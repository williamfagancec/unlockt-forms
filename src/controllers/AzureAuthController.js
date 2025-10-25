const UserRepository = require('../repositories/UserRepository');
const { asyncHandler } = require('../middleware/errorHandler');

class AzureAuthController {
  constructor(logger, cca) {
    this.logger = logger;
    this.cca = cca;
    this.userRepository = UserRepository;
  }

  getSignInUrl = asyncHandler(async (req, res) => {
    if (!this.cca) {
      return res.status(503).json({ error: 'Azure AD authentication not configured' });
    }

    const authCodeUrlParameters = {
      scopes: ['user.read'],
      redirectUri: `${req.protocol}://${req.get('host')}/auth/redirect`
    };

    try {
      const authUrl = await this.cca.getAuthCodeUrl(authCodeUrlParameters);
      res.redirect(authUrl);
    } catch (error) {
      (req.log || this.logger).error({ err: error }, 'Error generating Azure AD auth URL');
      res.status(500).json({ error: 'Authentication error' });
    }
  });

  handleRedirect = asyncHandler(async (req, res) => {
    if (!this.cca) {
      return res.status(503).json({ error: 'Azure AD authentication not configured' });
    }

    const tokenRequest = {
      code: req.query.code,
      scopes: ['user.read'],
      redirectUri: `${req.protocol}://${req.get('host')}/auth/redirect`
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
        (req.log || this.logger).info({ userId: newUser.id, email: newUser.email }, 'New Azure AD user created');
      } else {
        req.session.user = existingUser;
        (req.log || this.logger).info({ userId: existingUser.id, email: existingUser.email }, 'Azure AD user logged in');
      }
      
      res.redirect('/');
    } catch (error) {
      (req.log || this.logger).error({ err: error }, 'Azure AD authentication error');
      res.status(500).send('Authentication failed');
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
      res.json({
        authenticated: true,
        user: {
          email: req.session.user.email,
          name: req.session.user.name
        }
      });
    } else {
      res.json({ authenticated: false });
    }
  });
}

module.exports = AzureAuthController;
