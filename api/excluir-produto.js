export default async function handler(req, res) {
    if (req.method !== 'DELETE') return res.status(405).json({ error: "Método não permitido" });
    const API_TOKEN = process.env.BASEROW_TOKEN;
    const { id } = req.query; // Pega o ID da URL

    try {
        await fetch(`https://api.baserow.io/api/database/rows/table/884394/${id}/`, {
            method: "DELETE",
            headers: { Authorization: `Token ${API_TOKEN}` }
        });
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: "Erro ao excluir produto." });
    }
}