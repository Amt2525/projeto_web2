import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@solarsystem/shared';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Logo } from '../components/Logo';
import { Button } from '../components/ui/Button';
import { PasswordField } from '../components/ui/PasswordField';
import { TextField } from '../components/ui/TextField';

// Só aceitamos destinos internos do sistema ("/alguma-coisa"). Isso evita o "redirecionamento aberto",
// em que alguém monta um link de login que, depois de entrar, leva a um site malicioso.
function destinoSeguro(estado: unknown): string {
  const de = (estado as { de?: unknown } | null)?.de;
  return typeof de === 'string' && de.startsWith('/') && !de.startsWith('//') ? de : '/';
}

function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ApiError) {
    if (erro.status === 429)
      return 'Muitas tentativas de login. Aguarde um minuto e tente novamente.';
    // As mensagens da API são escritas para o usuário e não revelam detalhes internos.
    return erro.message;
  }
  return 'Ocorreu um erro inesperado. Tente novamente.';
}

export function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    // A MESMA validação que o servidor usa (pacote shared). A do servidor é a que vale; esta é só conforto.
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    document.title = 'Entrar — SolarSystem';
  }, []);

  const destino = destinoSeguro(location.state);
  if (status === 'autenticado') return <Navigate to={destino} replace />;

  const aoEnviar = handleSubmit(async (dados) => {
    setErroGeral(null);
    try {
      await login(dados);
      navigate(destino, { replace: true });
    } catch (erro) {
      setErroGeral(mensagemDeErro(erro));
      // Por segurança e praticidade: limpa a senha digitada e volta o foco para ela.
      setValue('password', '');
      setFocus('password');
    }
  });

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="mb-1 text-center text-2xl font-semibold">Entrar</h1>
        <p className="mb-6 text-center text-sm text-slate-700">
          Acesse o monitoramento das usinas fotovoltaicas.
        </p>

        {erroGeral && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-red-700 bg-red-50 p-3 text-sm font-medium text-red-800"
          >
            {erroGeral}
          </div>
        )}

        {/* noValidate: usamos as nossas mensagens, em português, e não as do navegador. */}
        <form onSubmit={aoEnviar} noValidate className="space-y-4">
          <TextField
            label="E-mail"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            erro={errors.email?.message}
            {...register('email')}
          />
          <PasswordField
            label="Senha"
            autoComplete="current-password"
            erro={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" carregando={isSubmitting} textoCarregando="Entrando...">
            Entrar
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-700">
          Não tem acesso? Solicite ao administrador do sistema.
        </p>
      </div>
    </main>
  );
}
