export default async function handler(req, res) {
    if (req.method !== 'DELETE') return res.status(405).json({ error: "Método não permitido" });

    const API_TOKEN = process.env.BASEROW_TOKEN;
    const TABLE_PRODUTOS = 884394;
    const TABLE_VENDAS = 884420;
    const { id, produtoID, quantidadeRetorno } = req.query;

    try {
        // 1. Devolve a quantidade ao estoque
        const resProd = await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/${produtoID}/?user_field_names=true`, {
            headers: { Authorization: `Token ${API_TOKEN}` }
        });
        const pDados = await resProd.json();
        
        await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/${produtoID}/?user_field_names=true`, {
            method: "PATCH",
            headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({ Estoque: (parseInt(pDados.Estoque) || 0) + parseInt(quantidadeRetorno) })
        });

        // 2. Apaga a venda
        await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_VENDAS}/${id}/`, {
            method: "DELETE",
            headers: { Authorization: `Token ${API_TOKEN}` }
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: "Erro ao estornar." });
    }
}