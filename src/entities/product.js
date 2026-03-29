import { DataTypes } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import sequelize from "../config/db/db.js";

// Product: representa un vehículo publicado por un dealer
const Product = sequelize.define(
  "Product",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },

    // --- Datos del vehículo (obligatorios) ---
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mileage: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    price: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // --- Datos de la ficha técnica (obligatorios) ---
    drive_train: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fuel_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    vin_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true, // opcional: no todos los productos necesitan descripción
    },

    // --- Estados de publicación y venta ---
    publish_status: {
      type: DataTypes.ENUM("draft", "published"),
      defaultValue: "draft", // un producto nuevo NO se publica automáticamente
    },
    sale_status: {
      type: DataTypes.ENUM("available", "sold", "unavailable"),
      defaultValue: "available",
    },
  },
  {
    tableName: "products",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at", // rastreamos ediciones porque el admin modifica productos
  },
);

export default Product;
