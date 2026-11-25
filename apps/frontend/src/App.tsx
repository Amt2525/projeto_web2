import { useEffect, useState } from 'react';
import { healthResponseSchema } from '@solarsystem/shared';

type EstadoApi = 'verificando' | 'online' | 'offline';

export function App() {
  const [estadoApi, setEstadoApi] = useState<EstadoApi>('verificando');

  useEffect(() => {
    // Evita atualizar o estado se o componente sair da tela antes da resposta chegar.
    let ativo = true;

    async function verificarApi() {
      try {
        const resposta = await fetch('/api/health');
        const dados: unknown = await resposta.json();
        // Valida o formato da resposta com o mesmo esquema que o back-end usa.
        const valido = resposta.ok && healthResponseSchema.safeParse(dados).success;
        if (ativo) setEstadoApi(valido ? 'online' : 'offline');
      } catch {
        if (ativo) setEstadoApi('offline');
      }
    }

    void verificarApi();
    return () => {
      ativo = false;
    };
  }, []);

  const textos: Record<EstadoApi, string> = {
    verificando: 'Verificando a API...',
    online: 'API online',
    offline: 'API indisponível',
  };

  return (
    <main>
      <h1>SolarSystem</h1>
      <p>Monitoramento de usinas fotovoltaicas.</p>
      <p role="status">{textos[estadoApi]}</p>
    </main>
  );
}
