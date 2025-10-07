const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { db } = require('./db');
const { adminUsers } = require('../shared/schema');
const { eq, sql } = require('drizzle-orm');

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
    
    if (user.isFrozen) {
      return res.status(423).json({ 
        error: 'Account frozen due to too many failed login attempts. Please contact an administrator to unfreeze your account.' 
      });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      const [updatedUser] = await db.update(adminUsers)
        .set({ 
          failedLoginAttempts: sql`COALESCE(${adminUsers.failedLoginAttempts}, 0) + 1`
        })
        .where(eq(adminUsers.id, user.id))
        .returning({ 
          id: adminUsers.id,
          failedLoginAttempts: adminUsers.failedLoginAttempts 
        });
      
      const newFailedAttempts = updatedUser.failedLoginAttempts;
      const shouldFreeze = newFailedAttempts >= 5;
      
      if (shouldFreeze) {
        await db.update(adminUsers)
          .set({ 
            isFrozen: true,
            frozenAt: new Date()
          })
          .where(eq(adminUsers.id, user.id));
        
        console.log(`[SECURITY] Account frozen for user ${email} after ${newFailedAttempts} failed login attempts`);
        return res.status(423).json({ 
          error: 'Account frozen due to too many failed login attempts. Please contact an administrator to unfreeze your account.' 
        });
      }
      
      const remainingAttempts = 5 - newFailedAttempts;
      return res.status(401).json({ 
        error: `Invalid email or password. ${remainingAttempts} attempt(s) remaining before account is frozen.` 
      });
    }
    
    await db.update(adminUsers)
      .set({ 
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        isFrozen: false,
        frozenAt: null
      })
      .where(eq(adminUsers.id, user.id));
    
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.status(500).json({ error: 'Failed to create session' });
      }
      
      req.session.adminUser = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      };
      
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ error: 'Failed to create session' });
        }
        
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
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}

async function handleCheckSession(req, res) {
  if (!req.session || !req.session.adminUser) {
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
