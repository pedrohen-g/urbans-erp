export default async function handler(req, res) {
    if (req.method !== 'DELETE') return res.status(405).end();
    if (req.headers.authorization !== process.env.API_SECRET) return res.status(401).json({ error: "Não autorizado" });

    const API_TOKEN = process.env.BASEROW_TOKEN;
    const TABLE_DESPESAS = 962948;
    const { id } = req.query;

    if (!id) return res.status(400).json({ error: "ID não fornecido" });

    try {
        const response = await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_DESPESAS}/${id}/`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Token ${API_TOKEN}`
            }
        });

        if (!response.ok) throw new Error("Erro ao deletar no Baserow");
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: "Erro interno ao excluir despesa" });
    }
}