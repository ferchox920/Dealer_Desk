import express from 'express';
import Product from '../../entities/product.entity.js';

const internalPlanRoutes = express.Router();

internalPlanRoutes.get('/internal/plan-usage', async (_req, res) => {
  try {
    const [activeProperties, inactiveProperties] = await Promise.all([
      Product.countActiveForPlan(),
      Product.countInactiveForPlan(),
    ]);

    return res.status(200).json({
      status: 200,
      data: {
        activeProperties,
        inactiveProperties,
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.statusCode || 500,
      error: error.message,
      code: error.code,
    });
  }
});

export default internalPlanRoutes;
