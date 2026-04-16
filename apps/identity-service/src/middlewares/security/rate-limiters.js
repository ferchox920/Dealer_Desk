import { rateLimit } from 'express-rate-limit';

function buildLimiter({ windowMinutes, limit, message, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    message: {
      status: 429,
      error: message,
      code: 'RATE_LIMIT_EXCEEDED',
    },
  });
}

const loginLimiter = buildLimiter({
  windowMinutes: 15,
  limit: 10,
  message: 'Too many login attempts. Please try again later.',
  skipSuccessfulRequests: true,
});

const forgotPasswordLimiter = buildLimiter({
  windowMinutes: 15,
  limit: 5,
  message: 'Too many password recovery requests. Please try again later.',
});

const passwordActionLimiter = buildLimiter({
  windowMinutes: 15,
  limit: 10,
  message: 'Too many password action attempts. Please try again later.',
});

const refreshLimiter = buildLimiter({
  windowMinutes: 15,
  limit: 30,
  message: 'Too many session refresh attempts. Please try again later.',
});

const inviteResendLimiter = buildLimiter({
  windowMinutes: 10,
  limit: 5,
  message: 'Too many invite resend attempts. Please try again later.',
});

export {
  forgotPasswordLimiter,
  inviteResendLimiter,
  loginLimiter,
  passwordActionLimiter,
  refreshLimiter,
};
