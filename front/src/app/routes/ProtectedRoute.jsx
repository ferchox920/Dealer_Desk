import { Navigate, Outlet } from 'react-router';
import { APP_ROUTES } from '@/lib/config';
import { useAuth } from '@/hooks/useAuth';
import { Loader } from '@/components/ui/Loader';

export function ProtectedRoute({ children }) {
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <Loader fullscreen label="Validando sesion..." />;
  }

  if (!isAuthenticated) {
    return <Navigate replace to={APP_ROUTES.login} />;
  }

  // "Proteger" aqui significa proteger la navegacion del front.
  // Esto evita que un usuario sin sesion vea pantallas privadas,
  // pero no reemplaza la seguridad real del backend.
  return children || <Outlet />;
}
