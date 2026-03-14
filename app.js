// ----------------------------------------------------
// SEGURANÇA E CONFIGURAÇÕES INICIAIS
// ----------------------------------------------------
const SENHA_ACESSO = "urbans123";
let produtosGlobais = [];
let vendasGlobais = []; 

function verificarAcesso() {
    const senhaDigitada = prompt("Digite a senha de acesso ao Urbans ERP:");
    if (senhaDigitada !== SENHA_ACESSO) {
        alert("Acesso negado!");
        document.body.innerHTML = `<div style="background:#1a1a1a; color:white; height:100vh; display:flex; align-items:center; justify-content:center; font-family:sans-serif;"><h1>🔒 Acesso Bloqueado.</h1></div>`;
        throw new Error("Bloqueado");
    }
}
verificarAcesso();

// ----------------------------------------------------
// UI E FORMATAÇÃO
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
    setTimeout(() => { toast.classList.add('esconder'); setTimeout(() => toast.remove(), 300); }, 3500);
}

function limparNumero(v) { return parseFloat(v?.toString().replace(',', '.')) || 0; }
function formatarMoeda(v) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function formatarDataBR(d) { 
    if (!d) return "-"; 
    const partes = d.split('T')[0].split('-'); 
    return `${partes[2]}/${partes[1]}/${partes[0]}`; 
}

// ----------------------------------------------------
// CARREGAR DADOS (CHAMA O BACKEND NA VERCEL)
// ----------------------------------------------------
async function carregarTudo() {
    try {
        const resposta = await fetch('/api/get-dados');
        const dados = await resposta.json();
        
        produtosGlobais = dados.produtos;
        vendasGlobais = dados.vendas;

        renderizarEstoque();
        renderizarDashboard();
    } catch (error) {
        mostrarNotificacao("Erro de conexão segura.", "erro");
    }
}

function renderizarEstoque() {
    const tabela = document.getElementById("produtos");
    tabela.innerHTML = "";
    let totalP = 0, cap = 0, pot = 0;

    produtosGlobais.forEach(p => {
        const custo = limparNumero(p.Custo);
        const preco = limparNumero(p.Preco_Venda);
        const estoque = parseInt(p.Estoque) || 0;
        
        totalP += estoque; cap += (custo * estoque); pot += (preco * estoque);
        let margem = preco > 0 ? ((preco - custo) / preco) * 100 : 0;
        
        tabela.innerHTML += `
            <tr>
                <td><strong>${p.Produto || '-'}</strong></td>
                <td>${p.Modelo || '-'}</td>
                <td>${p.Cor || '-'}</td>
                <td>${p.Tamanho || '-'}</td>
                <td>${formatarMoeda(custo)}</td>
                <td>${formatarMoeda(preco)}</td>
                <td><span class="badge margem-badge">${margem.toFixed(1)}%</span></td>
                <td><strong>${estoque}</strong></td>
                <td>${estoque < 3 ? '🔴' : '🟢'}</td>
                <td><button onclick="excluirProduto(${p.id})">❌</button></td>
            </tr>`;
    });
    atualizarSelects();
}

function renderizarDashboard() {
    const hoje = new Date().toLocaleDateString('sv-SE');
    const mesAtual = hoje.substring(0, 7);
    let vHoje = 0, lHoje = 0, lMes = 0;

    const tabela = document.getElementById("historicoVendas");
    tabela.innerHTML = "";

    vendasGlobais.forEach(v => {
        const dataV = v.Data?.split('T')[0] || "";
        const lucro = limparNumero(v.Lucro_Venda);
        if (dataV === hoje) { vHoje += parseInt(v.Quantidade); lHoje += lucro; }
        if (dataV.startsWith(mesAtual)) { lMes += lucro; }

        tabela.innerHTML += `
            <tr>
                <td>${formatarDataBR(v.Data)}</td>
                <td>${v.cliente || "-"}</td>
                <td>${v.Produtos?.[0]?.value || "Excluído"}</td>
                <td>${v.Quantidade}</td>
                <td>${formatarMoeda(limparNumero(v.Faturamento))}</td>
                <td class="lucro-verde">${formatarMoeda(lucro)}</td>
                <td><button onclick="excluirVenda(${v.id})">Estornar</button></td>
            </tr>`;
    });

    document.getElementById("dashVendasHoje").innerText = vHoje;
    document.getElementById("dashLucroHoje").innerText = formatarMoeda(lHoje);
    document.getElementById("dashLucroMes").innerText = formatarMoeda(lMes);
}

function atualizarSelects() {
    const sV = document.getElementById("produtoVenda");
    const sE = document.getElementById("produtoEntrada");
    sV.innerHTML = sE.innerHTML = '<option value="">Selecione...</option>';
    produtosGlobais.forEach(p => {
        const txt = `${p.Produto} ${p.Modelo} (${p.Tamanho})`;
        sV.add(new Option(txt, p.id)); sE.add(new Option(txt, p.id));
    });
}

// ----------------------------------------------------
// AÇÕES (POST)
// ----------------------------------------------------
async function registrarVenda() {
    const pID = document.getElementById("produtoVenda").value;
    const qtd = parseInt(document.getElementById("quantidadeVenda").value);
    const p = produtosGlobais.find(x => x.id == pID);

    if (!p || qtd <= 0) return mostrarNotificacao("Verifique os dados", "aviso");

    const payload = {
        produtoID: pID,
        cliente: document.getElementById("clienteVenda").value,
        quantidade: qtd,
        novoEstoque: p.Estoque - qtd,
        financeiro: {
            preco: limparNumero(p.Preco_Venda),
            custo: limparNumero(p.Custo),
            faturamento: limparNumero(p.Preco_Venda) * qtd,
            lucro: (limparNumero(p.Preco_Venda) - limparNumero(p.Custo)) * qtd
        }
    };

    try {
        const res = await fetch('/api/registrar-venda', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) { mostrarNotificacao("Venda OK!"); carregarTudo(); }
    } catch (e) { mostrarNotificacao("Erro no servidor", "erro"); }
}

// Inicializa
carregarTudo();