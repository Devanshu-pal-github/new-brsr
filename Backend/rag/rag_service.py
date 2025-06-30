# Table Extraction Logic for RAG
import re
try:
    from pint import UnitRegistry
    ureg = UnitRegistry()
except ImportError:
    ureg = None  # If pint is not installed, skip unit conversion

# Standard library imports
import os
import uuid
import datetime
import shutil
import re
from typing import List
from io import BytesIO

# Third-party imports
from dotenv import load_dotenv
from pymongo import MongoClient
from langchain_community.vectorstores import FAISS
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from pypdf import PdfReader
from google import genai
from google.genai import types

# For Word and Excel support
try:
    import docx
    from openpyxl import load_workbook
    DOCX_AVAILABLE = True
    EXCEL_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False
    EXCEL_AVAILABLE = False
    print("⚠️ [RAG] docx or openpyxl not available. Word/Excel support disabled.")

# Load environment variables
load_dotenv()
GEMINI_API_KEY_RAG = os.getenv("GEMINI_API_KEY_RAG")
GEMINI_MODEL = "gemini-2.0-flash"
MONGODB_URL = os.getenv("MONGODB_URL")
DB_NAME = os.getenv("DB_NAME")


# NOTE: Remove direct pymongo usage for FastAPI integration. Use async db from dependency injection.

# Embedding and text splitter setup
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

# Gemini client
genai_client = genai.Client(api_key=GEMINI_API_KEY_RAG)

async def get_file_metadata(file_id: str, db):
    return await db.rag_files.find_one({"_id": file_id})

def get_vector_store(file_id: str):
    faiss_path = f"faiss_index_{file_id}"
    return FAISS.load_local(faiss_path, embeddings, allow_dangerous_deserialization=True)

def retrieve_relevant_chunks(file_id: str, question: str, k: int = 3):
    print(f"🔍 [RAG] Retrieving chunks for file_id: {file_id}, question: {question[:100]}...")
    try:
        vector_store = get_vector_store(file_id)
        docs = vector_store.similarity_search(question, k=k)
        print(f"🔍 [RAG] Found {len(docs)} relevant chunks")
        for i, doc in enumerate(docs):
            print(f"🔍 [RAG] Chunk {i+1}: {doc.page_content[:100]}...")
        return docs
    except Exception as e:
        print(f"❌ [RAG] Error retrieving chunks: {e}")
        return []

def ask_gemini_with_context(context: str, question: str) -> str:
    print(f"🔍 [RAG] Asking Gemini with context length: {len(context)}")
    prompt = (
        "You are a chatbot that answers questions strictly based on the provided document. "
        "Do not use any external knowledge or assumptions.\n\n"
        f"Document content:\n{context}\n\n"
        f"Question: {question}\n\n"
        "Answer:"
    )
    print(f"🔍 [RAG] Full prompt: {prompt[:500]}...")
    
    try:
        generate_content_config = types.GenerateContentConfig(response_mime_type="text/plain")
        response = genai_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=generate_content_config,
        )
        if not response or not hasattr(response, 'text'):
            print("❌ [RAG] No response from Gemini API")
            return "No response from Gemini API."
        
        result = str(response.text)
        print(f"🔍 [RAG] Gemini response: {result}")
        return result
    except Exception as e:
        print(f"❌ [RAG] Error calling Gemini: {e}")
        return f"Error calling Gemini: {e}"

def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    """Extract text from PDF, Word, or Excel files."""
    print(f"🔍 [RAG] Extracting text from file: {filename}")
    
    file_ext = filename.lower().split('.')[-1]
    text = ""
    
    try:
        if file_ext == 'pdf':
            pdf_reader = PdfReader(BytesIO(file_bytes))
            for page_num, page in enumerate(pdf_reader.pages):
                page_text = page.extract_text() or ""
                text += page_text
                print(f"🔍 [RAG] Extracted {len(page_text)} chars from PDF page {page_num + 1}")
        
        elif file_ext in ['doc', 'docx'] and DOCX_AVAILABLE:
            doc = docx.Document(BytesIO(file_bytes))
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            print(f"🔍 [RAG] Extracted {len(text)} chars from Word document")
        
        elif file_ext in ['xls', 'xlsx'] and EXCEL_AVAILABLE:
            workbook = load_workbook(BytesIO(file_bytes), data_only=True)
            for sheet_name in workbook.sheetnames:
                sheet = workbook[sheet_name]
                text += f"Sheet: {sheet_name}\n"
                for row in sheet.iter_rows(values_only=True):
                    row_text = " | ".join([str(cell) if cell is not None else "" for cell in row])
                    text += row_text + "\n"
            print(f"🔍 [RAG] Extracted {len(text)} chars from Excel document")
        
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")
        
        print(f"🔍 [RAG] Total extracted text length: {len(text)}")
        print(f"🔍 [RAG] Text preview: {text[:300]}...")
        return text
        
    except Exception as e:
        print(f"❌ [RAG] Error extracting text from {filename}: {e}")
        raise e

async def process_file_and_store(file_bytes: bytes, filename: str, file_size: int, db) -> str:
    """Extract text from any supported file type, split, embed, store in FAISS and MongoDB. Returns file_id."""
    print(f"🔍 [RAG] Processing file: {filename} ({file_size} bytes)")
    
    # Extract text using the universal extractor
    text = extract_text_from_file(file_bytes, filename)
    
    if not text.strip():
        raise ValueError("No text could be extracted from the file")
    
    print(f"🔍 [RAG] Creating documents from text ({len(text)} characters)")
    documents = text_splitter.create_documents([text])
    print(f"🔍 [RAG] Created {len(documents)} document chunks")
    
    # Create vector store
    vector_store = FAISS.from_documents(documents, embeddings)
    file_id = str(uuid.uuid4())
    faiss_path = f"faiss_index_{file_id}"
    vector_store.save_local(faiss_path)
    print(f"🔍 [RAG] Saved vector store to: {faiss_path}")
    
    # Store metadata in MongoDB
    await db.rag_files.insert_one({
        "_id": file_id,
        "filename": filename,
        "content_length": file_size,
        "text_length": len(text),
        "chunk_count": len(documents),
        "faiss_path": faiss_path,
        "upload_date": datetime.datetime.now().timestamp()
    })
    print(f"🔍 [RAG] Stored metadata for file_id: {file_id}")
    
    return file_id


async def delete_file_and_index(file_id: str, db) -> bool:
    file_metadata = await db.rag_files.find_one({"_id": file_id})
    if not file_metadata:
        return False
    faiss_path = f"faiss_index_{file_id}"
    try:
        shutil.rmtree(faiss_path)
    except Exception:
        pass  # Ignore errors if directory does not exist
    await db.rag_files.delete_one({"_id": file_id})
    return True


async def extract_table_values(file_id: str, table_metadata: dict, question: str):
    """
    Extracts values for each editable cell in the table using RAG and Gemini.
    Returns: { 'suggested_values': {rowIdx: {colKey: value, ...}, ...}, 'unit_warnings': [ ... ] }
    """
    print(f"🔍 [RAG] Starting table extraction for file_id: {file_id}")
    print(f"🔍 [RAG] Question: {question}")
    print(f"🔍 [RAG] Table metadata keys: {list(table_metadata.keys())}")
    
    # Only process if rows and columns exist
    rows = table_metadata.get('rows', [])
    columns = table_metadata.get('columns', [])
    print(f"🔍 [RAG] Found {len(rows)} rows and {len(columns)} columns")
    print(f"🔍 [RAG] All rows:")
    for idx, row in enumerate(rows):
        print(f"  Row {idx}: {row}")
    print(f"🔍 [RAG] All columns:")
    for idx, col in enumerate(columns):
        print(f"  Col {idx}: {col}")
    
    # Identify editable rows (not auto-calculated)
    # Remove HTML tags from parameter text for keyword checking
    import re
    def clean_html(text):
        return re.sub(r'<[^>]+>', '', text)
    
    editable_row_indices = []
    for idx, row in enumerate(rows):
        if row.get('isHeader'):
            continue
        param_clean = clean_html(row.get('parameter', '')).lower()
        print(f"🔍 [RAG] Row {idx}: '{row.get('parameter', '')}' -> cleaned: '{param_clean}'")
        
        # Check if it's auto-calculated (very specific checks)
        is_auto_calc = (
            # Intensity calculations (per unit measures)
            ('intensity' in param_clean and ('per' in param_clean or '/' in param_clean)) or
            ('per rupee' in param_clean) or
            ('per ton' in param_clean) or
            ('/₹' in param_clean) or
            ('/ton' in param_clean) or
            # Sum/Total rows that explicitly show addition (A+B+C pattern)
            (('total' in param_clean or 'sum' in param_clean) and 
             ('+' in param_clean or 'a+b+c' in param_clean))
        )
        
        if not is_auto_calc:
            editable_row_indices.append(idx)
            print(f"🔍 [RAG] Row {idx} marked as editable")
        else:
            print(f"🔍 [RAG] Row {idx} marked as auto-calculated")
    
    print(f"🔍 [RAG] Editable row indices: {editable_row_indices}")
    
    # Identify year columns (e.g., 'current_year', 'previous_year')
    year_col_keys = [col.get('key') for col in columns if col.get('key') not in ('parameter', 'unit')]
    # If dynamicYear, fallback to all except parameter/unit
    if not year_col_keys:
        year_col_keys = [col.get('key') for col in columns if col.get('key') not in ('parameter', 'unit')]
    print(f"🔍 [RAG] Year column keys: {year_col_keys}")
    
    suggested_values = {}
    unit_warnings = []
    
    for row_idx in editable_row_indices:
        row = rows[row_idx]
        param = row.get('parameter', '')
        expected_unit = row.get('unit', '').strip()
        print(f"🔍 [RAG] Processing row {row_idx}: {param} (unit: {expected_unit})")
        
        suggested_values[str(row_idx)] = {}
        for col_key in year_col_keys:
            print(f"🔍 [RAG] Processing cell [{row_idx}][{col_key}]")
            
            # Compose a more specific prompt for this cell
            # Clean parameter name for better search
            param_clean = clean_html(param)
            
            # Create multiple search strategies
            search_queries = [
                param_clean,  # Direct parameter name
                f"{param_clean} {col_key}",  # Parameter with column
                "energy intensity per ton",  # Specific search for energy intensity per ton
                "energy intensity production",  # Alternative search
                f"{param_clean} FY",  # Parameter with financial year
                "per ton production",  # Direct search for per ton values
                "GJ/ton",  # Search by unit
            ]
            
            # Try multiple searches and combine results
            all_docs = []
            for search_query in search_queries[:4]:  # Use more queries for better coverage
                docs = retrieve_relevant_chunks(file_id, search_query, k=2)
                all_docs.extend(docs)
            
            # Remove duplicates and get unique content
            unique_content = []
            seen_content = set()
            for doc in all_docs:
                if doc.page_content not in seen_content:
                    unique_content.append(doc.page_content)
                    seen_content.add(doc.page_content)
            
            context = "\n".join(unique_content)
            print(f"🔍 [RAG] Retrieved {len(all_docs)} total docs, {len(unique_content)} unique chunks")
            print(f"🔍 [RAG] Context length: {len(context)}")
            print(f"🔍 [RAG] Context preview: {context[:300]}...")
            
            # Create a more targeted prompt
            year_mapping = {
                'current_year': 'FY 2024-2025',
                'previous_year': 'FY 2023-2024'
            }
            year_label = year_mapping.get(col_key, col_key)
            
            prompt = f"""From the document, find the exact numeric value for "{param_clean}" for the year "{year_label}".

Look for a table with energy consumption data. The table should have columns for different years (FY 2024-2025, FY 2023-2024) and rows for different energy metrics.

Find the row that contains "{param_clean}" or similar text like:
- Energy intensity per ton
- Energy intensity per ton of production  
- GJ/ton values

Extract the numeric value from the column for "{year_label}".

The value should be a complete number (including any digits after commas) in {expected_unit or 'the appropriate unit'}.

Document content:
{context}

Return only the complete numeric value (including all digits). If the number has commas (like 132,000), include the full number."""

            print(f"🔍 [RAG] Enhanced prompt: {prompt[:200]}...")
            
            # Ask Gemini with enhanced prompt
            answer = ask_gemini_with_context(context, f"Extract the complete numeric value for '{param_clean}' for '{year_label}' from the table data. Return the full number including all digits (e.g., if you see 132,000 return the complete number, not just 132).")
            print(f"🔍 [RAG] Gemini answer: {answer}")
            
            # Try to extract value and unit from answer with multiple patterns
            value, found_unit = None, None
            
            # Special handling for energy intensity per ton - look for the specific values mentioned
            if "energy intensity per ton" in answer.lower() or ("GJ/ton" in (expected_unit or "") and "per ton" in param_clean.lower()):
                print(f"🔍 [RAG] Special handling for GJ/ton field")
                
                # Pattern 1: Look for "energy intensity per ton of production" followed by value
                intensity_match = re.search(r"energy intensity per ton of production[^0-9]*?is\s+([\d,]+\.?\d*)\s*([A-Za-z\s⁻¹−]*)", answer, re.IGNORECASE)
                if not intensity_match:
                    # Pattern 2: Look for "per ton of production" followed by value
                    intensity_match = re.search(r"per ton of production[^0-9]*?is\s+([\d,]+\.?\d*)\s*([A-Za-z\s⁻¹−]*)", answer, re.IGNORECASE)
                if not intensity_match:
                    # Pattern 3: Look for "energy intensity per ton" followed by value (broader)
                    intensity_match = re.search(r"energy intensity per ton[^0-9]*?is\s+([\d,]+\.?\d*)\s*([A-Za-z\s⁻¹−]*)", answer, re.IGNORECASE)
                if not intensity_match:
                    # Pattern 4: Look for "per ton" followed by value, but check sentence context to avoid rupee confusion
                    sentences = answer.split('.')
                    for sentence in sentences:
                        if 'per ton' in sentence.lower() and 'per rupee' not in sentence.lower() and 'rupee' not in sentence.lower():
                            per_ton_match = re.search(r"per ton[^0-9]*?is\s+([\d,]+\.?\d*)\s*([A-Za-z\s⁻¹−]*)", sentence, re.IGNORECASE)
                            if not per_ton_match:
                                per_ton_match = re.search(r"per ton[^0-9]*?([\d,]+\.?\d*)\s*([A-Za-z\s⁻¹−]*)", sentence, re.IGNORECASE)
                            if per_ton_match:
                                intensity_match = per_ton_match
                                break
                
                # Pattern 5: If still not found, look for values with GJ and 't' units (per-ton indicators)
                if not intensity_match:
                    ton_unit_matches = re.finditer(r"([\d,]+\.?\d*)\s*([A-Za-z]*\s*[t][\s⁻¹−]+)", answer, re.IGNORECASE)
                    for match in ton_unit_matches:
                        # Check the context to ensure this is a per-ton value, not per-rupee
                        match_start = match.start()
                        match_end = match.end()
                        context_before = answer[max(0, match_start-100):match_start].lower()
                        context_after = answer[match_end:match_end+50].lower()
                        
                        # Skip if this is clearly in a per-rupee context
                        if any(phrase in context_before + context_after for phrase in ["per rupee", "rupee", "₹"]):
                            continue
                        
                        # Accept if it has per-ton context or if it's the only reasonable value
                        if any(phrase in context_before for phrase in ["per ton", "ton of production", "energy intensity"]):
                            intensity_match = match
                            break
                
                if intensity_match:
                    potential_value = intensity_match.group(1).replace(',', '')
                    potential_unit = intensity_match.group(2).strip() if intensity_match.group(2) else "GJ/ton"
                    
                    # Additional validation: make sure this isn't from a "per rupee" context
                    match_context = answer[max(0, intensity_match.start()-100):intensity_match.end()+100]
                    rupee_indicators = ['per rupee', 'per ₹', 'rupee', '₹']
                    ton_indicators = ['per ton', 'ton of production', 'energy intensity per ton']
                    
                    has_rupee_context = any(indicator in match_context.lower() for indicator in rupee_indicators)
                    has_ton_context = any(indicator in match_context.lower() for indicator in ton_indicators)
                    
                    # Only accept if it's clearly a per-ton value or has no rupee context
                    if has_ton_context or not has_rupee_context:
                        value = potential_value
                        found_unit = potential_unit
                        print(f"🔍 [RAG] Found and validated energy intensity per ton: {value} {found_unit}")
                    else:
                        print(f"🔍 [RAG] Rejected potential per-ton value due to rupee context: {potential_value}")
                
                # Special fallback for GJ/ton fields: if year_label is provided, look for year-specific per-ton values
                if not value and year_label:
                    year_pattern = str(year_label).replace("FY ", "")  # "2024-2025" or "2023-2024"
                    
                    # Look for year-specific per-ton patterns
                    year_ton_patterns = [
                        rf"for\s+FY\s+{re.escape(year_pattern)}\s+is\s+([\d,]+\.?\d*)\s*([A-Za-z]*\s*[t][\s⁻¹−]*)",  # "for FY 2023-2024 is 8.00 GJ t−1"
                        rf"per ton[^0-9]*?for\s+FY\s+{re.escape(year_pattern)}\s+is\s+([\d,]+\.?\d*)",  # "per ton ... for FY 2023-2024 is 8.00"
                    ]
                    
                    for pattern in year_ton_patterns:
                        year_match = re.search(pattern, answer, re.IGNORECASE)
                        if year_match:
                            # Validate this is in a per-ton context, not per-rupee
                            match_context = answer[max(0, year_match.start()-100):year_match.end()+50]
                            if 'per ton' in match_context.lower() and 'per rupee' not in match_context.lower():
                                value = year_match.group(1).replace(',', '')
                                found_unit = year_match.group(2).strip() if len(year_match.groups()) > 1 and year_match.group(2) else "GJ/ton"
                                print(f"🔍 [RAG] Found year-specific per-ton value: {value} {found_unit}")
                                break
            
            # If not found above, try specific year-based extraction
            if not value and year_label:
                # Look for year-specific patterns like "for FY 2023-2024 is 8.00"
                year_pattern = str(year_label).replace("FY ", "")  # "2024-2025" or "2023-2024"
                
                # First try to find specifically "per ton" values for this year
                year_match = re.search(rf"per ton[^0-9]*?for\s+FY\s+{re.escape(year_pattern)}\s+is\s+([\d,]+\.?\d*)", answer, re.IGNORECASE)
                if not year_match:
                    # Try "for FY ... is X.XX GJ t−1" pattern
                    year_match = re.search(rf"for\s+FY\s+{re.escape(year_pattern)}\s+is\s+([\d,]+\.?\d*)\s*([A-Za-z]+[⁻¹−\s]*[t][⁻¹−\s]*)", answer, re.IGNORECASE)
                if not year_match:
                    # Try the general pattern
                    year_match = re.search(rf"for\s+FY\s+{re.escape(year_pattern)}\s+is\s+([\d,]+\.?\d*)", answer, re.IGNORECASE)
                if not year_match:
                    year_match = re.search(rf"{re.escape(year_pattern)}[^0-9]*?([\d,]+\.?\d*)\s*([A-Za-z]+[⁻¹−\s]*)", answer, re.IGNORECASE)
                if year_match:
                    potential_value = year_match.group(1).replace(',', '')
                    potential_unit = year_match.group(2).strip() if len(year_match.groups()) > 1 and year_match.group(2) else None
                    
                    # For GJ/ton fields, prefer values that have 't' in the unit or are at the end of the sentence
                    if expected_unit and "ton" in expected_unit.lower():
                        if potential_unit and 't' in potential_unit.lower():
                            value = potential_value
                            found_unit = potential_unit
                            print(f"🔍 [RAG] Found year-specific per-ton value: {value} {found_unit}")
                        elif not potential_unit:  # Value at end of sentence, likely the per-ton value
                            value = potential_value
                            print(f"🔍 [RAG] Found year-specific value at end: {value}")
                    else:
                        value = potential_value
                        found_unit = potential_unit
                        print(f"🔍 [RAG] Found year-specific value: {value} {found_unit}")
            
            # If not found above, try general patterns
            if not value:
                # Multiple regex patterns to catch different formats
                patterns = [
                    r"([\d,]+\.?\d*)\s*([A-Za-z]+[⁻¹−]?)",  # 132,000 GJt⁻¹ or 7.64 GJt⁻¹
                    r"([\d,]+\.?\d*)\s*([A-Za-z/()]+)",     # 132,000 GJ/t or 7.64 GJ/t
                    r"([\d,]+\.?\d*)",                      # Just number: 132,000 or 7.64
                ]
                
                for pattern in patterns:
                    match = re.search(pattern, answer)
                    if match:
                        value = match.group(1).replace(',', '')  # Remove commas from the number
                        found_unit = match.group(2) if len(match.groups()) > 1 else None
                        break
            
            print(f"🔍 [RAG] Extracted value: {value}, unit: {found_unit}")
            
            # If no numeric value found, try to extract from a broader search
            if not value:
                # For energy intensity, try to extract the specific mentioned values
                if ("GJ/ton" in (expected_unit or "").lower() or "per ton" in param_clean.lower()) and "energy intensity" in param_clean.lower():
                    print(f"🔍 [RAG] Fallback search for GJ/ton energy intensity field")
                    # Look for year-specific values in the response
                    year_pattern = str(year_label).replace("FY ", "") if year_label else ""  # "2024-2025" or "2023-2024"
                    
                    # Try multiple patterns to find the value for this specific year, but only per-ton values
                    patterns_to_try = [
                        rf"for\s+FY\s+{re.escape(year_pattern)}\s+is\s+([\d,]+\.?\d*)\s*([A-Za-z]*\s*[t][\s⁻¹−]*)",  # "for FY 2023-2024 is 8.00 GJ t−1"
                        rf"{re.escape(year_pattern)}[^0-9]*?([\d,]+\.?\d*)\s*([A-Za-z]*\s*[t][\s⁻¹−]*)",  # "2023-2024 ... 8.00 GJ t−1"
                        rf"(?:is\s+)?([\d,]+\.?\d*)[^0-9]*?([A-Za-z]*\s*[t][\s⁻¹−]*)[^0-9]*?{re.escape(year_pattern)}",  # "is 8.00 GJ t−1 ... 2023-2024"
                    ]
                    
                    for pattern in patterns_to_try:
                        year_value_match = re.search(pattern, answer, re.IGNORECASE)
                        if year_value_match:
                            # Make sure this is not in a per-rupee context
                            match_context = answer[max(0, year_value_match.start()-100):year_value_match.end()+50]
                            if ('per ton' in match_context.lower() or 'energy intensity' in match_context.lower()) and 'per rupee' not in match_context.lower():
                                value = year_value_match.group(1).replace(',', '')
                                found_unit = year_value_match.group(2).strip() if len(year_value_match.groups()) > 1 and year_value_match.group(2) else None
                                print(f"🔍 [RAG] Found year-specific per-ton value with fallback pattern: {value} {found_unit}")
                                break
                    
                    # Final fallback: Look for values followed by GJ t or similar patterns (per-ton indicators)
                    if not value:
                        ton_values = re.findall(r"([\d,]*\.?\d+)\s*[A-Za-z]*\s*[t][\s⁻¹−]*", answer, re.IGNORECASE)
                        if ton_values:
                            # Filter out very small values that might be per-rupee (e.g., 0.3030)
                            valid_ton_values = [v.replace(',', '') for v in ton_values if float(v.replace(',', '')) > 1.0]
                            if valid_ton_values:
                                value = valid_ton_values[-1]  # Take the last valid ton-related value
                                print(f"🔍 [RAG] Final fallback extracted ton-specific value: {value}")
                            else:
                                print(f"🔍 [RAG] All ton values were too small (likely per-rupee), skipping: {ton_values}")
                        else:
                            # Look for decimal numbers first (like 7.64, 8.00) but exclude small ones that might be per-rupee
                            decimal_numbers = re.findall(r"[\d,]*\.\d+", answer)
                            valid_decimals = [d.replace(',', '') for d in decimal_numbers if float(d.replace(',', '')) > 1.0]
                            if valid_decimals:
                                value = valid_decimals[-1]  # Take the last valid decimal number
                                print(f"🔍 [RAG] Fallback extracted valid decimal value: {value}")
                            else:
                                print(f"🔍 [RAG] All decimal values were too small (likely per-rupee), skipping: {decimal_numbers}")
                else:
                    # For other fields, use normal logic
                    year_pattern = str(year_label).replace("FY ", "") if year_label else ""  # "2024-2025" or "2023-2024"
                    
                    # Try year-specific patterns first
                    if year_pattern:
                        patterns_to_try = [
                            rf"for\s+FY\s+{re.escape(year_pattern)}\s+is\s+([\d,]+\.?\d*)",  # "for FY 2023-2024 is 8.00"
                            rf"{re.escape(year_pattern)}[^0-9]*?([\d,]+\.?\d*)\s*GJ",  # "2023-2024 ... 8.00 GJ"
                            rf"(?:is\s+)?([\d,]+\.?\d*)[^0-9]*?{re.escape(year_pattern)}",  # "is 8.00 ... 2023-2024"
                            rf"{re.escape(year_pattern)}[^0-9]*?([\d,]+\.?\d*)",  # fallback
                        ]
                        
                        for pattern in patterns_to_try:
                            year_value_match = re.search(pattern, answer, re.IGNORECASE)
                            if year_value_match:
                                value = year_value_match.group(1).replace(',', '')
                                print(f"🔍 [RAG] Found year-specific value with pattern '{pattern}': {value}")
                                break
                    
                    # General fallback if no year-specific value found
                    if not value:
                        decimal_numbers = re.findall(r"[\d,]*\.\d+", answer)
                        if decimal_numbers:
                            value = decimal_numbers[-1].replace(',', '')  # Take the last decimal number
                            print(f"🔍 [RAG] Fallback extracted decimal value: {value}")
                        else:
                            numbers = re.findall(r"[\d,]+", answer)
                            if numbers:
                                value = numbers[-1].replace(',', '')  # Take the last number
                                print(f"🔍 [RAG] Fallback extracted integer value: {value}")
                
                if not value:
                    print(f"🔍 [RAG] No numeric value found in answer: {answer}")
            
            # Clean up the value
            if value:
                try:
                    # Ensure it's a valid number
                    float(value)
                except ValueError:
                    value = None
                    print(f"🔍 [RAG] Invalid numeric value, setting to None")
            
            # Unit conversion if needed
            if value and expected_unit and found_unit and ureg:
                try:
                    val = float(value)
                    # Handle special unit formats
                    expected_clean = expected_unit.replace('t⁻¹', '/t').replace('₹', 'rupee').split()[0]
                    found_clean = found_unit.replace('t⁻¹', '/t').replace('₹', 'rupee') if found_unit else expected_unit
                    
                    q = val * ureg(found_clean)
                    val_converted = q.to(ureg(expected_clean)).magnitude
                    converted_value = str(round(val_converted, 4))
                    
                    if found_unit != expected_unit:
                        unit_warnings.append(f"Converted '{param}' for '{col_key}' from {found_unit} to {expected_unit}.")
                    print(f"🔍 [RAG] Unit conversion: {val} {found_unit} -> {converted_value} {expected_unit}")
                    value = converted_value
                except Exception as e:
                    if found_unit and found_unit != expected_unit.split()[0]:
                        unit_warnings.append(f"Could not convert '{param}' for '{col_key}' from {found_unit} to {expected_unit}: {e}")
                    print(f"🔍 [RAG] Unit conversion failed: {e}")
            
            # Final value assignment
            final_value = value if value is not None else ""
            suggested_values[str(row_idx)][col_key] = final_value
            print(f"🔍 [RAG] Final value for [{row_idx}][{col_key}]: '{final_value}'")
    
    result = {"suggested_values": suggested_values, "unit_warnings": unit_warnings}
    print(f"🔍 [RAG] Final result: {result}")
    return result
