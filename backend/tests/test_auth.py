from app.auth import generate_temporary_password, hash_password, is_valid_password, verify_password


def test_temporary_password_is_long_enough_and_hashes():
    password = generate_temporary_password()
    assert len(password) == 18
    assert is_valid_password(password)
    assert verify_password(password, hash_password(password))


def test_password_requires_twelve_characters():
    assert not is_valid_password("too-short")
    assert is_valid_password("twelve-chars")
