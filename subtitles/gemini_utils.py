import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def generate_and_save(input_text, output_filename, api_key):
    """Generate content using Google GenAI API and save it to a file."""
    if not api_key:
        print("Error: GEMINI_API_KEY not provided.")
        return

    # Initialize API client
    try:
        client = genai.Client(api_key=api_key)
    except Exception as e:
        print(f"Error initializing Google GenAI Client: {e}")
        return

    model = "gemini-2.5-flash-preview-05-20"
    contents = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=input_text)],
        ),
    ]
    config = types.GenerateContentConfig(
        temperature=1.5,
        top_p=0.5,
        candidateCount=1,
        maxOutputTokens=65000,
        thinking_config=types.ThinkingConfig(thinking_budget=500),
        response_mime_type="text/plain",
        system_instruction=[types.Part.from_text(text="Translate to Vietnamese. Keep `(` and `)`. Output as JSON.")],
    )

    print(f"Starting content generation for '{input_text[:50]}' to '{output_filename}'")
    try:
        with open(output_filename, "w", encoding="utf-8") as f:
            stream = client.models.generate_content_stream(model=model, contents=contents, config=config)
            for chunk in stream:
                if chunk.text:
                    f.write(chunk.text)
        print(f"Content saved to '{output_filename}'")
    except Exception as e:
        print(f"Error during generation or file writing: {e}")

if __name__ == "__main__":
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY not found in environment variables.")
        print("Please create a .env file with GEMINI_API_KEY='YOUR_API_KEY_HERE'")
        exit()

    input_text = """``````"""
    output_filename = "generated_output.txt"
    generate_and_save(input_text, output_filename, api_key)
