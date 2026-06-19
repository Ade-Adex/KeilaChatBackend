// /src/lib/email.ts
import { Resend } from 'resend'
import { ENV } from '../config/env.js'

const resend = new Resend(ENV.RESEND.API_KEY)


export const sendWelcomeEmail = async (email: string, name: string) => {
  try {
    await resend.emails.send({
      from: ENV.RESEND.MAIL_USER,
      to: [email],
      subject: 'Welcome to our Platform',
      html: `
        <h1>Welcome, ${name}!</h1>
        <p>Your account has been successfully created. We are excited to have you on board.</p>
      `,
    })
  } catch (error) {
    console.error('Failed to send email:', error)
  }
}
