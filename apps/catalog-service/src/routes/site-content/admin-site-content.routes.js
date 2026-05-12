import express from 'express';
import multer from 'multer';
import { OWNER_ROLE } from '../../constants/admin-roles.js';
import siteLogoUpload from '../../config/multer/site-logo.multer.js';
import { requireAuth } from '../../middlewares/auth/require-auth.js';
import { authorizeRoles } from '../../middlewares/auth/authorize-roles.js';
import siteContentService from '../../services/site-content/site-content.service.js';
import { createHttpError } from '../../utils/errors/app-error.util.js';
import { validateUpdateSiteContent } from '../../utils/validations/site-content/site-content.validation.js';

const adminSiteContentRoutes = express.Router();

adminSiteContentRoutes.use(requireAuth);
adminSiteContentRoutes.use(authorizeRoles(OWNER_ROLE));

function sendSiteContentError(res, error) {
  return res.status(error.statusCode || 500).json({
    status: error.statusCode || 500,
    error: error.message,
    code: error.code,
    errors: Array.isArray(error.errors) ? error.errors : undefined,
  });
}

function handleLogoUpload(req, res, next) {
  siteLogoUpload.single('logo')(req, res, (error) => {
    if (!error && req.file) {
      return next();
    }

    if (!error && !req.file) {
      return sendSiteContentError(res, createHttpError(400, 'A logo image is required.', 'SITE_LOGO_REQUIRED'));
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return sendSiteContentError(
        res,
        createHttpError(400, 'The logo must be 5MB or less.', 'SITE_LOGO_FILE_TOO_LARGE'),
      );
    }

    return sendSiteContentError(
      res,
      createHttpError(400, error.message || 'Invalid logo file.', 'SITE_LOGO_UPLOAD_INVALID'),
    );
  });
}

adminSiteContentRoutes.get('/site-content', async (_req, res) => {
  try {
    const content = await siteContentService.get();
    return res.status(200).json({ status: 200, data: content });
  } catch (error) {
    return sendSiteContentError(res, error);
  }
});

adminSiteContentRoutes.put('/site-content', validateUpdateSiteContent, async (req, res) => {
  try {
    const content = await siteContentService.update(req.body);
    return res.status(200).json({ status: 200, data: content });
  } catch (error) {
    return sendSiteContentError(res, error);
  }
});

adminSiteContentRoutes.patch('/site-content', async (req, res) => {
  try {
    const content = await siteContentService.update(req.body);
    return res.status(200).json({ status: 200, data: content });
  } catch (error) {
    return sendSiteContentError(res, error);
  }
});

adminSiteContentRoutes.post('/site-content/logo', handleLogoUpload, async (req, res) => {
  try {
    const content = await siteContentService.uploadLogo(req.file);
    return res.status(200).json({ status: 200, data: content });
  } catch (error) {
    return sendSiteContentError(res, error);
  }
});

adminSiteContentRoutes.delete('/site-content/logo', async (_req, res) => {
  try {
    const content = await siteContentService.deleteLogo();
    return res.status(200).json({ status: 200, data: content });
  } catch (error) {
    return sendSiteContentError(res, error);
  }
});

export default adminSiteContentRoutes;
