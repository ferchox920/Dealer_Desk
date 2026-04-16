import { Navigate } from 'react-router';
import { APP_ROUTES } from '@/lib/config';
import { useAuth } from '@/hooks/useAuth';

export function RoleRoute({ allowedRoles = [], children, fallbackTo = APP_ROUTES.dashboard }) {
  const { admin } = useAuth();

  // Esta capa es una conveniencia de UX.
  // Si el rol no corresponde, redirigimos en el front.
  // Aun asi, la API debe seguir controlando permisos del lado servidor.
  if (!allowedRoles.includes(admin?.role)) {
    return <Navigate replace to={fallbackTo} />;
  }

  return children;
}
