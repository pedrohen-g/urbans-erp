export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Método não permitido" });

    const API_TOKEN = process.env.BASEROW_TOKEN;
    const TABLE_PRODUTOS = 884394;
    const TABLE_VENDAS = 884420;
    const { produtoID, cliente, quantidade, novoEstoque, metodoPagamento, financeiro } = req.body;

    try {
        // 1. Atualiza Estoque
        const resProd = await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/${produtoID}/?user_field_names=true`, {
            method: "PATCH",
            headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({ Estoque: novoEstoque })
        });
        
        if (!resProd.ok) {
            const errProd = await resProd.json();
            return res.status(400).json({ error: "Erro no Baserow ao baixar estoque", details: errProd });
        }

        // 2. Registra Venda
        const dataVenda = new Date().toLocaleDateString('en-CA'); // Padrão seguro YYYY-MM-DD
        
        const response = await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_VENDAS}/?user_field_names=true`, {
            method: "POST",
            headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                Produtos: [parseInt(produtoID)],
                Quantidade: quantidade,
                Preco_Venda: financeiro.preco,
                Faturamento: financeiro.faturamento,
                Custo_Produto: financeiro.custo,
                Lucro_Venda: financeiro.lucro,
                Desconto: financeiro.desconto,
                Taxa_Maquininha: financeiro.taxa_maquininha,
                Metodo_Pagamento: metodoPagamento,
                Data: dataVenda,
                cliente: cliente
            })
        });

        if (!response.ok) {
            const errVenda = await response.json();
            return res.status(400).json({ error: "Erro no Baserow ao salvar a venda", details: errVenda });
        }

        const resultado = await response.json();
        return res.status(200).json(resultado);
    } catch (error) {
        return res.status(500).json({ error: "Erro interno no servidor da Vercel." });
    }
}