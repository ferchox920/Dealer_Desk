import express from 'express';

const pruebaRoutes = express.Router();

pruebaRoutes.get('/health', (_req, res) => {
  res.json({
    status: 200,
    data: {
      message: 'Legacy monolith is alive.',
      mode: 'legacy',
    },
  });
});


export default pruebaRoutes;
