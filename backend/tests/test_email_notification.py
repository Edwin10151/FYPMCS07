from app.config import Settings
import ssl
from app.services import email_notification


class FakeSmtp:
    sent = []

    def __init__(self, host, port, timeout):
        assert (host, port, timeout) == ("smtp.gmail.com", 587, 20)

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return None

    def starttls(self, *, context):
        assert context.check_hostname
        assert context.verify_mode == ssl.CERT_REQUIRED
        return None

    def login(self, username, password):
        assert (username, password) == ("sender@gmail.com", "app-password")

    def send_message(self, message):
        self.sent.append(message)


def test_reminders_are_sent_individually(monkeypatch):
    FakeSmtp.sent = []
    monkeypatch.setattr(email_notification.smtplib, "SMTP", FakeSmtp)
    settings = Settings(
        smtp_username="sender@gmail.com",
        smtp_app_password="app-password",
        email_from="MCS07 Dashboard <sender@gmail.com>",
    )

    results = email_notification.send_reminders(
        settings,
        [{"user_id": 7, "full_name": "A. Lecturer", "email": "a@monash.edu"}],
        "Action required",
        "Please complete the semester setup.",
    )

    assert results[0]["status"] == "sent"
    assert len(FakeSmtp.sent) == 1
    assert FakeSmtp.sent[0]["To"] == "a@monash.edu"
    assert "not an official Monash" in FakeSmtp.sent[0].get_content()
