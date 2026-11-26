import { useState, type ComponentProps } from 'react';
import { TextField } from './TextField';

type Props = Omit<ComponentProps<typeof TextField>, 'type' | 'acao'>;

// Campo de senha com botão "Mostrar/Ocultar", acessível por teclado e por leitores de tela.
export function PasswordField(props: Props) {
  const [visivel, setVisivel] = useState(false);

  return (
    <TextField
      {...props}
      type={visivel ? 'text' : 'password'}
      acao={
        <button
          type="button"
          // O nome acessível muda junto com o texto ("Mostrar senha" / "Ocultar senha").
          // O texto visível ("Mostrar") está contido no nome acessível, como pede o WCAG.
          aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          onClick={() => setVisivel((atual) => !atual)}
          className="absolute inset-y-0 right-0 rounded-r-md px-3 text-sm font-medium text-blue-800 hover:bg-slate-100"
        >
          {visivel ? 'Ocultar' : 'Mostrar'}
        </button>
      }
    />
  );
}
