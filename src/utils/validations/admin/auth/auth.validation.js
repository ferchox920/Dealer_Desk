// ============================================================================
// auth.validation.js
//
// Validaciones mínimas para login.
// ============================================================================

function validateLogin(req, res, next) {
  const errors = [];
  const { email, password } = req.body;

  if (typeof email !== 'string' || email.trim().length === 0) {
    errors.push({
      code: 'AUTH_EMAIL_INVALID',
      field: 'email',
      message: 'The email is required.',
    });
  }

  if (typeof password !== 'string' || password.trim().length < 8) {
    errors.push({
      code: 'AUTH_PASSWORD_INVALID',
      field: 'password',
      message: 'The password must contain at least 8 characters.',
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({ status: 400, errors });
  }

  next();
}

export { validateLogin };
