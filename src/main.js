import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import sequelize from './config/db/db.js';
import './entities/associations.entity.js';
import './entities/admin.entity.js';
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
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida.');

    // Sincronizar la base de datos con las entidades definidas
    // - DEV: alter=true (conveniente)
    // - PROD: sync "seguro" por defecto (crea tablas si faltan, sin ALTER automático)
    const syncMode = (process.env.DB_SYNC_MODE || (process.env.NODE_ENV === 'production' ? 'safe' : 'alter')).toLowerCase();
    if (syncMode === 'force') {
      await sequelize.sync({ force: true });
      console.log('⚠️ DB sync FORCE (tablas recreadas).');
    } else if (syncMode === 'alter') {
      await sequelize.sync({ alter: true });
      console.log('✅ DB sync ALTER completado.');
    } else {
      await sequelize.sync();
      console.log('✅ DB sync SAFE completado.');
    }

    expressApp.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error.message);
    process.exit(1);
  }
}

startServer();