import os
import logging
from typing import Optional, Dict, Any
from google import genai
from google.genai import types


from dotenv import load_dotenv
import asyncio

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self):
        """Initialize the Gemini service with API key."""
        # Load environment variables
        load_dotenv()
        # Support both VITE_API_KEY and GEMINI_API_KEY
        self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("VITE_API_KEY")
        
        if not self.api_key:
            logger.error("API key not found in environment variables (checked GEMINI_API_KEY and VITE_API_KEY)")
            raise ValueError("API key not found in environment variables")
        
        # Initialize the Gemini client
        self.client = genai.Client(api_key=self.api_key)
        self.model = "gemini-1.5-flash"

    def create_prompt_with_context(self, message: str, context: Optional[Dict[Any, Any]] = None) -> str:
        """Create a structured prompt with context."""
        if not context:
            return message

        # Extract context information
        question_text = context.get('questionText', '')
        guidance_text = context.get('guidanceText', '')
        metadata = context.get('metadata', {})
        current_answer = context.get('answer', '')

        # Create structured prompt
        structured_prompt = f"""Context:
Question: {question_text}
Guidance: {guidance_text}
Current Answer: {current_answer}
Metadata: {metadata}

User Query: {message}

Please provide a detailed response considering the above context."""

        logger.info(f"Generated prompt with context:\n{structured_prompt}")
        return structured_prompt

    async def generate_content(self, prompt: str) -> str:
        """Generate content using the Gemini model."""
        try:
            generate_content_config = types.GenerateContentConfig(
                response_mime_type="text/plain",
            )
            
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=generate_content_config,
            )
            
            if not response or not hasattr(response, 'text'):
                return ""
            return str(response.text)
        except Exception as e:
            logger.error(f"Error generating content: {str(e)}")
            raise

    async def generate_content_stream(self, prompt: str):
        """Generate streaming content using the Gemini model."""
        try:
            generate_content_config = types.GenerateContentConfig(
                response_mime_type="text/plain",
            )
            
            # Wrap synchronous iterator in an async generator
            async def stream_wrapper():
                for chunk in self.client.models.generate_content_stream(
                    model=self.model,
                    contents=prompt,
                    config=generate_content_config,
                ):
                    yield chunk
                    # Small delay to prevent blocking the event loop
                    await asyncio.sleep(0)
            
            return stream_wrapper()
        except Exception as e:
            logger.error(f"Error generating content stream: {str(e)}")
            raise

    async def improve_brsr_response(self, question: str, response: str):
        """Improve a BRSR question response with detailed markdown output."""
        try:
            # Define the BRSR-specific prompt, preserving the original logic
            brsr_prompt = f"""This is my BRSR question and its response. Please improve the response with more details and structure it with clear headers and bullet points in markdown.

**BRSR Question**: {question}

**Response**: {response}

Please provide an improved version of the response."""

            logger.info(f"BRSR prompt generated:\n{brsr_prompt}")

            # Use the existing generate_content_stream method
            generate_content_config = types.GenerateContentConfig(
                response_mime_type="text/plain",
            )
            
            stream =  self.client.models.generate_content_stream(
                model=self.model,
                contents=brsr_prompt,
                config=generate_content_config,
            )

            # Stream the response asynchronously
            for chunk in stream:
                if chunk.text:
                    yield chunk.text
                    # Small delay to prevent blocking the event loop
                    await asyncio.sleep(0)
        except Exception as e:
            logger.error(f"Error generating streaming BRSR response: {str(e)}")
            raise