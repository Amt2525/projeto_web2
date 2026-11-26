import { Link } from 'react-router';
import { ApiError } from '../api/client';

// Mostra por que uma tela não conseguiu carregar. Quando a sessão acabou (401 mesmo depois de tentar
// renovar), leva a pessoa de volta ao login em vez de repetir um erro que não se resolve sozinho.
export function ErroDeCarga({
  erro,
  aoTentarDeNovo,
}: {
  erro: unknown;
  aoTentarDeNovo?: () => void;
}) {
  if (erro instanceof ApiError && erro.status === 401) {
    return (
      <div role="alert" className="rounded-md border border-red-700 bg-red-50 p-4 text-red-800">
        <p className="mb-2 font-medium">Sua sessão expirou.</p>
        <Link to="/login" className="font-medium underline">
          Entrar novamente
        </Link>
      </div>
    );
  }
  const mensagem = erro instanceof ApiError ? erro.message : 'Ocorreu um erro inesperado.';
  return (
    <div role="alert" className="rounded-md border border-red-700 bg-red-50 p-4 text-red-800">
      <p className="mb-2 font-medium">{mensagem}</p>
      {aoTentarDeNovo && (
        <button type="button" onClick={aoTentarDeNovo} className="font-medium underline">
          Tentar de novo
        </button>
      )}
    </div>
  );
}
