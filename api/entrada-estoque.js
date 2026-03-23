export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Método não permitido" });

    const API_TOKEN = process.env.BASEROW_TOKEN;
    const TABLE_PRODUTOS = 884394;
    
    const TABLE_ENTRADAS = 884417; 
    
    const { produtoID, quantidade, custo, novoEstoque } = req.body;

    try {
        // 1. Atualiza Estoque e Custo na Tabela de Produtos
        const resProd = await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/${produtoID}/?user_field_names=true`, {
            method: "PATCH",
            headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({ Estoque: novoEstoque, Custo: custo.toString() })
        });
        
        if (!resProd.ok) return res.status(400).json({ error: "Erro ao atualizar produto no Baserow" });

        // 2. Registra histórico na Tabela de Entradas
        const dataEntrada = new Date().toLocaleDateString('en-CA');
        
        const resHist = await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_ENTRADAS}/?user_field_names=true`, {
            method: "POST",
            headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                Produto: [parseInt(produtoID)],
                Quantidade: quantidade,
                Custo_Unitario: custo.toString(),
                Data: dataEntrada
            })
        });

        if (!resHist.ok) {
            const err = await resHist.json();
            return res.status(400).json({ error: "Erro ao salvar histórico de entrada", details: err });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: "Erro interno na Vercel." });
    }
}