# To run this code you need to install the following dependencies:
# pip install google-genai

import os
from google import genai
from google.genai import types

def generate():
    # Initialize the client with the API key from environment variables
    client = genai.Client(
        api_key=os.environ.get("GEMINI_API_KEY"),
    )

    model = "gemini-1.5-flash"
    # Define the new prompt
    prompt = """This is my BRSR question and its response. Please improve the response with more details and structure it with clear headers and bullet points in markdown.

**BRSR Question**: What measures has your organization taken to reduce greenhouse gas emissions?

**Response**: Our organization has implemented energy-efficient lighting and reduced travel by 10%.

Please provide an improved version of the response.
"""

    # Pass the prompt directly as a string to avoid type mismatch
    contents = prompt

    # Configure the response format
    generate_content_config = types.GenerateContentConfig(
        response_mime_type="text/plain",
    )

    try:
        # Stream the response from the Gemini API
        for chunk in client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=generate_content_config,
        ):
            if chunk.text:
                print(chunk.text, end="")
    except Exception as e:
        print(f"Error generating streaming text with Gemini: {e}")

if __name__ == "__main__":
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    generate()