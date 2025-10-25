const UserRepository = require('../repositories/UserRepository');
const { asyncHandler } = require('../middleware/errorHandler');
const { success, error, serviceUnavailable } = require('../utils/apiResponse');
const { getConfig } = require('../utils/config');

class AzureAuthController {
  constructor(logger, cca) {
    this.logger = logger;
    this.cca = cca;
    this.userRepository = UserRepository;
  }

  getSignInUrl = asyncHandler(async (req, res) => {
    if (!this.cca) {
      return serviceUnavailable(res, 'Azure AD authentication not configured');
    }

    const config = getConfig();
    const authCodeUrlParameters = {
      scopes: ['user.read'],
      redirectUri: `${config.BASE_URL}/auth/redirect`
    };

    try {
      const authUrl = await this.cca.getAuthCodeUrl(authCodeUrlParameters);
      res.redirect(authUrl);
    } catch (err) {
      (req.log || this.logger).error({ err }, 'Error generating Azure AD auth URL');
      return error(res, 'Authentication error', 500);
    }
  });

  handleRedirect = asyncHandler(async (req, res) => {
    if (!this.cca) {
      return serviceUnavailable(res, 'Azure AD authentication not configured');
    }

    const config = getConfig();
    const tokenRequest = {
      code: req.query.code,
      scopes: ['user.read'],
      redirectUri: `${config.BASE_URL}/auth/redirect`
    };

    try {
      const response = await this.cca.acquireTokenByCode(tokenRequest);
      
      const existingUser = await this.userRepository.findByEntraId(response.account.homeAccountId);
      
      if (!existingUser) {
        const newUser = await this.userRepository.create({
          entraId: response.account.homeAccountId,
          email: response.account.username,
          name: response.account.name
        });
        req.session.user = newUser;
        (req.log || this.logger).info({ userId: newUser.id }, 'New Azure AD user created');
      } else {
        req.session.user = existingUser;
        (req.log || this.logger).info({ userId: existingUser.id }, 'Azure AD user logged in');
      }
      
      res.redirect('/');
    } catch (err) {
      (req.log || this.logger).error({ err }, 'Azure AD authentication error');
      return error(res, 'Authentication failed', 500);
    }
  });

  handleSignOut = asyncHandler(async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        (req.log || this.logger).error({ err }, 'Session destruction error during sign out');
      }
      res.redirect('/');
    });
  });

  getAuthStatus = asyncHandler(async (req, res) => {
    if (req.session.user) {
      return success(res, {
        authenticated: true,
        user: {
          email: req.session.user.email,
          name: req.session.user.name
        }
      });
    } else {
      return success(res, { authenticated: false });
    }
  });
}

module.exports = AzureAuthController;
