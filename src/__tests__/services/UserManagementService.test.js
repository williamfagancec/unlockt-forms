jest.mock('../../repositories/AdminUserRepository', () => ({
  findByEmail: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  emailExistsExcludingUser: jest.fn(),
  update: jest.fn(),
  setActive: jest.fn(),
  unfreezeAccount: jest.fn()
}));

const adminUserRepository = require('../../repositories/AdminUserRepository');
const UserManagementService = require('../../services/UserManagementService');
const { ConflictError, NotFoundError } = require('../../middleware/errorHandler');

describe('UserManagementService', () => {
  let service;
  let logger;

  beforeEach(() => {
    logger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
    service = new UserManagementService(logger);
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user and return onboarding URL', async () => {
      adminUserRepository.findByEmail.mockResolvedValue(null);
      adminUserRepository.create.mockResolvedValue({ id: 123, email: 'new@ex.com' });

      const result = await service.createUser({
        firstName: 'A', lastName: 'B', email: 'new@ex.com', role: 'administrator'
      });

      expect(adminUserRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        email: 'new@ex.com',
        isActive: false
      }));
      expect(result.user.id).toBe(123);
      expect(result.onboardingUrl).toMatch(/^\/setup-password\?token=/);
      expect(logger.info).toHaveBeenCalled();
    });

    it('should throw ConflictError when email exists', async () => {
      adminUserRepository.findByEmail.mockResolvedValue({ id: 1 });

      await expect(service.createUser({ email: 'dup@ex.com' }))
        .rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe('updateUser', () => {
    it('should update user details', async () => {
      adminUserRepository.findById.mockResolvedValueOnce({ id: 1, email: 'old@ex.com' }); // existing
      adminUserRepository.emailExistsExcludingUser.mockResolvedValue(false);
      adminUserRepository.update.mockResolvedValue();
      adminUserRepository.findById.mockResolvedValueOnce({ id: 1, email: 'new@ex.com' }); // after update

      const updated = await service.updateUser(1, { email: 'new@ex.com', firstName: 'N' });
      expect(adminUserRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({ email: 'new@ex.com' }));
      expect(updated.email).toBe('new@ex.com');
      expect(logger.info).toHaveBeenCalled();
    });

    it('should throw NotFoundError when user not found', async () => {
      adminUserRepository.findById.mockResolvedValue(null);

      await expect(service.updateUser(999, { email: 'x@ex.com' }))
        .rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw ConflictError when email taken by another user', async () => {
      adminUserRepository.findById.mockResolvedValue({ id: 1, email: 'me@ex.com' });
      adminUserRepository.emailExistsExcludingUser.mockResolvedValue(true);

      await expect(service.updateUser(1, { email: 'other@ex.com' }))
        .rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe('toggleUserStatus', () => {
    it('should toggle isActive and call setActive', async () => {
      adminUserRepository.findById.mockResolvedValue({ id: 2, isActive: true });
      const res = await service.toggleUserStatus(2);
      expect(adminUserRepository.setActive).toHaveBeenCalledWith(2, false);
      expect(res).toEqual({ isActive: false });
    });
  });

  describe('setUserStatus', () => {
    it('should unfreeze and activate when requested', async () => {
      adminUserRepository.findById.mockResolvedValue({ id: 3, isFrozen: true, email: 'x' });
      await service.setUserStatus(3, true, true);
      expect(adminUserRepository.unfreezeAccount).toHaveBeenCalledWith(3);
    });

    it('should deactivate when isActive is false', async () => {
      adminUserRepository.findById.mockResolvedValue({ id: 4, isFrozen: false });
      await service.setUserStatus(4, false, false);
      expect(adminUserRepository.setActive).toHaveBeenCalledWith(4, false);
    });
  });

  describe('unfreezeUser', () => {
    it('should unfreeze existing user', async () => {
      adminUserRepository.findById.mockResolvedValue({ id: 5 });
      const result = await service.unfreezeUser(5);
      expect(adminUserRepository.unfreezeAccount).toHaveBeenCalledWith(5);
      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundError if not found', async () => {
      adminUserRepository.findById.mockResolvedValue(null);
      await expect(service.unfreezeUser(999)).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});