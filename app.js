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
        
        // STATUS RESTAURADO COM TEXTO PARA O TEMA DARK
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
    const hoje = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
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

        // RESOLVIDO: O [object Object] agora pega corretamente a string interna (.value)
        let metodoTxt = "-";
        if (venda.Metodo_Pagamento) {
            metodoTxt = venda.Metodo_Pagamento.value ? venda.Metodo_Pagamento.value : venda.Metodo_Pagamento;
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
    const faturamentoComDesconto = faturamentoBruto - desc;
    const valorTaxa = faturamentoComDesconto * (taxaPerc / 100);
    const custoTotal = limparNumero(p.Custo) * qtd;
    const lucroReal = faturamentoComDesconto - valorTaxa - custoTotal;

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
        }
    } catch (e) { mostrarNotificacao("Erro ao registrar venda.", "erro"); }
}

// ----------------------------------------------------
// AÇÕES DE CRUD (ESTORNO, ENTRADA, ETC)
// ----------------------------------------------------
async function excluirVenda(id) {
    if (!confirm("Deseja estornar esta venda?")) return;
    const venda = vendasGlobais.find(v => v.id === id);
    const pID = venda.Produtos && venda.Produtos.length > 0 ? venda.Produtos[0].id : null;
    const qtd = venda.Quantidade;
    if(!pID) return mostrarNotificacao("Erro: Produto não encontrado para estorno.", "erro");
    try {
        const res = await fetch(`/api/excluir-venda?id=${id}&produtoID=${pID}&quantidadeRetorno=${qtd}`, { method: 'DELETE' });
        if (res.ok) { mostrarNotificacao("Venda estornada com sucesso!"); carregarDados(); }
    } catch (error) { mostrarNotificacao("Erro ao estornar venda.", "erro"); }
}

async function entradaEstoque() {
    const pID = document.getElementById("produtoEntrada").value;
    const qtd = parseInt(document.getElementById("quantidadeEntrada").value);
    if (!pID || !qtd || qtd <= 0) return mostrarNotificacao("Preencha os dados corretamente.", "aviso");
    const p = produtosGlobais.find(x => x.id == pID);
    try {
        const res = await fetch('/api/entrada-estoque', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: pID, novoEstoque: (parseInt(p.Estoque) || 0) + qtd })
        });
        if(res.ok) { mostrarNotificacao("Estoque atualizado!"); carregarDados(); }
    } catch(e) { mostrarNotificacao("Erro ao atualizar estoque", "erro"); }
}

async function cadastrarProduto() {
    const Produto = document.getElementById("cadProduto").value;
    const Modelo = document.getElementById("cadModelo").value;
    const Cor = document.getElementById("cadCor").value;
    const Tamanho = document.getElementById("cadTamanho").value;
    const Custo = parseFloat(document.getElementById("cadCusto").value);
    const Preco_Venda = parseFloat(document.getElementById("cadPreco").value);
    const Estoque = parseInt(document.getElementById("cadEstoque").value) || 0;
    if (!Produto || isNaN(Custo) || isNaN(Preco_Venda)) return mostrarNotificacao("Preencha os campos obrigatórios.", "aviso");
    try {
        const res = await fetch('/api/cadastrar-produto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Produto, Modelo, Cor, Tamanho, Custo, Preco_Venda, Estoque })
        });
        if(res.ok) { mostrarNotificacao("Produto cadastrado!"); carregarDados(); }
    } catch(e) { mostrarNotificacao("Erro ao cadastrar", "erro"); }
}

async function excluirProduto(id) {
    if (!confirm("Tem certeza que deseja apagar este modelo?")) return;
    try {
        const res = await fetch(`/api/excluir-produto?id=${id}`, { method: 'DELETE' });
        if(res.ok) { mostrarNotificacao("Produto excluído."); carregarDados(); }
    } catch (e) { mostrarNotificacao("Erro ao excluir", "erro"); }
}

function abrirModalEdicao(id) {
    const p = produtosGlobais.find(x => x.id === id);
    document.getElementById("editID").value = p.id;
    document.getElementById("editProduto").value = p.Produto;
    document.getElementById("editCusto").value = limparNumero(p.Custo);
    document.getElementById("editPreco").value = limparNumero(p.Preco_Venda);
    document.getElementById("editEstoque").value = p.Estoque;
    document.getElementById("editModelo").value = p.Modelo || "";
    document.getElementById("editCor").value = p.Cor || "";
    document.getElementById("editTamanho").value = p.Tamanho || "";
    document.getElementById("modalEdicao").classList.add("ativo");
}
function fecharModal() { document.getElementById("modalEdicao").classList.remove("ativo"); }

async function salvarEdicao() {
    const id = document.getElementById("editID").value;
    const Produto = document.getElementById("editProduto").value;
    const Custo = parseFloat(document.getElementById("editCusto").value);
    const Preco_Venda = parseFloat(document.getElementById("editPreco").value);
    const Estoque = parseInt(document.getElementById("editEstoque").value);
    const Modelo = document.getElementById("editModelo").value;
    const Cor = document.getElementById("editCor").value;
    const Tamanho = document.getElementById("editTamanho").value;
    try {
        const res = await fetch('/api/editar-produto', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, Produto, Custo, Preco_Venda, Estoque, Modelo, Cor, Tamanho })
        });
        if(res.ok){ mostrarNotificacao("Alterações salvas!"); fecharModal(); carregarDados(); }
    } catch (e) { mostrarNotificacao("Erro ao editar", "erro"); }
}

// ----------------------------------------------------
// EDIÇÃO DE VENDAS (AGORA 100% FUNCIONAL)
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
    
    // Tratamento Robusto de Data (Isso estava travando o botão de Salvar!)
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
    
    // Tratamento Robusto do Objeto do Método
    let metodoTxt = "Dinheiro";
    if (venda.Metodo_Pagamento) {
        metodoTxt = venda.Metodo_Pagamento.value ? venda.Metodo_Pagamento.value : venda.Metodo_Pagamento;
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

    // Se o botão não estiver funcionando, agora o aviso VAI aparecer em cima do modal!
    if (!novaQtd || novaQtd <= 0 || !novaData) return mostrarNotificacao("Preencha a Quantidade e a Data corretamente.", "aviso");

    const diferencaEstoque = qtdAntiga - novaQtd;
    const faturamentoBruto = preco * novaQtd;
    const faturamentoComDesconto = faturamentoBruto - desconto;
    const valorTaxa = faturamentoComDesconto * (taxaPerc / 100);
    const custoTotal = custo * novaQtd;
    const lucroReal = faturamentoComDesconto - valorTaxa - custoTotal;

    const payload = {
        id: id,
        produtoID: produtoID,
        diferencaEstoque: diferencaEstoque,
        novaVenda: {
            Quantidade: novaQtd,
            cliente: novoCliente,
            Data: novaData,
            Desconto: desconto,
            Metodo_Pagamento: metodo, // Agora enviamos só a string correta
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
             mostrarNotificacao("Erro do Servidor ao editar venda.", "erro");
        }
    } catch (e) { mostrarNotificacao("Erro na comunicação com o servidor.", "erro"); }
}

carregarDados();