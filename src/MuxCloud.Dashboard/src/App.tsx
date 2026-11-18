import { Suspense, lazy, type ReactNode } from 'react';
import { RouteErrorPage } from './pages/RouteErrorPage';
import { Navigate, Outlet, RouterProvider, createBrowserRouter, useLocation, useMatch } from 'react-router';
import { Loading } from './components/Spinner';
import { Shell } from './components/Shell';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EventsProvider } from './context/EventsContext';
import { PageTitleProvider } from './context/PageTitleContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { useTranslation } from 'react-i18next';
import { ForgotPage } from './pages/auth/ForgotPage';
import { LoginPage } from './pages/auth/LoginPage';
import { ResetPage } from './pages/auth/ResetPage';
import { SignupPage } from './pages/auth/SignupPage';
import { VerifyPage } from './pages/auth/VerifyPage';
import { MachinesPage } from './pages/machines/MachinesPage';
import { MachineDetailPage } from './pages/machines/MachineDetailPage';
import { NotFoundPage } from './pages/NotFoundPage';

const ConversationsPage = lazy(() =>
  import('./pages/conversations/ConversationsPage').then((m) => ({ default: m.ConversationsPage })),
);
const AccountPage = lazy(() => import('./pages/account/AccountPage').then((m) => ({ default: m.AccountPage })));
const BillingPage = lazy(() => import('./pages/account/BillingPage').then((m) => ({ default: m.BillingPage })));
const AdminOverviewPage = lazy(() =>
  import('./pages/admin/AdminOverviewPage').then((m) => ({ default: m.AdminOverviewPage })),
);
const UsersPage = lazy(() => import('./pages/admin/UsersPage').then((m) => ({ default: m.UsersPage })));
const AdminMachinesPage = lazy(() =>
  import('./pages/admin/AdminMachinesPage').then((m) => ({ default: m.AdminMachinesPage })),
);
const PlansPage = lazy(() => import('./pages/admin/PlansPage').then((m) => ({ default: m.PlansPage })));
const OverridesPage = lazy(() => import('./pages/admin/OverridesPage').then((m) => ({ default: m.OverridesPage })));
const AuditPage = lazy(() => import('./pages/admin/AuditPage').then((m) => ({ default: m.AuditPage })));
const RequestHistoryPage = lazy(() =>
  import('./pages/admin/RequestHistoryPage').then((m) => ({ default: m.RequestHistoryPage })),
);
const ExplorerPage = lazy(() => import('./pages/admin/ExplorerPage').then((m) => ({ default: m.ExplorerPage })));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const LegalPage = lazy(() => import('./pages/legal/LegalPage').then((m) => ({ default: m.LegalPage })));

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}

/** Signed-in area: waits for session restore, redirects anonymous visitors to /login, renders the shell. */
function AppLayout() {
  const { status } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const machineDetail = useMatch('/machines/:id');
  if (status === 'loading') return <Loading label={t('auth.restoring')} />;
  if (status === 'anonymous')
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return (
    <EventsProvider>
      <Shell flush={!!machineDetail}>
        <Lazy>
          <Outlet />
        </Lazy>
      </Shell>
    </EventsProvider>
  );
}

function AdminOnly() {
  const { user } = useAuth();
  return user?.isAdmin ? <Outlet /> : <NotFoundPage />;
}

function PublicOnly() {
  const { status } = useAuth();
  const { t } = useTranslation();
  if (status === 'loading') return <Loading label={t('auth.restoring')} />;
  return <Outlet />;
}

const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <PublicOnly />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/signup', element: <SignupPage /> },
          { path: '/verify', element: <VerifyPage /> },
          { path: '/forgot', element: <ForgotPage /> },
          { path: '/reset', element: <ResetPage /> },
        ],
      },
      {
        path: '/legal/terms',
        element: (
          <Lazy>
            <LegalPage doc="terms" />
          </Lazy>
        ),
      },
      {
        path: '/legal/privacy',
        element: (
          <Lazy>
            <LegalPage doc="privacy" />
          </Lazy>
        ),
      },
      {
        path: '/legal/account-deletion',
        element: (
          <Lazy>
            <LegalPage doc="account-deletion" />
          </Lazy>
        ),
      },
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <Navigate to="/machines" replace /> },
          { path: '/machines', element: <MachinesPage /> },
          { path: '/machines/:id', element: <MachineDetailPage /> },
          { path: '/conversations', element: <ConversationsPage /> },
          { path: '/account', element: <AccountPage /> },
          { path: '/account/billing', element: <BillingPage /> },
          {
            element: <AdminOnly />,
            children: [
              { path: '/admin', element: <AdminOverviewPage /> },
              { path: '/admin/users', element: <UsersPage /> },
              { path: '/admin/machines', element: <AdminMachinesPage /> },
              { path: '/admin/plans', element: <PlansPage /> },
              { path: '/admin/overrides', element: <OverridesPage /> },
              { path: '/admin/audit', element: <AuditPage /> },
              { path: '/admin/requests', element: <RequestHistoryPage /> },
              { path: '/admin/explorer', element: <ExplorerPage /> },
              { path: '/admin/settings', element: <SettingsPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <PageTitleProvider>
            <RouterProvider router={router} />
          </PageTitleProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
