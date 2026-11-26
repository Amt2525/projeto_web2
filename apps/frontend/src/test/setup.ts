import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Depois de cada teste: desmonta a tela renderizada e remove os "fetch" falsos.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
