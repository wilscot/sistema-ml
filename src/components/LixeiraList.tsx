// TODO: Lista de produtos deletados (lixeira)
// - Props: modo ('LAB' | 'PROD')
// - 'use client'
// - Buscar produtos: GET /api/produtos?modo={modo}&deletados=true
// - Tabela com colunas:
//   - Nome, Data Deletado, Ações
// - Ações:
//   - Restaurar (LAB → LAB: deletedAt = NULL)
//   - Restaurar (PROD → LAB: move para produtos_lab)
//   - Deletar Permanente (DELETE do banco)
// - Empty state: "Lixeira vazia"

