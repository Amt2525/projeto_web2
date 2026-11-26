import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { Logo } from './Logo';

const ROTULOS_DE_PERFIL = { ADMIN: 'Administrador', TECNICO: 'Técnico' } as const;

// NavLink marca o link da página atual com aria-current="page" (leitores de tela anunciam "página atual").
function Aba({ to, children, fim = false }: { to: string; children: string; fim?: boolean }) {
  return (
    <NavLink
      to={to}
      end={fim}
      className={({ isActive }) =>
        [
          'rounded-md px-3 py-1.5 text-sm font-medium',
          isActive ? 'bg-blue-50 text-blue-900 underline' : 'text-slate-900 hover:bg-slate-100',
        ].join(' ')
      }
    >
      {children}
    </NavLink>
  );
}

// Moldura das telas que exigem login: cabeçalho com navegação, usuário e "Sair".
export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function aoSair() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-white px-6 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-6">
          <Logo />
          <nav aria-label="Principal" className="flex gap-1">
            <Aba to="/" fim>
              Visão geral
            </Aba>
            <Aba to="/usinas">Usinas</Aba>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm text-slate-800">
            <span className="font-semibold">{user?.name}</span>
            {user && <span> ({ROTULOS_DE_PERFIL[user.role]})</span>}
          </p>
          <button
            type="button"
            onClick={aoSair}
            className="rounded-md border border-slate-500 px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
          >
            Sair
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-6">
        <Outlet />
      </main>
    </div>
  );
}
