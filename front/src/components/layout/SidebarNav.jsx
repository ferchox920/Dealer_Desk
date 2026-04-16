import { useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_ROLES, APP_ROUTES } from '@/lib/config';
import styles from '@/components/layout/SidebarNav.module.css';

export function SidebarNav() {
  const navigate = useNavigate();
  const { admin, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navigationItems = useMemo(() => {
    const items = [
      {
        label: 'Dashboard',
        description: 'Resumen y accesos clave',
        to: APP_ROUTES.dashboard,
      },
      {
        label: 'Inventario',
        description: 'Productos, fotos y estados',
        to: APP_ROUTES.inventory,
      },
    ];

    if (admin?.role === ADMIN_ROLES.owner) {
      items.push({
        label: 'Usuarios',
        description: 'Equipo, accesos y permisos',
        to: APP_ROUTES.users,
      });
    }

    return items;
  }, [admin?.role]);

  async function handleLogout() {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate(APP_ROUTES.login, { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brandBlock}>
        <p className="page-eyebrow">Dealer Desk</p>
        <h1 className={styles.brandTitle}>Panel privado</h1>
        <p className={styles.brandCopy}>
          Organiza tus productos, manten sus fichas al dia y entra rapido a las tareas pendientes.
        </p>
      </div>

      <nav className={styles.nav} aria-label="Navegacion principal">
        {navigationItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => [
              styles.navItem,
              isActive ? styles['navItem--active'] : '',
            ].filter(Boolean).join(' ')}
          >
            <span className={styles.navLabel}>{item.label}</span>
            <span className={styles.navDescription}>{item.description}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.sessionCard}>
        <div className={styles.sessionHeader}>
          <div>
            <span className={styles.sessionLabel}>Sesion actual</span>
            <strong className={styles.sessionName}>{admin?.name || 'Admin sin nombre'}</strong>
          </div>
          <StatusBadge tone={admin?.role === ADMIN_ROLES.owner ? 'primary' : 'neutral'}>
            {admin?.role || 'sin rol'}
          </StatusBadge>
        </div>

        <p className={styles.sessionMeta}>{admin?.email || 'Sin email cargado'}</p>

        <Button isBlock isLoading={isLoggingOut} onClick={handleLogout} variant="secondary">
          Cerrar sesion
        </Button>
      </div>
    </aside>
  );
}
