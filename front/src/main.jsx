import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { router } from '@/app/router';
import '@/styles/tokens.css';
import '@/styles/reset.css';
import '@/styles/base.css';

// main.jsx es el punto de entrada del front:
// 1. monta React en #root
// 2. envuelve toda la app con el contexto global de auth
// 3. entrega el control de pantallas al router
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
);
