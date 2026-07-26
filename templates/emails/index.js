const { baseTemplate } = require('./base');
const getRegistrationEmail = ({ firstName, otp }) => baseTemplate('Your Verification Code', `<h2>Welcome, ${firstName}!</h2><p>Your verification code:</p><div class="code">${otp}</div><p>Expires in 10 minutes.</p>`);
const getPasswordResetEmail = ({ firstName, resetUrl }) => baseTemplate('Reset Password', `<h2>Hi ${firstName},</h2><p>Reset your password:</p><a href="${resetUrl}" class="btn">Reset Password</a><p>${resetUrl}</p><p>Expires in 1 hour.</p>`);
const getMagicLoginEmail = ({ firstName, magicUrl }) => baseTemplate('Magic Login', `<h2>Hi ${firstName},</h2><p>Click to log in:</p><a href="${magicUrl}" class="btn">Log In</a><p>${magicUrl}</p><p>Expires in 15 minutes.</p>`);
const getWelcomeEmail = ({ firstName, verificationUrl }) => baseTemplate('Welcome', `<h2>Welcome, ${firstName}!</h2><p>Verify your email:</p><a href="${verificationUrl}" class="btn">Verify Email</a>`);
const getPasswordChangedEmail = ({ firstName }) => baseTemplate('Password Changed', `<h2>Hi ${firstName},</h2><p>Your password was changed.</p>`);
const getEmailChangedEmail = ({ firstName, newEmail }) => baseTemplate('Email Changed', `<h2>Hi ${firstName},</h2><p>Your email changed to ${newEmail}.</p>`);
module.exports = { getRegistrationEmail, getPasswordResetEmail, getMagicLoginEmail, getWelcomeEmail, getPasswordChangedEmail, getEmailChangedEmail };
