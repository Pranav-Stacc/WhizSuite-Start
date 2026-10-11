import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { AppConfig } from '../config/app.config';
import { renderBrandedEmail } from './email-brand-template';
import { escapeHtml, paragraph } from './email-html';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    const port = this.config.get('SMTP_PORT');
    const secure = this.config.get('SMTP_SECURE');
    const user = this.config.get('SMTP_USER');
    const pass = this.config.get('SMTP_PASS');
    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST'),
      port,
      secure,
      ...(user && pass ? { auth: { user, pass } } : {}),
      ...(port === 587 && !secure ? { requireTLS: true } : {}),
    });
  }

  private brandDefaults() {
    const webAppUrl = this.config.get('WEB_APP_URL').replace(/\/$/, '');
    const configuredLogo = this.config.get('EMAIL_LOGO_URL').trim();
    const logoUrl = configuredLogo || `${webAppUrl}/brand/logo-primary.png`;
    return { webAppUrl, logoUrl };
  }

  private async sendBranded(input: {
    to: string;
    subject: string;
    text: string;
    headline: string;
    bodyHtml: string;
    eyebrow?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    footerNote?: string;
    preheader?: string;
  }): Promise<void> {
    const { webAppUrl, logoUrl } = this.brandDefaults();
    const html = renderBrandedEmail({
      headline: input.headline,
      bodyHtml: input.bodyHtml,
      eyebrow: input.eyebrow,
      ctaLabel: input.ctaLabel,
      ctaUrl: input.ctaUrl,
      footerNote: input.footerNote,
      preheader: input.preheader,
      logoUrl,
      webAppUrl,
    });
    await this.transporter.sendMail({
      from: this.config.get('EMAIL_FROM'),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html,
    });
    this.logger.log(`Email sent to ${input.to}: ${input.subject}`);
  }

  async sendInvitation(input: {
    to: string;
    organizationName: string;
    acceptUrl: string;
  }): Promise<void> {
    const href = input.acceptUrl;
    await this.sendBranded({
      to: input.to,
      subject: `You're invited to ${input.organizationName} on WhizSuite`,
      preheader: `Join ${input.organizationName} on WhizSuite`,
      eyebrow: 'Team invitation',
      headline: `Join ${input.organizationName}`,
      bodyHtml: `${paragraph(`You've been invited to collaborate on WhizSuite with ${input.organizationName}.`)}${paragraph('Accept the invitation to set up your account and access your workspace.')}`,
      ctaLabel: 'Accept invitation',
      ctaUrl: href,
      text: `You have been invited to join ${input.organizationName}. Accept: ${href}`,
    });
  }

  async sendWelcome(input: {
    to: string;
    firstName?: string | null;
    organizationName: string;
  }): Promise<void> {
    const { webAppUrl } = this.brandDefaults();
    const name = input.firstName?.trim() || 'there';
    await this.sendBranded({
      to: input.to,
      subject: `Welcome to WhizSuite`,
      preheader: `Your workspace ${input.organizationName} is ready`,
      eyebrow: 'Getting started',
      headline: `Welcome, ${name}`,
      bodyHtml: `${paragraph(`Your agency workspace "${input.organizationName}" is live on WhizSuite.`)}${paragraph('Invite your team, connect clients, plan content, and let Whiz AI help with day-to-day work.')}`,
      ctaLabel: 'Open dashboard',
      ctaUrl: webAppUrl,
      text: `Welcome to WhizSuite. Open your dashboard: ${webAppUrl}`,
    });
  }

  async sendPasswordReset(input: {
    to: string;
    firstName?: string | null;
    resetUrl: string;
    expiresHours: number;
  }): Promise<void> {
    const name = input.firstName?.trim() || 'there';
    await this.sendBranded({
      to: input.to,
      subject: 'Reset your WhizSuite password',
      preheader: 'Password reset request',
      eyebrow: 'Security',
      headline: 'Reset your password',
      bodyHtml: `${paragraph(`Hi ${name}, we received a request to reset your WhizSuite password.`)}${paragraph(`This link expires in ${input.expiresHours} hours. If you didn't request this, you can ignore this email.`)}`,
      ctaLabel: 'Reset password',
      ctaUrl: input.resetUrl,
      text: `Reset your password: ${input.resetUrl}`,
    });
  }

  async sendEmailVerification(input: {
    to: string;
    firstName?: string | null;
    verifyUrl: string;
  }): Promise<void> {
    const name = input.firstName?.trim() || 'there';
    await this.sendBranded({
      to: input.to,
      subject: 'Verify your WhizSuite email',
      eyebrow: 'Account',
      headline: 'Confirm your email',
      bodyHtml: `${paragraph(`Hi ${name}, please verify your email address to secure your WhizSuite account.`)}`,
      ctaLabel: 'Verify email',
      ctaUrl: input.verifyUrl,
      text: `Verify your email: ${input.verifyUrl}`,
    });
  }

  async sendNotification(input: {
    to: string;
    subject: string;
    body: string;
    actionUrl: string;
    actionLabel: string;
  }): Promise<void> {
    await this.sendBranded({
      to: input.to,
      subject: input.subject,
      headline: input.subject,
      bodyHtml: paragraph(input.body),
      ctaLabel: input.actionLabel || 'View in WhizSuite',
      ctaUrl: input.actionUrl,
      text: `${input.body}\n\n${input.actionLabel}: ${input.actionUrl}`,
    });
  }
}
