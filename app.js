// ----------------------------------------------------
// SEGURANÇA E CONFIGURAÇÕES INICIAIS
// ----------------------------------------------------
const SENHA_ACESSO = "urbans123"; // Defina a senha que você dirá ao seu irmão
const API_TOKEN = "SEU_NOVO_TOKEN_AQUI"; 
const TABLE_PRODUTOS = 884394;
const TABLE_VENDAS = 884420;

let produtosGlobais = [];
let vendasGlobais = []; 

// Função de bloqueio imediato
function verificarAcesso() {
    const senhaDigitada = prompt("Digite a senha de acesso ao Urbans ERP:");
    if (senhaDigitada !== SENHA_ACESSO) {
        alert("Acesso negado!");
        document.body.innerHTML = `
            <div style="background:#1a1a1a; color:white; height:100vh; display:flex; align-items:center; justify-content:center; font-family:sans-serif;">
                <h1>🔒 Acesso Bloqueado. Digite a senha correta ao atualizar a página.</h1>
            </div>`;
        throw new Error("Acesso interrompido por senha incorreta");
    }
}

// Executa a tranca antes de carregar o resto
verificarAcesso();

// ----------------------------------------------------
// NAVEGAÇÃO E UI
// ----------------------------------------------------
function abrirAba(evento, idAba) {
    let conteudos = document.getElementsByClassName("aba-conteudo");
    for (let i = 0; i < conteudos.length; i++) { conteudos[i].classList.remove("ativo"); }
    let botoes = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < botoes.length; i++) { botoes[i].classList.remove("ativo"); }
    document.getElementById(idAba).classList.add("ativo");
    evento.currentTarget.classList.add("ativo");
}

function mostrarNotificacao(mensagem, tipo = 'sucesso') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    let icone = tipo === 'erro' ? '❌' : (tipo === 'aviso' ? '⚠️' : '✅');
    toast.innerHTML = `<span>${icone}</span> <span>${mensagem}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('esconder');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ----------------------------------------------------
// AUXILIARES DE FORMATAÇÃO
// ----------------------------------------------------
function limparNumero(valor) {
    if (valor !== undefined && valor !== null && valor !== "") {
        return parseFloat(valor.toString().replace(',', '.')) || 0;
    }
    return 0;
}

function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataBR(dataIso) {
    if (!dataIso) return "-";
    if (dataIso.includes('/')) return dataIso;
    const partes = dataIso.split('T')[0].split('-');
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// ----------------------------------------------------
// CARREGAR PRODUTOS (ABA ESTOQUE)
// ----------------------------------------------------
async function carregarProdutos() {
    try {
        const resposta = await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/?user_field_names=true`, { 
            headers: { Authorization: `Token ${API_TOKEN}` }
        });
        const dados = await resposta.json();
        produtosGlobais = dados.results; 

        const tabela = document.getElementById("produtos");
        tabela.innerHTML = "";
        let totalPecas = 0, capitalInvestido = 0, potencialFaturamento = 0;

        produtosGlobais.forEach(produto => {
            const custo = limparNumero(produto.Custo);
            const preco = limparNumero(produto.Preco_Venda);
            const estoqueAtual = parseInt(produto.Estoque) || 0;
            
            totalPecas += estoqueAtual;
            capitalInvestido += (custo * estoqueAtual);
            potencialFaturamento += (preco * estoqueAtual);

            let margem = preco > 0 ? ((preco - custo) / preco) * 100 : 0;
            let statusHtml = estoqueAtual === 0 ? '<span class="badge badge-danger">🔴 Esgotado</span>' : 
                             (estoqueAtual < 3 ? '<span class="badge badge-warning">🟡 Acabando</span>' : '<span class="badge badge-success">🟢 Normal</span>');

            const linha = `
            <tr>
                <td><strong>${produto.Produto || '-'}</strong></td>
                <td>${produto.Modelo || '-'}</td>
                <td>${produto.Cor || '-'}</td>
                <td>${produto.Tamanho || '-'}</td>
                <td>${formatarMoeda(custo)}</td>
                <td>${formatarMoeda(preco)}</td>
                <td><span class="badge margem-badge">${margem.toFixed(1).replace('.', ',')}%</span></td>
                <td style="font-size: 16px;"><strong>${estoqueAtual}</strong></td>
                <td>${statusHtml}</td>
                <td>
                    <button class="btn-acao btn-edit" onclick="abrirModalEdicao(${produto.id})">Editar</button>
                    <button class="btn-acao btn-delete" onclick="excluirProduto(${produto.id})">Excluir</button>
                </td>
            </tr>`;
            tabela.innerHTML += linha;
        });

        const lucroProjetado = potencialFaturamento - capitalInvestido;
        document.getElementById("resumoEstoque").innerHTML = `
            <tr>
                <td colspan="4" style="text-align: right; text-transform: uppercase; font-size: 12px;"><strong>Resumo:</strong></td>
                <td><strong>${formatarMoeda(capitalInvestido)}</strong></td>
                <td><strong>${formatarMoeda(potencialFaturamento)}</strong></td>
                <td>-</td>
                <td style="font-size: 16px;"><strong>${totalPecas} un.</strong></td>
                <td colspan="2" class="lucro-verde">LUCRO PROJETADO: <br>+ ${formatarMoeda(lucroProjetado)}</td>
            </tr>`;

        atualizarSelects();
    } catch (error) { console.error(error); }
}

function atualizarSelects() {
    const sV = document.getElementById("produtoVenda");
    const sE = document.getElementById("produtoEntrada");
    if(!sV || !sE) return;
    sV.innerHTML = '<option value="">Selecione...</option>';
    sE.innerHTML = '<option value="">Selecione...</option>';
    produtosGlobais.forEach(p => {
        const txt = `${p.Produto} ${p.Modelo} - ${p.Cor} (${p.Tamanho})`;
        sV.add(new Option(txt, p.id));
        sE.add(new Option(txt, p.id));
    });
}

// ----------------------------------------------------
// CARREGAR HISTÓRICO E DASHBOARD
// ----------------------------------------------------
async function carregarVendasEDashboard() {
    try {
        const resposta = await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_VENDAS}/?user_field_names=true`, { 
            headers: { Authorization: `Token ${API_TOKEN}` }
        });
        const dados = await resposta.json();
        vendasGlobais = dados.results.reverse(); 

        // FIX FUSO HORÁRIO BRASIL
        const hoje = new Date().toLocaleDateString('sv-SE'); 
        const mesAtual = hoje.substring(0, 7); 

        let qtdVendasHoje = 0, lucroHoje = 0, lucroMes = 0;
        const tabelaHistorico = document.getElementById("historicoVendas");
        tabelaHistorico.innerHTML = "";

        vendasGlobais.forEach(venda => {
            let dataVendaIso = venda.Data ? venda.Data.split('T')[0] : "";
            if (venda.Data && venda.Data.includes('/')) {
                const p = venda.Data.split('/');
                dataVendaIso = `${p[2]}-${p[1]}-${p[0]}`;
            }

            const qtd = parseInt(venda.Quantidade) || 0;
            const lucroVal = limparNumero(venda.Lucro_Venda);

            if (dataVendaIso === hoje) { qtdVendasHoje += qtd; lucroHoje += lucroVal; }
            if (dataVendaIso.startsWith(mesAtual)) { lucroMes += lucroVal; }

            const linha = `
            <tr>
                <td>${formatarDataBR(venda.Data)}</td>
                <td><strong>${venda.cliente || "-"}</strong></td>
                <td>${venda.Produtos && venda.Produtos.length > 0 ? venda.Produtos[0].value : "Excluído"}</td>
                <td><strong>${qtd}</strong></td>
                <td>${formatarMoeda(limparNumero(venda.Faturamento))}</td>
                <td class="lucro-verde">${formatarMoeda(lucroVal)}</td>
                <td>
                    <button class="btn-acao btn-edit" onclick="abrirModalEdicaoVenda(${venda.id})">Editar</button>
                    <button class="btn-acao btn-delete" onclick="excluirVenda(${venda.id})">Estornar</button>
                </td>
            </tr>`;
            tabelaHistorico.innerHTML += linha;
        });

        document.getElementById("dashVendasHoje").innerText = qtdVendasHoje;
        document.getElementById("dashLucroHoje").innerText = formatarMoeda(lucroHoje);
        document.getElementById("dashLucroMes").innerText = formatarMoeda(lucroMes);
    } catch (error) { console.error(error); }
}

// ----------------------------------------------------
// AÇÕES
// ----------------------------------------------------
async function registrarVenda() {
    const pID = document.getElementById("produtoVenda").value;
    const qtd = parseInt(document.getElementById("quantidadeVenda").value);
    const cli = document.getElementById("clienteVenda").value;

    if (!pID || !qtd || qtd <= 0) return mostrarNotificacao("Dados incompletos", "aviso");

    try {
        const p = produtosGlobais.find(x => x.id == pID);
        if (parseInt(p.Estoque) < qtd) return mostrarNotificacao("Estoque insuficiente", "erro");

        const preco = limparNumero(p.Preco_Venda);
        const custo = limparNumero(p.Custo);
        const dataVenda = new Date().toLocaleDateString('sv-SE');

        await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/${pID}/?user_field_names=true`, {
            method: "PATCH", headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({ Estoque: parseInt(p.Estoque) - qtd })
        });

        await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_VENDAS}/?user_field_names=true`, {
            method: "POST", headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                Produtos: [parseInt(pID)], Quantidade: qtd, Preco_Venda: preco,
                Faturamento: preco * qtd, Custo_Produto: custo, Lucro_Venda: (preco - custo) * qtd,
                Data: dataVenda, cliente: cli
            })
        });

        mostrarNotificacao("Venda registrada!");
        carregarProdutos(); carregarVendasEDashboard();
    } catch (e) { mostrarNotificacao("Erro ao vender", "erro"); }
}

// ... (Todas as outras funções de edição e exclusão permanecem aqui para o sistema funcionar)

async function excluirVenda(id) {
    if (!confirm("Estornar venda?")) return;
    try {
        const v = vendasGlobais.find(x => x.id === id);
        if (v.Produtos && v.Produtos.length > 0) {
            const pID = v.Produtos[0].id;
            const resP = await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/${pID}/?user_field_names=true`, { headers: { Authorization: `Token ${API_TOKEN}` }});
            const pD = await resP.json();
            await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/${pID}/?user_field_names=true`, {
                method: "PATCH", headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
                body: JSON.stringify({ Estoque: (parseInt(pD.Estoque) || 0) + (parseInt(v.Quantidade) || 0) })
            });
        }
        await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_VENDAS}/${id}/`, { method: "DELETE", headers: { Authorization: `Token ${API_TOKEN}` }});
        mostrarNotificacao("Estornado!");
        carregarProdutos(); carregarVendasEDashboard();
    } catch (e) { }
}

async function entradaEstoque() {
    const pID = document.getElementById("produtoEntrada").value;
    const qtd = parseInt(document.getElementById("quantidadeEntrada").value);
    if (!pID || !qtd) return;
    const p = produtosGlobais.find(x => x.id == pID);
    await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/${pID}/?user_field_names=true`, {
        method: "PATCH", headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ Estoque: (parseInt(p.Estoque) || 0) + qtd })
    });
    mostrarNotificacao("Estoque atualizado!");
    carregarProdutos();
}

async function cadastrarProduto() {
    const n = document.getElementById("cadProduto").value;
    const c = parseFloat(document.getElementById("cadCusto").value);
    const p = parseFloat(document.getElementById("cadPreco").value);
    if (!n || isNaN(c) || isNaN(p)) return;
    await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/?user_field_names=true`, {
        method: "POST", headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ Produto: n, Modelo: document.getElementById("cadModelo").value, Cor: document.getElementById("cadCor").value, Tamanho: document.getElementById("cadTamanho").value, Custo: c, Preco_Venda: p, Estoque: parseInt(document.getElementById("cadEstoque").value) || 0 })
    });
    mostrarNotificacao("Cadastrado!");
    carregarProdutos();
}

async function excluirProduto(id) {
    if (!confirm("Excluir produto?")) return;
    await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/${id}/`, { method: "DELETE", headers: { Authorization: `Token ${API_TOKEN}` }});
    carregarProdutos();
}

function abrirModalEdicao(id) {
    const p = produtosGlobais.find(x => x.id === id);
    document.getElementById("editID").value = p.id;
    document.getElementById("editProduto").value = p.Produto;
    document.getElementById("editCusto").value = limparNumero(p.Custo);
    document.getElementById("editPreco").value = limparNumero(p.Preco_Venda);
    document.getElementById("editEstoque").value = p.Estoque;
    document.getElementById("modalEdicao").classList.add("ativo");
}
function fecharModal() { document.getElementById("modalEdicao").classList.remove("ativo"); }

async function salvarEdicao() {
    const id = document.getElementById("editID").value;
    await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/${id}/?user_field_names=true`, {
        method: "PATCH", headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ Produto: document.getElementById("editProduto").value, Custo: parseFloat(document.getElementById("editCusto").value), Preco_Venda: parseFloat(document.getElementById("editPreco").value), Estoque: parseInt(document.getElementById("editEstoque").value) })
    });
    fecharModal(); carregarProdutos();
}

// Inicialização Final
carregarProdutos();
carregarVendasEDashboard();