@echo off
echo ========================================
echo  Build Sistema ML Tray
echo ========================================
echo.

REM Verificar se Python esta instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Python nao encontrado!
    echo Instale Python em: https://www.python.org/downloads/
    exit /b 1
)

echo [1/4] Instalando dependencias...
python -m pip install -r requirements.txt -q
python -m pip install pyinstaller -q

echo.
echo [2/4] Criando executavel...
python -m PyInstaller --onefile --windowed --name=SistemaML app.py

echo.
echo [3/4] Limpando arquivos temporarios...
if exist build rmdir /s /q build 2>nul
if exist SistemaML.spec del /q SistemaML.spec 2>nul

echo.
echo [4/4] Pronto!
echo.
echo ========================================
echo  Executavel criado em: dist\SistemaML.exe
echo ========================================
