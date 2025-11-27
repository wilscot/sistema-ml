# CONHECIMENTO EXTRAÍDO DO SISTEMA ANTIGO

Este documento contém a **LÓGICA** (não código) extraída do sistema antigo para reimplementação do zero no novo sistema.

---

## 📊 PARSER EXCEL MERCADO LIVRE

### Estrutura da Planilha ML

**Formato:** Excel (.xlsx)  
**Encoding:** UTF-8  
**Primeiras linhas:** Cabeçalhos (linhas 1-5)  
**Dados reais:** A partir da linha 6 (índice 5)

### Mapeamento de Colunas (índice base 0)

```
Coluna A (0)  → Número da Venda (string)
Coluna B (1)  → Data da Venda (string no formato "DD de MMMM de YYYY HH:MM")
Coluna C (2)  → Estado (string: "Aprovado", "Devolução", etc)
Coluna D (3)  → Descrição Status (string)
Coluna G (6)  → Unidades (number, pode vir como string "1,00")
Coluna H (7)  → **Preço Unitário** (number, pode vir como "321,00")
Coluna K (10) → Taxa Venda (number negativo, ex: "-35,31")
Coluna L (11) → Receita Envio (number)
Coluna M (12) → Taxa Envio (number negativo)
Coluna Q (16) → Total (number - valor líquido recebido)
Coluna S (18) → SKU (string)
Coluna T (19) → Número do Anúncio (string)
Coluna U (20) → Canal Venda (string: "Mercado Livre")
Coluna V (21) → **Título do Anúncio** (string)
Coluna W (22) → Variação (string - pode ser título se coluna 21 incorreta)
Coluna Y (24) → Tipo Anúncio (string: "clásico" ou "premium")

Colunas 25-29  → Dados de faturamento (empresa)
Colunas 32-44  → Dados do comprador e envio
```

### Fórmulas de Cálculo

**Receita Total:**
```
receita = precoUnitario × unidades
```

**Tipo de Anúncio:**
```
Se coluna[24] contém "premium" (case-insensitive) → PREMIUM
Caso contrário → CLASSICO
```

### Validações e Filtros

**Linhas a IGNORAR:**
1. Linhas vazias (todas colunas vazias)
2. Linhas com menos de 24 colunas
3. Linhas de cabeçalho detectadas:
   - Se coluna[0] ou coluna[7] contém: "n.º de venda", "receita", "unidades", "data da venda"
4. **Status proibidos** (devoluções):
   - Estado contém: "devolução", "devolucao", "reclamação", "reclamacao" (case-insensitive)
5. Número de venda vazio
6. Título do anúncio vazio
7. Data inválida (não parseável)
8. Preço unitário inválido (NaN, zero ou negativo)

### Tratamento de Números (formato brasileiro)

**Entrada:** "1.234,56" (ponto = milhar, vírgula = decimal)  
**Saída:** 1234.56

**Algoritmo:**
1. Se tem ponto E vírgula: remover pontos, trocar vírgula por ponto
2. Se tem apenas vírgula: trocar vírgula por ponto
3. Remover caracteres não numéricos (exceto ponto e sinal)
4. parseFloat() e retornar valor absoluto (Math.abs)

### Tratamento de Datas

**Formatos aceitos:**

1. **Formato ML:** "15 de janeiro de 2025 14:30"
   - Regex: `(\d+)\s+de\s+(\w+)\s+de\s+(\d+)\s+(\d+):(\d+)`
   - Meses: janeiro=0, fevereiro=1, ..., dezembro=11

2. **Formato ISO:** "15/01/2025 14:30"
   - Regex: `(\d{2})/(\d{2})/(\d{4})\s+(\d{2}):(\d{2})`

3. **Fallback:** `new Date(string)` se formato não reconhecido

### Correção Específica: Título vs Canal

**Problema:** Coluna 21 às vezes vem como "Mercado Livre" (canal) ao invés do título

**Solução:**
```
Se coluna[21] == "Mercado Livre" OU coluna[21] == canalVenda OU vazia:
  Se coluna[22] tem conteúdo válido E != "Mercado Livre":
    titulo = coluna[22]
    variacao = ""
```

### Estrutura de Retorno

```typescript
{
  vendas: VendaML[],              // Array de vendas válidas
  erros: ParseError[],            // Erros críticos de parse
  linhasIgnoradas: LinhaIgnorada[], // Linhas puladas com motivo
  totalLinhas: number,            // Total de linhas no Excel
  linhasProcessadas: number,      // Linhas válidas processadas
  statusDisponiveis: string[]     // Lista única de status encontrados
}
```

---

## 🔄 SISTEMA FIFO (First In, First Out)

### Conceito

**Problema:** Quando vender produto, de qual compra deduzir?  
**Solução:** Deduzir sempre das **compras mais antigas** primeiro (FIFO)

### Algoritmo de Dedução

**Entrada:**
- produtoId: ID do produto vendido
- quantidadeVendida: Quantidade a deduzir

**Passo 1:** Buscar compras disponíveis
```sql
SELECT * FROM compras
WHERE produtoId = ? AND quantidadeDisponivel > 0
ORDER BY dataCompra ASC  -- Mais antigas primeiro
```

**Passo 2:** Deduzir em loop FIFO
```
custoTotalAcumulado = 0
quantidadeRestante = quantidadeVendida

Para cada compra disponível (ordem: mais antiga → mais nova):
  
  Se quantidadeRestante <= 0:
    PARAR (dedução completa)
  
  quantidadeParaDeduzir = MIN(quantidadeRestante, compra.quantidadeDisponivel)
  
  # Calcular custo proporcional
  custoParcelaAtual = compra.custoUnitario × quantidadeParaDeduzir
  custoTotalAcumulado += custoParcelaAtual
  
  # Atualizar compra
  compra.quantidadeDisponivel -= quantidadeParaDeduzir
  
  # Atualizar quantidade restante
  quantidadeRestante -= quantidadeParaDeduzir
  
  # Salvar compra atualizada no banco
```

**Passo 3:** Validação final
```
Se quantidadeRestante > 0:
  ERRO: "Estoque insuficiente! Faltam {quantidadeRestante} unidades"
```

**Retorno:**
```typescript
{
  custoTotal: number,           // Custo total real (FIFO)
  comprasUsadas: Compra[],      // Lista de compras afetadas
  quantidadeDeduzida: number    // Total deduzido
}
```

### Exemplo Prático

**Cenário:**
- Compra #1: 10 unidades a R$ 100 cada (data: 01/01/2025)
- Compra #2: 15 unidades a R$ 120 cada (data: 05/01/2025)
- Venda: 12 unidades

**Dedução FIFO:**
1. Deduz 10 unidades da Compra #1 → Custo = 10 × 100 = R$ 1.000
2. Deduz 2 unidades da Compra #2 → Custo = 2 × 120 = R$ 240
3. **Custo Total = R$ 1.240**

**Resultado:**
- Compra #1: quantidadeDisponivel = 0 (esgotada)
- Compra #2: quantidadeDisponivel = 13

### SQL Transaction (importante!)

**Dedução FIFO deve ser atômica:**

```
BEGIN TRANSACTION

1. Buscar compras disponíveis (SELECT com FOR UPDATE)
2. Loop de dedução (UPDATE cada compra)
3. Inserir venda com custoTotal calculado
4. Atualizar produto.quantidade (deduzir soma)

COMMIT ou ROLLBACK em caso de erro
```

### Validações Críticas

1. **Antes de vender:**
   - Verificar se SUM(compras.quantidadeDisponivel) >= quantidadeVendida
   - Se não: retornar erro antes de iniciar transaction

2. **Durante dedução:**
   - NUNCA deixar quantidadeDisponivel negativa
   - SEMPRE usar MIN(quantidadeRestante, compra.quantidadeDisponivel)

3. **Após dedução:**
   - Validar quantidadeRestante == 0
   - Validar custoTotal > 0

---

## 🧮 CÁLCULOS (Fórmulas)

### Custo Unitário de Compra

```
custoUnitario = (precoUSD × cotacao + freteTotal) ÷ quantidade

Exemplo:
- Preço: 39 USD
- Cotação: 5,60 BRL
- Frete: 500 BRL
- Quantidade: 20 unidades

custoUnitario = (39 × 5,60 + 500) ÷ 20
              = (218,40 + 500) ÷ 20
              = 718,40 ÷ 20
              = 35,92 BRL/unidade
```

### Taxa Mercado Livre

```
taxaML = precoVenda × (taxaPercent ÷ 100)

Exemplo Clássico (11%):
- Preço venda: 350 BRL
taxaML = 350 × 0,11 = 38,50 BRL

Exemplo Premium (16%):
- Preço venda: 350 BRL
taxaML = 350 × 0,16 = 56,00 BRL
```

### Lucro Líquido

```
receita = (precoVenda × quantidadeVendida) + freteCobrado
custoTotal = custoUnitario × quantidadeVendida  (FIFO!)
lucroLiquido = receita - custoTotal - taxaML

Exemplo:
- Preço venda: 350 BRL/un
- Quantidade: 1
- Frete cobrado: 19,95 BRL
- Custo unitário (FIFO): 35,92 BRL
- Taxa ML (16%): 56,00 BRL

receita = (350 × 1) + 19,95 = 369,95 BRL
custoTotal = 35,92 × 1 = 35,92 BRL
lucroLiquido = 369,95 - 35,92 - 56,00 = 278,03 BRL
```

---

## 🎯 OBSERVAÇÕES IMPORTANTES

### Parser Excel
- **Sempre tratar números como absolutos** (Math.abs) pois ML retorna taxas negativas
- **Case-insensitive** em todas comparações de strings (toLowerCase())
- **Trim** em todas strings extraídas
- **Validar data** antes de usar (isNaN(date.getTime()))
- **Log primeira venda** para debug de colunas

### FIFO
- **Transaction obrigatória** (rollback em erro)
- **Ordenar por dataCompra ASC** (mais antigas primeiro)
- **MIN sempre** para evitar quantidades negativas
- **Validar antes** se tem estoque suficiente
- **Acumular custo** durante o loop

### Cálculos
- **Usar 2 casas decimais** em valores monetários (.toFixed(2))
- **Cotação default = 1.0** se moeda = BRL
- **Frete >= 0** (nunca negativo)
- **Taxa ML sempre positiva** (% sobre preço venda)

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Parser Excel
- [ ] Tratar formato brasileiro de números (ponto e vírgula)
- [ ] Parsear datas no formato ML
- [ ] Mapear colunas corretamente (A=0, H=7, etc)
- [ ] Filtrar status proibidos (devolução/reclamação)
- [ ] Detectar e pular linhas de cabeçalho
- [ ] Validar dados obrigatórios antes de processar
- [ ] Retornar erros detalhados com número da linha
- [ ] Normalizar tipo anúncio (premium/clássico)

### FIFO
- [ ] Buscar compras ordenadas por data (ASC)
- [ ] Loop de dedução com MIN()
- [ ] Acumular custo proporcional
- [ ] Atualizar quantidadeDisponivel de cada compra
- [ ] Usar transaction SQL (BEGIN/COMMIT)
- [ ] Validar estoque antes de iniciar
- [ ] Retornar custoTotal calculado

### Cálculos
- [ ] custoUnitario = (preço × cotação + frete) ÷ qtd
- [ ] taxaML = preço × (taxa% ÷ 100)
- [ ] lucroLiquido = receita - custo - taxa
- [ ] Formatar valores com 2 casas decimais
- [ ] Validar valores sempre positivos (exceto lucro)
