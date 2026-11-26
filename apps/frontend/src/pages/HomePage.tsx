import { useEffect } from 'react';
import { Link } from 'react-router';

// Tela inicial PROVISÓRIA. O painel de verdade (indicadores, mapa, alarmes) é da Etapa 7.
// Não mostramos números inventados: só o que já existe de verdade.
export function HomePage() {
  useEffect(() => {
    document.title = 'Visão geral — SolarSystem';
  }, []);

  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold">Visão geral</h1>
      <p className="mb-4 text-slate-800">
        Esta tela ainda está em construção. Os indicadores e o mapa das usinas serão exibidos aqui.
      </p>
      <Link to="/usinas" className="font-medium text-blue-800 underline">
        Ver as usinas cadastradas
      </Link>
    </>
  );
}
