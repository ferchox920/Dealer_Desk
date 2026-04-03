// ============================================================================
// cloudinary.js
//
// Configura la conexión con Cloudinary (servicio de almacenamiento de imágenes).
// Las credenciales vienen de las variables de entorno (.env).
// Se usa la versión v2 de la SDK.
// ============================================================================

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
