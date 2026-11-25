import { useId, type ComponentProps, type ReactNode } from 'react';

type Props = Omit<ComponentProps<'input'>, 'id'> & {
  label: string;
  // Mensagem de erro deste campo (vinda da validação). Aparece abaixo do campo.
  erro?: string | undefined;
  // Elemento extra dentro do campo, à direita (ex.: botão de mostrar senha).
  acao?: ReactNode;
};

// Campo de texto acessível: o rótulo fica sempre visível e ligado ao campo (htmlFor/id),
// e a mensagem de erro é ligada por aria-describedby, para o leitor de tela lê-la ao focar o campo.
export function TextField({ label, erro, acao, className, ...input }: Props) {
  const id = useId();
  const idErro = `${id}-erro`;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-900">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? idErro : undefined}
          className={[
            'block w-full rounded-md border bg-white px-3 py-2 text-base text-slate-900',
            erro ? 'border-red-700' : 'border-slate-500',
            acao ? 'pr-24' : '',
            className ?? '',
          ].join(' ')}
          {...input}
        />
        {acao}
      </div>
      {erro && (
        <p id={idErro} className="mt-1 text-sm font-medium text-red-700">
          {/* Não dependemos só da cor: o texto explica o problema. */}
          {erro}
        </p>
      )}
    </div>
  );
}
