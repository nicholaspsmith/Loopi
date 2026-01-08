/**
 * Email Client
 *
 * Handles email sending via Resend HTTP API (preferred) or Nodemailer SMTP (fallback)
 * Falls back to queue on failure for retry logic
 */

import { Resend } from 'resend'
import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { queueEmail } from './retry-queue'

let resendClient: Resend | null = null
let transporter: Transporter | null = null

/**
 * Check if Resend API is configured
 */
function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}

/**
 * Initialize Resend client
 */
function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

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
 * Send email via Resend HTTP API or SMTP
 *
 * Prefers Resend API (works on all networks, no port restrictions)
 * Falls back to SMTP if Resend not configured
 * If immediate send fails, queues email for retry
 *
 * @param params - Email parameters
 * @param params.to - Recipient email address
 * @param params.subject - Email subject
 * @param params.text - Plain text body
 * @param params.html - Optional HTML body
 * @param params.fromQueue - Internal flag to prevent circular dependency (do not use externally)
 * @returns Sent message info with messageId
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

  const from = process.env.SMTP_FROM || 'noreply@loopi.com'

  try {
    // Prefer Resend HTTP API (no port restrictions)
    if (isResendConfigured()) {
      const resend = getResendClient()

      const { data, error } = await resend.emails.send({
        from,
        to,
        subject,
        text,
        html: html || undefined,
      })

      if (error) {
        throw new Error(error.message)
      }

      console.log('📧 Email sent successfully via Resend:', data?.id)
      return { messageId: data?.id || `resend-${Date.now()}` }
    }

    // Fall back to SMTP
    const emailClient = initializeEmailClient()

    const info = await emailClient.sendMail({
      from,
      to,
      subject,
      text,
      html: html || undefined,
    })

    console.log('📧 Email sent successfully via SMTP:', info.messageId)

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
