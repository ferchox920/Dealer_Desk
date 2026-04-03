// ============================================================================
// main.js - Punto de entrada del servidor
//
// 1. Carga variables de entorno (.env)
// 2. Registra middlewares globales (CORS, JSON parser, Morgan logger)
// 3. Monta las rutas
// 4. Conecta a PostgreSQL y sincroniza tablas
// 5. Inicia el servidor en el puerto configurado
// ============================================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import db from './config/db/db.js';
import pruebaRoutes from './routes/prueba.routes.js';
import productRoutes from './routes/admin/products/product.routes.js';
import productImageRoutes from './routes/admin/product-images/product-image.routes.js';

const expressApp = express();

expressApp.use(cors());
expressApp.use(express.json());
expressApp.use(morgan('dev'));

expressApp.use('/api', pruebaRoutes);
expressApp.use('/api/admin', productRoutes);
expressApp.use('/api/admin', productImageRoutes);

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await db.authenticate();
    console.log('Conexion a la base de datos establecida.');

    // Usa DB_SYNC_MODE=force solo cuando quieras borrar toda la BBDD y empezar de cero en desarrollo.
    // En el dia a dia dejalo en safe para no perder datos al reiniciar el servidor.
    const syncMode = (process.env.DB_SYNC_MODE || 'safe').toLowerCase();

    if (syncMode === 'force') {
      await db.sync({ force: true });
      console.log('DB sync FORCE completado.');
    } else {
      await db.sync();
      console.log('DB sync SAFE completado.');
    }

    expressApp.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error.message);
    process.exit(1);
  }
}

startServer();
