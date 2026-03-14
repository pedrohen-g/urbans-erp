export default async function handler(req, res) {
    if (req.method !== 'PATCH') return res.status(405).json({ error: "Método não permitido" });
    const API_TOKEN = process.env.BASEROW_TOKEN;
    const { id, novoEstoque } = req.body;

    try {
        await fetch(`https://api.baserow.io/api/database/rows/table/884394/${id}/?user_field_names=true`, {
            method: "PATCH",
            headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({ Estoque: novoEstoque })
        });
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: "Erro ao dar entrada no estoque." });
    }
}