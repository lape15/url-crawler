import { LoginPage } from './pages/auth/login';
import { RegisterPage } from './pages/auth/register';
import { PostDashboard } from './pages/dashboard/dashboard';

export interface AppRoute {
  path: string;
  element: React.ReactNode;
  children?: AppRoute[];
  index?: boolean;
}
const isAuthenticated = !!localStorage.getItem('token');

export const routes: AppRoute[] = [
  { path: '/', element: <LoginPage />, index: true },
  { path: '/register', element: <RegisterPage /> },
  {
    path: '/dashboard',
    element: isAuthenticated ? <PostDashboard /> : <LoginPage />,
  },
];
