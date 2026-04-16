import { Navigate } from 'react-router';
import { APP_ROUTES } from '@/lib/config';
import { useAuth } from '@/hooks/useAuth';
import { Loader } from '@/components/ui/Loader';

export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <Loader fullscreen label="Preparando acceso..." />;
  }

  if (isAuthenticated) {
    return <Navigate replace to={APP_ROUTES.dashboard} />;
  }

  return children;
}
