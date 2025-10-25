const bcrypt = require('bcryptjs');
const adminUserRepository = require('../repositories/AdminUserRepository');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');

class OnboardingService {
  constructor(logger) {
    this.logger = logger;
  }

  async verifyOnboardingToken(token) {
    if (!token) {
      throw new ValidationError('Token is required');
    }

    const user = await adminUserRepository.findByOnboardingToken(token, new Date());
    
    if (!user) {
      return { valid: false };
    }

    return {
      valid: true,
      user: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    };
  }

  async completeOnboarding(token, password) {
    if (!token || !password) {
      throw new ValidationError('Token and password are required');
    }

    const user = await adminUserRepository.findByOnboardingToken(token, new Date());
    
    if (!user) {
      throw new NotFoundError('Invalid or expired onboarding token');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await adminUserRepository.update(user.id, {
      passwordHash,
      isActive: true,
      onboardingToken: null,
      onboardingTokenExpiry: null
    });

    this.logger.info({ userId: user.id, email: user.email }, 'User onboarding completed');

    return {
      success: true,
      message: 'Password set successfully. You can now log in.'
    };
  }
}

module.exports = OnboardingService;
