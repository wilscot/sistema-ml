# Sistema ML - System Tray App

Aplicativo de bandeja do sistema para controlar o servidor Next.js.

## Requisitos

- Python 3.8+ instalado
- Node.js instalado (para rodar o sistema)

## Como usar (Desenvolvimento)

1. Instalar dependencias:
```bash
pip install -r requirements.txt
```

2. Executar:
```bash
python app.py
```

## Como gerar .exe

1. Execute o script de build:
```bash
build.bat
```

2. O executavel sera criado em: `dist/SistemaML.exe`

## Funcionalidades

- Verde = Servidor rodando
- Vermelho = Servidor parado

### Menu:
- **Start App**: Pergunta dev/prod e inicia servidor
- **Stop App**: Para servidor e libera porta 3000
- **Restart App**: Reinicia servidor
- **Abrir App**: Abre http://localhost:3000 no navegador
- **Sair**: Fecha tudo

## Observacoes

- Primeira vez que iniciar: escolha entre `npm run dev` ou `npm start`
- Se porta 3000 ocupada: pergunta se quer encerrar processo
- Icones sao gerados automaticamente se nao existirem

