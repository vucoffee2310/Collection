import random
import string
import re

def add_random_chars_after_punctuations(text: str) -> str:
    """
    Adds " {2 random characters}." after specified punctuation marks in a string.
    The target punctuation marks are: '.', ',', '!', '?'.

    Args:
        text: The input string.

    Returns:
        The modified string with random characters and full stops inserted.
    """

    def generate_two_random_chars() -> str:
        """Generates a string containing 2 random ASCII letters."""
        return ''.join(random.choice(string.ascii_letters) for _ in range(2))

    # Define the regex pattern to match any of the target punctuation marks.
    # We escape '.' because it's a special character in regex.
    # Comma is added as per docstring.
    punctuations_pattern = r'[.!?,\']' # Matches '.', '!', '?', or ','

    def replacement_function(match):
        """
        This function is called for each match found by re.sub.
        It takes the matched punctuation, adds random chars, and appends a full stop.
        """
        original_punctuation = match.group(0)
        random_chars = generate_two_random_chars()
        # Construct the replacement string: original punctuation + {random chars} + .
        # Note: The original code added a space before '{', like " {XY}." which seems intended.
        return f"{original_punctuation} {{{random_chars}}}."

    modified_text = re.sub(punctuations_pattern, replacement_function, text)
    return modified_text

# Example usage (can be run if this file is executed directly)
# if __name__ == "__main__":
#     sample_text = "Hello world. This is a test, right? Yes!"
#     processed_text = add_random_chars_after_punctuations(sample_text)
#     print("Original Text:")
#     print(sample_text)
#     print("\nModified Text:")
#     print(processed_text)
#     # Expected output style:
#     # Hello world. {rN}. This is a test, {rN}. right? {rN}. Yes! {rN}.
