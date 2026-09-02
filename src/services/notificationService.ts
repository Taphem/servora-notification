import type { FastifyBaseLogger } from 'fastify';
import type { EmailProvider } from '../providers/email/EmailProvider.js';
import type { SmsProvider } from '../providers/sms/SmsProvider.js';
import {
  renderAccountCreatedGoogle,
  renderAccountCreatedPassword,
  renderAuthLoginGoogle,
  renderAuthLoginPassword,
  renderEmailVerification,
  renderPasswordReset,
  renderPhoneOtpMessage,
} from '../templates/render.js';
import { formatDurationFromSeconds } from '../utils/duration.js';
import { buildAppUrl, buildEmailVerificationUrl, buildPasswordResetUrl } from '../utils/urls.js';

export type AuthenticationMethod = 'password' | 'google';

export interface NotificationServiceOptions {
  emailProvider: EmailProvider;
  smsProvider: SmsProvider;
  appPublicUrl: string;
}

export class NotificationService {
  constructor(private readonly options: NotificationServiceOptions) {}

  async sendEmailVerification(input: { email: string; verificationToken: string }, logger: FastifyBaseLogger): Promise<void> {
    const verificationUrl = buildEmailVerificationUrl(this.options.appPublicUrl, input.verificationToken);
    const { html, text } = renderEmailVerification({ verificationUrl });

    await this.options.emailProvider.sendEmail(
      {
        type: 'email-verification',
        to: input.email,
        subject: 'Verify your Servora email',
        html,
        text,
      },
      logger,
    );
  }

  async sendPasswordReset(input: { email: string; resetToken: string }, logger: FastifyBaseLogger): Promise<void> {
    const resetUrl = buildPasswordResetUrl(this.options.appPublicUrl, input.resetToken);
    const { html, text } = renderPasswordReset({ resetUrl });

    await this.options.emailProvider.sendEmail(
      {
        type: 'password-reset',
        to: input.email,
        subject: 'Reset your Servora password',
        html,
        text,
      },
      logger,
    );
  }

  async sendPhoneOtp(input: { phone: string; otp: string; expiresInSeconds: number }, logger: FastifyBaseLogger): Promise<void> {
    const body = renderPhoneOtpMessage({
      otp: input.otp,
      expiresInWords: formatDurationFromSeconds(input.expiresInSeconds),
    });

    await this.options.smsProvider.sendSms(
      {
        type: 'phone-otp',
        to: input.phone,
        body,
      },
      logger,
    );
  }

  /**
   * emailVerified is validated as part of the request contract but does not
   * change which template is sent — the two content variants map 1:1 onto
   * authenticationMethod (password accounts are always unverified at
   * creation time; Google accounts are always pre-verified), per the
   * documented AccountCreated event semantics.
   */
  async sendAccountCreated(
    input: { email: string; authenticationMethod: AuthenticationMethod },
    logger: FastifyBaseLogger,
  ): Promise<void> {
    const appUrl = buildAppUrl(this.options.appPublicUrl);
    const { html, text } =
      input.authenticationMethod === 'google' ? renderAccountCreatedGoogle({ appUrl }) : renderAccountCreatedPassword({ appUrl });

    await this.options.emailProvider.sendEmail(
      {
        type: 'account-created',
        to: input.email,
        subject: 'Welcome to Servora',
        html,
        text,
      },
      logger,
    );
  }

  async sendAuthLogin(input: { email: string; authenticationMethod: AuthenticationMethod }, logger: FastifyBaseLogger): Promise<void> {
    const { html, text } = input.authenticationMethod === 'google' ? renderAuthLoginGoogle() : renderAuthLoginPassword();

    await this.options.emailProvider.sendEmail(
      {
        type: 'auth-login',
        to: input.email,
        subject: 'New sign-in to your Servora account',
        html,
        text,
      },
      logger,
    );
  }
}
