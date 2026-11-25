import argon2 from 'argon2';

// Parâmetros do Argon2id, acima do mínimo recomendado pela OWASP (19 MiB, 2 iterações, 1 thread).
// Quanto mais memória e iterações, mais caro é testar uma senha por tentativa e erro (força bruta offline),
// mas também mais lento é cada login. 64 MiB e 3 iterações levam algumas dezenas de milissegundos.
const OPCOES_ARGON2 = {
  type: argon2.argon2id,
  memoryCost: 64 * 1024, // em KiB = 64 MiB
  timeCost: 3,
  parallelism: 1,
} as const;

// Gera o hash da senha. O resultado já inclui o "sal" aleatório e os parâmetros usados,
// por isso o mesmo texto gera hashes diferentes a cada chamada.
export function hashPassword(senha: string): Promise<string> {
  return argon2.hash(senha, OPCOES_ARGON2);
}

// Confere a senha contra o hash. Qualquer problema (hash corrompido, formato errado)
// vira "false": nunca lançamos erro que revele detalhes ao chamador.
export async function verifyPassword(hash: string, senha: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, senha);
  } catch {
    return false;
  }
}
