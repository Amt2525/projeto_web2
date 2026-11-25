import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, type InitialEntry } from 'react-router';
import { vi } from 'vitest';
import { App } from '../App';
import { AuthProvider } from '../auth/AuthContext';

// Valores FICTÍCIOS, só para os testes.
export const USUARIO = {
  id: '0199a000-0000-7000-8000-000000000001',
  name: 'Ana Teste',
  email: 'ana@exemplo.com',
  role: 'TECNICO',
} as const;

export function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export function erroDaApi(status: number, code: string, message: string) {
  return json({ error: { code, message } }, status);
}

type Resposta = Response | Promise<Response>;
export type Rotas = Record<string, (init?: RequestInit) => Resposta>;

// Substitui o "fetch" por um falso: cada rota ("METODO /caminho") responde o que o teste definir.
// Rota não prevista = erro no teste (assim nenhuma chamada passa despercebida).
export function simularApi(rotas: Rotas) {
  const falso = vi.fn(async (url: string, init?: RequestInit) => {
    const chave = `${init?.method ?? 'GET'} ${url}`;
    const tratador = rotas[chave];
    if (!tratador) throw new Error(`Chamada sem simulação no teste: ${chave}`);
    return tratador(init);
  });
  vi.stubGlobal('fetch', falso);
  return falso;
}

// Rotas de "ninguém logado": /me e a renovação respondem 401.
export const SEM_SESSAO: Rotas = {
  'GET /api/auth/me': () => erroDaApi(401, 'NAO_AUTENTICADO', 'Faça login para continuar.'),
  'POST /api/auth/refresh': () => erroDaApi(401, 'NAO_AUTENTICADO', 'Faça login para continuar.'),
};

export const COM_SESSAO: Rotas = {
  'GET /api/auth/me': () => json({ user: USUARIO }),
};

export function renderizarApp(entrada: InitialEntry = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entrada]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
