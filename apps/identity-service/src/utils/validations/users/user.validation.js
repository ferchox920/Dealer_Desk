import { ADMIN_ROLES, isAdminRole } from '../../../constants/admin-roles.js';
import { getPasswordPolicyError } from '../../../utils/security/password.util.js';
import { createUuidParamValidator } from '../shared/common.validation.js';

function validateOptionalString(body, field, errors) {
  if (body[field] !== undefined && typeof body[field] !== 'string') {
    errors.push({
      code: `USER_${field.toUpperCase()}_INVALID`,
      field,
      message: `The ${field} must be a string.`,
    });
  }
}

function validateOptionalBoolean(body, field, errors) {
  if (body[field] !== undefined && typeof body[field] !== 'boolean') {
    errors.push({
      code: `USER_${field.toUpperCase()}_INVALID`,
      field,
      message: `The ${field} must be a boolean.`,
    });
  }
}

function validateOptionalRole(body, field, errors) {
  if (body[field] !== undefined && !isAdminRole(body[field])) {
    errors.push({
      code: 'USER_ROLE_INVALID',
      field,
      message: `The ${field} must be one of: ${ADMIN_ROLES.join(', ')}.`,
    });
  }
}

function validateRequiredString(body, field, errors) {
  if (typeof body[field] !== 'string' || body[field].trim().length === 0) {
    errors.push({
      code: `USER_${field.toUpperCase()}_REQUIRED`,
      field,
      message: `The ${field} is required.`,
    });
  }
}

function validateOptionalNonEmptyString(body, field, errors) {
  if (body[field] !== undefined && (typeof body[field] !== 'string' || body[field].trim().length === 0)) {
    errors.push({
      code: `USER_${field.toUpperCase()}_INVALID`,
      field,
      message: `The ${field} must be a non-empty string.`,
    });
  }
}

function validatePassword(body, field, errors) {
  const value = body[field];

  if (value === undefined) {
    return;
  }

  if (typeof value !== 'string') {
    errors.push({
      code: 'USER_PASSWORD_INVALID',
      field,
      message: 'The password must be a string.',
    });
    return;
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return;
  }

  const passwordPolicyError = getPasswordPolicyError(trimmedValue);

  if (passwordPolicyError) {
    errors.push({
      code: 'USER_PASSWORD_INVALID',
      field,
      message: passwordPolicyError,
    });
  }
}

function validateCreateUser(req, res, next) {
  const errors = [];
  const body = req.body;

  validateOptionalString(body, 'name', errors);
  validateRequiredString(body, 'email', errors);
  validatePassword(body, 'password', errors);
  validateOptionalRole(body, 'role', errors);
  validateOptionalBoolean(body, 'is_active', errors);

  if (body.role === undefined) {
    errors.push({
      code: 'USER_ROLE_REQUIRED',
      field: 'role',
      message: 'The role is required.',
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({ status: 400, errors });
  }

  next();
}

function validateUpdateUser(req, res, next) {
  const errors = [];
  const body = req.body;
  const editableFields = ['name', 'email', 'password', 'role', 'is_active'];

  validateOptionalString(body, 'name', errors);
  validateOptionalNonEmptyString(body, 'email', errors);
  validatePassword(body, 'password', errors);
  validateOptionalRole(body, 'role', errors);
  validateOptionalBoolean(body, 'is_active', errors);

  const hasAtLeastOneField = editableFields.some((field) => body[field] !== undefined);

  if (!hasAtLeastOneField) {
    errors.push({
      code: 'USER_UPDATE_EMPTY',
      field: 'body',
      message: 'At least one editable field is required.',
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({ status: 400, errors });
  }

  next();
}

const validateUserId = createUuidParamValidator({
  paramName: 'id',
  code: 'USER_ID_INVALID',
  responseShape: 'status',
});

export { validateCreateUser, validateUpdateUser, validateUserId };
