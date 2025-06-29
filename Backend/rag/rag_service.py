
# Standard library imports
import os
import uuid
import datetime
import shutil
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
    vector_store = get_vector_store(file_id)
    docs = vector_store.similarity_search(question, k=k)
    return docs

def ask_gemini_with_context(context: str, question: str) -> str:
    prompt = (
        "You are a chatbot that answers questions strictly based on the provided document. "
        "Do not use any external knowledge or assumptions.\n\n"
        f"Document content:\n{context}\n\n"
        f"Question: {question}\n\n"
        "Answer:"
    )
    generate_content_config = types.GenerateContentConfig(response_mime_type="text/plain")
    response = genai_client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=generate_content_config,
    )
    if not response or not hasattr(response, 'text'):
        return "No response from Gemini API."
    return str(response.text)
import os
import uuid
import datetime
from typing import List
from pymongo import MongoClient
from dotenv import load_dotenv
from langchain_community.vectorstores import FAISS
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from pypdf import PdfReader

# Load environment variables
load_dotenv()
MONGODB_URL = os.getenv("MONGODB_URL")
DB_NAME = os.getenv("DB_NAME")

# MongoDB setup
mongo_client = MongoClient(MONGODB_URL)
if not DB_NAME:
    raise ValueError("DB_NAME environment variable is not set.")
db = mongo_client[DB_NAME]
files_collection = db.rag_files

# Embedding and text splitter setup
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)


from io import BytesIO

async def process_pdf_and_store(file_bytes: bytes, filename: str, file_size: int, db) -> str:
    """Extract text, split, embed, store in FAISS and MongoDB. Returns file_id."""
    pdf_reader = PdfReader(BytesIO(file_bytes))
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text() or ""
    documents = text_splitter.create_documents([text])
    vector_store = FAISS.from_documents(documents, embeddings)
    file_id = str(uuid.uuid4())
    faiss_path = f"faiss_index_{file_id}"
    vector_store.save_local(faiss_path)
    await db.rag_files.insert_one({
        "_id": file_id,
        "filename": filename,
        "content_length": file_size,
        "faiss_path": faiss_path,
        "upload_date": datetime.datetime.now().timestamp()
    })
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
