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
import { trimRequestStrings } from './middlewares/http/trim-request-strings.js';
import pruebaRoutes from './routes/prueba.routes.js';

const expressApp = express();
const areLegacyAdminRoutesEnabled = process.env.ENABLE_LEGACY_MONOLITH_ROUTES === 'true';

expressApp.disable('x-powered-by');
// credentials:true es importante para que el navegador acepte enviar/recibir
// la cookie HttpOnly del refresh token desde el panel admin.
expressApp.use(cors({
  origin: process.env.ADMIN_APP_ORIGIN || true,
  credentials: true,
}));
expressApp.use(express.json());
// Este middleware corta espacios accidentales en strings del body/query
// antes de que lleguen a validaciones y services.
expressApp.use(trimRequestStrings);
expressApp.use(morgan('dev'));

expressApp.use('/api', pruebaRoutes);

const PORT = process.env.PORT || 3000;

function mountDisabledLegacyAdminRoutes() {
  expressApp.use('/api/admin', (_req, res) => {
    return res.status(410).json({
      status: 410,
      error: 'Legacy monolith admin routes are disabled. Use the microservices stack through the gateway instead.',
      code: 'LEGACY_MONOLITH_ROUTES_DISABLED',
    });
  });
}

async function mountLegacyAdminRoutes() {
  if (!areLegacyAdminRoutesEnabled) {
    mountDisabledLegacyAdminRoutes();
    return;
  }

  console.warn('Legacy monolith admin routes are enabled.');

  const [
    { default: authRoutes },
    { default: userRoutes },
    { default: productRoutes },
    { default: productImageRoutes },
  ] = await Promise.all([
    import('./routes/admin/auth/auth.routes.js'),
    import('./routes/admin/users/user.routes.js'),
    import('./routes/admin/products/product.routes.js'),
    import('./routes/admin/product-images/product-image.routes.js'),
  ]);

  expressApp.use('/api/admin/auth', authRoutes);
  expressApp.use('/api/admin/users', userRoutes);
  expressApp.use('/api/admin', productRoutes);
  expressApp.use('/api/admin', productImageRoutes);
}

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

    await mountLegacyAdminRoutes();

    expressApp.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Legacy monolith admin routes ${areLegacyAdminRoutesEnabled ? 'enabled' : 'disabled'}.`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error.message);
    process.exit(1);
  }
}

startServer();
