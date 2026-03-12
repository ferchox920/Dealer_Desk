import express from 'express';

const pruebaRoutes = express.Router();

pruebaRoutes.get('/health', (_req, res) => {
  res.json({ message: 'API is SOO healthy!' });
});


export default pruebaRoutes;

