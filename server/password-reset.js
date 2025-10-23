const crypto = require('crypto');
const { db } = require('./db');
const { adminUsers, adminPasswordResetTokens } = require('../shared/schema');
const { eq, and, gt, isNull, sql } = require('drizzle-orm');
const sgMail = require('@sendgrid/mail');

const TOKEN_EXPIRY_MINUTES = 30;
const MAX_REQUESTS_PER_EMAIL_PER_HOUR = 3;
const MAX_REQUESTS_PER_IP_PER_HOUR = 5;

function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         'unknown';
}

function getUserAgent(req) {
  return req.headers['user-agent'] || 'unknown';
}

async function checkRateLimit(email, ip) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const [emailCount] = await db
    .select({ count: sql`count(*)` })
    .from(adminPasswordResetTokens)
    .innerJoin(adminUsers, eq(adminPasswordResetTokens.adminUserId, adminUsers.id))
    .where(
      and(
        eq(adminUsers.email, email.toLowerCase()),
        gt(adminPasswordResetTokens.createdAt, oneHourAgo)
      )
    );
  
  if (parseInt(emailCount.count) >= MAX_REQUESTS_PER_EMAIL_PER_HOUR) {
    return { 
      allowed: false, 
      reason: 'Too many password reset requests for this email. Please try again later.' 
    };
  }
  
  const [ipCount] = await db
    .select({ count: sql`count(*)` })
    .from(adminPasswordResetTokens)
    .where(
      and(
        eq(adminPasswordResetTokens.issuedIp, ip),
        gt(adminPasswordResetTokens.createdAt, oneHourAgo)
      )
    );
  
  if (parseInt(ipCount.count) >= MAX_REQUESTS_PER_IP_PER_HOUR) {
    return { 
      allowed: false, 
      reason: 'Too many password reset requests from this location. Please try again later.' 
    };
  }
  
  return { allowed: true };
}

async function cleanupExpiredTokens() {
  await db
    .delete(adminPasswordResetTokens)
    .where(
      and(
        gt(sql`now()`, adminPasswordResetTokens.expiresAt),
        isNull(adminPasswordResetTokens.consumedAt)
      )
    );
}

async function createResetToken(email, req) {
  const normalizedEmail = email.toLowerCase().trim();
  
  await cleanupExpiredTokens();
  
  const ip = getClientIp(req);
  const userAgent = getUserAgent(req);
  
  const rateLimit = await checkRateLimit(normalizedEmail, ip);
  if (!rateLimit.allowed) {
    throw new Error(rateLimit.reason);
  }
  
  const [user] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, normalizedEmail));
  
  if (!user) {
    return null;
  }
  
  if (!user.isActive) {
    return null;
  }
  
  const token = generateSecureToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);
  
  await db.insert(adminPasswordResetTokens).values({
    adminUserId: user.id,
    tokenHash,
    issuedIp: ip,
    issuedUserAgent: userAgent,
    expiresAt
  });
  
  return { token, user, expiresAt };
}

async function validateResetToken(token) {
  if (!token) {
    return { valid: false, error: 'Reset link is invalid or has expired' };
  }
  
  const tokenHash = hashToken(token);
  
  const [resetToken] = await db
    .select({
      id: adminPasswordResetTokens.id,
      adminUserId: adminPasswordResetTokens.adminUserId,
      expiresAt: adminPasswordResetTokens.expiresAt,
      consumedAt: adminPasswordResetTokens.consumedAt,
      userEmail: adminUsers.email,
      userFirstName: adminUsers.firstName,
      userLastName: adminUsers.lastName,
      userIsActive: adminUsers.isActive,
      userIsFrozen: adminUsers.isFrozen
    })
    .from(adminPasswordResetTokens)
    .innerJoin(adminUsers, eq(adminPasswordResetTokens.adminUserId, adminUsers.id))
    .where(eq(adminPasswordResetTokens.tokenHash, tokenHash));
  
  if (!resetToken) {
    return { valid: false, error: 'Reset link is invalid or has expired' };
  }
  
  if (resetToken.consumedAt) {
    return { valid: false, error: 'This reset link has already been used' };
  }
  
  if (new Date() > new Date(resetToken.expiresAt)) {
    await db
      .delete(adminPasswordResetTokens)
      .where(eq(adminPasswordResetTokens.id, resetToken.id));
    
    return { valid: false, error: 'Reset link has expired. Please request a new one' };
  }
  
  if (!resetToken.userIsActive) {
    return { valid: false, error: 'This account is not active' };
  }
  
  if (resetToken.userIsFrozen) {
    return { valid: false, error: 'This account is frozen. Please contact an administrator' };
  }
  
  return { 
    valid: true, 
    tokenId: resetToken.id,
    userId: resetToken.adminUserId,
    userEmail: resetToken.userEmail,
    userFirstName: resetToken.userFirstName,
    userLastName: resetToken.userLastName
  };
}

async function consumeResetToken(tokenId, userId, newPasswordHash, req) {
  await db.transaction(async (tx) => {
    await tx
      .update(adminPasswordResetTokens)
      .set({ consumedAt: new Date() })
      .where(eq(adminPasswordResetTokens.id, tokenId));
    
    await tx
      .update(adminUsers)
      .set({
        passwordHash: newPasswordHash,
        failedLoginAttempts: 0,
        isFrozen: false,
        frozenAt: null,
        lastPasswordResetAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(adminUsers.id, userId));
  });
  
  if (req.session) {
    req.session.destroy();
  }
}

async function sendResetEmail(email, token, user) {
  const resetUrl = `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/admin/reset-password?token=${token}`;
  
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #5fa88a 0%, #4a8b6e 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: linear-gradient(135deg, #5fa88a 0%, #4a8b6e 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: bold; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
        .security-note { background: #e3f2fd; border-left: 4px solid #2196F3; padding: 12px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hello ${user.firstName} ${user.lastName},</p>
          
          <p>We received a request to reset the password for your Unlockt Forms admin account.</p>
          
          <p>Click the button below to reset your password:</p>
          
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background: #fff; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;">${resetUrl}</p>
          
          <div class="warning">
            <strong>Important:</strong> This link will expire in ${TOKEN_EXPIRY_MINUTES} minutes and can only be used once.
          </div>
          
          <div class="security-note">
            <strong>Security Notice:</strong>
            <ul style="margin: 10px 0 0 20px;">
              <li>If you didn't request this password reset, please ignore this email</li>
              <li>Your password will not change unless you click the link above and complete the reset process</li>
              <li>Never share this link with anyone</li>
            </ul>
          </div>
          
          <div class="footer">
            <p>If you have any questions or concerns, please contact us at <a href="mailto:${process.env.SENDGRID_FROM_EMAIL}">${process.env.SENDGRID_FROM_EMAIL}</a></p>
            <p>This is an automated email from Unlockt Forms - Form Manager Portal</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const emailText = `
Password Reset Request

Hello ${user.firstName} ${user.lastName},

We received a request to reset the password for your Unlockt Forms admin account.

Click the link below to reset your password:
${resetUrl}

This link will expire in ${TOKEN_EXPIRY_MINUTES} minutes and can only be used once.

SECURITY NOTICE:
- If you didn't request this password reset, please ignore this email
- Your password will not change unless you click the link above and complete the reset process
- Never share this link with anyone

If you have any questions or concerns, please contact us at ${process.env.SENDGRID_FROM_EMAIL}

This is an automated email from Unlockt Forms - Form Manager Portal
  `;
  
  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: 'Password Reset Request - Unlockt Forms',
    text: emailText,
    html: emailHtml
  };
  
  try {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      await sgMail.send(msg);
      console.log(`[PASSWORD_RESET] Reset email sent to ${email}`);
      return { success: true };
    } else {
      console.log(`[PASSWORD_RESET] SendGrid not configured. Reset URL: ${resetUrl}`);
      return { success: false, resetUrl };
    }
  } catch (error) {
    console.error('[PASSWORD_RESET] Error sending email:', error);
    throw new Error('Failed to send password reset email');
  }
}

module.exports = {
  createResetToken,
  validateResetToken,
  consumeResetToken,
  sendResetEmail,
  cleanupExpiredTokens
};
