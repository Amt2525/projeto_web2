import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './AuthContext';

// Envolve as telas que exigem login. Sem sessão, manda para /login guardando de onde a pessoa veio.
// Lembrete: isto melhora a experiência; a segurança de verdade está nas rotas da API.
export function ProtectedRoute() {
  const { status } = useAuth();
  const local = useLocation();

  if (status === 'carregando') {
    return (
      <p role="status" className="p-8 text-slate-700">
        Carregando...
      </p>
    );
  }
  if (status === 'anonimo') {
    return <Navigate to="/login" replace state={{ de: local.pathname }} />;
  }
  return <Outlet />;
}
