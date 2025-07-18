import os
import requests
from datetime import datetime
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.api_key = os.getenv("ELASTIC_EMAIL_API_KEY")
        self.from_email = os.getenv("EMAIL_FROM", "noreply@aistockselect.com")
        self.from_name = os.getenv("EMAIL_FROM_NAME", "AI股票分析")
        self.api_url = "https://api.elasticemail.com/v2/email/send"
        
        if not self.api_key:
            logger.warning("Elastic Email API key not set. Email sending will not work.")
    
    async def send_verification_email(self, to_email: str, verification_code: str) -> bool:
        """Send verification code email to user."""
        if not self.api_key:
            # For development, just log the code
            logger.info(f"Verification code for {to_email}: {verification_code}")
            return True
            
        subject = "AI股票分析 - 邮箱验证码"
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>AI股票分析 - 邮箱验证</h2>
            <p>您好，</p>
            <p>您的验证码是: <strong style="font-size: 18px;">{verification_code}</strong></p>
            <p>此验证码将在1分钟后过期。</p>
            <p>如果您没有请求此验证码，请忽略此邮件。</p>
            <p>谢谢！</p>
            <p>AI股票分析团队</p>
        </div>
        """
        
        return await self.send_email(to_email, subject, html_content)
    
    async def send_welcome_email(self, to_email: str) -> bool:
        """Send welcome email to new user."""
        if not self.api_key:
            logger.info(f"Welcome email would be sent to {to_email}")
            return True
            
        subject = "欢迎加入AI股票分析"
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>欢迎加入AI股票分析！</h2>
            <p>您好，</p>
            <p>感谢您注册AI股票分析。我们很高兴您加入我们的社区！</p>
            <p>您现在可以登录并开始使用我们的服务。</p>
            <p>如有任何问题，请随时联系我们。</p>
            <p>祝您投资顺利！</p>
            <p>AI股票分析团队</p>
        </div>
        """
        
        return await self.send_email(to_email, subject, html_content)
    
    async def send_password_reset_email(self, to_email: str, verification_code: str) -> bool:
        """Send password reset code email to user."""
        if not self.api_key:
            # For development, just log the code
            logger.info(f"Password reset code for {to_email}: {verification_code}")
            return True
            
        subject = "AI股票分析 - 密码重置验证码"
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>AI股票分析 - 密码重置</h2>
            <p>您好，</p>
            <p>您请求重置密码。您的验证码是: <strong style="font-size: 18px; color: #e74c3c;">{verification_code}</strong></p>
            <p>此验证码将在10分钟后过期。</p>
            <p>如果您没有请求重置密码，请忽略此邮件。您的账户仍然安全。</p>
            <p>为了保护您的账户安全，请不要将此验证码分享给任何人。</p>
            <p>谢谢！</p>
            <p>AI股票分析团队</p>
        </div>
        """
        
        return await self.send_email(to_email, subject, html_content)
    
    async def send_admin_notification_email(self, new_user_email: str) -> bool:
        """Send notification email to admin when a new user registers."""
        admin_email = "1014346275@qq.com"
        
        if not self.api_key:
            logger.info(f"Admin notification email would be sent to {admin_email} about new user: {new_user_email}")
            return True
            
        subject = "AI股票分析 - 新用户注册通知"
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>AI股票分析 - 新用户注册通知</h2>
            <p>您好，管理员，</p>
            <p>有新用户注册了AI股票分析平台：</p>
            <p><strong>注册邮箱：</strong> {new_user_email}</p>
            <p><strong>注册时间：</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            <p>请及时关注新用户的使用情况。</p>
            <p>AI股票分析系统</p>
        </div>
        """
        
        return await self.send_email(admin_email, subject, html_content)
    
    async def send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        """Send email using Elastic Email API."""
        if not self.api_key:
            logger.info(f"Email would be sent to {to_email} with subject: {subject}")
            return True
            
        try:
            data = {
                'apikey': self.api_key,
                'from': self.from_email,
                'fromName': self.from_name,
                'to': to_email,
                'subject': subject,
                'bodyHtml': html_content,
                'isTransactional': True
            }
            
            response = requests.post(self.api_url, data=data)
            
            if response.status_code == 200 and response.json().get('success', False):
                logger.info(f"Email sent successfully to {to_email}")
                return True
            else:
                logger.error(f"Failed to send email: {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending email: {str(e)}")
            return False