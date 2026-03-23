export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Método não permitido" });
    if (req.headers.authorization !== process.env.API_SECRET) return res.status(401).json({ error: "Acesso não autorizado" });

    const API_TOKEN = process.env.BASEROW_TOKEN;
    const TABLE_PRODUTOS = 884394;
    const TABLE_ENTRADAS = 884417; 
    
    const { produtoID, quantidade, custo, novoEstoque } = req.body;

    try {
        const resProd = await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/${produtoID}/?user_field_names=true`, {
            method: "PATCH", headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ Estoque: novoEstoque, Custo: custo.toString() })
        });
        if (!resProd.ok) return res.status(400).json({ error: "Erro produto" });

        const dataEntrada = new Date().toLocaleDateString('en-CA');
        const resHist = await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_ENTRADAS}/?user_field_names=true`, {
            method: "POST", headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({ Produto: [parseInt(produtoID)], Quantidade: quantidade, Custo_Unitario: custo.toString(), Data: dataEntrada })
        });
        if (!resHist.ok) return res.status(400).json({ error: "Erro histórico" });

        return res.status(200).json({ success: true });
    } catch (error) { return res.status(500).json({ error: "Erro Vercel" }); }
}