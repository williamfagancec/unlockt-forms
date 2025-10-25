const express = require('express');
const PasswordResetController = require('../controllers/PasswordResetController');
const OnboardingController = require('../controllers/OnboardingController');
const AzureAuthController = require('../controllers/AzureAuthController');
const { loginValidation, handleLogin, handleCheckSession, handleLogout, changePasswordValidation, handleChangePassword, adminAuthMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

function createAuthRoutes(logger, cca) {
  const router = express.Router();
  
  const passwordResetController = new PasswordResetController(logger);
  const onboardingController = new OnboardingController(logger);
  const azureAuthController = new AzureAuthController(logger, cca);

  router.post('/admin/login', loginValidation, validate, handleLogin);
  router.get('/admin/check-session', handleCheckSession);
  router.post('/admin/logout', handleLogout);
  router.post('/admin/change-password', adminAuthMiddleware, changePasswordValidation, validate, handleChangePassword);

  router.post('/admin/forgot-password', PasswordResetController.requestResetValidation, validate, passwordResetController.requestReset);
  router.get('/admin/validate-reset-token', passwordResetController.validateToken);
  router.post('/admin/reset-password', PasswordResetController.resetPasswordValidation, validate, passwordResetController.resetPassword);

  router.get('/verify-onboarding-token', onboardingController.verifyToken);
  router.post('/complete-onboarding', OnboardingController.completeOnboardingValidation, validate, onboardingController.completeOnboarding);

  if (cca) {
    router.get('/signin', azureAuthController.getSignInUrl);
    router.get('/redirect', azureAuthController.handleRedirect);
    router.get('/signout', azureAuthController.handleSignOut);
    router.get('/status', azureAuthController.getAuthStatus);
  }

  return router;
}

module.exports = createAuthRoutes;
