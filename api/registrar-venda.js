export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Método não permitido" });

    const API_TOKEN = process.env.BASEROW_TOKEN;
    const TABLE_PRODUTOS = 884394;
    const TABLE_VENDAS = 884420;

    // Agora recebemos o metodoPagamento e os novos dados financeiros
    const { produtoID, cliente, quantidade, novoEstoque, metodoPagamento, financeiro } = req.body;

    try {
        // 1. Atualiza Estoque
        await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/${produtoID}/?user_field_names=true`, {
            method: "PATCH",
            headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({ Estoque: novoEstoque })
        });

        // 2. Registra Venda com as novas colunas
        const dataVenda = new Date().toLocaleDateString('sv-SE');
        
        const response = await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_VENDAS}/?user_field_names=true`, {
            method: "POST",
            headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                Produtos: [parseInt(produtoID)],
                Quantidade: quantidade,
                Preco_Venda: financeiro.preco,
                Faturamento: financeiro.faturamento, // Faturamento real (com desconto)
                Custo_Produto: financeiro.custo,
                Lucro_Venda: financeiro.lucro,       // Lucro Líquido
                Desconto: financeiro.desconto,       // NOVA COLUNA
                Taxa_Maquininha: financeiro.taxa_maquininha, // NOVA COLUNA
                Metodo_Pagamento: metodoPagamento,   // NOVA COLUNA
                Data: dataVenda,
                cliente: cliente
            })
        });

        const resultado = await response.json();
        return res.status(200).json(resultado);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao processar a venda no servidor." });
    }
}