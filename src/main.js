import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import pruebaRoutes from './routes/prueba.routes.js';
import listingRoutes from './routes/admin/listings/listing.routes.js';
import listingImageRoutes from './routes/admin/listings-images/listing-image.routes.js';


const expressApp = express();

expressApp.use(cors());
expressApp.use(express.json());
expressApp.use(morgan('dev'));

expressApp.use('/api', pruebaRoutes);
expressApp.use('/api/admin', listingRoutes);
expressApp.use('/api/admin', listingImageRoutes);

const PORT = process.env.PORT || 3000;

expressApp.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});