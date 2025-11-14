# External API Reference - Sistema Gestão ML

## API: AwesomeAPI (Cotação de Moedas)

**Purpose**: Obter cotação atual do dólar (USD → BRL) para cálculo de custos.

**Base URL**: `https://economia.awesomeapi.com.br`  
**Authentication**: Nenhuma (API pública)  
**Rate Limit**: Não documentado (usar cache local)  
**Documentation**: https://docs.awesomeapi.com.br

---

## Endpoints

### GET /json/last/USD-BRL

Retorna a última cotação disponível do dólar (USD) em relação ao real (BRL).

**URL Completa:**

```
https://economia.awesomeapi.com.br/json/last/USD-BRL
```

**Method**: GET  
**Auth Required**: No  
**Query Parameters**: Nenhum

---

### Response (Success - 200 OK)

**Content-Type**: application/json

**Body Structure:**

```json
{
  "USDBRL": {
    "code": "USD",
    "codein": "BRL",
    "name": "Dólar Americano/Real Brasileiro",
    "high": "5.1234",
    "low": "5.0987",
    "varBid": "0.0123",
    "pctChange": "0.24",
    "bid": "5.1100",
    "ask": "5.1150",
    "timestamp": "1699876543",
    "create_date": "2025-11-11 14:30:00"
  }
}
```

**Field Descriptions:**

- `code`: Código da moeda (USD)
- `codein`: Código da moeda de destino (BRL)
- `name`: Nome descritivo do par
- `high`: Maior valor do dia (string)
- `low`: Menor valor do dia (string)
- `varBid`: Variação do valor (string)
- `pctChange`: Variação percentual (string)
- **`bid`**: **Valor de compra (usar este para cálculos)**
- `ask`: Valor de venda
- `timestamp`: Unix timestamp
- `create_date`: Data/hora formatada

**Valor a usar**: `USDBRL.bid` (valor de compra)

---

### Response (Error - 4xx/5xx)

**Possíveis erros:**

- 404: Par de moeda inválido
- 500: Erro no servidor
- Network error: Sem conexão

**Handling:**

```typescript
try {
  const response = await fetch(
    'https://economia.awesomeapi.com.br/json/last/USD-BRL'
  );
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  const data = await response.json();
  const cotacao = parseFloat(data.USDBRL.bid);
  
  return cotacao;
} catch (error) {
  // Fallback: usar cotação manual ou última cotação salva
  console.error('Erro ao buscar cotação:', error);
  return null; // Sistema deve permitir input manual
}
```

---

## Usage Examples

### Buscar cotação ao criar produto

```typescript
// src/lib/cotacao.ts
export async function buscarCotacaoDolar(): Promise<number | null> {
  try {
    const response = await fetch(
      'https://economia.awesomeapi.com.br/json/last/USD-BRL',
      { cache: 'no-store' } // Não cachear para ter valor atualizado
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return parseFloat(data.USDBRL.bid);
  } catch (error) {
    console.error('Erro ao buscar cotação:', error);
    return null;
  }
}
```

### Atualizar configuração global

```typescript
// Atualizar cotação no banco
const cotacao = await buscarCotacaoDolar();

if (cotacao) {
  await db
    .update(configuracoes)
    .set({ 
      cotacaoDolar: cotacao,
      updatedAt: new Date() 
    })
    .where(eq(configuracoes.id, 1));
}
```

### Permitir input manual (fallback)

```typescript
// UI deve permitir:
// 1. Buscar automaticamente via API
// 2. Inserir manualmente se API falhar
// 3. Usar última cotação salva no banco

const cotacaoAtual = 
  (await buscarCotacaoDolar()) || 
  cotacaoManual || 
  cotacaoSalvaNoBanco;
```

---

## Integration Notes

**Frequency**: 

- Buscar ao criar/editar produto
- Botão "atualizar cotação" nas configurações
- NÃO fazer polling automático (evitar rate limit)

**Caching**:

- Salvar última cotação no banco (tabela configuracoes)
- Usar cotação salva como fallback se API falhar
- Atualizar apenas quando usuário solicitar

**Error Handling**:

- Sempre permitir input manual de cotação
- Mostrar última atualização da cotação (timestamp)
- Não bloquear cadastro de produto se API falhar

**Offline Mode**:

- Sistema deve funcionar 100% offline
- Cotação pode ser inserida manualmente
- API é enhancement, não requirement

---

## Future APIs (NOT IMPLEMENTED)

As seguintes APIs NÃO estão no escopo atual:

❌ Mercado Livre API (integração automática vendas)  
❌ API de notificações/alertas  
❌ API de sincronização multi-usuário  
❌ API de backup cloud  

Qualquer integração futura deve ser documentada neste arquivo.

