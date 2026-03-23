export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Método não permitido" });

    const API_TOKEN = process.env.BASEROW_TOKEN;
    const TABLE_PRODUTOS = 884394;
    const TABLE_VENDAS = 884420;
    
    // Agora a API recebe um array chamado "itens" do carrinho
    const { itens } = req.body; 

    try {
        const dataVenda = new Date().toLocaleDateString('en-CA');

        // Promise.all executa todos os envios de uma vez só (Alta Performance)
        await Promise.all(itens.map(async (item) => {
            // 1. Atualiza Estoque
            const resProd = await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/${item.produtoID}/?user_field_names=true`, {
                method: "PATCH",
                headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
                body: JSON.stringify({ Estoque: item.novoEstoque })
            });

            if (!resProd.ok) throw new Error("Falha ao atualizar estoque do item " + item.produtoID);

            // 2. Registra Venda Individual
            const resVenda = await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_VENDAS}/?user_field_names=true`, {
                method: "POST",
                headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    Produtos: [parseInt(item.produtoID)],
                    Quantidade: item.quantidade,
                    Preco_Venda: item.financeiro.preco.toString(),
                    Faturamento: item.financeiro.faturamento.toString(),
                    Custo_Produto: item.financeiro.custo.toString(),
                    Lucro_Venda: item.financeiro.lucro.toString(),
                    Desconto: item.financeiro.desconto.toString(),
                    Taxa_Maquininha: item.financeiro.taxa_maquininha.toString(),
                    Metodo_Pagamento: item.metodoPagamento,
                    Data: dataVenda,
                    cliente: item.cliente || "",
                    Codigo_Pedido: item.codigoPedido
                })
            });

            if (!resVenda.ok) throw new Error("Falha ao registrar venda do item " + item.produtoID);
        }));

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro interno ao processar o carrinho na Vercel." });
    }
}