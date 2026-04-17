import express from 'express';
import productService from '../../services/products/product.service.js';
import {
  validateProductId,
  validatePublicCatalogQuery,
} from '../../utils/validations/products/product.validation.js';

const publicCatalogRoutes = express.Router();

function sendPublicCatalogError(res, error) {
  return res.status(error.statusCode || 500).json({
    status: error.statusCode || 500,
    error: error.message,
    code: error.code,
  });
}

publicCatalogRoutes.get('/catalog/health', (_req, res) => {
  return res.status(200).json({
    status: 200,
    data: {
      message: 'Catalog public surface is alive.',
    },
  });
});

publicCatalogRoutes.get('/catalog/products', validatePublicCatalogQuery, async (req, res) => {
  try {
    const products = await productService.getPublicCatalog(req.catalogFilters);

    return res.status(200).json({
      status: 200,
      data: products,
    });
  } catch (error) {
    return sendPublicCatalogError(res, error);
  }
});

publicCatalogRoutes.get('/catalog/products/:id', validateProductId, async (req, res) => {
  try {
    const product = await productService.getPublicById(req.params.id);

    return res.status(200).json({
      status: 200,
      data: product,
    });
  } catch (error) {
    return sendPublicCatalogError(res, error);
  }
});

export default publicCatalogRoutes;
