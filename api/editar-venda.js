export default async function handler(req, res) {
    if (req.method !== 'PATCH') return res.status(405).json({ error: "Método não permitido" });

    const API_TOKEN = process.env.BASEROW_TOKEN;
    const TABLE_PRODUTOS = 884394;
    const TABLE_VENDAS = 884420;

    const { id, produtoID, diferencaEstoque, novaVenda } = req.body;

    try {
        // 1. Devolve ou retira a diferença do Estoque
        if (diferencaEstoque !== 0) {
            const resProd = await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/${produtoID}/?user_field_names=true`, {
                headers: { Authorization: `Token ${API_TOKEN}` }
            });
            const p = await resProd.json();
            const novoEstoque = (parseInt(p.Estoque) || 0) + parseInt(diferencaEstoque);

            await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/${produtoID}/?user_field_names=true`, {
                method: "PATCH",
                headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
                body: JSON.stringify({ Estoque: novoEstoque })
            });
        }

        // 2. Atualiza os dados financeiros e quantidades na Venda
        const response = await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_VENDAS}/${id}/?user_field_names=true`, {
            method: "PATCH",
            headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify(novaVenda)
        });

        const resultado = await response.json();
        return res.status(200).json(resultado);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao editar venda no servidor." });
    }
}