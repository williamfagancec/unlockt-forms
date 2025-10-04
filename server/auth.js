const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { db } = require('./db');
const { adminUsers } = require('../shared/schema');
const { eq } = require('drizzle-orm');

const authMiddleware = (req, res, next) => {
  if (!req.session || !req.session.adminUser) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  next();
};

const adminPageMiddleware = (req, res, next) => {
  if (!req.session || !req.session.adminUser) {
    return res.redirect('/admin-login.html');
  }
  next();
};

const loginValidation = [
  body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

async function handleLogin(req, res) {
  console.log('[PROD DEBUG] Login attempt:', {
    protocol: req.protocol,
    secure: req.secure,
    hostname: req.hostname,
    headers: {
      'x-forwarded-proto': req.get('x-forwarded-proto'),
      'x-forwarded-host': req.get('x-forwarded-host'),
      origin: req.get('origin')
    }
  });
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const email = req.body.email.toLowerCase().trim();
    const { password } = req.body;
    
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is inactive' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    await db.update(adminUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminUsers.id, user.id));
    
    req.session.adminUser = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role
    };
    
    req.session.save((err) => {
      if (err) {
        console.error('[PROD DEBUG] Session save error:', err);
        return res.status(500).json({ error: 'Failed to create session' });
      }
      
      console.log('[PROD DEBUG] Session saved. Cookie will be:', {
        sessionID: req.sessionID,
        setCookie: res.getHeader('Set-Cookie')
      });
      
      res.json({
        success: true,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role
        }
      });
    });
  } catch (error) {
    console.error('[PROD DEBUG] Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}

async function handleCheckSession(req, res) {
  console.log('[PROD DEBUG] Check session:', {
    hasSession: !!req.session,
    hasAdminUser: !!req.session?.adminUser,
    sessionID: req.sessionID,
    cookies: req.get('cookie')
  });
  
  if (!req.session || !req.session.adminUser) {
    console.log('[PROD DEBUG] No valid session found');
    return res.json({ authenticated: false });
  }
  
  try {
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, req.session.adminUser.id));
    
    if (!user || !user.isActive) {
      req.session.destroy();
      return res.json({ authenticated: false });
    }
    
    res.json({
      authenticated: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Session check error:', error);
    res.json({ authenticated: false });
  }
}

function handleLogout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
}

module.exports = {
  authMiddleware,
  adminPageMiddleware,
  loginValidation,
  handleLogin,
  handleCheckSession,
  handleLogout
};
