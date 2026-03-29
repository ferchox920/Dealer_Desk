import express from "express";
import {
  validateCreateProduct,
  validateProductId,
} from "../../../utils/validations/admin/products/product.validation.js";
import productService from "../../../services/admin/products/product.service.js";
import { validatorBodyCreateError } from "../../../utils/errors/handlerError.js";


const productRoutes = express.Router();

// Create product
productRoutes.post(
  "/products",
  validateCreateProduct,
  validatorBodyCreateError,
  async (req, res) => {
    try {
      const product = await productService.create(req.body);

      if (!product) {
        return res.status(400).json({
          status: 400,
          error: "Error creating product"
        });
      }

      return res.status(201).json({
        status: 201,
        data: product
      });

    } catch (error) {
      return res.status(500).json({
        status: 500,
        error: error.message
      });
    }
  }
);

// Obtener todos los products
productRoutes.get("/products", async (req, res) => {
  try {
    const products = await productService.getAll();
    res.status(200).json({ status: 200, data: products });
  } catch (error) {
    res.status(500).json({ status: 500, error: error.message });
  }
});

// Obtener un product por ID
productRoutes.get("/products/:id", validateProductId, async (req, res) => {
  try {
    const product = await productService.getById(req.params.id);
    res.status(200).json({ status: 200, data: product });
  } catch (error) {
    res.status(404).json({ status: 404, error: error.message });
  }
});

// Update product por ID
productRoutes.put(
  "/products/:id",
  validateProductId,
  validateCreateProduct,
  async (req, res) => {
    try {
      const product = await productService.update(req.params.id, req.body);
      res.status(200).json({ status: 200, data: product });
    } catch (error) {
      res.status(404).json({ status: 404, error: error.message });
    }
  },
);

// Delete product por ID
productRoutes.delete("/products/:id", validateProductId, async (req, res) => {
  try {
    const product = await productService.delete(req.params.id);
    res.status(200).json({ status: 200, data: product });
  } catch (error) {
    res.status(404).json({ status: 404, error: error.message });
  }
});

export default productRoutes;
