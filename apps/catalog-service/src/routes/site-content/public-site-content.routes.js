import express from 'express';
import { normalizePublicLanguage } from '../../constants/public-i18n.js';
import siteContentService from '../../services/site-content/site-content.service.js';

const publicSiteContentRoutes = express.Router();

function sendSiteContentError(res, error) {
  return res.status(error.statusCode || 500).json({
    status: error.statusCode || 500,
    error: error.message,
    code: error.code,
  });
}

publicSiteContentRoutes.get('/catalog/site-content', async (req, res) => {
  try {
    const content = await siteContentService.getPublic(normalizePublicLanguage(req.query.lang));
    return res.status(200).json({
      status: 200,
      data: content,
    });
  } catch (error) {
    return sendSiteContentError(res, error);
  }
});

export default publicSiteContentRoutes;
