import { DataTypes } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import sequelize from "../config/db/db.js";

// Admin: usuario que administra un dealer system (owner o staff)
// NO es el super_admin de la plataforma — ese se maneja en otro servicio
const Admin = sequelize.define(
  "Admin",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // no puede haber dos admins con el mismo email
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false, // siempre se guarda hasheada, nunca texto plano
    },
    role: {
      type: DataTypes.ENUM("owner", "staff"),
      allowNull: false, // owner: control total — staff: permisos limitados
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true, // al crearse, el admin está activo por defecto
    },
  },
  {
    tableName: "admins",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at", // rastreamos cuándo se editó un admin
  },
);

export default Admin;
