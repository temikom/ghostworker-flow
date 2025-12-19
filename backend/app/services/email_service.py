"""
Email service for sending transactional emails.
"""
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from app.core.config import settings


class EmailService:
    """Email service for sending transactional emails."""
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send an email."""
        if not settings.SMTP_HOST:
            print(f"[EMAIL] Would send to {to_email}: {subject}")
            return True
        
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
            msg["To"] = to_email
            
            if text_content:
                msg.attach(MIMEText(text_content, "plain"))
            msg.attach(MIMEText(html_content, "html"))
            
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(
                    settings.SMTP_FROM_EMAIL,
                    to_email,
                    msg.as_string()
                )
            
            return True
        except Exception as e:
            print(f"[EMAIL ERROR] Failed to send email to {to_email}: {e}")
            return False
    
    async def send_verification_email(
        self,
        to_email: str,
        user_name: str,
        verification_token: str
    ) -> bool:
        """Send email verification email."""
        verification_url = (
            f"{settings.FRONTEND_URL}/verify-email?token={verification_token}"
        )
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1a1a2e; margin: 0;">GhostWorker</h1>
            </div>
            
            <h2 style="color: #1a1a2e;">Verify your email address</h2>
            
            <p>Hi {user_name},</p>
            
            <p>Thanks for signing up for GhostWorker! Please verify your email address by clicking the button below.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{verification_url}" style="background-color: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Verify Email Address</a>
            </div>
            
            <p style="color: #666; font-size: 14px;">This link will expire in {settings.EMAIL_VERIFICATION_EXPIRE_MINUTES} minutes.</p>
            
            <p style="color: #666; font-size: 14px;">If you didn't create an account with GhostWorker, you can safely ignore this email.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
                © GhostWorker. All rights reserved.<br>
                If you're having trouble clicking the button, copy and paste this URL into your browser:<br>
                <a href="{verification_url}" style="color: #6366f1;">{verification_url}</a>
            </p>
        </body>
        </html>
        """
        
        return await self.send_email(
            to_email=to_email,
            subject="Verify your GhostWorker account",
            html_content=html_content
        )
    
    async def send_password_reset_email(
        self,
        to_email: str,
        user_name: str,
        reset_token: str
    ) -> bool:
        """Send password reset email."""
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1a1a2e; margin: 0;">GhostWorker</h1>
            </div>
            
            <h2 style="color: #1a1a2e;">Reset your password</h2>
            
            <p>Hi {user_name},</p>
            
            <p>We received a request to reset your password. Click the button below to create a new password.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}" style="background-color: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Reset Password</a>
            </div>
            
            <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
            
            <p style="color: #666; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
                © GhostWorker. All rights reserved.
            </p>
        </body>
        </html>
        """
        
        return await self.send_email(
            to_email=to_email,
            subject="Reset your GhostWorker password",
            html_content=html_content
        )
    
    async def send_security_alert(
        self,
        to_email: str,
        user_name: str,
        event_type: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> bool:
        """Send security alert email."""
        event_messages = {
            "new_login": "New login to your account",
            "new_device": "Login from a new device",
            "password_changed": "Your password was changed",
            "account_locked": "Your account has been temporarily locked",
        }
        
        event_message = event_messages.get(event_type, "Security alert")
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1a1a2e; margin: 0;">GhostWorker</h1>
            </div>
            
            <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <h2 style="color: #92400e; margin: 0 0 10px 0;">🔐 Security Alert</h2>
                <p style="margin: 0; color: #92400e;">{event_message}</p>
            </div>
            
            <p>Hi {user_name},</p>
            
            <p>We detected the following activity on your account:</p>
            
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0;"><strong>Event:</strong> {event_message}</p>
                {f'<p style="margin: 0 0 8px 0;"><strong>IP Address:</strong> {ip_address}</p>' if ip_address else ''}
                {f'<p style="margin: 0;"><strong>Device:</strong> {user_agent[:100]}...</p>' if user_agent else ''}
            </div>
            
            <p>If this was you, no action is needed. If you didn't perform this action, please secure your account immediately by changing your password.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
                © GhostWorker. All rights reserved.
            </p>
        </body>
        </html>
        """
        
        return await self.send_email(
            to_email=to_email,
            subject=f"Security Alert: {event_message}",
            html_content=html_content
        )


email_service = EmailService()
