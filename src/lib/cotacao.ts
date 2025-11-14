/**
 * Busca a cotação atual do dólar (USD-BRL) da API AwesomeAPI
 * @returns Cotação em BRL ou null em caso de erro
 */
export async function buscarCotacaoDolar(): Promise<number | null> {
  try {
    const response = await fetch(
      'https://economia.awesomeapi.com.br/json/last/USD-BRL',
      {
        cache: 'no-store', // Não cachear para ter valor atualizado
      }
    );

    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.USDBRL || !data.USDBRL.bid) {
      console.error('Resposta da API inválida');
      return null;
    }

    const cotacao = parseFloat(data.USDBRL.bid);

    if (isNaN(cotacao) || cotacao <= 0) {
      console.error('Cotação inválida:', data.USDBRL.bid);
      return null;
    }

    return cotacao;
  } catch (error) {
    console.error('Erro ao buscar cotação:', error);
    return null;
  }
}
