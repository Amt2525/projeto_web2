import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { LoginInput, UserResponse } from '@solarsystem/shared';
import { buscarUsuarioLogado, entrar, sair } from '../api/auth';

type ValorDoContexto = {
  // 'carregando' = ainda perguntando à API se há sessão
  status: 'carregando' | 'anonimo' | 'autenticado';
  user: UserResponse | null;
  login: (dados: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<ValorDoContexto | null>(null);

const CHAVE_USUARIO = ['auth', 'usuario'] as const;

// Guarda "quem está logado" e oferece login/logout para qualquer tela.
// IMPORTANTE: isto é só conforto de interface. Quem realmente protege os dados é o back-end.
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const consulta = useQuery({
    queryKey: CHAVE_USUARIO,
    queryFn: buscarUsuarioLogado,
    retry: false,
    staleTime: Infinity,
  });

  const valor = useMemo<ValorDoContexto>(() => {
    const user = consulta.data ?? null;
    return {
      status: consulta.isPending ? 'carregando' : user ? 'autenticado' : 'anonimo',
      user,
      login: async (dados) => {
        const usuario = await entrar(dados);
        queryClient.setQueryData(CHAVE_USUARIO, usuario);
      },
      logout: async () => {
        try {
          await sair();
        } finally {
          // Mesmo se a chamada falhar, esquecemos tudo localmente: nada de dados do usuário anterior na tela.
          // Apagamos os dados em cache (menos a própria consulta de autenticação, que a tela ainda observa).
          queryClient.removeQueries({ predicate: (consulta) => consulta.queryKey[0] !== 'auth' });
          queryClient.setQueryData(CHAVE_USUARIO, null);
        }
      },
    };
  }, [consulta.data, consulta.isPending, queryClient]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): ValorDoContexto {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return contexto;
}
