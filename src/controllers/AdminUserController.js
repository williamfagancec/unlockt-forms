const { body } = require('express-validator');
const UserManagementService = require('../services/UserManagementService');
const { asyncHandler } = require('../middleware/errorHandler');
const { sendResetEmail } = require('../services/PasswordResetService');

class AdminUserController {
  constructor(logger) {
    this.userService = new UserManagementService(logger);
    this.logger = logger;
  }

  getAll = asyncHandler(async (req, res) => {
    const users = await this.userService.getAllUsers();
    res.json(users);
  });

  create = asyncHandler(async (req, res) => {
    const { firstName, lastName, email, role, shouldSendEmail } = req.body;
    
    const result = await this.userService.createUser({
      firstName,
      lastName,
      email,
      role
    });

    if (shouldSendEmail) {
      const fullOnboardingUrl = `${req.protocol}://${req.get('host')}${result.onboardingUrl}`;
      await sendResetEmail(email, fullOnboardingUrl, true);
      (req.log || this.logger).info({ email }, 'Onboarding email sent');
    }

    res.status(201).json({
      success: true,
      user: result.user,
      onboardingUrl: result.onboardingUrl
    });
  });

  update = asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.id);
    const { firstName, lastName, email, role } = req.body;

    const updatedUser = await this.userService.updateUser(userId, {
      firstName,
      lastName,
      email,
      role
    });

    res.json({
      success: true,
      user: updatedUser
    });
  });

  toggleStatus = asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.id);
    const result = await this.userService.toggleUserStatus(userId);
    res.json({ success: true, ...result });
  });

  setStatus = asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.id);
    const { isActive, shouldUnfreeze } = req.body;

    const updatedUser = await this.userService.setUserStatus(userId, isActive, shouldUnfreeze);

    res.json({
      success: true,
      user: updatedUser
    });
  });

  unfreeze = asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.id);
    await this.userService.unfreezeUser(userId);
    res.json({ success: true, message: 'User account unfrozen successfully' });
  });

  static createValidation = [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('role').isIn(['administrator', 'user']).withMessage('Invalid role'),
    body('shouldSendEmail').optional().isBoolean()
  ];

  static updateValidation = [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('role').isIn(['administrator', 'user']).withMessage('Invalid role')
  ];

  static setStatusValidation = [
    body('isActive').isBoolean().withMessage('isActive must be a boolean'),
    body('shouldUnfreeze').optional().isBoolean()
  ];
}

module.exports = AdminUserController;
