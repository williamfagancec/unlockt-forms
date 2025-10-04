const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { db } = require('./db');
const { adminUsers } = require('../shared/schema');
const { eq } = require('drizzle-orm');

const authMiddleware = (req, res, next) => {
  console.log('[AUTH MIDDLEWARE] Session check:', {
    hasSession: !!req.session,
    hasAdminUser: !!req.session?.adminUser,
    sessionID: req.sessionID,
    cookies: req.headers.cookie
  });
  
  if (!req.session || !req.session.adminUser) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  next();
};

const adminPageMiddleware = (req, res, next) => {
  console.log('[PAGE MIDDLEWARE] Session check:', {
    hasSession: !!req.session,
    hasAdminUser: !!req.session?.adminUser,
    sessionID: req.sessionID
  });
  
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
  console.log('[LOGIN] Request received:', {
    email: req.body.email,
    hasPassword: !!req.body.password,
    sessionID: req.sessionID,
    secure: req.secure,
    protocol: req.protocol,
    headers: {
      'x-forwarded-proto': req.get('x-forwarded-proto'),
      'x-forwarded-for': req.get('x-forwarded-for'),
      'cookie': req.get('cookie'),
      'origin': req.get('origin')
    }
  });
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('[LOGIN] Validation errors:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const email = req.body.email.toLowerCase().trim();
    const { password } = req.body;
    
    console.log('[LOGIN] Looking up user:', email);
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    
    if (!user) {
      console.log('[LOGIN] User not found');
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    if (!user.isActive) {
      console.log('[LOGIN] User is inactive');
      return res.status(401).json({ error: 'Account is inactive' });
    }
    
    console.log('[LOGIN] Comparing password');
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      console.log('[LOGIN] Invalid password');
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    console.log('[LOGIN] Password valid, updating last login');
    await db.update(adminUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminUsers.id, user.id));
    
    console.log('[LOGIN] Creating session data');
    req.session.adminUser = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role
    };
    
    console.log('[LOGIN] Saving session explicitly');
    req.session.save((err) => {
      if (err) {
        console.error('[LOGIN] Session save error:', err);
        return res.status(500).json({ error: 'Failed to create session' });
      }
      
      console.log('[LOGIN] Session saved successfully:', {
        sessionID: req.sessionID,
        adminUser: req.session.adminUser
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
    console.error('[LOGIN] Error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}

async function handleCheckSession(req, res) {
  console.log('[CHECK SESSION] Request received:', {
    hasSession: !!req.session,
    hasAdminUser: !!req.session?.adminUser,
    sessionID: req.sessionID,
    cookies: req.headers.cookie
  });
  
  if (!req.session || !req.session.adminUser) {
    console.log('[CHECK SESSION] No valid session');
    return res.json({ authenticated: false });
  }
  
  try {
    console.log('[CHECK SESSION] Verifying user in database:', req.session.adminUser.id);
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, req.session.adminUser.id));
    
    if (!user || !user.isActive) {
      console.log('[CHECK SESSION] User not found or inactive');
      req.session.destroy();
      return res.json({ authenticated: false });
    }
    
    console.log('[CHECK SESSION] User authenticated');
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
    console.error('[CHECK SESSION] Error:', error);
    res.json({ authenticated: false });
  }
}

function handleLogout(req, res) {
  console.log('[LOGOUT] Request received:', {
    hasSession: !!req.session,
    sessionID: req.sessionID
  });
  
  req.session.destroy((err) => {
    if (err) {
      console.error('[LOGOUT] Error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    console.log('[LOGOUT] Session destroyed successfully');
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
