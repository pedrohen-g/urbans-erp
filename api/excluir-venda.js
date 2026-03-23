export default async function handler(req, res) {
    if (req.method !== 'DELETE') return res.status(405).json({ error: "Método não permitido" });
    if (req.headers.authorization !== process.env.API_SECRET) return res.status(401).json({ error: "Acesso não autorizado" });

    const API_TOKEN = process.env.BASEROW_TOKEN;
    const { id, produtoID, quantidadeRetorno } = req.query;

    try {
        const resProd = await fetch(`https://api.baserow.io/api/database/rows/table/884394/${produtoID}/?user_field_names=true`, { headers: { Authorization: `Token ${API_TOKEN}` } });
        const pDados = await resProd.json();
        
        await fetch(`https://api.baserow.io/api/database/rows/table/884394/${produtoID}/?user_field_names=true`, {
            method: "PATCH", headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ Estoque: (parseInt(pDados.Estoque) || 0) + parseInt(quantidadeRetorno) })
        });

        await fetch(`https://api.baserow.io/api/database/rows/table/884420/${id}/`, {
            method: "DELETE", headers: { Authorization: `Token ${API_TOKEN}` }
        });

        return res.status(200).json({ success: true });
    } catch (error) { return res.status(500).json({ error: "Erro ao estornar." }); }
}