import { PASSWORD_MIN_LENGTH } from '../../security/password.util.js';

function validateLogin(req, res, next) {
  const errors = [];
  const { email, password } = req.body;

  if (typeof email !== 'string' || email.trim().length === 0) {
    errors.push({
      code: 'PLATFORM_AUTH_EMAIL_INVALID',
      field: 'email',
      message: 'The email is required.',
    });
  }

  if (typeof password !== 'string' || password.trim().length < PASSWORD_MIN_LENGTH) {
    errors.push({
      code: 'PLATFORM_AUTH_PASSWORD_INVALID',
      field: 'password',
      message: `The password must contain at least ${PASSWORD_MIN_LENGTH} characters.`,
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 400,
      errors,
    });
  }

  return next();
}

export { validateLogin };
