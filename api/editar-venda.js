export default async function handler(req, res) {
    if (req.method !== 'PATCH') return res.status(405).json({ error: "Método não permitido" });

    const API_TOKEN = process.env.BASEROW_TOKEN;
    const TABLE_PRODUTOS = 884394;
    const TABLE_VENDAS = 884420;
    const { id, produtoID, diferencaEstoque, novaVenda } = req.body;

    try {
        if (diferencaEstoque !== 0) {
            const resProd = await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/${produtoID}/?user_field_names=true`, {
                headers: { Authorization: `Token ${API_TOKEN}` }
            });
            const p = await resProd.json();
            const novoEstoque = (parseInt(p.Estoque) || 0) + parseInt(diferencaEstoque);

            const resPatchProd = await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/${produtoID}/?user_field_names=true`, {
                method: "PATCH",
                headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
                body: JSON.stringify({ Estoque: novoEstoque })
            });
            
            if (!resPatchProd.ok) {
                const errEstoque = await resPatchProd.json();
                return res.status(400).json({ error: "Baserow recusou a devolução de estoque", details: errEstoque });
            }
        }

        const response = await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_VENDAS}/${id}/?user_field_names=true`, {
            method: "PATCH",
            headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify(novaVenda)
        });

        if (!response.ok) {
            const errVenda = await response.json();
            return res.status(400).json({ error: "Baserow recusou a edição da venda", details: errVenda });
        }

        const resultado = await response.json();
        return res.status(200).json(resultado);
    } catch (error) {
        return res.status(500).json({ error: "Erro no servidor ao editar venda." });
    }
}