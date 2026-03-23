// ----------------------------------------------------
// SEGURANÇA E VARIÁVEIS GLOBAIS
// ----------------------------------------------------
const SENHA_ACESSO = "urbans123";
let produtosGlobais = [];
let vendasGlobais = []; 

// Instâncias do Chart.js para o BI
let graficoEvolucaoVendas = null;
let graficoTopProdutos = null;
let graficoPagamentos = null;

function verificarAcesso() {
    const senhaDigitada = prompt("Digite a senha de acesso ao Urbans ERP:");
    if (senhaDigitada !== SENHA_ACESSO) {
        document.body.innerHTML = `<div style="background:#121212; color:white; height:100vh; display:flex; align-items:center; justify-content:center; font-family:sans-serif;"><h1>🔒 Acesso Bloqueado.</h1></div>`;
        throw new Error("Acesso negado");
    }
}
verificarAcesso();

function abrirAba(evento, idAba) {
    let conteudos = document.getElementsByClassName("aba-conteudo");
    for (let i = 0; i < conteudos.length; i++) { conteudos[i].classList.remove("ativo"); }
    let botoes = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < botoes.length; i++) { botoes[i].classList.remove("ativo"); }
    document.getElementById(idAba).classList.add("ativo");
    evento.currentTarget.classList.add("ativo");

    // Aciona o Dashboard quando a aba for clicada
    if(idAba === 'abaDashboard') { renderizarDashboard(); }
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
    }, 4000);
}

const limparNumero = (v) => parseFloat(v?.toString().replace(',', '.')) || 0;
const formatarMoeda = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ----------------------------------------------------
// CARREGAR DADOS DA API
// ----------------------------------------------------
async function carregarDados() {
    try {
        const resposta = await fetch('/api/get-dados');
        const dados = await resposta.json();
        produtosGlobais = dados.produtos;
        vendasGlobais = dados.vendas.reverse(); 
        renderizarProdutos();
        renderizarVendas();
        if(document.getElementById('abaDashboard').classList.contains('ativo')) {
            renderizarDashboard();
        }
    } catch (error) { 
        mostrarNotificacao("Erro de conexão com o servidor.", "erro"); 
    }
}

function renderizarProdutos() {
    const tabela = document.getElementById("produtos");
    if (!tabela) return;
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

        tabela.innerHTML += `
            <tr>
                <td><strong>${produto.Produto}</strong></td><td>${produto.Modelo}</td><td>${produto.Cor}</td><td>${produto.Tamanho}</td>
                <td>${formatarMoeda(custo)}</td><td>${formatarMoeda(preco)}</td>
                <td><span class="badge margem-badge">${margem.toFixed(1)}%</span></td>
                <td><strong>${estoqueAtual}</strong></td><td>${statusHtml}</td>
                <td>
                    <button class="btn-acao btn-edit" onclick="abrirModalEdicao(${produto.id})">Editar</button>
                    <button class="btn-acao btn-delete" onclick="excluirProduto(${produto.id})">❌</button>
                </td>
            </tr>`;
    });
    
    document.getElementById("resumoEstoque").innerHTML = `<tr><td colspan="4">RESUMO</td><td>${formatarMoeda(capitalInvestido)}</td><td>${formatarMoeda(potencialFaturamento)}</td><td>-</td><td>${totalPecas} un.</td><td colspan="2" class="lucro-verde">LUCRO PROJETADO: ${formatarMoeda(potencialFaturamento - capitalInvestido)}</td></tr>`;
    atualizarSelects();
}

function renderizarVendas() {
    const tabela = document.getElementById("historicoVendas");
    if (!tabela) return;
    tabela.innerHTML = "";

    vendasGlobais.forEach(venda => {
        let dataIso = venda.Data?.split('T')[0] || "";
        const qtd = parseInt(venda.Quantidade) || 0;
        const lucroVal = limparNumero(venda.Lucro_Venda);
        
        // Blindagem contra o bug [object Object]
        let metodoTxt = "Dinheiro";
        if(venda.Metodo_Pagamento) {
            metodoTxt = typeof venda.Metodo_Pagamento === 'object' ? (venda.Metodo_Pagamento.value || "Dinheiro") : venda.Metodo_Pagamento;
        }

        tabela.innerHTML += `
            <tr>
                <td>${dataIso.split('-').reverse().join('/')}</td>
                <td><strong>${venda.cliente || "-"}</strong></td>
                <td>${venda.Produtos?.[0]?.value || "-"}</td>
                <td>${qtd}</td><td>${metodoTxt}</td>
                <td>${formatarMoeda(limparNumero(venda.Faturamento))}</td>
                <td class="lucro-verde">${formatarMoeda(lucroVal)}</td>
                <td>
                    <button class="btn-acao btn-edit" onclick="abrirModalEdicaoVenda(${venda.id})">Editar</button>
                    <button class="btn-acao btn-delete" onclick="excluirVenda(${venda.id})">Estornar</button>
                </td>
            </tr>`;
    });
}

function atualizarSelects() {
    const sV = document.getElementById("produtoVenda"), sE = document.getElementById("produtoEntrada");
    sV.innerHTML = sE.innerHTML = '<option value="">Selecione...</option>';
    produtosGlobais.forEach(p => {
        const txt = `${p.Produto} ${p.Modelo} (${p.Tamanho})`;
        sV.add(new Option(txt, p.id)); sE.add(new Option(txt, p.id));
    });
}

// ----------------------------------------------------
// REGISTRO DE VENDAS E EDIÇÃO
// ----------------------------------------------------
function atualizarResumoVenda() {
    const pID = document.getElementById("produtoVenda").value, qtd = parseInt(document.getElementById("quantidadeVenda").value) || 0;
    const desc = limparNumero(document.getElementById("descontoVenda").value), tP = limparNumero(document.getElementById("taxaVenda").value), display = document.getElementById("resumoVendaDisplay");
    const p = produtosGlobais.find(x => x.id == pID);
    if (!p || qtd <= 0) { display.style.display = "none"; return; }
    
    const fR = Number(((limparNumero(p.Preco_Venda) * qtd) - desc).toFixed(2));
    const vT = Number((fR * (tP / 100)).toFixed(2));
    const luc = Number((fR - vT - (limparNumero(p.Custo) * qtd)).toFixed(2));
    
    display.style.display = "block";
    display.innerHTML = `<span>Fat: ${formatarMoeda(fR)} | Taxa: -${formatarMoeda(vT)}<br>Lucro: <strong class="lucro-verde">${formatarMoeda(luc)}</strong></span>`;
}

async function registrarVenda() {
    const pID = document.getElementById("produtoVenda").value, qtd = parseInt(document.getElementById("quantidadeVenda").value);
    const p = produtosGlobais.find(x => x.id == pID);
    if (!p || !qtd) return mostrarNotificacao("Dados incompletos", "aviso");
    if (parseInt(p.Estoque) < qtd) return mostrarNotificacao("Estoque insuficiente", "erro");
    
    const desc = limparNumero(document.getElementById("descontoVenda").value), tP = limparNumero(document.getElementById("taxaVenda").value);
    const fR = Number(((limparNumero(p.Preco_Venda) * qtd) - desc).toFixed(2));
    const vT = Number((fR * (tP / 100)).toFixed(2));
    const luc = Number((fR - vT - (limparNumero(p.Custo) * qtd)).toFixed(2));

    try {
        const res = await fetch('/api/registrar-venda', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                produtoID: pID, cliente: document.getElementById("clienteVenda").value, quantidade: qtd, novoEstoque: parseInt(p.Estoque) - qtd, metodoPagamento: document.getElementById("metodoPagamento").value,
                financeiro: { preco: limparNumero(p.Preco_Venda), custo: limparNumero(p.Custo), desconto: desc, taxa_maquininha: vT, faturamento: fR, lucro: luc }
            })
        });
        if (res.ok) { 
            mostrarNotificacao("Venda salva!"); 
            document.getElementById("quantidadeVenda").value = "";
            document.getElementById("descontoVenda").value = "";
            document.getElementById("taxaVenda").value = "";
            document.getElementById("clienteVenda").value = "";
            document.getElementById("resumoVendaDisplay").style.display = "none";
            carregarDados(); 
        } else {
            mostrarNotificacao("O banco de dados recusou os valores.", "erro");
        }
    } catch (e) { mostrarNotificacao("Erro ao salvar", "erro"); }
}

async function salvarEdicaoVenda() {
    const id = document.getElementById("editVendaID").value, qA = parseInt(document.getElementById("editVendaQtdAntiga").value);
    const nQ = parseInt(document.getElementById("editVendaQuantidade").value), pr = limparNumero(document.getElementById("editVendaPreco").value);
    const cus = limparNumero(document.getElementById("editVendaCusto").value), desc = limparNumero(document.getElementById("editVendaDesconto").value);
    const tP = limparNumero(document.getElementById("editVendaTaxa").value);
    
    const fR = Number(((pr * nQ) - desc).toFixed(2));
    const vT = Number((fR * (tP / 100)).toFixed(2));
    const luc = Number((fR - vT - (cus * nQ)).toFixed(2));

    const payload = {
        id, produtoID: document.getElementById("editVendaProdutoID").value, diferencaEstoque: qA - nQ,
        novaVenda: { Quantidade: nQ, cliente: document.getElementById("editVendaCliente").value, Data: document.getElementById("editVendaData").value, Desconto: desc, Metodo_Pagamento: document.getElementById("editVendaMetodo").value, Taxa_Maquininha: vT, Faturamento: fR, Lucro_Venda: luc }
    };
    try {
        const res = await fetch('/api/editar-venda', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) { mostrarNotificacao("Atualizado!"); fecharModalVenda(); carregarDados(); }
        else { mostrarNotificacao("Erro ao atualizar venda.", "erro"); }
    } catch (e) { mostrarNotificacao("Erro de conexão", "erro"); }
}

function abrirModalEdicaoVenda(id) {
    const v = vendasGlobais.find(x => x.id === id);
    document.getElementById("editVendaID").value = v.id;
    document.getElementById("editVendaProdutoID").value = v.Produtos[0].id;
    document.getElementById("editVendaQtdAntiga").value = v.Quantidade;
    document.getElementById("editVendaPreco").value = limparNumero(v.Preco_Venda);
    document.getElementById("editVendaCusto").value = limparNumero(v.Custo_Produto);
    document.getElementById("editVendaProdutoNome").value = v.Produtos[0].value;
    document.getElementById("editVendaCliente").value = v.cliente || "";
    document.getElementById("editVendaData").value = v.Data?.split('T')[0] || "";
    document.getElementById("editVendaQuantidade").value = v.Quantidade;
    document.getElementById("editVendaDesconto").value = limparNumero(v.Desconto);
    
    let metodoTxt = "Dinheiro";
    if (v.Metodo_Pagamento) {
        metodoTxt = typeof v.Metodo_Pagamento === 'object' ? (v.Metodo_Pagamento.value || "Dinheiro") : v.Metodo_Pagamento;
    }
    document.getElementById("editVendaMetodo").value = metodoTxt;
    
    let fR = limparNumero(v.Faturamento), vT = limparNumero(v.Taxa_Maquininha);
    document.getElementById("editVendaTaxa").value = fR > 0 ? (vT / fR * 100).toFixed(2) : 0;
    document.getElementById("modalEdicaoVenda").classList.add("ativo");
}
function fecharModalVenda() { document.getElementById("modalEdicaoVenda").classList.remove("ativo"); }

// ----------------------------------------------------
// NOVA LÓGICA DE ESTOQUE E CRUDS DE PRODUTOS
// ----------------------------------------------------
async function entradaEstoque() {
    const id = document.getElementById("produtoEntrada").value;
    const q = parseInt(document.getElementById("quantidadeEntrada").value);
    const custo = limparNumero(document.getElementById("custoEntrada").value);
    const p = produtosGlobais.find(x => x.id == id);
    
    if (!id || !q || q <= 0 || custo <= 0) return mostrarNotificacao("Preencha quantidade e custo pago.", "aviso");
    
    try {
        const res = await fetch('/api/entrada-estoque', { 
            method: 'POST', // Mudou para POST pois agora salva histórico!
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                produtoID: id, 
                quantidade: q,
                custo: custo,
                novoEstoque: (parseInt(p.Estoque) || 0) + q 
            }) 
        });
        if(res.ok) { 
            mostrarNotificacao("Estoque atualizado e Histórico salvo!"); 
            document.getElementById("quantidadeEntrada").value = "";
            document.getElementById("custoEntrada").value = "";
            carregarDados(); 
        } else {
            mostrarNotificacao("Erro do Servidor.", "erro");
        }
    } catch(e) { mostrarNotificacao("Erro de conexão.", "erro"); }
}

async function excluirVenda(id) {
    if (!confirm("Estornar?")) return;
    const v = vendasGlobais.find(x => x.id === id);
    try {
        const res = await fetch(`/api/excluir-venda?id=${id}&produtoID=${v.Produtos[0].id}&quantidadeRetorno=${v.Quantidade}`, { method: 'DELETE' });
        if (res.ok) { mostrarNotificacao("Estornado!"); carregarDados(); }
    } catch (e) { mostrarNotificacao("Erro", "erro"); }
}

async function cadastrarProduto() {
    const p = { 
        Produto: document.getElementById("cadProduto").value, Modelo: document.getElementById("cadModelo").value, 
        Cor: document.getElementById("cadCor").value, Tamanho: document.getElementById("cadTamanho").value, 
        Custo: parseFloat(document.getElementById("cadCusto").value), Preco_Venda: parseFloat(document.getElementById("cadPreco").value), 
        Estoque: parseInt(document.getElementById("cadEstoque").value) || 0 
    };
    try {
        const res = await fetch('/api/cadastrar-produto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
        if(res.ok){ mostrarNotificacao("Cadastrado!"); carregarDados(); }
    } catch(e) { mostrarNotificacao("Erro", "erro"); }
}

async function excluirProduto(id) {
    if (!confirm("Excluir?")) return;
    try {
        await fetch(`/api/excluir-produto?id=${id}`, { method: 'DELETE' });
        mostrarNotificacao("Excluído!"); carregarDados();
    } catch (e) { mostrarNotificacao("Erro", "erro"); }
}

function abrirModalEdicao(id) {
    const p = produtosGlobais.find(x => x.id === id);
    document.getElementById("editID").value = p.id; document.getElementById("editProduto").value = p.Produto;
    document.getElementById("editCusto").value = limparNumero(p.Custo); document.getElementById("editPreco").value = limparNumero(p.Preco_Venda);
    document.getElementById("editEstoque").value = p.Estoque; document.getElementById("editModelo").value = p.Modelo || "";
    document.getElementById("editCor").value = p.Cor || ""; document.getElementById("editTamanho").value = p.Tamanho || "";
    document.getElementById("modalEdicao").classList.add("ativo");
}
function fecharModal() { document.getElementById("modalEdicao").classList.remove("ativo"); }
async function salvarEdicao() {
    const p = { 
        id: document.getElementById("editID").value, Produto: document.getElementById("editProduto").value, 
        Custo: parseFloat(document.getElementById("editCusto").value), Preco_Venda: parseFloat(document.getElementById("editPreco").value), 
        Estoque: parseInt(document.getElementById("editEstoque").value), Modelo: document.getElementById("editModelo").value, 
        Cor: document.getElementById("editCor").value, Tamanho: document.getElementById("editTamanho").value 
    };
    try {
        await fetch('/api/editar-produto', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
        mostrarNotificacao("Salvo!"); fecharModal(); carregarDados();
    } catch (e) { mostrarNotificacao("Erro", "erro"); }
}

// ----------------------------------------------------
// DASHBOARD BI (BUSINESS INTELLIGENCE)
// ----------------------------------------------------
function renderizarDashboard() {
    try {
        let capEstoque = produtosGlobais.reduce((acc, p) => acc + (limparNumero(p.Custo) * (parseInt(p.Estoque)||0)), 0);
        document.getElementById('biCapitalEstoque').innerText = formatarMoeda(capEstoque);

        const hoje = new Date().toLocaleDateString('en-CA');
        const mesAtual = hoje.substring(0, 7); 
        
        let fatMes = 0, lucroMes = 0;
        let faturamentoPorDia = {};
        let lucroPorDia = {};
        let qtdPorProduto = {};
        let fatPorPagamento = {};

        Chart.defaults.color = '#aaaaaa';
        Chart.defaults.borderColor = '#333333';

        vendasGlobais.forEach(v => {
            let dataIso = v.Data?.split('T')[0] || "";
            const fR = limparNumero(v.Faturamento);
            const lR = limparNumero(v.Lucro_Venda);
            const qtd = parseInt(v.Quantidade) || 0;
            const prodNome = v.Produtos?.[0]?.value || "Outro";
            
            let met = "Dinheiro";
            if(v.Metodo_Pagamento) {
                met = typeof v.Metodo_Pagamento === 'object' ? (v.Metodo_Pagamento.value || "Dinheiro") : v.Metodo_Pagamento;
            }

            if (dataIso.startsWith(mesAtual)) {
                fatMes += fR; lucroMes += lR;
                let dia = dataIso.split('-')[2];
                if(dia) {
                    faturamentoPorDia[dia] = (faturamentoPorDia[dia] || 0) + fR;
                    lucroPorDia[dia] = (lucroPorDia[dia] || 0) + lR;
                }
            }

            qtdPorProduto[prodNome] = (qtdPorProduto[prodNome] || 0) + qtd;
            fatPorPagamento[met] = (fatPorPagamento[met] || 0) + fR;
        });

        document.getElementById('biFatMes').innerText = formatarMoeda(fatMes);
        document.getElementById('biLucroMes').innerText = formatarMoeda(lucroMes);

        // GRÁFICO 1: LINHA
        if(graficoEvolucaoVendas) graficoEvolucaoVendas.destroy();
        const diasOrdenados = Object.keys(faturamentoPorDia).sort();
        
        graficoEvolucaoVendas = new Chart(document.getElementById('graficoLinha'), {
            type: 'line',
            data: {
                labels: diasOrdenados.map(d => `Dia ${d}`),
                datasets: [
                    { label: 'Faturamento', data: diasOrdenados.map(d => faturamentoPorDia[d]), borderColor: '#5c6bc0', backgroundColor: 'rgba(92, 107, 192, 0.2)', fill: true, tension: 0.3 },
                    { label: 'Lucro', data: diasOrdenados.map(d => lucroPorDia[d]), borderColor: '#66bb6a', backgroundColor: 'transparent', tension: 0.3 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        // GRÁFICO 2: BARRAS
        if(graficoTopProdutos) graficoTopProdutos.destroy();
        let produtosOrdenados = Object.entries(qtdPorProduto).sort((a, b) => b[1] - a[1]).slice(0, 5);
        
        graficoTopProdutos = new Chart(document.getElementById('graficoBarras'), {
            type: 'bar',
            data: {
                labels: produtosOrdenados.map(p => p[0].substring(0, 15)),
                datasets: [{ label: 'Unidades Vendidas', data: produtosOrdenados.map(p => p[1]), backgroundColor: '#ffa726', borderRadius: 4 }]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
        });

        // GRÁFICO 3: PIZZA
        if(graficoPagamentos) graficoPagamentos.destroy();
        graficoPagamentos = new Chart(document.getElementById('graficoPizza'), {
            type: 'doughnut',
            data: {
                labels: Object.keys(fatPorPagamento),
                datasets: [{ data: Object.values(fatPorPagamento), backgroundColor: ['#5c6bc0', '#66bb6a', '#ffa726', '#ef5350'], borderWidth: 0 }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    } catch (e) { console.error("Erro ao montar BI:", e); }
}

carregarDados();