export default async function handler(req, res) {
    if (req.method !== 'PATCH') return res.status(405).json({ error: "Método não permitido" });
    if (req.headers.authorization !== process.env.API_SECRET) return res.status(401).json({ error: "Acesso não autorizado" });

    const API_TOKEN = process.env.BASEROW_TOKEN;
    const { id, produtoID, diferencaEstoque, novaVenda } = req.body;

    try {
        if (diferencaEstoque !== 0) {
            const resProd = await fetch(`https://api.baserow.io/api/database/rows/table/884394/${produtoID}/?user_field_names=true`, { headers: { Authorization: `Token ${API_TOKEN}` } });
            const p = await resProd.json();
            const novoEstoque = (parseInt(p.Estoque) || 0) + parseInt(diferencaEstoque);

            await fetch(`https://api.baserow.io/api/database/rows/table/884394/${produtoID}/?user_field_names=true`, {
                method: "PATCH", headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ Estoque: novoEstoque })
            });
        }

        const response = await fetch(`https://api.baserow.io/api/database/rows/table/884420/${id}/?user_field_names=true`, {
            method: "PATCH", headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify(novaVenda)
        });
        const resultado = await response.json();
        return res.status(200).json(resultado);
    } catch (error) { return res.status(500).json({ error: "Erro ao editar venda." }); }
}