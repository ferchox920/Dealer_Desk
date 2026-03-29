import { DataTypes } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import sequelize from "../config/db/db.js";

// ProductImage: imagen asociada a un producto (almacenada en Cloudinary)
const ProductImage = sequelize.define(
  "ProductImage",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false, // toda imagen pertenece a un producto
      references: {
        model: 'products',
        key: 'id',
      },
    },
    cloudinary_public_id: {
      type: DataTypes.STRING,
      allowNull: false, // ID único en Cloudinary (necesario para eliminar/transformar)
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false, // URL pública de la imagen servida por Cloudinary CDN
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0, // orden de la imagen en la galería (0 = primera posición)
    },
    is_cover: {
      type: DataTypes.BOOLEAN,
      defaultValue: false, // true = imagen principal / portada del producto
    },
  },
  {
    tableName: "product_images",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false, // las imágenes se crean o eliminan, no se editan
  },
);

export default ProductImage;
