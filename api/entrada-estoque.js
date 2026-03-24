export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Método não permitido" });
    if (req.headers.authorization !== process.env.API_SECRET) return res.status(401).json({ error: "Acesso não autorizado" });

    const API_TOKEN = process.env.BASEROW_TOKEN;
    const TABLE_PRODUTOS = 884394;
    const TABLE_ENTRADAS = "COLOQUE_AQUI_O_ID_DA_TABELA_ENTRADAS"; // <- AVISO: SUBSTITUA PELO ID REAL DA SUA TABELA DE ENTRADAS

    const { produtoID, quantidade, custo } = req.body;

    try {
        // 1. Puxa os dados ATUAIS do produto
        const resAtual = await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/${produtoID}/?user_field_names=true`, {
            headers: { Authorization: `Token ${API_TOKEN}` }
        });
        const produtoAtual = await resAtual.json();

        // 2. Garante que os valores antigos sejam lidos com os decimais corretos
        const estoqueAntigo = parseInt(produtoAtual.Estoque) || 0;
        const custoAntigoStr = produtoAtual.Custo ? produtoAtual.Custo.toString().replace(',', '.') : "0";
        const custoAntigo = parseFloat(custoAntigoStr) || 0;

        const qtdNova = parseInt(quantidade) || 0;
        const custoNovo = parseFloat(custo.toString().replace(',', '.')) || 0;

        // 3. Calcula o Preço Médio Ponderado e o Estoque Total
        const estoqueTotal = estoqueAntigo + qtdNova;
        let precoMedio = custoNovo;

        if (estoqueAntigo > 0) {
            const valorTotalAntigo = estoqueAntigo * custoAntigo;
            const valorTotalNovo = qtdNova * custoNovo;
            precoMedio = (valorTotalAntigo + valorTotalNovo) / estoqueTotal;
        }

        // 4. Salva no Produto (Estoque Atualizado + Custo Médio)
        const resProd = await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/${produtoID}/?user_field_names=true`, {
            method: "PATCH",
            headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                Estoque: estoqueTotal,
                Custo: precoMedio.toFixed(2).toString() // Salva no banco com duas casas decimais
            })
        });

        if (!resProd.ok) throw new Error("Erro ao atualizar o produto principal.");

        // 5. Salva na Tabela de Entradas (Histórico)
        const dataEntrada = new Date().toLocaleDateString('en-CA');
        const resHist = await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_ENTRADAS}/?user_field_names=true`, {
            method: "POST",
            headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                Produto: [parseInt(produtoID)],
                Quantidade: qtdNova,
                Custo_Unitario: custoNovo.toFixed(2).toString(), // Histórico guarda o que você pagou de fato neste lote
                Data: dataEntrada
            })
        });

        if (!resHist.ok) throw new Error("Erro ao registrar no histórico de entradas.");

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro interno no servidor." });
    }
}