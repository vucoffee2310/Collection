import os
import logging
import sys
from dotenv import load_dotenv
from gemini_utils import generate_and_save
from input_manipulation import process_input_to_structured_data, save_structured_data_to_json, DEFAULT_CONFIG as input_manip_default_config

# --- Basic Logging Setup ---
def setup_logging(level=logging.INFO):
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        stream=sys.stdout # Or use a file handler: logging.FileHandler("app.log")
    )

logger = logging.getLogger(__name__)

def main():
    setup_logging(logging.INFO) # Set to logging.DEBUG for more verbosity
    load_dotenv()
    logger.info("Application started.")

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.error("GEMINI_API_KEY not found in environment variables.")
        logger.error("Please create a .env file with GEMINI_API_KEY='YOUR_API_KEY_HERE'")
        return

    # --- Configuration ---
    # This raw_subtitle_input would typically be loaded from a file (e.g., .srt)
    raw_subtitle_input = """
1
00:00:01,000 --> 00:00:03,000
This is the first subtitle.

2
00:00:03,500 --> 00:00:05,500
And this is the second one.
[Marker]

3
00:00:06,000 --> 00:00:08,000
A third line for testing the process.

4
00:00:09,000 --> 00:00:12,000
Another example to make enough segments for grouping and combining.
    """
    # Example: Override default input_manipulation config if needed
    input_processing_config = {
        "group_size": 5, # Smaller for testing
        "combine_size": 25, # Smaller for testing
        "output_json_file": "run_generation_input_structure.json"
    }

    if not raw_subtitle_input.strip():
        logger.error("Raw subtitle input is empty. Aborting.")
        return

    # 1. Process raw subtitles to get text for Gemini and keys
    try:
        full_text_to_translate, generated_keys, structured_data_for_json = \
            process_input_to_structured_data(raw_subtitle_input, config_overrides=input_processing_config)
    except Exception as e:
        logger.error(f"Failed during input manipulation: {e}", exc_info=True)
        return

    if not full_text_to_translate or not generated_keys:
        logger.error("Input manipulation did not produce text for translation or keys. Aborting.")
        return

    # Optionally save the structured data from input_manipulation
    if structured_data_for_json:
        save_structured_data_to_json(structured_data_for_json, input_processing_config)
    
    gemini_output_filename = "generated_translation_output.txt"
    context_characters_for_regex = 150 # Or load from a config

    # 2. Call the Gemini generation function
    logger.info(f"Starting Gemini generation. Number of keys: {len(generated_keys)}.")
    generate_and_save(
        full_text_to_translate,
        gemini_output_filename,
        api_key,
        generated_keys,
        context_chars_for_regex=context_characters_for_regex
    )

    logger.info("Application finished.")

if __name__ == "__main__":
    main()
