export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    if (req.headers.authorization !== process.env.API_SECRET) return res.status(401).json({ error: "Não autorizado" });

    const API_TOKEN = process.env.BASEROW_TOKEN;
    const TABLE_DESPESAS = 962948;
    const { Data, Valor, Descricao, Categoria } = req.body;

    try {
        const response = await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_DESPESAS}/?user_field_names=true`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "Data": Data,
                "Valor": Valor,
                "Descricao": Descricao,
                "Categoria": Categoria
            })
        });

        if (!response.ok) throw new Error("Erro ao salvar no Baserow");
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: "Erro interno ao registrar despesa" });
    }
}