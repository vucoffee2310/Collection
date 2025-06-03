import os
import logging
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Import the processor from the other file
from keypair_processor import KeyPairProcessor 

# --- Configuration for Gemini API ---
GEMINI_MODEL_NAME = "gemini-2.5-flash-preview-05-20" # Corrected name if preview-05-20 is valid

class GeminiStreamer:
    """
    Handles making requests to the Gemini API and streaming the response
    to a KeyPairProcessor.
    """
    def __init__(self, api_key, output_filename_base):
        self.api_key = api_key
        self.output_filename_base = output_filename_base
        self.client = None
        try:
            self.client = genai.Client(api_key=self.api_key)
        except Exception as e:
            logging.error(f"Error initializing Google GenAI Client: {e}")
            raise # Reraise to stop execution if client fails

    def stream_and_process(self, input_text_for_llm, key_processor_instance: KeyPairProcessor):
        """
        Streams content from Gemini and passes chunks to the KeyPairProcessor.
        """
        if not self.client:
            logging.error("Gemini client not initialized. Cannot stream.")
            return

        gen_config = types.GenerateContentConfig(
            temperature=1.5, top_p=0.5, candidate_count=1, max_output_tokens=65000,
            thinking_config=types.ThinkingConfig(thinking_budget=500),
            response_mime_type="text/plain",
            system_instruction=[types.Part.from_text(text="Translate to Vietnamese. Keep `(` and `)`. Output as JSON.")]
        )
        gen_contents = [types.Content(role="user", parts=[types.Part.from_text(text=input_text_for_llm)])]

        logging.info(f"Starting content generation for input (first 50 chars): '{input_text_for_llm[:50]}...'")
        raw_stream_output_file = f"{self.output_filename_base}_raw_stream.txt"
        logging.info(f"Full AI stream will be saved to '{raw_stream_output_file}'")

        try:
            with open(raw_stream_output_file, "w", encoding="utf-8") as f_stream:
                stream = self.client.generate_content(
                    model=f"models/{GEMINI_MODEL_NAME}",
                    contents=gen_contents,
                    generation_config=gen_config,
                    stream=True
                )

                chunk_num = 0
                for chunk in stream:
                    chunk_num += 1
                    if not hasattr(chunk, 'text') or not chunk.text:
                        logging.debug(f"Chunk {chunk_num} has no text, skipping.")
                        continue
                    
                    chunk_text = chunk.text
                    f_stream.write(chunk_text) # Save raw chunk
                    f_stream.flush() # Ensure it's written immediately for monitoring

                    # Pass the chunk to the processor
                    key_processor_instance.process_chunk(chunk_text)
            
            logging.info(f"Stream finished. Raw content saved to '{raw_stream_output_file}'")
            # Finalize processing in the KeyPairProcessor
            key_processor_instance.finalize_processing()

        except Exception as e:
            logging.error(f"Error during generation or streaming: {e}", exc_info=True)
        

def setup_logging():
    """Configures basic logging."""
    logging.basicConfig(
        level=logging.INFO, # Change to logging.DEBUG for more verbose output from both files
        format='%(asctime)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
        handlers=[
            logging.StreamHandler(),
        ]
    )

if __name__ == "__main__":
    setup_logging()
    load_dotenv()

    api_key_env = os.environ.get("GEMINI_API_KEY")
    if not api_key_env:
        logging.error("Error: GEMINI_API_KEY not found in environment variables.")
        logging.error("Please create a .env file with GEMINI_API_KEY='YOUR_API_KEY_HERE'")
        exit()

    # Define the sequence of (p1, p2) keys to search for
    # This is now passed to the KeyPairProcessor
    target_key_pair_definitions = [
        ('2f8e', '09e5'), ('09e5', 'ddc7'), ('ddc7', '29t9'),
        ('29t9', '56ca'), ('56ca', '6f36'), ('6f36', ''), 
    ]
    
    output_directory_for_pairs = "output_pairs_data_separated"
    output_file_basename = "generated_llm_output"

    # Create instances
    try:
        gemini_handler = GeminiStreamer(api_key=api_key_env, output_filename_base=output_file_basename)
        key_pair_handler = KeyPairProcessor(
            target_pair_definitions=target_key_pair_definitions,
            output_directory=output_directory_for_pairs
        )
    except Exception as e: # Handles client init error from GeminiStreamer
        logging.error(f"Failed to initialize handlers: {e}")
        exit()


    # Example input for the LLM
    test_input = """
    This is a sample text.
    Please translate the following content ensuring you include specific markers.
    Marker one is 2f8e and then some interesting text.
    Then we should see 09e5.
    After that, there should be a lot of content, more than 150 non-whitespace characters.
    The next marker is ddc7, followed by some text, and then 29t9.
    Consider this context for the translation.
    Another section might have 56ca and then more details before 6f36 which is the final key.
    Everything after 6f36 is also important.
    And more text here to test after content checks. This part is quite long to ensure we have enough.
    Adding even more text to make sure after conditions can be met if the keys are found near the end.
    This ensures that the after checks have plenty of material to work with.
    Final sentence.
    """

    gemini_handler.stream_and_process(input_text_for_llm=test_input, key_processor_instance=key_pair_handler)

    logging.info("Script finished.")
