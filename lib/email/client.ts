/**
 * Email Client
 *
 * Handles email sending via Nodemailer with SMTP
 * Falls back to queue on failure for retry logic
 */

import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { queueEmail } from './retry-queue'

let transporter: Transporter | null = null

/**
 * Initialize email client with SMTP configuration from environment
 *
 * @returns Nodemailer transporter instance
 */
export function initializeEmailClient(): Transporter {
  if (transporter) {
    return transporter
  }

  // Check if SMTP credentials are configured
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_PORT ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    console.warn('⚠️  SMTP credentials not configured. Emails will be queued but not sent.')

    // Return a test transporter that doesn't actually send
    transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
    })

    return transporter
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_PORT === '465', // true for port 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  return transporter
}

/**
 * Send email via SMTP
 *
 * If immediate send fails, queues email for retry
 *
 * IMPORTANT: Do not call this function from queue processor!
 * Queue processor should call emailClient.sendMail() directly to avoid circular dependency
 *
 * @param params - Email parameters
 * @param params.to - Recipient email address
 * @param params.subject - Email subject
 * @param params.text - Plain text body
 * @param params.html - Optional HTML body
 * @param params.fromQueue - Internal flag to prevent circular dependency (do not use externally)
 * @returns Sent message info with messageId
 *
 * @example
 * const result = await sendEmail({
 *   to: 'user@example.com',
 *   subject: 'Test Email',
 *   text: 'This is a test',
 *   html: '<p>This is a test</p>'
 * })
 */
export async function sendEmail(params: {
  to: string
  subject: string
  text: string
  html?: string
  fromQueue?: boolean
}): Promise<{ messageId: string }> {
  const { to, subject, text, html, fromQueue = false } = params

  // Validation
  if (!to || !to.includes('@')) {
    throw new Error('Invalid email address')
  }

  if (!subject || subject.trim() === '') {
    throw new Error('Email subject is required')
  }

  if (!text || text.trim() === '') {
    throw new Error('Email body is required')
  }

  // Get or create transporter
  const emailClient = initializeEmailClient()

  const from = process.env.SMTP_FROM || 'noreply@memoryloop.com'

  try {
    // Attempt to send immediately
    const info = await emailClient.sendMail({
      from,
      to,
      subject,
      text,
      html: html || undefined,
    })

    console.log('📧 Email sent successfully:', info.messageId)

    return { messageId: info.messageId }
  } catch (error) {
    console.error('❌ Failed to send email immediately:', error)

    // Prevent circular dependency: do not re-queue if this was called from queue processor
    if (fromQueue) {
      throw error
    }

    // Queue for retry
    console.log('📬 Queueing email for retry...')
    await queueEmail({
      to,
      subject,
      textBody: text,
      htmlBody: html,
    })

    // Return a synthetic messageId
    return { messageId: `queued-${Date.now()}` }
  }
}
