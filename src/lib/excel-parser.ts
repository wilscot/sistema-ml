// TODO: Parser de planilha Excel do Mercado Livre
// - Importar xlsx library
// - Função parseExcelML(file: File): Promise<ParseResult>
// - Mapear colunas conforme docs/CONHECIMENTO_EXTRAIDO.md:
//   - Coluna A (0): Número da Venda
//   - Coluna B (1): Data
//   - Coluna C (2): Estado
//   - Coluna G (6): Unidades
//   - Coluna H (7): Preço Unitário
//   - Coluna K (10): Taxa Venda
//   - Coluna V (21): Título do Anúncio
//   - Coluna Y (24): Tipo Anúncio
// - Validações:
//   - Ignorar linhas vazias
//   - Ignorar status proibidos (devolução, reclamação)
//   - Ignorar linhas de cabeçalho
//   - Parsear datas no formato ML
//   - Tratar números formato brasileiro (vírgula/ponto)
// - Retornar: { vendas: VendaML[], erros: [], linhasIgnoradas: [] }

