// ----------------------------------------------------
// SEGURANÇA E CONFIGURAÇÕES INICIAIS
// ----------------------------------------------------
const SENHA_ACESSO = "urbans123";
let produtosGlobais = [];
let vendasGlobais = []; 

// Variáveis para guardar os gráficos
let graficoEvolucaoVendas = null;
let graficoTopProdutos = null;
let graficoPagamentos = null;

function verificarAcesso() {
    const senhaDigitada = prompt("Digite a senha de acesso ao Urbans ERP:");
    if (senhaDigitada !== SENHA_ACESSO) {
        alert("Acesso negado!");
        document.body.innerHTML = `
            <div style="background:#121212; color:white; height:100vh; display:flex; align-items:center; justify-content:center; font-family:sans-serif;">
                <h1>🔒 Acesso Bloqueado. Atualize a página e digite a senha correta.</h1>
            </div>`;
        throw new Error("Acesso interrompido por senha incorreta");
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

    // Aciona a renderização dos gráficos quando abrir o BI
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
    }, 4500);
}

function limparNumero(valor) { return parseFloat(valor?.toString().replace(',', '.')) || 0; }
function formatarMoeda(valor) { return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function formatarDataBR(dataIso) {
    if (!dataIso) return "-";
    if (dataIso.includes('/')) return dataIso;
    const partes = dataIso.split('T')[0].split('-');
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// ----------------------------------------------------
// CARREGAR DADOS
// ----------------------------------------------------
async function carregarDados() {
    try {
        const resposta = await fetch('/api/get-dados');
        const dados = await resposta.json();
        produtosGlobais = dados.produtos;
        vendasGlobais = dados.vendas.reverse(); 
        renderizarProdutos();
        renderizarVendasEDashboard();
        
        // Se a aba do dashboard estiver aberta, atualiza os gráficos
        if(document.getElementById('abaDashboard').classList.contains('ativo')) {
            renderizarDashboard();
        }
    } catch (error) { mostrarNotificacao("Erro de conexão com o servidor.", "erro"); }
}

function renderizarProdutos() {
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
        
        // RESTAURADO COM SUCESSO AS ETIQUETAS DE STATUS!
        let statusHtml = estoqueAtual === 0 ? '<span class="badge badge-danger">🔴 Esgotado</span>' : 
                         (estoqueAtual < 3 ? '<span class="badge badge-warning">🟡 Acabando</span>' : '<span class="badge badge-success">🟢 Normal</span>');

        tabela.innerHTML += `
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
                    <button class="btn-acao btn-delete" onclick="excluirProduto(${produto.id})">❌</button>
                </td>
            </tr>`;
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
}

function renderizarVendasEDashboard() {
    const hoje = new Date().toLocaleDateString('en-CA');
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

        // O FANTASMA DO [object Object] DESTRUÍDO DE NOVO!
        let metodoTxt = "-";
        if (venda.Metodo_Pagamento) {
            metodoTxt = typeof venda.Metodo_Pagamento === 'object' ? (venda.Metodo_Pagamento.value || "-") : venda.Metodo_Pagamento;
        }

        tabelaHistorico.innerHTML += `
            <tr>
                <td>${formatarDataBR(venda.Data)}</td>
                <td><strong>${venda.cliente || "-"}</strong></td>
                <td>${venda.Produtos && venda.Produtos.length > 0 ? venda.Produtos[0].value : "Excluído"}</td>
                <td><strong>${qtd}</strong></td>
                <td style="color: var(--text-secondary);">${metodoTxt}</td>
                <td>${formatarMoeda(limparNumero(venda.Faturamento))}</td>
                <td class="lucro-verde">${formatarMoeda(lucroVal)}</td>
                <td>
                    <button class="btn-acao btn-edit" onclick="abrirModalEdicaoVenda(${venda.id})">Editar</button>
                    <button class="btn-acao btn-delete" onclick="excluirVenda(${venda.id})">Estornar</button>
                </td>
            </tr>`;
    });

    document.getElementById("dashVendasHoje").innerText = qtdVendasHoje;
    document.getElementById("dashLucroHoje").innerText = formatarMoeda(lucroHoje);
    document.getElementById("dashLucroMes").innerText = formatarMoeda(lucroMes);
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
// REGISTRO DE VENDA
// ----------------------------------------------------
function atualizarResumoVenda() {
    const pID = document.getElementById("produtoVenda").value;
    const qtd = parseInt(document.getElementById("quantidadeVenda").value) || 0;
    const desc = parseFloat(document.getElementById("descontoVenda").value) || 0;
    const taxaPerc = parseFloat(document.getElementById("taxaVenda").value) || 0;
    const display = document.getElementById("resumoVendaDisplay");

    if (!pID || qtd <= 0) {
        if(display) display.style.display = "none";
        return;
    }

    const p = produtosGlobais.find(x => x.id == pID);
    if (!p) return;

    const faturamentoBruto = (limparNumero(p.Preco_Venda) * qtd);
    const faturamentoComDesconto = faturamentoBruto - desc;
    const valorTaxa = faturamentoComDesconto * (taxaPerc / 100);
    const custoTotal = limparNumero(p.Custo) * qtd;
    const lucroLiquido = faturamentoComDesconto - valorTaxa - custoTotal;

    if(display) {
        display.style.display = "block";
        display.innerHTML = `
            <span style="font-size: 13px; color: #888;">Faturamento Real: ${formatarMoeda(faturamentoComDesconto)} | Taxa R$: -${formatarMoeda(valorTaxa)}</span><br>
            <span style="font-size: 16px; color:#fff;">Lucro Líquido Previsto: <strong class="lucro-verde">${formatarMoeda(lucroLiquido)}</strong></span>
        `;
    }
}

async function registrarVenda() {
    const pID = document.getElementById("produtoVenda").value;
    const qtd = parseInt(document.getElementById("quantidadeVenda").value);
    const cli = document.getElementById("clienteVenda").value;
    const desc = parseFloat(document.getElementById("descontoVenda").value) || 0;
    const taxaPerc = parseFloat(document.getElementById("taxaVenda").value) || 0;
    const metodo = document.getElementById("metodoPagamento").value;

    if (!pID || !qtd || qtd <= 0) return mostrarNotificacao("Dados incompletos", "aviso");

    const p = produtosGlobais.find(x => x.id == pID);
    if (parseInt(p.Estoque) < qtd) return mostrarNotificacao("Estoque insuficiente", "erro");

    const faturamentoBruto = (limparNumero(p.Preco_Venda) * qtd);
    const faturamentoComDesconto = Number((faturamentoBruto - desc).toFixed(2));
    const valorTaxa = Number((faturamentoComDesconto * (taxaPerc / 100)).toFixed(2));
    const custoTotal = limparNumero(p.Custo) * qtd;
    const lucroReal = Number((faturamentoComDesconto - valorTaxa - custoTotal).toFixed(2));

    const payload = {
        produtoID: pID,
        cliente: cli,
        quantidade: qtd,
        novoEstoque: parseInt(p.Estoque) - qtd,
        metodoPagamento: metodo,
        financeiro: {
            preco: limparNumero(p.Preco_Venda),
            custo: limparNumero(p.Custo),
            desconto: desc,
            taxa_maquininha: valorTaxa,
            faturamento: faturamentoComDesconto,
            lucro: lucroReal
        }
    };

    try {
        const res = await fetch('/api/registrar-venda', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            mostrarNotificacao("Venda registrada com sucesso!");
            document.getElementById("quantidadeVenda").value = "";
            document.getElementById("descontoVenda").value = "";
            document.getElementById("taxaVenda").value = "";
            document.getElementById("clienteVenda").value = "";
            document.getElementById("resumoVendaDisplay").style.display = "none";
            carregarDados();
        } else {
            const errData = await res.json();
            console.error(errData);
            mostrarNotificacao("Erro do Banco de Dados.", "erro");
        }
    } catch (e) { mostrarNotificacao("Erro ao registrar venda.", "erro"); }
}

// ----------------------------------------------------
// EDIÇÃO DE VENDAS
// ----------------------------------------------------
function abrirModalEdicaoVenda(id) {
    const venda = vendasGlobais.find(v => v.id === id);
    if(!venda || !venda.Produtos || venda.Produtos.length === 0) return mostrarNotificacao("Erro ao carregar venda.", "erro");

    document.getElementById("editVendaID").value = venda.id;
    document.getElementById("editVendaProdutoID").value = venda.Produtos[0].id;
    document.getElementById("editVendaQtdAntiga").value = venda.Quantidade;
    
    document.getElementById("editVendaPreco").value = limparNumero(venda.Preco_Venda);
    document.getElementById("editVendaCusto").value = limparNumero(venda.Custo_Produto);

    document.getElementById("editVendaProdutoNome").value = venda.Produtos[0].value;
    document.getElementById("editVendaCliente").value = venda.cliente || "";
    
    let dataIso = "";
    if (venda.Data) {
        if (venda.Data.includes('/')) {
            const p = venda.Data.split('/');
            dataIso = `${p[2]}-${p[1]}-${p[0]}`;
        } else {
            dataIso = venda.Data.split('T')[0];
        }
    } else {
        dataIso = new Date().toLocaleDateString('en-CA');
    }
    document.getElementById("editVendaData").value = dataIso;
    
    document.getElementById("editVendaQuantidade").value = venda.Quantidade;
    document.getElementById("editVendaDesconto").value = limparNumero(venda.Desconto) || 0;
    
    let metodoTxt = "Dinheiro";
    if (venda.Metodo_Pagamento) {
        metodoTxt = typeof venda.Metodo_Pagamento === 'object' ? (venda.Metodo_Pagamento.value || "Dinheiro") : venda.Metodo_Pagamento;
    }
    document.getElementById("editVendaMetodo").value = metodoTxt;
    
    let faturamentoReal = limparNumero(venda.Faturamento);
    let taxaReais = limparNumero(venda.Taxa_Maquininha);
    let taxaPerc = faturamentoReal > 0 ? (taxaReais / faturamentoReal) * 100 : 0;
    document.getElementById("editVendaTaxa").value = taxaPerc.toFixed(2);

    document.getElementById("modalEdicaoVenda").classList.add("ativo");
}

function fecharModalVenda() { document.getElementById("modalEdicaoVenda").classList.remove("ativo"); }

async function salvarEdicaoVenda() {
    const id = document.getElementById("editVendaID").value;
    const produtoID = document.getElementById("editVendaProdutoID").value;
    const qtdAntiga = parseInt(document.getElementById("editVendaQtdAntiga").value);
    
    const preco = parseFloat(document.getElementById("editVendaPreco").value);
    const custo = parseFloat(document.getElementById("editVendaCusto").value);
    
    const novaQtd = parseInt(document.getElementById("editVendaQuantidade").value);
    const novoCliente = document.getElementById("editVendaCliente").value;
    const novaData = document.getElementById("editVendaData").value;
    
    const desconto = parseFloat(document.getElementById("editVendaDesconto").value) || 0;
    const metodo = document.getElementById("editVendaMetodo").value;
    const taxaPerc = parseFloat(document.getElementById("editVendaTaxa").value) || 0;

    if (!novaQtd || novaQtd <= 0 || !novaData) return mostrarNotificacao("Preencha a Quantidade e a Data corretamente.", "aviso");

    const diferencaEstoque = qtdAntiga - novaQtd;
    const faturamentoBruto = preco * novaQtd;
    const faturamentoComDesconto = Number((faturamentoBruto - desconto).toFixed(2));
    const valorTaxa = Number((faturamentoComDesconto * (taxaPerc / 100)).toFixed(2));
    const custoTotal = custo * novaQtd;
    const lucroReal = Number((faturamentoComDesconto - valorTaxa - custoTotal).toFixed(2));

    const payload = {
        id: id,
        produtoID: produtoID,
        diferencaEstoque: diferencaEstoque,
        novaVenda: {
            Quantidade: novaQtd,
            cliente: novoCliente,
            Data: novaData,
            Desconto: desconto,
            Metodo_Pagamento: metodo,
            Taxa_Maquininha: valorTaxa,
            Faturamento: faturamentoComDesconto,
            Lucro_Venda: lucroReal
        }
    };

    try {
        const res = await fetch('/api/editar-venda', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            mostrarNotificacao("Venda atualizada com sucesso!");
            fecharModalVenda();
            carregarDados();
        } else {
             const errData = await res.json();
             console.error(errData);
             mostrarNotificacao("Erro do Servidor ao editar venda.", "erro");
        }
    } catch (e) { mostrarNotificacao("Erro na comunicação com o servidor.", "erro"); }
}

// ----------------------------------------------------
// MOTOR DE BUSINESS INTELLIGENCE (DASHBOARD)
// ----------------------------------------------------
function renderizarDashboard() {
    let capEstoque = produtosGlobais.reduce((acc, p) => acc + (limparNumero(p.Custo) * (parseInt(p.Estoque)||0)), 0);
    document.getElementById('biCapitalEstoque').innerText = formatarMoeda(capEstoque);

    const hoje = new Date().toLocaleDateString('en-CA');
    const mesAtual = hoje.substring(0, 7); 
    
    let fatMes = 0, lucroMes = 0;
    
    Chart.defaults.color = '#aaaaaa';
    Chart.defaults.borderColor = '#333333';

    let faturamentoPorDia = {};
    let lucroPorDia = {};
    let qtdPorProduto = {};
    let fatPorPagamento = {};

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
            faturamentoPorDia[dia] = (faturamentoPorDia[dia] || 0) + fR;
            lucroPorDia[dia] = (lucroPorDia[dia] || 0) + lR;
        }

        qtdPorProduto[prodNome] = (qtdPorProduto[prodNome] || 0) + qtd;
        fatPorPagamento[met] = (fatPorPagamento[met] || 0) + fR;
    });

    document.getElementById('biFatMes').innerText = formatarMoeda(fatMes);
    document.getElementById('biLucroMes').innerText = formatarMoeda(lucroMes);

    // GRÁFICO 1
    if(graficoEvolucaoVendas) graficoEvolucaoVendas.destroy();
    const diasOrdenados = Object.keys(faturamentoPorDia).sort();
    const dadosFatDia = diasOrdenados.map(dia => faturamentoPorDia[dia]);
    const dadosLucroDia = diasOrdenados.map(dia => lucroPorDia[dia]);

    graficoEvolucaoVendas = new Chart(document.getElementById('graficoLinha'), {
        type: 'line',
        data: {
            labels: diasOrdenados.map(d => `Dia ${d}`),
            datasets: [
                { label: 'Faturamento', data: dadosFatDia, borderColor: '#5c6bc0', backgroundColor: 'rgba(92, 107, 192, 0.2)', fill: true, tension: 0.3 },
                { label: 'Lucro', data: dadosLucroDia, borderColor: '#66bb6a', backgroundColor: 'transparent', tension: 0.3 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // GRÁFICO 2
    if(graficoTopProdutos) graficoTopProdutos.destroy();
    let produtosOrdenados = Object.entries(qtdPorProduto).sort((a, b) => b[1] - a[1]).slice(0, 5);

    graficoTopProdutos = new Chart(document.getElementById('graficoBarras'), {
        type: 'bar',
        data: {
            labels: produtosOrdenados.map(p => p[0].substring(0, 15) + '...'),
            datasets: [{
                label: 'Unidades Vendidas',
                data: produtosOrdenados.map(p => p[1]),
                backgroundColor: '#ffa726',
                borderRadius: 4
            }]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
    });

    // GRÁFICO 3
    if(graficoPagamentos) graficoPagamentos.destroy();
    graficoPagamentos = new Chart(document.getElementById('graficoPizza'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(fatPorPagamento),
            datasets: [{
                data: Object.values(fatPorPagamento),
                backgroundColor: ['#5c6bc0', '#66bb6a', '#ffa726', '#ef5350'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// ----------------------------------------------------
// RESTANTE DOS CRUDS (AÇÕES DE PRODUTO)
// ----------------------------------------------------
async function excluirVenda(id) {
    if (!confirm("Deseja estornar esta venda?")) return;
    const v = vendasGlobais.find(x => x.id === id);
    const pID = v.Produtos?.[0]?.id, qtd = v.Quantidade;
    if(!pID) return mostrarNotificacao("Erro", "erro");
    try {
        const res = await fetch(`/api/excluir-venda?id=${id}&produtoID=${pID}&quantidadeRetorno=${qtd}`, { method: 'DELETE' });
        if (res.ok) { mostrarNotificacao("Venda estornada!"); carregarDados(); }
    } catch (e) { mostrarNotificacao("Erro", "erro"); }
}
async function entradaEstoque() {
    const id = document.getElementById("produtoEntrada").value, q = parseInt(document.getElementById("quantidadeEntrada").value);
    const p = produtosGlobais.find(x => x.id == id);
    if (!id || !q) return mostrarNotificacao("Dados incompletos", "aviso");
    try {
        const res = await fetch('/api/entrada-estoque', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, novoEstoque: (parseInt(p.Estoque) || 0) + q }) });
        if(res.ok) { mostrarNotificacao("Estoque atualizado!"); carregarDados(); }
    } catch(e) { mostrarNotificacao("Erro", "erro"); }
}
async function cadastrarProduto() {
    const p = document.getElementById("cadProduto").value, m = document.getElementById("cadModelo").value, c = document.getElementById("cadCor").value, t = document.getElementById("cadTamanho").value, cus = parseFloat(document.getElementById("cadCusto").value), pr = parseFloat(document.getElementById("cadPreco").value), est = parseInt(document.getElementById("cadEstoque").value) || 0;
    if (!p || isNaN(cus) || isNaN(pr)) return mostrarNotificacao("Dados obrigatórios", "aviso");
    try {
        const res = await fetch('/api/cadastrar-produto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Produto:p, Modelo:m, Cor:c, Tamanho:t, Custo:cus, Preco_Venda:pr, Estoque:est }) });
        if(res.ok) { mostrarNotificacao("Cadastrado!"); carregarDados(); }
    } catch(e) { mostrarNotificacao("Erro", "erro"); }
}
async function excluirProduto(id) {
    if (!confirm("Apagar modelo?")) return;
    try {
        const res = await fetch(`/api/excluir-produto?id=${id}`, { method: 'DELETE' });
        if(res.ok) { mostrarNotificacao("Excluído!"); carregarDados(); }
    } catch (e) { mostrarNotificacao("Erro", "erro"); }
}
function abrirModalEdicao(id) {
    const p = produtosGlobais.find(x => x.id === id);
    document.getElementById("editID").value = p.id; document.getElementById("editProduto").value = p.Produto; document.getElementById("editCusto").value = limparNumero(p.Custo); document.getElementById("editPreco").value = limparNumero(p.Preco_Venda); document.getElementById("editEstoque").value = p.Estoque; document.getElementById("editModelo").value = p.Modelo || ""; document.getElementById("editCor").value = p.Cor || ""; document.getElementById("editTamanho").value = p.Tamanho || "";
    document.getElementById("modalEdicao").classList.add("ativo");
}
function fecharModal() { document.getElementById("modalEdicao").classList.remove("ativo"); }
async function salvarEdicao() {
    const id = document.getElementById("editID").value, p = document.getElementById("editProduto").value, cus = parseFloat(document.getElementById("editCusto").value), pr = parseFloat(document.getElementById("editPreco").value), est = parseInt(document.getElementById("editEstoque").value), m = document.getElementById("editModelo").value, c = document.getElementById("editCor").value, t = document.getElementById("editTamanho").value;
    try {
        const res = await fetch('/api/editar-produto', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, Produto:p, Custo:cus, Preco_Venda:pr, Estoque:est, Modelo:m, Cor:c, Tamanho:t }) });
        if(res.ok){ mostrarNotificacao("Salvo!"); fecharModal(); carregarDados(); }
    } catch (e) { mostrarNotificacao("Erro", "erro"); }
}

carregarDados();