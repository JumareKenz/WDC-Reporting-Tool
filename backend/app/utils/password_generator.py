"""
Password generator utility for creating secure, memorable passwords.
"""

import random
import string
import secrets


def generate_password(length: int = 12, use_special_chars: bool = True) -> str:
    """
    Generate a secure random password.

    Args:
        length: Password length (default: 12)
        use_special_chars: Include special characters (default: True)

    Returns:
        str: Generated password
    """

    if use_special_chars:
        characters = string.ascii_letters + string.digits + "!@#$%&*"
    else:
        characters = string.ascii_letters + string.digits

    # Use secrets for cryptographically strong random generation
    password = ''.join(secrets.choice(characters) for _ in range(length))

    return password


def generate_memorable_password() -> str:
    """
    Generate a memorable password using word combinations.

    Format: Word-Word-Number-Special
    Example: Blue-Tiger-23!

    Returns:
        str: Generated memorable password
    """

    words = [
        "Blue", "Red", "Green", "Gold", "Silver", "Crystal", "Bright", "Swift",
        "Tiger", "Eagle", "Lion", "Falcon", "Dragon", "Phoenix", "Hawk", "Wolf",
        "River", "Mountain", "Ocean", "Forest", "Sky", "Star", "Moon", "Sun",
        "Storm", "Thunder", "Lightning", "Wind", "Rain", "Cloud", "Fire", "Ice"
    ]

    # Pick 2 random words
    word1 = random.choice(words)
    word2 = random.choice(words)

    # Generate 2-digit number
    number = random.randint(10, 99)

    # Pick special character
    special = random.choice("!@#$%&*")

    return f"{word1}{word2}{number}{special}"


def generate_pin(length: int = 6) -> str:
    """
    Generate a numeric PIN code.

    Args:
        length: PIN length (default: 6)

    Returns:
        str: Generated PIN
    """

    return ''.join(secrets.choice(string.digits) for _ in range(length))
