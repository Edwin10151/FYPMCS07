from email.message import EmailMessage
import smtplib

from app.config import Settings


DISCLAIMER = (
    "This message was sent by the MCS07 final-year project prototype and is not "
    "an official Monash University communication."
)


def send_reminders(
    settings: Settings,
    recipients: list[dict],
    subject: str,
    body: str,
) -> list[dict]:
    if not settings.email_configured:
        raise RuntimeError("Email delivery is not configured")

    results: list[dict] = []
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as smtp:
            smtp.starttls()
            smtp.login(settings.smtp_username, settings.smtp_app_password)
            for recipient in recipients:
                message = EmailMessage()
                message["From"] = settings.email_from
                message["To"] = recipient["email"]
                message["Subject"] = subject
                message.set_content(
                    f"Hello {recipient['full_name']},\n\n{body.strip()}\n\n{DISCLAIMER}\n"
                )
                try:
                    smtp.send_message(message)
                    results.append({**recipient, "status": "sent", "error": None})
                except (OSError, smtplib.SMTPException) as exc:
                    results.append({**recipient, "status": "failed", "error": str(exc)[:500]})
    except (OSError, smtplib.SMTPException) as exc:
        raise RuntimeError("The email service could not connect or authenticate") from exc
    return results
