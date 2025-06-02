import random
import string
import re
import logging

logger = logging.getLogger(__name__)

def add_random_chars_after_punctuations(text: str) -> str:
    """
    Adds " {2 random characters}." after specified punctuation marks in a string.
    The target punctuation marks are: '.', '!', '?'.

    Args:
        text: The input string.

    Returns:
        The modified string with random characters and full stops inserted.
    """

    def generate_two_random_chars() -> str:
        """Generates a string containing 2 random ASCII letters."""
        return ''.join(random.choice(string.ascii_letters) for _ in range(2))

    punctuations_pattern = r'[.!?\']' 

    def replacement_function(match):
        original_punctuation = match.group(0)
        random_chars = generate_two_random_chars()
        return f"{original_punctuation} {{{random_chars}}}."

    modified_text = re.sub(punctuations_pattern, replacement_function, text)
    logger.debug("Added random characters after punctuations.")
    return modified_text
