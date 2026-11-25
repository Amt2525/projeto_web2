# Cria o arquivo .env a partir do .env.example, trocando os valores TROQUE_* por
# segredos aleatórios (gerados pelo gerador criptográfico do sistema operacional).
# Uso (na raiz do projeto): pnpm env:criar
# Não sobrescreve um .env que já exista.

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
$exemplo = Join-Path $raiz '.env.example'
$destino = Join-Path $raiz '.env'

if (Test-Path $destino) {
  Write-Host '.env já existe: nada foi alterado. Apague-o antes se quiser gerar outro.'
  exit 0
}

function Novo-Segredo([int]$bytes) {
  $buffer = New-Object byte[] $bytes
  $gerador = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $gerador.GetBytes($buffer)
  $gerador.Dispose()
  return (-join ($buffer | ForEach-Object { $_.ToString('x2') }))
}

# A mesma senha vai em POSTGRES_PASSWORD e dentro de DATABASE_URL.
$senhaBanco = Novo-Segredo 16

$texto = [System.IO.File]::ReadAllText($exemplo).Replace("`r`n", "`n")
$texto = $texto.Replace('TROQUE_ESTA_SENHA', $senhaBanco)
$texto = $texto.Replace('TROQUE_POR_SEGREDO_ALEATORIO_LONGO', (Novo-Segredo 48))
$texto = $texto.Replace('TROQUE_POR_CHAVE_ALEATORIA', (Novo-Segredo 32))
$texto = $texto.Replace('TROQUE_CHAVE_DE_DEMONSTRACAO', (Novo-Segredo 16))
$texto = $texto.Replace('TROQUE_SENHA_DO_ADMIN_DEMO', (Novo-Segredo 16))
$texto = $texto.Replace('TROQUE_SENHA_DO_TECNICO_DEMO', (Novo-Segredo 16))

# Sem BOM e com quebras de linha LF, para o Docker Compose e o Node lerem sem problemas.
[System.IO.File]::WriteAllText($destino, $texto, (New-Object System.Text.UTF8Encoding($false)))

Write-Host '.env criado com segredos aleatórios. Ele NÃO vai para o Git (está no .gitignore).'
