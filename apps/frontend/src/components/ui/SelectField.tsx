import { useId, type ComponentProps } from 'react';

type Props = Omit<ComponentProps<'select'>, 'id'> & {
  label: string;
  erro?: string | undefined;
};

// Lista de opções acessível: rótulo ligado ao campo e erro ligado por aria-describedby (como no TextField).
export function SelectField({ label, erro, className, children, ...select }: Props) {
  const id = useId();
  const idErro = `${id}-erro`;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-900">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? idErro : undefined}
        className={[
          'block w-full rounded-md border bg-white px-3 py-2 text-base text-slate-900',
          erro ? 'border-red-700' : 'border-slate-500',
          className ?? '',
        ].join(' ')}
        {...select}
      >
        {children}
      </select>
      {erro && (
        <p id={idErro} className="mt-1 text-sm font-medium text-red-700">
          {erro}
        </p>
      )}
    </div>
  );
}
