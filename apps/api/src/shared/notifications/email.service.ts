import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { AppConfig } from '../config/app.config';

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
    token: string;
    invitedBy?: string;
  }): Promise<void> {
    const acceptUrl = `http://localhost:3000/invitations/accept?token=${input.token}`;
    await this.transporter.sendMail({
      from: 'Agency OS <noreply@agency-os.local>',
      to: input.to,
      subject: `You're invited to join ${input.organizationName}`,
      text: `You have been invited to join ${input.organizationName}. Accept: ${acceptUrl}`,
      html: `<p>You have been invited to join <strong>${input.organizationName}</strong>.</p><p><a href="${acceptUrl}">Accept invitation</a></p>`,
    });
    this.logger.log(`Invitation email sent to ${input.to}`);
  }
}
