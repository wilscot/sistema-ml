# Sistema ML - Gestão Mercado Livre

Sistema de gestão para vendas no Mercado Livre com ambientes LAB (simulação) e PROD (operação real).

## 📋 Requisitos

- Node.js >= 20.0.0
- npm >= 9.0.0
- Windows 10/11 (ou compatível)

## 🚀 Setup Inicial

### 1. Clonar o Repositório

```bash
git clone <url-do-repositorio>
cd sistema-ML
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Banco de Dados

O banco de dados (`data/sistema-ml.db`) está versionado no Git, então os produtos cadastrados estarão disponíveis automaticamente após clonar o repositório.

Se você fizer alterações nos produtos, lembre-se de commitar o banco:

```bash
git add data/sistema-ml.db
git commit -m "atualiza produtos"
git push
```

### 4. Inicializar Configurações (Opcional)

As configurações são criadas automaticamente, mas você pode garantir que existam executando:

```bash
npm run dev
```

Acesse a página de configurações no sistema para verificar.

### 5. Executar o Sistema

```bash
npm run dev
```

O sistema estará disponível em: `http://localhost:3000`

## 📁 Estrutura do Banco de Dados

- **Localização:** `data/sistema-ml.db`
- **Tipo:** SQLite (better-sqlite3)
- **Schema:** Ver `docs/database-schema.md`

## 🔄 Sincronizando Dados Entre Estações

O banco de dados está versionado no Git, então basta fazer push/pull:

**Na estação onde você fez alterações:**

```bash
git add data/sistema-ml.db
git commit -m "atualiza produtos"
git push
```

**Na outra estação:**

```bash
git pull
```

Os produtos estarão sincronizados!

## ⚠️ Importante

- **NUNCA** edite o banco de dados manualmente enquanto o sistema está rodando
- Sempre faça commit do banco após cadastrar produtos: `git add data/sistema-ml.db && git commit -m "atualiza produtos" && git push`
- Se o banco não existir, será criado automaticamente na primeira execução
- Backups automáticos são criados em `data/sistema-ml-backup-*.db` (não versionados)

## 🛠️ Scripts Disponíveis

- `npm run dev` - Inicia servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm run start` - Inicia servidor de produção
- `npm run lint` - Executa linter
- `npm run db:setup` - Setup inicial do banco (cria tabelas)

## 📚 Documentação

- Schema do banco: `docs/database-schema.md`
- Endpoints da API: `docs/api-endpoints.md`
- Escopo do projeto: `escopo.md`

## 🐛 Troubleshooting

### Banco de dados não encontrado

Se você ver erros sobre banco não encontrado:

1. Verifique se a pasta `data` existe
2. Verifique se `data/sistema-ml.db` existe
3. Se não existir, o sistema criará automaticamente na primeira execução

### Produtos não aparecem

1. Verifique se fez `git pull` para atualizar o banco
2. Verifique se o arquivo `data/sistema-ml.db` existe
3. Se não existir, será criado automaticamente na primeira execução (vazio)

### Erro ao iniciar servidor

1. Verifique se todas as dependências estão instaladas: `npm install`
2. Verifique a versão do Node.js: `node --version` (deve ser >= 20)
3. Limpe cache e reinstale: `rm -rf node_modules package-lock.json && npm install`

## 📝 Notas

- O sistema cria automaticamente as tabelas na primeira execução
- As configurações padrão são criadas automaticamente se não existirem
- O banco de dados está versionado no Git para facilitar sincronização entre estações
- Backups automáticos são criados em `data/sistema-ml-backup-*.db` (não versionados)

