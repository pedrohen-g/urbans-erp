export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Método não permitido" });
    if (req.headers.authorization !== process.env.API_SECRET) return res.status(401).json({ error: "Acesso não autorizado" });

    const API_TOKEN = process.env.BASEROW_TOKEN;
    const TABLE_PRODUTOS = 884394;
    const TABLE_VENDAS = 884420;
    const { itens } = req.body; 

    try {
        const dataVenda = new Date().toLocaleDateString('en-CA');
        await Promise.all(itens.map(async (item) => {
            const resProd = await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/${item.produtoID}/?user_field_names=true`, {
                method: "PATCH", headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ Estoque: item.novoEstoque })
            });
            if (!resProd.ok) throw new Error("Falha estoque");

            const resVenda = await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_VENDAS}/?user_field_names=true`, {
                method: "POST", headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
                body: JSON.stringify({ Produtos: [parseInt(item.produtoID)], Quantidade: item.quantidade, Preco_Venda: item.financeiro.preco.toString(), Faturamento: item.financeiro.faturamento.toString(), Custo_Produto: item.financeiro.custo.toString(), Lucro_Venda: item.financeiro.lucro.toString(), Desconto: item.financeiro.desconto.toString(), Taxa_Maquininha: item.financeiro.taxa_maquininha.toString(), Metodo_Pagamento: item.metodoPagamento, Data: dataVenda, cliente: item.cliente || "", Codigo_Pedido: item.codigoPedido })
            });
            if (!resVenda.ok) throw new Error("Falha venda");
        }));
        return res.status(200).json({ success: true });
    } catch (error) { return res.status(500).json({ error: "Erro interno" }); }
}