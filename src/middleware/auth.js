const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const { db } = require("../infrastructure/database");
const { adminUsers } = require("../../shared/schema");
const { eq, sql } = require("drizzle-orm");
const { success, error, unauthorized, notFound } = require("../utils/apiResponse");

let logger = console;

function setLogger(loggerInstance) {
  logger = loggerInstance;
}

const authMiddleware = (req, res, next) => {
  if (!req.session || !req.session.adminUser) {
    return unauthorized(res, "Unauthorized. Please log in.");
  }
  next();
};

const adminPageMiddleware = (req, res, next) => {
  if (!req.session || !req.session.adminUser) {
    return res.redirect("/admin-login.html");
  }
  next();
};

const loginValidation = [
  body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

async function handleLogin(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return error(res, 'Validation failed', 400, errors.array());
  }

  try {
    const email = req.body.email.toLowerCase().trim();
    const { password } = req.body;

    const [user] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email));

    if (!user) {
      // Log failed attempt without revealing account existence
      (req.log || logger).warn({ email }, 'Login attempt for non-existent account');
      return unauthorized(res, "Invalid email or password");
    }

    // Guard against null/undefined passwordHash to prevent bcrypt.compare from throwing
    if (!user.passwordHash) {
      (req.log || logger).warn({ email }, 'Login attempt for account without password hash');
      return unauthorized(res, "Invalid email or password");
    }

    // Always validate password first, regardless of account status
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      // Log details server-side for auditing
      (req.log || logger).warn({
        email,
        isActive: user.isActive,
        isFrozen: user.isFrozen
      }, 'Invalid password for user');
      const [updatedUser] = await db
        .update(adminUsers)
        .set({
          failedLoginAttempts: sql`${adminUsers.failedLoginAttempts} + 1`,
        })
        .where(eq(adminUsers.id, user.id))
        .returning({
          id: adminUsers.id,
          failedLoginAttempts: adminUsers.failedLoginAttempts,
        });

      const newFailedAttempts = updatedUser.failedLoginAttempts;
      const shouldFreeze = newFailedAttempts >= 5;

      if (shouldFreeze) {
        await db
          .update(adminUsers)
          .set({
            isFrozen: true,
            frozenAt: new Date(),
          })
          .where(eq(adminUsers.id, user.id));

        (req.log || logger).warn({
          email,
          failedAttempts: newFailedAttempts
        }, 'Account frozen due to failed login attempts');
        return unauthorized(res, "Invalid email or password.");
      }

      // Don't reveal remaining attempts to prevent user enumeration
      (req.log || logger).warn({
        email,
        failedAttempts: newFailedAttempts,
        maxAttempts: 5
      }, 'Failed login attempt');
      return unauthorized(res, "Invalid email or password.");
    }

    // Password is valid - now check account status
    if (!user.isActive) {
      (req.log || logger).warn({ email }, 'Login attempt for inactive account');
      return unauthorized(res, "Invalid email or password");
    }

    if (user.isFrozen) {
      (req.log || logger).warn({ email }, 'Login attempt for frozen account');
      return unauthorized(res, "Invalid email or password");
    }

    // All checks passed - update last login and reset failed attempts
    await db
      .update(adminUsers)
      .set({
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        isFrozen: false,
        frozenAt: null,
      })
      .where(eq(adminUsers.id, user.id));

    req.session.regenerate((err) => {
      if (err) {
        (req.log || logger).error({ err }, 'Session regeneration error');
        return error(res, "Failed to create session", 500);
      }

      req.session.adminUser = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      };

      req.session.save((err) => {
        if (err) {
          (req.log || logger).error({ err }, 'Session save error');
          return error(res, "Failed to create session", 500);
        }

        return success(res, {
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
          }
        }, 'Login successful');
      });
    });
  } catch (err) {
    (req.log || logger).error({ err }, 'Login error');
    return error(res, "Login failed", 500);
  }
}

async function handleCheckSession(req, res) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  
  (req.log || logger).info({
    hasSession: !!req.session,
    hasAdminUser: !!(req.session && req.session.adminUser),
    sessionID: req.sessionID,
    cookies: req.headers.cookie
  }, 'Check session called');
  
  if (!req.session || !req.session.adminUser) {
    return success(res, { authenticated: false });
  }

  try {
    const [user] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, req.session.adminUser.id));

    if (!user || !user.isActive || user.isFrozen) {
      req.session.destroy();
      return success(res, { authenticated: false });
    }

    return success(res, {
      authenticated: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      }
    });
  } catch (err) {
    (req.log || logger).error({ err }, 'Session check error');
    return success(res, { authenticated: false });
  }
}

function handleLogout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      (req.log || logger).error({ err }, 'Logout error');
      return error(res, "Logout failed", 500);
    }
    return success(res, null, 'Logged out successfully');
  });
}

const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters long")
    .matches(/[A-Z]/)
    .withMessage("New password must contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("New password must contain at least one lowercase letter")
    .matches(/[0-9]/)
    .withMessage("New password must contain at least one number")
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage("New password must contain at least one special character"),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error("Password confirmation does not match new password");
    }
    return true;
  }),
];

async function handleChangePassword(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return error(res, 'Validation failed', 400, errors.array());
  }

  if (!req.session || !req.session.adminUser) {
    return unauthorized(res, "Unauthorized. Please log in.");
  }

  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.session.adminUser.id;

    const [user] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, userId));

    if (!user) {
      return notFound(res, "User");
    }

    // Guard against null/undefined passwordHash to prevent bcrypt.compare from throwing
    if (!user.passwordHash) {
      (req.log || logger).warn({ email: user.email }, 'Change password attempt for account without password hash');
      return error(res, "No password set for this account. Please use the forgot password flow to set a password.", 400);
    }

    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );

    if (!isValidPassword) {
      return unauthorized(res, "Current password is incorrect");
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await db
      .update(adminUsers)
      .set({
        passwordHash: newPasswordHash,
        lastPasswordResetAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(adminUsers.id, userId));

    return success(res, null, "Password changed successfully");
  } catch (err) {
    (req.log || logger).error({ err }, 'Change password error');
    return error(res, "Failed to change password", 500);
  }
}

module.exports = {
  setLogger,
  authMiddleware,
  adminAuthMiddleware: authMiddleware,
  adminPageMiddleware,
  loginValidation,
  handleLogin,
  handleCheckSession,
  handleLogout,
  changePasswordValidation,
  handleChangePassword,
};
