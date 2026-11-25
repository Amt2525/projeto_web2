# Pendências e respostas

Respostas de Atos e Bryan registradas na Etapa 1.

| ID  | Pergunta                              | Resposta                                                                                                                                  | Status                                 |
| --- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| P1  | Prazo e horas semanais                | A implementação será feita pelo Claude. Atos e Bryan estudam o que foi feito para apresentar. Horas semanais e prazo final não informados | Parcial                                |
| P2  | Experiência e imposição de tecnologia | Sem experiência com TypeScript, React e SQL. A professora não impõe tecnologia. Manter a stack                                            | Respondida                             |
| P3  | Docker Desktop                        | Pode ser instalado                                                                                                                        | Respondida                             |
| P4  | Acesso a API de fabricante            | Não. Somente o simulador                                                                                                                  | Respondida                             |
| P5  | "Potência instalada"                  | Apenas kWp (módulos). Armazenado em Wp (`capacidade_instalada_wp`)                                                                        | Respondida                             |
| P6  | Visibilidade e cadastro de usinas     | Técnico vê todas as usinas. Técnico e admin cadastram usinas                                                                              | Respondida                             |
| P7  | "Sem comunicação" e retenção          | 3× o intervalo de sincronização. 90 dias de leituras brutas                                                                               | Respondida                             |
| P8  | E-mail na demonstração                | Mailpit local                                                                                                                             | Respondida                             |
| P9  | Repositório                           | Público                                                                                                                                   | Respondida (ver cuidados em CLAUDE.md) |
| P10 | Data e formato da apresentação        | Não definidos                                                                                                                             | Aberta                                 |

## Regras derivadas

- Criar e editar usinas: `ADMIN` e `TECNICO`.
- Arquivar usina, gerenciar usuários e configurar credenciais de integração: somente `ADMIN` (proposta; a confirmar).
- Sem integração real no MVP. Toda integração usa o simulador, marcado como simulado.
- Leituras brutas com mais de 90 dias são agregadas por dia e removidas.
