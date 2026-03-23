export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Método não permitido" });
    if (req.headers.authorization !== process.env.API_SECRET) return res.status(401).json({ error: "Acesso não autorizado" });
    
    const API_TOKEN = process.env.BASEROW_TOKEN;
    try {
        const response = await fetch(`https://api.baserow.io/api/database/rows/table/884394/?user_field_names=true`, {
            method: "POST", headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify(req.body)
        });
        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) { return res.status(500).json({ error: "Erro ao cadastrar." }); }
}