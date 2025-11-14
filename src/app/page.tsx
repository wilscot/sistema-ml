export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4 text-foreground">
            Sistema Gestão ML
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Sistema desktop para gestão de produtos importados, registro de
            custos básicos, simulação de cenários de preço e lucro, controle
            manual de vendas, estoque e ambientes LAB/PROD independentes.
          </p>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Navegação
            </h2>
            <nav className="space-y-2">
              <a
                href="/produtos"
                className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                <h3 className="font-medium text-foreground">Produtos</h3>
                <p className="text-sm text-muted-foreground">
                  Gerenciar produtos LAB e PROD
                </p>
              </a>
              <a
                href="/vendas"
                className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                <h3 className="font-medium text-foreground">Vendas</h3>
                <p className="text-sm text-muted-foreground">
                  Registrar e visualizar vendas
                </p>
              </a>
              <a
                href="/simulacao"
                className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                <h3 className="font-medium text-foreground">Simulação</h3>
                <p className="text-sm text-muted-foreground">
                  Simular cenários de preço e lucro
                </p>
              </a>
              <a
                href="/lixeira"
                className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                <h3 className="font-medium text-foreground">Lixeira</h3>
                <p className="text-sm text-muted-foreground">
                  Produtos deletados e restauração
                </p>
              </a>
              <a
                href="/configuracoes"
                className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                <h3 className="font-medium text-foreground">Configurações</h3>
                <p className="text-sm text-muted-foreground">
                  Taxas ML e cotação do dólar
                </p>
              </a>
            </nav>
          </div>
        </div>
      </main>
    </div>
  );
}
