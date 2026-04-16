import express from 'express';
import { OWNER_ROLE, STAFF_ROLE } from '../../constants/admin-roles.js';
import { requireAuth } from '../../middlewares/auth/require-auth.js';
import { authorizeRoles } from '../../middlewares/auth/authorize-roles.js';
import {
  validateCreateProduct,
  validateProductId,
  validateUpdateProduct,
} from '../../utils/validations/products/product.validation.js';
import productService from '../../services/products/product.service.js';

const productRoutes = express.Router();

// Estas rutas viven bajo /api/admin y controlan inventario interno del panel.
// Por eso primero exigimos sesion valida y despues limitamos a roles del panel.
productRoutes.use(requireAuth);
productRoutes.use(authorizeRoles(OWNER_ROLE, STAFF_ROLE));

function sendProductError(res, error) {
  return res.status(error.statusCode || 500).json({
    status: error.statusCode || 500,
    error: error.message,
    code: error.code,
  });
}

productRoutes.post('/products', validateCreateProduct, async (req, res) => {
  try {
    const product = await productService.create(req.body);

    if (!product) {
      return res.status(400).json({
        status: 400,
        error: 'Error creating product',
      });
    }

    return res.status(201).json({
      status: 201,
      data: product,
    });
  } catch (error) {
    return sendProductError(res, error);
  }
});

productRoutes.get('/products', async (req, res) => {
  try {
    const products = await productService.getAll();
    return res.status(200).json({ status: 200, data: products });
  } catch (error) {
    return sendProductError(res, error);
  }
});

productRoutes.get('/products/:id', validateProductId, async (req, res) => {
  try {
    const product = await productService.getById(req.params.id);
    return res.status(200).json({ status: 200, data: product });
  } catch (error) {
    return sendProductError(res, error);
  }
});

productRoutes.put(
  '/products/:id',
  validateProductId,
  validateUpdateProduct,
  async (req, res) => {
    try {
      const product = await productService.update(req.params.id, req.body);
      return res.status(200).json({ status: 200, data: product });
    } catch (error) {
      return sendProductError(res, error);
    }
  },
);

productRoutes.post('/products/:id/publish', validateProductId, async (req, res) => {
  try {
    const product = await productService.publish(req.params.id);
    return res.status(200).json({ status: 200, data: product });
  } catch (error) {
    return sendProductError(res, error);
  }
});

productRoutes.post('/products/:id/unpublish', validateProductId, async (req, res) => {
  try {
    const product = await productService.unpublish(req.params.id);
    return res.status(200).json({ status: 200, data: product });
  } catch (error) {
    return sendProductError(res, error);
  }
});

productRoutes.post('/products/:id/activate', validateProductId, async (req, res) => {
  try {
    const product = await productService.activate(req.params.id);
    return res.status(200).json({ status: 200, data: product });
  } catch (error) {
    return sendProductError(res, error);
  }
});

productRoutes.post('/products/:id/inactivate', validateProductId, async (req, res) => {
  try {
    const product = await productService.inactivate(req.params.id);
    return res.status(200).json({ status: 200, data: product });
  } catch (error) {
    return sendProductError(res, error);
  }
});

productRoutes.post('/products/:id/mark-sold', validateProductId, async (req, res) => {
  try {
    const product = await productService.markSold(req.params.id);
    return res.status(200).json({ status: 200, data: product });
  } catch (error) {
    return sendProductError(res, error);
  }
});

productRoutes.post('/products/:id/mark-available', validateProductId, async (req, res) => {
  try {
    const product = await productService.markAvailable(req.params.id);
    return res.status(200).json({ status: 200, data: product });
  } catch (error) {
    return sendProductError(res, error);
  }
});

productRoutes.delete('/products/:id', validateProductId, async (req, res) => {
  try {
    const product = await productService.delete(req.params.id);
    return res.status(200).json({ status: 200, data: product });
  } catch (error) {
    return sendProductError(res, error);
  }
});

export default productRoutes;
