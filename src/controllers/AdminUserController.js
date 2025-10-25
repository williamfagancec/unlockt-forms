const { body } = require('express-validator');
const UserManagementService = require('../services/UserManagementService');
const { asyncHandler } = require('../middleware/errorHandler');
const { sendResetEmail } = require('../services/PasswordResetService');
const { success, created, error } = require('../utils/apiResponse');

class AdminUserController {
  constructor(logger) {
    this.userService = new UserManagementService(logger);
    this.logger = logger;
  }

  getAll = asyncHandler(async (req, res) => {
    const users = await this.userService.getAllUsers();
    return success(res, users);
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

    return created(res, {
      user: result.user,
      onboardingUrl: result.onboardingUrl
    }, 'User created successfully');
  });

  update = asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    
    if (!Number.isInteger(userId) || userId <= 0) {
      return error(res, 'Invalid user ID', 400);
    }
    
    const { firstName, lastName, email, role } = req.body;

    const updatedUser = await this.userService.updateUser(userId, {
      firstName,
      lastName,
      email,
      role
    });

    return success(res, { user: updatedUser }, 'User updated successfully');
  });

  toggleStatus = asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    
    if (!Number.isInteger(userId) || userId <= 0) {
      return error(res, 'Invalid user ID', 400);
    }
    
    const result = await this.userService.toggleUserStatus(userId);
    return success(res, result, 'User status toggled successfully');
  });

  setStatus = asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    
    if (!Number.isInteger(userId) || userId <= 0) {
      return error(res, 'Invalid user ID', 400);
    }
    
    const { isActive, shouldUnfreeze } = req.body;

    const updatedUser = await this.userService.setUserStatus(userId, isActive, shouldUnfreeze);

    return success(res, { user: updatedUser }, 'User status updated successfully');
  });

  unfreeze = asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    
    if (!Number.isInteger(userId) || userId <= 0) {
      return error(res, 'Invalid user ID', 400);
    }
    
    await this.userService.unfreezeUser(userId);
    return success(res, null, 'User account unfrozen successfully');
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
