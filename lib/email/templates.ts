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

/**
 * Password changed notification email template
 *
 * @param params - Email parameters
 * @param params.email - User's email address
 * @param params.name - User's name (optional)
 * @returns Email template with subject and body
 */
export function passwordChangedEmail(params: { email: string; name?: string }): EmailTemplate {
  const { email, name } = params
  const greeting = name ? `Hi ${name},` : 'Hi,'

  return {
    subject: 'Your MemoryLoop password was changed',
    text: `${greeting}

Your MemoryLoop password was successfully changed.

If you made this change, you can safely ignore this email. We recommend logging out from all devices and logging back in with your new password.

If you did NOT make this change, please contact support immediately - your account may have been compromised.

For security reasons, we recommend:
- Using a strong, unique password
- Enabling two-factor authentication (when available)
- Not sharing your password with anyone

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
  <h2 style="color: #2563eb;">Password Changed</h2>

  <p>${greeting}</p>

  <p><strong>Your MemoryLoop password was successfully changed.</strong></p>

  <p>If you made this change, you can safely ignore this email. We recommend logging out from all devices and logging back in with your new password.</p>

  <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
    <p style="margin: 0; color: #991b1b;"><strong>⚠️ If you did NOT make this change:</strong></p>
    <p style="margin: 10px 0 0 0; color: #991b1b;">Please contact support immediately - your account may have been compromised.</p>
  </div>

  <p style="color: #666; font-size: 14px;"><strong>Security recommendations:</strong></p>
  <ul style="color: #666; font-size: 14px;">
    <li>Use a strong, unique password</li>
    <li>Enable two-factor authentication (when available)</li>
    <li>Don't share your password with anyone</li>
  </ul>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #999; font-size: 12px;">This email was sent to ${email}. If you have any questions, please contact support.</p>
</body>
</html>
`,
  }
}

/**
 * Send password reset email
 *
 * Queues email for delivery with retry logic
 *
 * @param email - User's email address
 * @param resetLink - Full reset link with token
 */
export async function sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
  const { queueEmail } = await import('@/lib/email/retry-queue')
  const template = passwordResetEmail({ email, resetLink })

  await queueEmail({
    to: email,
    subject: template.subject,
    textBody: template.text,
    htmlBody: template.html,
  })
}

/**
 * Send email verification email
 *
 * Queues email for delivery with retry logic
 *
 * @param email - User's email address
 * @param verificationLink - Full verification link with token
 */
export async function sendEmailVerificationEmail(
  email: string,
  verificationLink: string
): Promise<void> {
  const { queueEmail } = await import('@/lib/email/retry-queue')
  const template = emailVerificationEmail({ email, verificationLink })

  await queueEmail({
    to: email,
    subject: template.subject,
    textBody: template.text,
    htmlBody: template.html,
  })
}

/**
 * Send password changed notification email
 *
 * Queues email for delivery with retry logic
 *
 * @param email - User's email address
 * @param name - User's name (optional)
 */
export async function sendPasswordChangedEmail(email: string, name?: string): Promise<void> {
  const { queueEmail } = await import('@/lib/email/retry-queue')
  const template = passwordChangedEmail({ email, name })

  await queueEmail({
    to: email,
    subject: template.subject,
    textBody: template.text,
    htmlBody: template.html,
  })
}
