const express = require('express');
const PasswordResetController = require('../controllers/PasswordResetController');
const OnboardingController = require('../controllers/OnboardingController');
const AzureAuthController = require('../controllers/AzureAuthController');
const { loginValidation, handleLogin, handleCheckSession, handleLogout, changePasswordValidation, handleChangePassword, adminAuthMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const { csrfProtection } = require('../middleware/csrf');

function createAuthRoutes(logger, cca) {
  const router = express.Router();
  
  const passwordResetController = new PasswordResetController(logger);
  const onboardingController = new OnboardingController(logger);
  const azureAuthController = new AzureAuthController(logger, cca);

  router.post('/admin/login', authLimiter, csrfProtection, loginValidation, validate, handleLogin);
  router.get('/admin/check-session', handleCheckSession);
  router.post('/admin/logout', csrfProtection, handleLogout);
  router.post('/admin/change-password', adminAuthMiddleware, csrfProtection, changePasswordValidation, validate, handleChangePassword);

  router.post('/admin/forgot-password', passwordResetLimiter, csrfProtection, PasswordResetController.requestResetValidation, validate, passwordResetController.requestReset);
  router.get('/admin/validate-reset-token', passwordResetLimiter, passwordResetController.validateToken);
  router.post('/admin/reset-password', passwordResetLimiter, csrfProtection, PasswordResetController.resetPasswordValidation, validate, passwordResetController.resetPassword);

  router.get('/verify-onboarding-token', OnboardingController.verifyTokenValidation, validate, onboardingController.verifyToken);
  router.post('/complete-onboarding', csrfProtection, OnboardingController.completeOnboardingValidation, validate, onboardingController.completeOnboarding);

  if (cca) {
    router.get('/signin', azureAuthController.getSignInUrl);
    router.get('/redirect', azureAuthController.handleRedirect);
    router.get('/signout', azureAuthController.handleSignOut);
    router.get('/status', azureAuthController.getAuthStatus);
  }

  return router;
}

module.exports = createAuthRoutes;
