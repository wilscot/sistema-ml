# Script para transferir banco de dados entre estações
# Execute na estação ORIGEM (onde os produtos estão cadastrados)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Transferência de Banco de Dados" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$dbPath = Join-Path $PSScriptRoot "..\data\sistema-ml.db"
$backupPath = Join-Path $PSScriptRoot "..\data"
$outputZip = Join-Path $PSScriptRoot "..\sistema-ml-transfer.zip"

# Verificar se o banco existe
if (-not (Test-Path $dbPath)) {
    Write-Host "ERRO: Banco de dados não encontrado em:" -ForegroundColor Red
    Write-Host "  $dbPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Certifique-se de que o sistema já foi executado pelo menos uma vez." -ForegroundColor Yellow
    exit 1
}

Write-Host "Banco de dados encontrado: $dbPath" -ForegroundColor Green
Write-Host ""

# Verificar se há processos usando o banco (Next.js pode estar rodando)
Write-Host "Verificando se há processos usando o banco..." -ForegroundColor Yellow
$processes = Get-Process | Where-Object { $_.Path -like "*node*" -or $_.Path -like "*next*" }
if ($processes) {
    Write-Host "AVISO: Processos Node.js/Next.js encontrados:" -ForegroundColor Yellow
    $processes | ForEach-Object { Write-Host "  - $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Yellow }
    Write-Host ""
    $response = Read-Host "Deseja continuar mesmo assim? (S/N)"
    if ($response -ne "S" -and $response -ne "s") {
        Write-Host "Operação cancelada." -ForegroundColor Yellow
        exit 0
    }
}

# Criar backup antes de transferir
Write-Host "Criando backup de segurança..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = Join-Path $backupPath "sistema-ml-backup-$timestamp.db"
Copy-Item $dbPath $backupFile -Force
Write-Host "Backup criado: $backupFile" -ForegroundColor Green
Write-Host ""

# Criar arquivo ZIP com o banco
Write-Host "Criando arquivo de transferência..." -ForegroundColor Yellow
try {
    # Remover ZIP anterior se existir
    if (Test-Path $outputZip) {
        Remove-Item $outputZip -Force
    }

    # Criar ZIP
    Compress-Archive -Path $dbPath -DestinationPath $outputZip -Force
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Transferência concluída!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Arquivo criado: $outputZip" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Próximos passos:" -ForegroundColor Yellow
    Write-Host "1. Copie o arquivo 'sistema-ml-transfer.zip' para a nova estação" -ForegroundColor White
    Write-Host "2. Na nova estação, execute: .\scripts\restaurar-banco.ps1" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host ""
    Write-Host "ERRO ao criar arquivo ZIP:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

