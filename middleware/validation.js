const { body, param, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

const registerValidation = [
  body('email').isEmail().withMessage('Please provide a valid email address.').normalizeEmail().isLength({ max: 255 }).withMessage('Email must be less than 255 characters.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.').matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.').matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter.').matches(/[0-9]/).withMessage('Password must contain at least one number.').matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character.'),
  body('firstName').optional({ checkFalsy: true }).trim().isLength({ min: 1, max: 50 }).withMessage('First name must be between 1 and 50 characters.').matches(/^[a-zA-Z\s'-]+$/).withMessage('First name contains invalid characters.'),
  body('lastName').optional({ checkFalsy: true }).trim().isLength({ min: 1, max: 50 }).withMessage('Last name must be between 1 and 50 characters.').matches(/^[a-zA-Z\s'-]+$/).withMessage('Last name contains invalid characters.'),
  handleValidationErrors
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
  handleValidationErrors
];

const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
  handleValidationErrors
];

const resetPasswordValidation = [
  param('token').isLength({ min: 32 }).withMessage('Invalid reset token.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.').matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.').matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter.').matches(/[0-9]/).withMessage('Password must contain at least one number.').matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character.'),
  body('confirmPassword').custom((value, { req }) => { if (value !== req.body.password) throw new Error('Passwords do not match.'); return true; }),
  handleValidationErrors
];

const updateProfileValidation = [
  body('firstName').optional({ checkFalsy: true }).trim().isLength({ min: 1, max: 50 }).withMessage('First name must be between 1 and 50 characters.'),
  body('lastName').optional({ checkFalsy: true }).trim().isLength({ min: 1, max: 50 }).withMessage('Last name must be between 1 and 50 characters.'),
  body('displayName').optional({ checkFalsy: true }).trim().isLength({ min: 1, max: 50 }).withMessage('Display name must be between 1 and 50 characters.'),
  body('bio').optional({ checkFalsy: true }).trim().isLength({ max: 500 }).withMessage('Bio must be less than 500 characters.'),
  body('phone').optional({ checkFalsy: true }).trim().matches(/^\+?[1-9]\d{1,14}$/).withMessage('Please provide a valid phone number.'),
  body('website').optional({ checkFalsy: true }).trim().isURL().withMessage('Please provide a valid URL.'),
  handleValidationErrors
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required.'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long.').matches(/[A-Z]/).withMessage('New password must contain at least one uppercase letter.').matches(/[a-z]/).withMessage('New password must contain at least one lowercase letter.').matches(/[0-9]/).withMessage('New password must contain at least one number.').matches(/[^A-Za-z0-9]/).withMessage('New password must contain at least one special character.'),
  body('confirmNewPassword').custom((value, { req }) => { if (value !== req.body.newPassword) throw new Error('Passwords do not match.'); return true; }),
  handleValidationErrors
];

const changeEmailValidation = [
  body('newEmail').isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required for verification.'),
  handleValidationErrors
];

module.exports = {
  registerValidation, loginValidation, forgotPasswordValidation, resetPasswordValidation,
  updateProfileValidation, changePasswordValidation, changeEmailValidation, handleValidationErrors
};
