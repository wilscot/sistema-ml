# External API Reference

Sistema ML integra com APIs externas para funcionalidades específicas.

---

## 🌐 API: AwesomeAPI - Cotação de Moedas

**Propósito:** Buscar cotação atual USD→BRL para cálculos de custo.

**Base URL:** `https://economia.awesomeapi.com.br`

**Autenticação:** Nenhuma (API pública)

**Documentação Oficial:** https://docs.awesomeapi.com.br

**Rate Limit:** 

- Gratuito: ~60 requests/minuto
- Recomendado: Cache local (evitar requests repetidas)

---

### Endpoint: Última Cotação USD-BRL

**Method:** GET  
**Path:** `/json/last/USD-BRL`

**Headers:**

```
Content-Type: application/json
```

**Query Parameters:** Nenhum

**Request Example:**

```bash
curl https://economia.awesomeapi.com.br/json/last/USD-BRL
```

**Response Success (200):**

```json
{
  "USDBRL": {
    "code": "USD",
    "codein": "BRL",
    "name": "Dólar Americano/Real Brasileiro",
    "high": "5.6523",
    "low": "5.6012",
    "varBid": "-0.0145",
    "pctChange": "-0.26",
    "bid": "5.6234",
    "ask": "5.6267",
    "timestamp": "1705420800",
    "create_date": "2024-01-16 14:00:00"
  }
}
```

**Campos Relevantes:**

- `bid` (string): Valor de compra (usar este para conversão USD→BRL)
- `ask` (string): Valor de venda
- `high` (string): Maior cotação do dia
- `low` (string): Menor cotação do dia
- `timestamp` (string): Unix timestamp
- `create_date` (string): Data/hora da cotação

**Response Error (404):**

```json
{
  "status": 404,
  "code": "CoinNotExists",
  "message": "moeda nao encontrada"
}
```

**Response Error (500):**

```json
{
  "status": 500,
  "message": "internal server error"
}
```

---

### Implementação Recomendada

**Cache Local:**

```typescript
// Armazenar última cotação em localStorage
// Revalidar apenas se > 1 hora desde última busca

const CACHE_KEY = 'cotacao_usd_brl';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hora

function getCachedCotacao(): number | null {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;
  
  const { value, timestamp } = JSON.parse(cached);
  const isExpired = Date.now() - timestamp > CACHE_DURATION;
  
  return isExpired ? null : value;
}

function setCachedCotacao(value: number): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify({
    value,
    timestamp: Date.now()
  }));
}
```

**Função de Busca:**

```typescript
async function buscarCotacaoUSD(): Promise<number> {
  // 1. Tentar cache primeiro
  const cached = getCachedCotacao();
  if (cached) return cached;
  
  // 2. Buscar da API
  try {
    const response = await fetch(
      'https://economia.awesomeapi.com.br/json/last/USD-BRL'
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const cotacao = parseFloat(data.USDBRL.bid);
    
    // 3. Salvar no cache
    setCachedCotacao(cotacao);
    
    return cotacao;
  } catch (error) {
    console.error('Erro ao buscar cotação:', error);
    
    // 4. Fallback: usar última cotação conhecida (mesmo expirada)
    const cached = getCachedCotacao();
    if (cached) return cached;
    
    // 5. Fallback final: valor padrão do banco (configuracoes.cotacaoDolar)
    throw new Error('Não foi possível buscar cotação. Use valor manual.');
  }
}
```

---

### UI/UX Recomendado

**Botão "Buscar Cotação Atual":**

- Loading state durante fetch
- Toast de sucesso: "Cotação atualizada: R$ 5,62"
- Toast de erro: "Erro ao buscar cotação. Use valor manual."
- Fallback: campo manual sempre disponível

**Exemplo de Uso:**

```typescript
// No formulário de produto/compra
const [loadingCotacao, setLoadingCotacao] = useState(false);
const [cotacao, setCotacao] = useState(5.60);

async function handleBuscarCotacao() {
  setLoadingCotacao(true);
  try {
    const novaCotacao = await buscarCotacaoUSD();
    setCotacao(novaCotacao);
    toast.success(`Cotação atualizada: R$ ${novaCotacao.toFixed(2)}`);
  } catch (error) {
    toast.error('Erro ao buscar cotação. Use valor manual.');
  } finally {
    setLoadingCotacao(false);
  }
}
```

---

### Considerações de Performance

**✅ Boas Práticas:**

- Cache local (1 hora)
- Timeout de 5 segundos
- Retry apenas 1x em caso de erro
- Fallback sempre disponível

**❌ Evitar:**

- Buscar cotação a cada render
- Múltiplas requests simultâneas
- Bloquear formulário durante busca

---

### Alternativas (se AwesomeAPI ficar indisponível)

**Opção 1:** Banco Central do Brasil

- URL: `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='MM-DD-YYYY'&$format=json`
- Mais estável, mas mais complexo

**Opção 2:** Manual

- Usuário digita cotação manualmente
- Salvar em configuracoes.cotacaoDolar como padrão

---

## 📝 Notas de Implementação

**Onde usar a cotação:**

- Cadastro de produto LAB
- Registro de compra (PROD)
- Edição de configurações globais (LAB/PROD)

**Não usar a cotação em:**

- Cálculos de vendas (usar cotação da compra original via FIFO)
- Histórico (manter valores congelados)

**Validação:**

- Cotação deve ser > 0
- Cotação deve ser < 100 (sanity check)
- Se fora do range, rejeitar e pedir valor manual

