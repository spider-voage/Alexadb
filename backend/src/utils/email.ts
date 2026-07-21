import nodemailer from 'nodemailer';
import { logger } from '../config/logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    await transporter.sendMail({
      from: `"AlexaDB" <${process.env.SMTP_FROM || 'noreply@alexadb.com'}>`,
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    logger.error('Email sending failed:', error);
    throw error;
  }
};

export const sendVerificationEmail = async (to: string, token: string) => {
  const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  await sendEmail(
    to,
    'Verify your AlexaDB account',
    `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563EB;">Welcome to AlexaDB!</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${url}" style="display: inline-block; padding: 12px 24px; background: #2563EB; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">Verify Email</a>
      <p>Or copy and paste this URL: ${url}</p>
      <p style="color: #666; font-size: 12px;">This link expires in 24 hours.</p>
    </div>`
  );
};

export const sendPasswordResetEmail = async (to: string, token: string) => {
  const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  await sendEmail(
    to,
    'Reset your AlexaDB password',
    `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563EB;">Password Reset</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${url}" style="display: inline-block; padding: 12px 24px; background: #2563EB; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">Reset Password</a>
      <p>Or copy and paste this URL: ${url}</p>
      <p style="color: #666; font-size: 12px;">This link expires in 1 hour.</p>
    </div>`
  );
};

export const send2FAEmail = async (to: string, code: string) => {
  await sendEmail(
    to,
    'Your AlexaDB 2FA Code',
    `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563EB;">Two-Factor Authentication</h2>
      <p>Your verification code is:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px; background: #f3f4f6; border-radius: 8px; text-align: center; margin: 16px 0;">${code}</div>
      <p style="color: #666; font-size: 12px;">This code expires in 10 minutes.</p>
    </div>`
  );
};
