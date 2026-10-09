import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { AppConfig } from '../config/app.config';

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch);
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST'),
      port: this.config.get('SMTP_PORT'),
      secure: false,
    });
  }

  async sendInvitation(input: {
    to: string;
    organizationName: string;
    acceptUrl: string;
  }): Promise<void> {
    const href = input.acceptUrl;
    await this.transporter.sendMail({
      from: this.config.get('EMAIL_FROM'),
      to: input.to,
      subject: `You're invited to join ${input.organizationName}`,
      text: `You have been invited to join ${input.organizationName}. Accept: ${href}`,
      html: `<p>You have been invited to join <strong>${escapeHtml(input.organizationName)}</strong>.</p><p><a href="${escapeHtml(href)}">Accept invitation</a></p>`,
    });
    this.logger.log(`Invitation email sent to ${input.to}`);
  }
}
