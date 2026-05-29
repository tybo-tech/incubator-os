import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface EmailRequest {
  sender_name: string;
  sender_email: string;
  recipient_name: string;
  recipient_email: string;
  subject: string;
  message: string;
  reply_to?: string;
  reply_to_name?: string;
}

export interface EmailResponse {
  message: string;
  success?: boolean;
}

const API_URL    = 'https://mail.rbttacesd.co.za/send.php';
const FROM_NAME  = 'incubator-os';
const FROM_EMAIL = 'no-reply@rbttacesd.co.za';

@Injectable({ providedIn: 'root' })
export class EmailService {

  constructor(private http: HttpClient) {}

  // ─────────────────── PUBLIC HELPERS ─────────────────────────────────────────

  /** Generic notification to any recipient. */
  sendNotification(
    recipientName: string,
    recipientEmail: string,
    subject: string,
    bodyHtml: string,
  ): Observable<EmailResponse> {
    return this.send({
      sender_name:     FROM_NAME,
      sender_email:    FROM_EMAIL,
      recipient_name:  recipientName,
      recipient_email: recipientEmail,
      subject,
      message: this.shell(subject, bodyHtml),
    });
  }

  /** Password-reset email with a clickable button. */
  sendPasswordReset(
    recipientName: string,
    recipientEmail: string,
    resetLink: string,
  ): Observable<EmailResponse> {
    const body = `
      <p style="color:#374151;font-size:15px;margin:0 0 16px;">Hi <strong>${recipientName}</strong>,</p>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 24px;">
        We received a request to reset your <strong>incubator-os</strong> password.
        Click the button below to set a new password. This link expires in <strong>24 hours</strong>.
      </p>
      <div style="text-align:center;margin:0 0 28px;">
        <a href="${resetLink}"
           style="display:inline-block;background:#7c3aed;color:#fff;font-weight:700;
                  font-size:14px;padding:12px 32px;border-radius:8px;text-decoration:none;">
          Reset Password
        </a>
      </div>
      <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">
        If you did not request this, you can safely ignore this email.
        Your password will not change until you click the link above.
      </p>`;

    return this.sendNotification(
      recipientName,
      recipientEmail,
      'Reset your incubator-os password',
      body,
    );
  }

  /** Invite email to set up a new account. */
  sendInvite(
    recipientName: string,
    recipientEmail: string,
    inviteLink: string,
  ): Observable<EmailResponse> {
    const body = `
      <p style="color:#374151;font-size:15px;margin:0 0 16px;">Hi <strong>${recipientName}</strong>,</p>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 16px;">
        You've been invited to <strong>incubator-os</strong>. Click the button below to set your
        password and access your account.
      </p>
      <p style="color:#374151;font-size:14px;margin:0 0 24px;">
        This invitation link is valid for <strong>72 hours</strong>.
      </p>
      <div style="text-align:center;margin:0 0 28px;">
        <a href="${inviteLink}"
           style="display:inline-block;background:#7c3aed;color:#fff;font-weight:700;
                  font-size:14px;padding:12px 32px;border-radius:8px;text-decoration:none;">
          Set My Password
        </a>
      </div>
      <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">
        If you were not expecting this invitation, please contact your programme administrator.
      </p>`;

    return this.sendNotification(
      recipientName,
      recipientEmail,
      'You\'ve been invited to incubator-os',
      body,
    );
  }

  /** Welcome / account-created email with optional temporary password. */
  sendWelcome(
    recipientName: string,
    recipientEmail: string,
    temporaryPassword?: string,
  ): Observable<EmailResponse> {
    const pwBlock = temporaryPassword
      ? `<p style="color:#374151;font-size:14px;margin:0 0 8px;">Your temporary password is:</p>
         <div style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:6px;
                     padding:10px 16px;font-family:monospace;font-size:16px;
                     letter-spacing:2px;color:#111827;margin:0 0 20px;">
           ${temporaryPassword}
         </div>
         <p style="color:#6b7280;font-size:13px;margin:0 0 24px;">
           Please log in and change this password as soon as possible.
         </p>`
      : '';

    const body = `
      <p style="color:#374151;font-size:15px;margin:0 0 16px;">Hi <strong>${recipientName}</strong>,</p>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">
        Your <strong>incubator-os</strong> account has been created. You can now sign in.
      </p>
      ${pwBlock}
      <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">
        If you have any questions, please contact your administrator.
      </p>`;

    return this.sendNotification(
      recipientName,
      recipientEmail,
      'Welcome to incubator-os',
      body,
    );
  }

  // ─────────────────── TRANSPORT ───────────────────────────────────────────────

  /** Low-level send — use this when you need full control over the request. */
  send(req: EmailRequest): Observable<EmailResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<EmailResponse>(API_URL, req, { headers }).pipe(
      map(res => ({ ...res, success: true })),
      catchError(err => throwError(() => ({
        message: 'Failed to send email',
        success: false,
        error: err,
      }))),
    );
  }

  // ─────────────────── HTML SHELL ──────────────────────────────────────────────

  /**
   * Wraps a body fragment in a minimal branded email layout.
   * `body` should be inner HTML — paragraphs, buttons, tables, etc.
   */
  shell(title: string, body: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0"
           style="background:#ffffff;border-radius:12px;overflow:hidden;
                  box-shadow:0 2px 8px rgba(0,0,0,.08);max-width:600px;">
      <tr>
        <td style="background:#7c3aed;padding:24px 36px;text-align:center;">
          <p style="color:#fff;margin:0;font-size:22px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">
            incubator-os
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:36px 36px 28px;">
          <h2 style="color:#111827;font-size:18px;font-weight:700;margin:0 0 20px;">${title}</h2>
          ${body}
        </td>
      </tr>
      <tr>
        <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 36px;text-align:center;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">
            This is an automated message from incubator-os. Please do not reply directly to this email.
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</html>`;
  }
}
