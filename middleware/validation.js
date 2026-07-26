const { body, param, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed.', errors: errors.array().map(e => ({ field: e.path, message: e.msg })) });
  next();
};

const registerValidation = [
  body('email').isEmail().withMessage('Valid email required.').normalizeEmail().isLength({ max: 255 }),
  body('password').isLength({ min: 8 }).withMessage('Min 8 chars.').matches(/[A-Z]/).withMessage('Need uppercase.').matches(/[a-z]/).withMessage('Need lowercase.').matches(/[0-9]/).withMessage('Need number.').matches(/[^A-Za-z0-9]/).withMessage('Need special char.'),
  body('firstName').optional().trim().isLength({ min: 1, max: 50 }).matches(/^[a-zA-Z\s'-]+$/),
  body('lastName').optional().trim().isLength({ min: 1, max: 50 }).matches(/^[a-zA-Z\s'-]+$/),
  handleValidationErrors
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email required.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password required.'),
  handleValidationErrors
];

const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Valid email required.').normalizeEmail(),
  handleValidationErrors
];

const resetPasswordValidation = [
  param('token').isLength({ min: 32 }).withMessage('Invalid token.'),
  body('password').isLength({ min: 8 }).withMessage('Min 8 chars.').matches(/[A-Z]/).matches(/[a-z]/).matches(/[0-9]/).matches(/[^A-Za-z0-9]/),
  body('confirmPassword').custom((value, { req }) => { if (value !== req.body.password) throw new Error('Passwords do not match.'); return true; }),
  handleValidationErrors
];

const updateProfileValidation = [
  body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
  body('displayName').optional().trim().isLength({ min: 1, max: 50 }),
  body('bio').optional().trim().isLength({ max: 500 }),
  body('phone').optional().trim().matches(/^\+?[1-9]\d{1,14}$/),
  body('website').optional().trim().isURL(),
  handleValidationErrors
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password required.'),
  body('newPassword').isLength({ min: 8 }).withMessage('Min 8 chars.').matches(/[A-Z]/).matches(/[a-z]/).matches(/[0-9]/).matches(/[^A-Za-z0-9]/),
  body('confirmNewPassword').custom((value, { req }) => { if (value !== req.body.newPassword) throw new Error('Passwords do not match.'); return true; }),
  handleValidationErrors
];

const changeEmailValidation = [
  body('newEmail').isEmail().withMessage('Valid email required.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password required for verification.'),
  handleValidationErrors
];

module.exports = { registerValidation, loginValidation, forgotPasswordValidation, resetPasswordValidation, updateProfileValidation, changePasswordValidation, changeEmailValidation, handleValidationErrors };
