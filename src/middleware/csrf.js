const { doubleCsrf } = require('csrf-csrf');
const { getConfig } = require('../utils/config');

const config = getConfig();

const {
  generateToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => config.SESSION_SECRET,
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: config.IS_PRODUCTION,
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req) => {
    return req.headers['x-csrf-token'] || req.body?._csrf;
  },
});

const csrfTokenEndpoint = (req, res) => {
  const token = generateToken(req, res);
  res.json({
    success: true,
    data: { csrfToken: token }
  });
};

module.exports = {
  csrfProtection: doubleCsrfProtection,
  generateCsrfToken: generateToken,
  csrfTokenEndpoint
};
