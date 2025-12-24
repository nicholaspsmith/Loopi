/**
 * Email Templates
 *
 * Simple template functions for transactional emails
 * Returns subject, text, and HTML body for each email type
 */

interface EmailTemplate {
  subject: string
  text: string
  html: string
}

/**
 * Password reset email template
 *
 * @param params - Email parameters
 * @param params.email - User's email address
 * @param params.resetLink - Full reset link with token
 * @returns Email template with subject and body
 */
export function passwordResetEmail(params: { email: string; resetLink: string }): EmailTemplate {
  const { email, resetLink } = params

  return {
    subject: 'Reset your MemoryLoop password',
    text: `Hi,

You requested to reset your password for MemoryLoop.

Click here to reset your password:
${resetLink}

This link will expire in 1 hour.

If you didn't request this, you can safely ignore this email.

Best,
The MemoryLoop Team`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #2563eb;">Reset your password</h2>

  <p>Hi,</p>

  <p>You requested to reset your password for MemoryLoop.</p>

  <p style="margin: 30px 0;">
    <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
  </p>

  <p style="color: #666; font-size: 14px;">This link will expire in <strong>1 hour</strong>.</p>

  <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #999; font-size: 12px;">This email was sent to ${email}. If you have any questions, please contact support.</p>
</body>
</html>
`,
  }
}

/**
 * Email verification email template
 *
 * @param params - Email parameters
 * @param params.email - User's email address
 * @param params.verificationLink - Full verification link with token
 * @returns Email template with subject and body
 */
export function emailVerificationEmail(params: {
  email: string
  verificationLink: string
}): EmailTemplate {
  const { email, verificationLink } = params

  return {
    subject: 'Verify your MemoryLoop email address',
    text: `Hi,

Thanks for signing up for MemoryLoop!

Please verify your email address by clicking the link below:
${verificationLink}

This link will expire in 24 hours.

If you didn't create this account, you can safely ignore this email.

Best,
The MemoryLoop Team`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #2563eb;">Verify your email address</h2>

  <p>Hi,</p>

  <p>Thanks for signing up for MemoryLoop! We're excited to have you.</p>

  <p>Please verify your email address to get started:</p>

  <p style="margin: 30px 0;">
    <a href="${verificationLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email Address</a>
  </p>

  <p style="color: #666; font-size: 14px;">This link will expire in <strong>24 hours</strong>.</p>

  <p style="color: #666; font-size: 14px;">If you didn't create this account, you can safely ignore this email.</p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #999; font-size: 12px;">This email was sent to ${email}. If you have any questions, please contact support.</p>
</body>
</html>
`,
  }
}
