import { Outlet } from 'react-router';
import { SidebarNav } from '@/components/layout/SidebarNav';
import styles from '@/components/layout/AppShellLayout.module.css';

export function AppShellLayout() {
  return (
    <div className={styles.shell}>
      <div className={styles.frame}>
        <SidebarNav />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
