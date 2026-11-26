import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { Logo } from '../components/Logo';

const ROTULOS_DE_PERFIL = { ADMIN: 'Administrador', TECNICO: 'Técnico' } as const;

// Tela inicial PROVISÓRIA. O painel de verdade (indicadores, mapa, alarmes) é da Etapa 7.
// Não mostramos números inventados: só o que já existe de verdade.
export function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Visão geral — SolarSystem';
  }, []);

  async function aoSair() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex items-center justify-between bg-white px-6 py-3 shadow-sm">
        <Logo />
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
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="mb-2 text-2xl font-semibold">Visão geral</h1>
        <p className="text-slate-800">
          Esta tela ainda está em construção. Os indicadores e o mapa das usinas serão exibidos
          aqui.
        </p>
      </main>
    </div>
  );
}
