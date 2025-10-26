const { doubleCsrf } = require('csrf-csrf');
const { getConfig } = require('../utils/config');

const config = getConfig();

const csrfFunctions = doubleCsrf({
  getSecret: () => config.SESSION_SECRET,
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: config.isProduction,
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req) => {
    return req.headers['x-csrf-token'] || req.body?._csrf;
  },
});

const csrfTokenEndpoint = (req, res) => {
  const token = csrfFunctions.generateCsrfToken(req, res);
  res.set('Cache-Control', 'no-store');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.json({
    success: true,
    data: { csrfToken: token }
  });
};

module.exports = {
  csrfProtection: csrfFunctions.doubleCsrfProtection,
  generateCsrfToken: csrfFunctions.generateCsrfToken,
  csrfTokenEndpoint
};
