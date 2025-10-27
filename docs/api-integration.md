# API Integration - AwesomeAPI

## Overview

Integração com AwesomeAPI para buscar cotação USD-BRL em tempo real.

**Base URL**: `https://economia.awesomeapi.com.br`

**Documentação**: https://docs.awesomeapi.com.br

---

## Endpoint: Cotação USD-BRL

### GET /json/last/USD-BRL

Retorna a última cotação disponível do dólar americano em reais.

**Request:**
```typescript
const response = await fetch(
  'https://economia.awesomeapi.com.br/json/last/USD-BRL'
)
const data = await response.json()
```

**Response (200 OK):**
```json
{
  "USDBRL": {
    "code": "USD",
    "codein": "BRL",
    "name": "Dólar Americano/Real Brasileiro",
    "high": "5.8540",
    "low": "5.8120",
    "varBid": "0.0015",
    "pctChange": "0.03",
    "bid": "5.8495",
    "ask": "5.8505",
    "timestamp": "1729785600",
    "create_date": "2024-10-24 17:00:00"
  }
}
```

**Campos relevantes:**
- `bid`: Valor de compra (usar este para cálculos)
- `ask`: Valor de venda
- `high`: Máxima do dia
- `low`: Mínima do dia
- `timestamp`: Unix timestamp
- `create_date`: Data/hora da cotação

---

## Uso no Sistema

### Buscar cotação ao cadastrar produto
```typescript
// src/lib/api/awesomeapi.ts
export async function buscarCotacaoDolar(): Promise<number | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_AWESOMEAPI_URL}/json/last/USD-BRL`
    )
    
    if (!response.ok) {
      throw new Error('Falha ao buscar cotação')
    }
    
    const data = await response.json()
    const cotacao = parseFloat(data.USDBRL.bid)
    
    return cotacao
  } catch (error) {
    console.error('Erro ao buscar cotação:', error)
    return null
  }
}
```

### Integração no formulário de produto
```typescript
// Em componente de formulário
const [cotacao, setCotacao] = useState<number | null>(null)
const [carregando, setCarregando] = useState(false)

const handleBuscarCotacao = async () => {
  setCarregando(true)
  const valor = await buscarCotacaoDolar()
  if (valor) {
    setCotacao(valor)
    setValue('cotacao', valor) // React Hook Form
  }
  setCarregando(false)
}
```

---

## Error Handling

**Possíveis erros:**
1. Rede indisponível
2. API fora do ar
3. Rate limiting (raro, API é pública)
4. Resposta inválida

**Tratamento:**
- Sempre usar try/catch
- Retornar null em caso de erro
- Permitir input manual de cotação como fallback
- Mostrar mensagem amigável ao usuário

**Exemplo:**
```typescript
try {
  const cotacao = await buscarCotacaoDolar()
  if (!cotacao) {
    toast.error('Não foi possível buscar cotação. Insira manualmente.')
  }
} catch {
  toast.error('Erro de conexão. Verifique sua internet.')
}
```

---

## Rate Limits

AwesomeAPI não tem rate limits documentados para uso normal.
Não fazer polling desnecessário. Buscar apenas quando usuário clicar no botão.

---

## Alternative: Configuração Manual

Sistema permite override da cotação via `public.configuracoes.cotacao_manual`.
Se configurado, usar valor manual ao invés da API.
```typescript
// Lógica de prioridade
const cotacaoSugerida = configuracoes.cotacao_manual || await buscarCotacaoDolar()
```

---

## Future Integration: Mercado Livre API

**⚠️ NÃO IMPLEMENTAR AGORA - FASE 4**

Documentação: https://developers.mercadolivre.com.br

Endpoints planejados:
- `GET /orders/search`: Buscar vendas
- `GET /items/{id}`: Dados do anúncio

Requer OAuth 2.0 (Client ID + Secret).
