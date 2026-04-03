import multer from "multer";

// Almacenamiento en memoria: el archivo NO se guarda en disco,
// se mantiene en un buffer temporal para enviarlo directo a Cloudinary
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // máximo 5MB por imagen
  },
  fileFilter: (_req, file, callback) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (allowedTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error("Only JPEG, PNG and WEBP images are allowed."));
    }
  },
});

export default upload;
