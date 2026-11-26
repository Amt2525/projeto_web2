import { useEffect, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { UFS } from '@solarsystem/shared';
import { listarUsinas, type FiltrosDeUsinas } from '../api/plants';
import { ErroDeCarga } from '../components/ErroDeCarga';
import { Button, classesDoBotao } from '../components/ui/Button';
import { SelectField } from '../components/ui/SelectField';
import { TextField } from '../components/ui/TextField';
import { formatarKwp } from '../lib/formatar';

// Os filtros ficam na URL (?q=...&state=MG&page=2): dá para recarregar a página, usar o botão
// "voltar" e mandar o link da busca para outra pessoa.
function lerFiltros(params: URLSearchParams): FiltrosDeUsinas {
  const pagina = Number(params.get('page'));
  return {
    q: params.get('q') ?? '',
    state: params.get('state') ?? '',
    // Padrão: só as usinas ativas. Na URL, "all" significa todas (aqui vira '' = sem filtro).
    // Qualquer outro valor digitado na URL é ignorado, e a API nunca recebe algo inesperado.
    active:
      params.get('active') === 'all' ? '' : params.get('active') === 'false' ? 'false' : 'true',
    page: Number.isInteger(pagina) && pagina >= 1 ? pagina : 1,
  };
}

export function PlantsListPage() {
  const [params, setParams] = useSearchParams();
  const filtros = lerFiltros(params);

  useEffect(() => {
    document.title = 'Usinas — SolarSystem';
  }, []);

  const consulta = useQuery({
    queryKey: ['plants', 'lista', filtros],
    queryFn: () => listarUsinas(filtros),
  });

  function aplicar(novos: Partial<FiltrosDeUsinas>) {
    const juntos = { ...filtros, ...novos };
    const proximos = new URLSearchParams();
    if (juntos.q) proximos.set('q', juntos.q);
    if (juntos.state) proximos.set('state', juntos.state);
    proximos.set('active', juntos.active === '' ? 'all' : juntos.active);
    if (juntos.page > 1) proximos.set('page', String(juntos.page));
    setParams(proximos);
  }

  function aoFiltrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const situacao = String(dados.get('active') ?? 'true');
    aplicar({
      q: String(dados.get('q') ?? '').trim(),
      state: String(dados.get('state') ?? ''),
      active: situacao === 'all' ? '' : situacao,
      page: 1,
    });
  }

  const dados = consulta.data;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Usinas</h1>
        <Link to="/usinas/nova" className={classesDoBotao('primario', false)}>
          Cadastrar usina
        </Link>
      </div>

      {/* A "key" recria o formulário quando a URL muda (voltar/avançar), mantendo os campos coerentes. */}
      <form
        key={params.toString()}
        onSubmit={aoFiltrar}
        role="search"
        aria-label="Filtrar usinas"
        className="mb-4 grid gap-3 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-[1fr_8rem_10rem_auto] sm:items-end"
      >
        <TextField
          label="Buscar por nome, cliente ou cidade"
          name="q"
          defaultValue={filtros.q}
          maxLength={100}
          autoComplete="off"
        />
        <SelectField label="UF" name="state" defaultValue={filtros.state}>
          <option value="">Todas</option>
          {UFS.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Situação"
          name="active"
          defaultValue={filtros.active === '' ? 'all' : filtros.active}
        >
          <option value="true">Ativas</option>
          <option value="false">Inativas</option>
          <option value="all">Todas</option>
        </SelectField>
        <Button type="submit" larga={false}>
          Filtrar
        </Button>
      </form>

      {consulta.isPending && (
        <p role="status" className="p-4 text-slate-700">
          Carregando usinas...
        </p>
      )}

      {consulta.isError && (
        <ErroDeCarga erro={consulta.error} aoTentarDeNovo={() => void consulta.refetch()} />
      )}

      {dados && dados.items.length === 0 && (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="mb-3 text-slate-800">Nenhuma usina encontrada com estes filtros.</p>
          <Link to="/usinas/nova" className="font-medium text-blue-800 underline">
            Cadastrar uma usina
          </Link>
        </div>
      )}

      {dados && dados.items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <caption className="sr-only">
                Usinas cadastradas, página {dados.page} de {dados.totalPages}
              </caption>
              <thead className="border-b border-slate-300 bg-slate-50 text-slate-900">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Nome
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Cliente
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Cidade/UF
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Capacidade
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Situação
                  </th>
                </tr>
              </thead>
              <tbody>
                {dados.items.map((usina) => (
                  <tr key={usina.id} className="border-b border-slate-200 last:border-0">
                    <th scope="row" className="px-4 py-3 font-medium">
                      <Link to={`/usinas/${usina.id}`} className="text-blue-800 underline">
                        {usina.name}
                      </Link>
                    </th>
                    <td className="px-4 py-3">{usina.clientName}</td>
                    <td className="px-4 py-3">
                      {usina.city}/{usina.state}
                    </td>
                    <td className="px-4 py-3 text-right">{formatarKwp(usina.capacityKwp)}</td>
                    {/* A situação é sempre TEXTO (não só cor), para quem não distingue cores. */}
                    <td className="px-4 py-3">{usina.isActive ? 'Ativa' : 'Inativa'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav aria-label="Paginação" className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-slate-800">
              {dados.total} {dados.total === 1 ? 'usina' : 'usinas'} · página {dados.page} de{' '}
              {dados.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variante="secundario"
                larga={false}
                disabled={dados.page <= 1}
                onClick={() => aplicar({ page: dados.page - 1 })}
              >
                Anterior
              </Button>
              <Button
                variante="secundario"
                larga={false}
                disabled={dados.page >= dados.totalPages}
                onClick={() => aplicar({ page: dados.page + 1 })}
              >
                Próxima
              </Button>
            </div>
          </nav>
        </>
      )}
    </>
  );
}
