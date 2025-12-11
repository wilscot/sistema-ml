# Script para restaurar banco de dados na nova estação
# Execute na estação DESTINO após copiar sistema-ml-transfer.zip

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Restauração de Banco de Dados" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$zipPath = Join-Path $PSScriptRoot "..\sistema-ml-transfer.zip"
$dataDir = Join-Path $PSScriptRoot "..\data"
$dbPath = Join-Path $dataDir "sistema-ml.db"
$tempExtract = Join-Path $PSScriptRoot "..\temp-extract"

# Verificar se o ZIP existe
if (-not (Test-Path $zipPath)) {
    Write-Host "ERRO: Arquivo de transferência não encontrado:" -ForegroundColor Red
    Write-Host "  $zipPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Certifique-se de que copiou o arquivo 'sistema-ml-transfer.zip' para a raiz do projeto." -ForegroundColor Yellow
    exit 1
}

Write-Host "Arquivo de transferência encontrado: $zipPath" -ForegroundColor Green
Write-Host ""

# Verificar se há processos usando o banco
Write-Host "Verificando se há processos usando o banco..." -ForegroundColor Yellow
$processes = Get-Process | Where-Object { $_.Path -like "*node*" -or $_.Path -like "*next*" }
if ($processes) {
    Write-Host "AVISO: Processos Node.js/Next.js encontrados:" -ForegroundColor Yellow
    $processes | ForEach-Object { Write-Host "  - $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Yellow }
    Write-Host ""
    Write-Host "IMPORTANTE: Pare o servidor antes de restaurar o banco!" -ForegroundColor Red
    Write-Host "Execute: Ctrl+C no terminal onde o servidor está rodando" -ForegroundColor Yellow
    Write-Host ""
    $response = Read-Host "Deseja continuar mesmo assim? (S/N)"
    if ($response -ne "S" -and $response -ne "s") {
        Write-Host "Operação cancelada." -ForegroundColor Yellow
        exit 0
    }
}

# Criar pasta data se não existir
if (-not (Test-Path $dataDir)) {
    Write-Host "Criando pasta 'data'..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
    Write-Host "Pasta 'data' criada." -ForegroundColor Green
    Write-Host ""
}

# Fazer backup do banco existente (se houver)
if (Test-Path $dbPath) {
    Write-Host "Fazendo backup do banco existente..." -ForegroundColor Yellow
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupFile = Join-Path $dataDir "sistema-ml-backup-$timestamp.db"
    Copy-Item $dbPath $backupFile -Force
    Write-Host "Backup criado: $backupFile" -ForegroundColor Green
    Write-Host ""
}

# Extrair ZIP
Write-Host "Extraindo banco de dados..." -ForegroundColor Yellow
try {
    # Criar pasta temporária
    if (Test-Path $tempExtract) {
        Remove-Item $tempExtract -Recurse -Force
    }
    New-Item -ItemType Directory -Path $tempExtract -Force | Out-Null

    # Extrair ZIP
    Expand-Archive -Path $zipPath -DestinationPath $tempExtract -Force

    # Encontrar o arquivo .db extraído
    $extractedDb = Get-ChildItem -Path $tempExtract -Filter "*.db" -Recurse | Select-Object -First 1

    if (-not $extractedDb) {
        throw "Arquivo .db não encontrado no ZIP"
    }

    Write-Host "Banco extraído: $($extractedDb.FullName)" -ForegroundColor Green
    Write-Host ""

    # Copiar para data/sistema-ml.db
    Write-Host "Restaurando banco de dados..." -ForegroundColor Yellow
    Copy-Item $extractedDb.FullName $dbPath -Force

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Restauração concluída!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Banco de dados restaurado em: $dbPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Próximos passos:" -ForegroundColor Yellow
    Write-Host "1. Execute: npm run dev" -ForegroundColor White
    Write-Host "2. Verifique se os produtos aparecem corretamente" -ForegroundColor White
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "ERRO ao restaurar banco:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
} finally {
    # Limpar pasta temporária
    if (Test-Path $tempExtract) {
        Remove-Item $tempExtract -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Limpar arquivo ZIP (opcional)
Write-Host "Deseja remover o arquivo ZIP de transferência? (S/N)" -ForegroundColor Yellow
$response = Read-Host
if ($response -eq "S" -or $response -eq "s") {
    Remove-Item $zipPath -Force
    Write-Host "Arquivo ZIP removido." -ForegroundColor Green
}

