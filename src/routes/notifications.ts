import type { FastifyInstance } from 'fastify';
import { AppError } from '../errors/AppError.js';
import { ErrorCode } from '../errors/errorCodes.js';
import { ProviderError } from '../errors/ProviderError.js';
import { requireInternalServiceKey } from '../middleware/internalAuth.js';
import { accountCreatedSchema } from '../schemas/accountCreated.schema.js';
import { authLoginSchema } from '../schemas/authLogin.schema.js';
import { emailVerificationSchema } from '../schemas/emailVerification.schema.js';
import { passwordResetSchema } from '../schemas/passwordReset.schema.js';
import { phoneOtpSchema } from '../schemas/phoneOtp.schema.js';
import type { NotificationService } from '../services/notificationService.js';

export interface NotificationRoutesOptions {
  notificationService: NotificationService;
  internalServiceKey: string;
}

const BASE_PATH = '/internal/v1/notifications';

export default async function notificationRoutes(app: FastifyInstance, options: NotificationRoutesOptions): Promise<void> {
  app.addHook('preHandler', requireInternalServiceKey(options.internalServiceKey));

  app.post(`${BASE_PATH}/email-verification`, async (request, reply) => {
    const parsed = emailVerificationSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new AppError({
        statusCode: 400,
        code: ErrorCode.VALIDATION_FAILED,
        message: 'The request could not be validated.',
      });
    }

    try {
      await options.notificationService.sendEmailVerification(
        { email: parsed.data.email, verificationToken: parsed.data.verificationToken },
        request.log,
      );
    } catch (error) {
      throw toProviderAppError(error);
    }

    reply.status(202).send({ accepted: true });
  });

  app.post(`${BASE_PATH}/password-reset`, async (request, reply) => {
    const parsed = passwordResetSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new AppError({
        statusCode: 400,
        code: ErrorCode.VALIDATION_FAILED,
        message: 'The request could not be validated.',
      });
    }

    try {
      await options.notificationService.sendPasswordReset(
        { email: parsed.data.email, resetToken: parsed.data.resetToken },
        request.log,
      );
    } catch (error) {
      throw toProviderAppError(error);
    }

    reply.status(202).send({ accepted: true });
  });

  app.post(`${BASE_PATH}/phone-otp`, async (request, reply) => {
    const parsed = phoneOtpSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new AppError({
        statusCode: 400,
        code: ErrorCode.VALIDATION_FAILED,
        message: 'The request could not be validated.',
      });
    }

    try {
      await options.notificationService.sendPhoneOtp(
        {
          phone: parsed.data.phone,
          otp: parsed.data.otp,
          expiresInSeconds: parsed.data.expiresInSeconds,
        },
        request.log,
      );
    } catch (error) {
      throw toProviderAppError(error);
    }

    reply.status(202).send({ accepted: true });
  });

  app.post(`${BASE_PATH}/account-created`, async (request, reply) => {
    const parsed = accountCreatedSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new AppError({
        statusCode: 400,
        code: ErrorCode.VALIDATION_FAILED,
        message: 'The request could not be validated.',
      });
    }

    try {
      await options.notificationService.sendAccountCreated(
        { email: parsed.data.email, authenticationMethod: parsed.data.authenticationMethod },
        request.log,
      );
    } catch (error) {
      throw toProviderAppError(error);
    }

    reply.status(202).send({ accepted: true });
  });

  app.post(`${BASE_PATH}/auth-login`, async (request, reply) => {
    const parsed = authLoginSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new AppError({
        statusCode: 400,
        code: ErrorCode.VALIDATION_FAILED,
        message: 'The request could not be validated.',
      });
    }

    try {
      await options.notificationService.sendAuthLogin(
        { email: parsed.data.email, authenticationMethod: parsed.data.authenticationMethod },
        request.log,
      );
    } catch (error) {
      throw toProviderAppError(error);
    }

    reply.status(202).send({ accepted: true });
  });
}

function toProviderAppError(error: unknown): AppError {
  if (error instanceof ProviderError) {
    return new AppError({
      statusCode: 502,
      code: ErrorCode.PROVIDER_ERROR,
      message: 'Notification provider failed.',
      cause: error,
    });
  }

  return new AppError({
    statusCode: 500,
    code: ErrorCode.INTERNAL_ERROR,
    message: 'An unexpected error occurred. Please try again.',
    cause: error,
  });
}
