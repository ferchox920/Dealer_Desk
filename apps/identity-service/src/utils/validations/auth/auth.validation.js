import {
  PASSWORD_MIN_LENGTH,
  getPasswordPolicyError,
} from '../../../utils/security/password.util.js';

function pushRequiredStringError(errors, field, code, message) {
  errors.push({
    code,
    field,
    message,
  });
}

function validateEmailField(value, errors, code = 'AUTH_EMAIL_INVALID') {
  if (typeof value !== 'string' || value.trim().length === 0) {
    pushRequiredStringError(errors, 'email', code, 'The email is required.');
  }
}

function validateTokenField(value, errors) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push({
      code: 'AUTH_TOKEN_REQUIRED',
      field: 'token',
      message: 'The token is required.',
    });
  }
}

function validateLogin(req, res, next) {
  const errors = [];
  const { email, password } = req.body;

  validateEmailField(email, errors);

  if (typeof password !== 'string' || password.trim().length < PASSWORD_MIN_LENGTH) {
    errors.push({
      code: 'AUTH_PASSWORD_INVALID',
      field: 'password',
      message: `The password must contain at least ${PASSWORD_MIN_LENGTH} characters.`,
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({ status: 400, errors });
  }

  next();
}

function validateForgotPassword(req, res, next) {
  const errors = [];

  validateEmailField(req.body.email, errors);

  if (errors.length > 0) {
    return res.status(400).json({ status: 400, errors });
  }

  next();
}

function validateVerifyPasswordAction(req, res, next) {
  const errors = [];

  validateTokenField(req.body.token, errors);

  if (errors.length > 0) {
    return res.status(400).json({ status: 400, errors });
  }

  next();
}

function validateCompletePasswordAction(req, res, next) {
  const errors = [];
  const { token, password } = req.body;
  const normalizedPassword = typeof password === 'string' ? password.trim() : password;

  validateTokenField(token, errors);

  const passwordPolicyError = getPasswordPolicyError(normalizedPassword);

  if (passwordPolicyError) {
    errors.push({
      code: 'AUTH_PASSWORD_POLICY_INVALID',
      field: 'password',
      message: passwordPolicyError,
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({ status: 400, errors });
  }

  next();
}

export {
  validateCompletePasswordAction,
  validateForgotPassword,
  validateLogin,
  validateVerifyPasswordAction,
};
