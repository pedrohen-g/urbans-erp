export default async function handler(req, res) {
    if (req.headers.authorization !== process.env.API_SECRET) return res.status(401).json({ error: "Acesso não autorizado" });
    const API_TOKEN = process.env.BASEROW_TOKEN;
    const TABLE_PRODUTOS = 884394;
    const TABLE_VENDAS = 884420;

    try {
        const [resProd, resVend] = await Promise.all([
            fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/?user_field_names=true`, { headers: { Authorization: `Token ${API_TOKEN}` } }),
            fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_VENDAS}/?user_field_names=true`, { headers: { Authorization: `Token ${API_TOKEN}` } })
        ]);
        const produtos = await resProd.json();
        const vendas = await resVend.json();
        return res.status(200).json({ produtos: produtos.results || [], vendas: vendas.results || [] });
    } catch (error) {
        return res.status(500).json({ error: "Erro ao acessar o banco de dados." });
    }
}