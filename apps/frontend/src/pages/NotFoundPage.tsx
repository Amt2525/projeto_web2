import { useEffect } from 'react';
import { Link } from 'react-router';

export function NotFoundPage() {
  useEffect(() => {
    document.title = 'Página não encontrada — SolarSystem';
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-4 text-center">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Página não encontrada</h1>
        <p className="mb-4 text-slate-800">O endereço acessado não existe.</p>
        <Link to="/" className="font-medium text-blue-800 underline">
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
