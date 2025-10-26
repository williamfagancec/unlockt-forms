const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const adminUserRepository = require('../repositories/AdminUserRepository');
const { ValidationError, ConflictError, NotFoundError } = require('../middleware/errorHandler');

class UserManagementService {
  constructor(logger) {
    this.logger = logger;
  }

  async getAllUsers() {
    return await adminUserRepository.findAll();
  }

  async createUser(userData) {
    const { firstName, lastName, email, role } = userData;

    const existingEmail = await adminUserRepository.findByEmail(email);
    
    if (existingEmail) {
      throw new ConflictError('Email already exists');
    }

    const onboardingToken = crypto.randomBytes(32).toString('hex');
    const onboardingTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const newUser = await adminUserRepository.create({
      firstName,
      lastName,
      email,
      role,
      passwordHash: null,
      onboardingToken,
      onboardingTokenExpiry,
      isActive: false,
      isFrozen: false,
      failedLoginAttempts: 0
    });

    this.logger.info({ userId: newUser.id }, 'New admin user created');

    return {
      user: newUser,
      onboardingUrl: `/setup-password?token=${onboardingToken}`
    };
  }

  async updateUser(userId, updates) {
    const { firstName, lastName, email, role } = updates;

    const existingUser = await adminUserRepository.findById(userId);
    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    if (email && email !== existingUser.email) {
      const emailExists = await adminUserRepository.emailExistsExcludingUser(email, userId);
      if (emailExists) {
        throw new ConflictError('Email already in use');
      }
    }

    await adminUserRepository.update(userId, {
      firstName,
      lastName,
      email,
      role
    });

    const updatedUser = await adminUserRepository.findById(userId);
    this.logger.info({ userId }, 'Admin user updated');

    return updatedUser;
  }

  async toggleUserStatus(userId) {
    const user = await adminUserRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const newStatus = !user.isActive;
    await adminUserRepository.setActive(userId, newStatus);

    this.logger.info({ userId, newStatus }, 'User status toggled');

    return { isActive: newStatus };
  }

  async setUserStatus(userId, isActive, shouldUnfreeze) {
    const user = await adminUserRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (isActive && shouldUnfreeze && user.isFrozen) {
      await adminUserRepository.unfreezeAccount(userId);
      await adminUserRepository.setActive(userId, true);
      this.logger.info({ userId }, 'User account unfrozen and activated');
    } else if (isActive) {
      await adminUserRepository.setActive(userId, true);
      this.logger.info({ userId }, 'User activated');
    } else {
      await adminUserRepository.setActive(userId, false);
      this.logger.info({ userId }, 'User deactivated');
    }

    const updatedUser = await adminUserRepository.findById(userId);
    return updatedUser;
  }

  async unfreezeUser(userId) {
    const user = await adminUserRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await adminUserRepository.unfreezeAccount(userId);
    this.logger.info({ userId }, 'User account unfrozen');

    return { success: true };
  }

  async getStatistics(submissions) {
    const totalSubmissions = submissions.length;
    const last30Days = submissions.filter(s => 
      new Date(s.submittedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;
    const last7Days = submissions.filter(s => 
      new Date(s.submittedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;

    return {
      totalSubmissions,
      last30Days,
      last7Days
    };
  }
}

module.exports = UserManagementService;
