import logging
from datetime import datetime

# Configure a simple logger for notifications
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("notifications")

def send_sms_alert(phone_number: str, message: str):
    """
    Mock function to send an SMS alert.
    In a real-world scenario, this would integrate with Twilio or AWS SNS.
    """
    logger.warning(f"[{datetime.utcnow().isoformat()}] [MOCK SMS to {phone_number}]: {message}")

def send_email_alert(email_address: str, subject: str, message: str):
    """
    Mock function to send an email alert.
    In a real-world scenario, this would integrate with SendGrid, Mailgun, or SMTP.
    """
    logger.warning(f"[{datetime.utcnow().isoformat()}] [MOCK EMAIL to {email_address}] Subject: {subject} | Body: {message}")

def trigger_emergency_notifications(extinguisher_id: str, location: str, issue: str):
    """
    Convenience function to trigger all emergency notifications for a specific incident.
    """
    message = f"EMERGENCY: Fire Extinguisher {extinguisher_id} at {location} reported issue: {issue}. Please check immediately!"
    
    # Example contacts (in reality, these would be fetched from the DB based on role/building)
    safety_officer_phone = "+1234567890"
    admin_email = "admin@firetwin.edu"
    
    send_sms_alert(safety_officer_phone, message)
    send_email_alert(admin_email, "Fire Extinguisher Emergency Alert", message)
