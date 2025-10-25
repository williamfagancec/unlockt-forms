const { body } = require('express-validator');
const { createResetToken, validateResetToken, consumeResetToken, sendResetEmail } = require('../services/PasswordResetService');
const adminUserRepository = require('../repositories/AdminUserRepository');
const bcrypt = require('bcryptjs');
const { asyncHandler } = require('../middleware/errorHandler');

class PasswordResetController {
  constructor(logger) {
    this.logger = logger;
  }

  requestReset = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await adminUserRepository.findByEmail(email);
    
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    const resetToken = await createResetToken(email);
    const resetUrl = `${req.protocol}://${req.get('host')}/admin/reset-password?token=${resetToken}`;
    
    await sendResetEmail(email, resetUrl, false);

    (req.log || this.logger).info({ email }, 'Password reset email sent');

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  });

  validateToken = asyncHandler(async (req, res) => {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({
        valid: false,
        error: 'Token is required'
      });
    }

    const validation = await validateResetToken(token);
    
    if (!validation.valid) {
      return res.json({
        valid: false,
        error: validation.error
      });
    }

    res.json({ valid: true, email: validation.email });
  });

  resetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    const result = await consumeResetToken(token);
    
    if (!result.valid) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Invalid or expired token'
      });
    }

    const user = await adminUserRepository.findByEmail(result.email);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await adminUserRepository.update(user.id, { passwordHash });

    (req.log || this.logger).info({ userId: user.id, email: user.email }, 'Password reset completed');

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });
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
