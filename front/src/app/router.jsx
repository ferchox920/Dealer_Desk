import { createBrowserRouter, Navigate } from 'react-router';
import { AppShellLayout } from '@/components/layout/AppShellLayout';
import { LoginPage } from '@/pages/LoginPage/LoginPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage/ForgotPasswordPage';
import { PasswordActionPage } from '@/pages/PasswordActionPage/PasswordActionPage';
import { DashboardPage } from '@/pages/DashboardPage/DashboardPage';
import { InventoryPage } from '@/pages/InventoryPage/InventoryPage';
import { ProductCreatePage } from '@/pages/ProductCreatePage/ProductCreatePage';
import { ProductEditPage } from '@/pages/ProductEditPage/ProductEditPage';
import { UsersPage } from '@/pages/UsersPage/UsersPage';
import { ProtectedRoute } from '@/app/routes/ProtectedRoute';
import { PublicOnlyRoute } from '@/app/routes/PublicOnlyRoute';
import { RoleRoute } from '@/app/routes/RoleRoute';
import { ADMIN_ROLES, APP_ROUTES } from '@/lib/config';

// La idea del router es separar dos mundos:
// - publico: login
// - privado: dashboard, inventario y usuarios dentro del mismo layout
//
// El layout privado vive una sola vez y renderiza sus paginas hijas con <Outlet />.
export const router = createBrowserRouter([
  {
    path: APP_ROUTES.login,
    children: [
      {
        index: true,
        element: (
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        ),
      },
      {
        path: 'forgot-password',
        element: <ForgotPasswordPage />,
      },
      {
        path: 'password-action',
        element: <PasswordActionPage />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppShellLayout />,
            children: [
              {
                path: 'dashboard',
                element: <DashboardPage />,
              },
              {
                path: 'inventory',
                element: <InventoryPage />,
              },
              {
                path: 'inventory/new',
                element: <ProductCreatePage />,
              },
              {
                path: 'inventory/:productId/edit',
                element: <ProductEditPage />,
              },
              {
                path: 'products/new',
                element: <Navigate replace to={APP_ROUTES.inventoryNew} />,
              },
              {
                path: 'users',
                element: (
                  <RoleRoute allowedRoles={[ADMIN_ROLES.owner]}>
                    <UsersPage />
                  </RoleRoute>
                ),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate replace to={APP_ROUTES.login} />,
  },
]);
