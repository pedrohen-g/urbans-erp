export default async function handler(req, res) {
    if (req.method !== 'PATCH') return res.status(405).json({ error: "Método não permitido" });

    const API_TOKEN = process.env.BASEROW_TOKEN;
    const TABLE_PRODUTOS = 884394;
    const { id, ...dados } = req.body;

    try {
        const response = await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/${id}/?user_field_names=true`, {
            method: "PATCH",
            headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify(dados)
        });
        const resultado = await response.json();
        return res.status(200).json(resultado);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao editar produto." });
    }
}