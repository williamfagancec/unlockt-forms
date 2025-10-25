const { body } = require('express-validator');
const { createResetToken, validateResetToken, consumeResetToken, sendResetEmail } = require('../services/PasswordResetService');
const adminUserRepository = require('../repositories/AdminUserRepository');
const bcrypt = require('bcryptjs');
const { asyncHandler } = require('../middleware/errorHandler');
const { success, error, notFound } = require('../utils/apiResponse');
const { getConfig } = require('../utils/config');

class PasswordResetController {
  constructor(logger) {
    this.logger = logger;
  }

  requestReset = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await adminUserRepository.findByEmail(email);
    
    if (!user) {
      return success(res, null, 'If an account with that email exists, a password reset link has been sent.');
    }

    const config = getConfig();
    const resetToken = await createResetToken(email);
    const resetUrl = `${config.BASE_URL}/admin/reset-password?token=${resetToken}`;
    
    await sendResetEmail(email, resetUrl, false);

    (req.log || this.logger).info({ userId: user.id }, 'Password reset email sent');

    return success(res, null, 'If an account with that email exists, a password reset link has been sent.');
  });

  validateToken = asyncHandler(async (req, res) => {
    const { token } = req.query;
    
    if (!token) {
      return error(res, 'Token is required', 400);
    }

    const validation = await validateResetToken(token);
    
    if (!validation.valid) {
      return success(res, { valid: false, error: validation.error });
    }

    return success(res, { valid: true, email: validation.email });
  });

  resetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    const result = await consumeResetToken(token);
    
    if (!result.valid) {
      return error(res, result.error || 'Invalid or expired token', 400);
    }

    const user = await adminUserRepository.findByEmail(result.email);
    
    if (!user) {
      return notFound(res, 'User');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await adminUserRepository.update(user.id, { passwordHash });

    (req.log || this.logger).info({ userId: user.id }, 'Password reset completed');

    return success(res, null, 'Password has been reset successfully');
  });

  static requestResetValidation = [
    body('email').isEmail().withMessage('Valid email is required')
  ];

  static resetPasswordValidation = [
    body('token').notEmpty().withMessage('Token is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/)
      .withMessage('Password must contain at least one lowercase letter')
      .matches(/[0-9]/)
      .withMessage('Password must contain at least one number')
  ];
}

module.exports = PasswordResetController;
