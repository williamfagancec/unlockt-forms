const { body } = require('express-validator');
const OnboardingService = require('../services/OnboardingService');
const { asyncHandler } = require('../middleware/errorHandler');
const { success } = require('../utils/apiResponse');

class OnboardingController {
  constructor(logger) {
    this.onboardingService = new OnboardingService(logger);
    this.logger = logger;
  }

  verifyToken = asyncHandler(async (req, res) => {
    const { token } = req.query;
    const result = await this.onboardingService.verifyOnboardingToken(token);
    return success(res, result);
  });

  completeOnboarding = asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    const result = await this.onboardingService.completeOnboarding(token, password);
    return success(res, result, 'Onboarding completed successfully');
  });

  static completeOnboardingValidation = [
    body('token').notEmpty().withMessage('Token is required'),
    body('password')
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

module.exports = OnboardingController;
