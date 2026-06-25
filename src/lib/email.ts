// /src/lib/email.ts
import { Resend } from 'resend'
import { ENV } from '../config/env.js'

const resend = new Resend(ENV.RESEND.API_KEY)

export const sendWelcomeEmail = async (
  email: string,
  name: string,
  dashboardLink: string,
) => {
  // Configured with clean routing back to your primary app domain

  try {
    await resend.emails.send({
      from: `Christ Baptist Church <${ENV.RESEND.MAIL_USER}>`,
      to: [email],
      replyTo: ENV.RESEND.MAIL_USER,
      subject: 'Welcome to Christ Baptist Church Platform',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 30px 20px; color: #171717; background-color: #fdfdfd; max-width: 600px; margin: 0 auto;">
          
          <div style="background-color: #ffffff; border: 1px solid #ededed; border-radius: 8px; padding: 40px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);">
            
            <div style="margin-bottom: 30px; border-bottom: 1px solid #ededed; padding-bottom: 20px;">
              <span style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #737373;">Official Workspace Platform</span>
            </div>

            <h1 style="color: #0a0a0a; font-size: 26px; font-weight: 700; tracking-tight: -0.02em; margin-top: 0; margin-bottom: 16px;">
              Welcome to the Team, ${name}!
            </h1>
            
            <p style="font-size: 15px; line-height: 1.6; color: #404040; margin-bottom: 24px;">
              Your administrator account credentials have been successfully provisioned. We are highly thrilled to have you join our core support ecosystem.
            </p>

            <div style="margin: 32px 0; padding: 24px; background-color: #fafafa; border-radius: 6px; border: 1px solid #f0f0f0;">
              <h3 style="margin-top: 0; margin-bottom: 16px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #171717;">
                Getting Started with Your Dashboard
              </h3>
              
              <div style="margin-bottom: 16px;">
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #0a0a0a;">1. Setup Workspace Properties</p>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #525252;">Verify connected digital domain items and API credentials under workspace properties settings.</p>
              </div>

              <div style="margin-bottom: 16px;">
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #0a0a0a;">2. Invite Additional Agents</p>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #525252;">Use your updated Contacts tab to dynamically dispatch tokenized workspace invitations.</p>
              </div>

              <div>
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #0a0a0a;">3. Monitor Real-Time Conversations</p>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #525252;">Access the incoming operational session queries directly via your live operator terminal view.</p>
              </div>
            </div>

            <div style="text-align: center; margin: 36px 0 20px 0;">
              <a href="${dashboardLink}" style="background-color: #171717; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; display: inline-block; transition: background-color 0.2s ease;">
                Go to Dashboard Terminal
              </a>
            </div>

          </div>

          <div style="text-align: center; margin-top: 24px; padding: 0 20px;">
            <p style="font-size: 12px; color: #737373; line-height: 1.5; margin: 0;">
              This is an automated system security notification. Please do not reply directly to this transmission.<br />
              Need deployment assistance? Contact platform support administrators at any time.
            </p>
            <p style="font-size: 11px; color: #a3a3a3; margin-top: 16px; margin-bottom: 0;">
              &copy; 2026 Christ Baptist Church. All rights reserved.
            </p>
          </div>

        </div>
      `,
    })
  } catch (error) {
    console.error('Failed to send welcome email:', error)
  }
}

export const sendOperatorInvitationEmail = async (
  email: string,
  role: string,
  inviteToken: string,
  originDomain: string,
  companyName: string,
) => {
  const cleanDomain = originDomain.startsWith('http')
    ? originDomain
    : `https://${originDomain}`
  const invitationLink = `${cleanDomain}/accept-invite?token=${inviteToken}`

  try {
    await resend.emails.send({
      from: `Christ Baptist Church <${ENV.RESEND.MAIL_USER}>`,
      to: [email],
      replyTo: ENV.RESEND.MAIL_USER,
      subject: `${companyName} invited you to join their workspace`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 30px 20px; color: #171717; background-color: #fdfdfd; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #ffffff; border: 1px solid #ededed; border-radius: 8px; padding: 40px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);">
            
            <div style="margin-bottom: 30px; border-bottom: 1px solid #ededed; padding-bottom: 20px;">
              <span style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #737373;">
                ${companyName} Workspace Invite
              </span>
            </div>

            <h2 style="color: #0a0a0a; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 16px;">You've Been Invited!</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #404040;">
             You have been invited to join <strong>${companyName}</strong> as a <strong>${role}</strong> operator.
            </p>
            
            <div style="margin: 30px 0; padding: 20px; background-color: #fafafa; border-radius: 6px; border: 1px solid #f0f0f0;">
              <p style="margin-top: 0; font-size: 14px; font-weight: 600; color: #0a0a0a;">How to get started:</p>
              <ul style="padding-left: 20px; margin-bottom: 0; font-size: 13px; color: #525252; line-height: 1.6;">
                <li><strong>If you already have an account:</strong> Click the button below, log in, and accept the workspace association.</li>
                <li><strong>If you are completely new:</strong> Click the button below to register and secure your profile credentials.</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 35px 0;">
              <a href="${invitationLink}" style="background-color: #171717; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
                Accept Invitation & Join Team
              </a>
            </div>

            <hr style="border: 0; border-top: 1px solid #ededed; margin: 20px 0;" />
            <p style="font-size: 12px; color: #737373; line-height: 1.5;">
              If the button doesn't work, copy and paste this link into your browser:<br />
              <a href="${invitationLink}" style="color: #171717; word-break: break-all;">${invitationLink}</a>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 24px;">
            <p style="font-size: 11px; color: #a3a3a3; margin: 0;">
              &copy; 2026 ${companyName}. Powered by Christ Baptist Church. All rights reserved.
            </p>
          </div>
        </div>
      `,
    })
  } catch (error) {
    console.error('Failed to dispatch operator invitation email:', error)
  }
}

export const sendPasswordResetEmail = async (
  email: string,
  resetLink: string,
) => {
  try {
    await resend.emails.send({
      from: `Christ Baptist Church <${ENV.RESEND.MAIL_USER}>`,
      to: [email],
      replyTo: ENV.RESEND.MAIL_USER,
      subject: 'Reset your password',
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:30px 20px;background:#f8fafc;color:#171717;max-width:600px;margin:0 auto;">

          <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:40px;">

            <div style="margin-bottom:24px;border-bottom:1px solid #e5e7eb;padding-bottom:20px;">
              <span style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                Password Reset
              </span>
            </div>

            <h2 style="margin-top:0;font-size:26px;color:#111827;">
              Reset Your Password
            </h2>

            <p style="font-size:15px;line-height:1.7;color:#4b5563;">
              We received a request to reset your account password.
              If you made this request, click the button below to create a new password.
            </p>

            <div style="text-align:center;margin:40px 0;">
              <a
                href="${resetLink}"
                style="
                  display:inline-block;
                  background:#111827;
                  color:#ffffff;
                  text-decoration:none;
                  padding:14px 28px;
                  border-radius:6px;
                  font-weight:600;
                "
              >
                Reset Password
              </a>
            </div>

            <p style="font-size:14px;color:#6b7280;line-height:1.7;">
              This password reset link will expire in
              <strong>30 minutes</strong>.
            </p>

            <p style="font-size:14px;color:#6b7280;line-height:1.7;">
              If you did not request a password reset, you can safely ignore this email.
              Your password will remain unchanged.
            </p>

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:30px 0;" />

            <p style="font-size:12px;color:#9ca3af;word-break:break-all;">
              If the button above doesn't work, copy and paste this link into your browser:
              <br /><br />
              <a href="${resetLink}" style="color:#111827;">
                ${resetLink}
              </a>
            </p>

          </div>

          <div style="text-align:center;margin-top:24px;">
            <p style="font-size:11px;color:#9ca3af;">
              © 2026 Christ Baptist Church. All rights reserved.
            </p>
          </div>

        </div>
      `,
    })
  } catch (error) {
    console.error('Failed to send password reset email:', error)
  }
}