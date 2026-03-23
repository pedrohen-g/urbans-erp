// ----------------------------------------------------
// SEGURANÇA E VARIÁVEIS GLOBAIS
// ----------------------------------------------------
const SENHA_ACESSO = "urbans123";
let produtosGlobais = [];
let vendasGlobais = []; 
let carrinhoVendas = []; // NOVA VARIÁVEL DO CARRINHO

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
// CARREGAR DADOS
// ----------------------------------------------------
async function carregarDados() {
    try {
        const resposta = await fetch('/api/get-dados');
        const dados = await resposta.json();
        produtosGlobais = dados.produtos;
        vendasGlobais = dados.vendas.reverse(); 
        renderizarProdutos();
        renderizarVendas();
        atualizarSelects(); // Atualiza os estoques disponíveis
        if(document.getElementById('abaDashboard').classList.contains('ativo')) renderizarDashboard();
    } catch (error) { mostrarNotificacao("Erro de conexão com o servidor.", "erro"); }
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
}

function renderizarVendas() {
    const tabela = document.getElementById("historicoVendas");
    if (!tabela) return;
    tabela.innerHTML = "";

    vendasGlobais.forEach(venda => {
        let dataIso = venda.Data?.split('T')[0] || "";
        const qtd = parseInt(venda.Quantidade) || 0;
        const lucroVal = limparNumero(venda.Lucro_Venda);
        const cod = venda.Codigo_Pedido || "-";
        
        let metodoTxt = "Dinheiro";
        if(venda.Metodo_Pagamento) {
            metodoTxt = typeof venda.Metodo_Pagamento === 'object' ? (venda.Metodo_Pagamento.value || "Dinheiro") : venda.Metodo_Pagamento;
        }

        let nomeProduto = "-";
        if(venda.Produtos && venda.Produtos.length > 0) {
            const prodEncontrado = produtosGlobais.find(p => p.id === venda.Produtos[0].id);
            if(prodEncontrado) {
                nomeProduto = `${prodEncontrado.Produto} ${prodEncontrado.Modelo} - ${prodEncontrado.Cor} (${prodEncontrado.Tamanho})`;
            } else {
                nomeProduto = venda.Produtos[0].value;
            }
        }

        tabela.innerHTML += `
            <tr>
                <td style="font-size: 11px; color: var(--primary);">${cod}</td>
                <td>${dataIso.split('-').reverse().join('/')}</td>
                <td><strong>${venda.cliente || "-"}</strong></td>
                <td>${nomeProduto}</td>
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

// ----------------------------------------------------
// LÓGICA DO CARRINHO DE COMPRAS
// ----------------------------------------------------
function atualizarSelects() {
    const sV = document.getElementById("produtoVenda");
    const sE = document.getElementById("produtoEntrada");
    if(!sV || !sE) return;

    sV.innerHTML = '<option value="">Selecione um produto...</option>';
    sE.innerHTML = '<option value="">Selecione um produto...</option>';
    
    produtosGlobais.forEach(p => {
        // Calcula quanto tem no estoque, menos o que já tá no carrinho
        const qtdNoCarrinho = carrinhoVendas.filter(item => item.id == p.id).reduce((sum, item) => sum + item.qtd, 0);
        const estoqueReal = (parseInt(p.Estoque) || 0) - qtdNoCarrinho;
        
        let textoCaixa = `${p.Produto} ${p.Modelo} - ${p.Cor} (${p.Tamanho}) | Estoque: ${estoqueReal} un.`;
        let optVenda = new Option(textoCaixa, p.id);
        
        if (estoqueReal <= 0) {
            optVenda.text = `🚫 ESGOTADO - ${p.Produto} ${p.Modelo} - ${p.Cor} (${p.Tamanho})`;
            optVenda.disabled = true;
        }
        sV.add(optVenda);

        let textoEntrada = `${p.Produto} ${p.Modelo} - ${p.Cor} (${p.Tamanho}) | Estoque: ${(parseInt(p.Estoque) || 0)}`;
        sE.add(new Option(textoEntrada, p.id));
    });
}

function adicionarAoCarrinho() {
    const pID = document.getElementById("produtoVenda").value;
    const qtd = parseInt(document.getElementById("quantidadeVenda").value);
    if (!pID || !qtd || qtd <= 0) return mostrarNotificacao("Selecione o produto e a quantidade válida.", "aviso");
    
    const p = produtosGlobais.find(x => x.id == pID);
    
    // Verifica se já passou do estoque
    const qtdNoCarrinho = carrinhoVendas.filter(item => item.id == p.id).reduce((sum, item) => sum + item.qtd, 0);
    const estoqueDisponivel = (parseInt(p.Estoque) || 0) - qtdNoCarrinho;
    
    if (qtd > estoqueDisponivel) {
        return mostrarNotificacao(`Você só tem mais ${estoqueDisponivel} unidade(s) disponíveis para adicionar!`, "erro");
    }

    carrinhoVendas.push({
        id: p.id,
        nomeCompleto: `${p.Produto} ${p.Modelo} - ${p.Cor} (${p.Tamanho})`,
        qtd: qtd,
        preco: limparNumero(p.Preco_Venda),
        custo: limparNumero(p.Custo),
        estoqueOriginal: parseInt(p.Estoque) || 0
    });

    document.getElementById("quantidadeVenda").value = 1;
    document.getElementById("produtoVenda").value = "";
    
    renderizarCarrinho();
    atualizarSelects(); // Atualiza o select pra diminuir o estoque lá
}

function removerDoCarrinho(index) {
    carrinhoVendas.splice(index, 1);
    renderizarCarrinho();
    atualizarSelects();
}

function renderizarCarrinho() {
    const area = document.getElementById("areaCarrinho");
    const lista = document.getElementById("listaCarrinho");
    
    if (carrinhoVendas.length === 0) {
        area.style.display = "none";
        lista.innerHTML = "";
        atualizarResumoCarrinho();
        return;
    }

    area.style.display = "block";
    lista.innerHTML = "";
    
    carrinhoVendas.forEach((item, index) => {
        const subtotalItem = item.preco * item.qtd;
        lista.innerHTML += `
            <div class="carrinho-item">
                <div class="carrinho-info">
                    <strong>${item.qtd}x ${item.nomeCompleto}</strong>
                    <span class="carrinho-preco">${formatarMoeda(subtotalItem)} (${formatarMoeda(item.preco)} un)</span>
                </div>
                <button class="btn-remover" onclick="removerDoCarrinho(${index})">❌</button>
            </div>
        `;
    });
    
    atualizarResumoCarrinho();
}

function atualizarResumoCarrinho() {
    const display = document.getElementById("resumoVendaDisplay");
    
    if (carrinhoVendas.length === 0) {
        display.style.display = "none";
        return;
    }

    const descTotal = limparNumero(document.getElementById("descontoVenda").value);
    const tP = limparNumero(document.getElementById("taxaVenda").value);
    
    let faturamentoBrutoTotal = 0;
    let custoTotalCarrinho = 0;
    
    carrinhoVendas.forEach(item => {
        faturamentoBrutoTotal += (item.preco * item.qtd);
        custoTotalCarrinho += (item.custo * item.qtd);
    });

    const faturamentoLiquido = faturamentoBrutoTotal - descTotal;
    const taxaReais = faturamentoLiquido * (tP / 100);
    const lucroReal = faturamentoLiquido - taxaReais - custoTotalCarrinho;

    display.style.display = "block";
    
    if (faturamentoLiquido < 0) {
        display.innerHTML = `<span style="color:var(--danger)">⚠️ O desconto não pode ser maior que o valor total (R$ ${faturamentoBrutoTotal.toFixed(2)})</span>`;
    } else {
        display.innerHTML = `<span>Fat. Final: ${formatarMoeda(faturamentoLiquido)} | Taxa Total: -${formatarMoeda(taxaReais)}<br>Lucro do Pedido: <strong class="lucro-verde">${formatarMoeda(lucroReal)}</strong></span>`;
    }
}

async function finalizarVendaCarrinho() {
    if (carrinhoVendas.length === 0) return mostrarNotificacao("O carrinho está vazio!", "aviso");
    
    const clienteNome = document.getElementById("clienteVenda").value;
    const descTotal = limparNumero(document.getElementById("descontoVenda").value);
    const tP = limparNumero(document.getElementById("taxaVenda").value);
    const metodo = document.getElementById("metodoPagamento").value;
    
    let faturamentoBrutoTotal = 0;
    carrinhoVendas.forEach(i => faturamentoBrutoTotal += (i.preco * i.qtd));
    
    if (descTotal > faturamentoBrutoTotal) return mostrarNotificacao("O desconto é maior que o total da compra!", "erro");

    document.querySelector('.btn-success').innerText = "Processando...";
    document.querySelector('.btn-success').disabled = true;

    // Gera Código do Pedido (Ex: PED-1A2B)
    const codigoPedidoUnico = "PED-" + Math.random().toString(36).substring(2, 6).toUpperCase();

    // Cria o array de Payload com Rateio Matemático
    const payloadItens = carrinhoVendas.map(item => {
        const itemFatBruto = item.preco * item.qtd;
        const pesoNoPedido = itemFatBruto / faturamentoBrutoTotal;
        
        const descontoDoItem = Number((descTotal * pesoNoPedido).toFixed(2));
        const fatRealItem = Number((itemFatBruto - descontoDoItem).toFixed(2));
        const taxaDoItem = Number((fatRealItem * (tP / 100)).toFixed(2));
        const custoDoItem = Number((item.custo * item.qtd).toFixed(2));
        const lucroDoItem = Number((fatRealItem - taxaDoItem - custoDoItem).toFixed(2));
        
        const prodOriginal = produtosGlobais.find(x => x.id == item.id);

        return {
            produtoID: item.id,
            cliente: clienteNome,
            quantidade: item.qtd,
            novoEstoque: parseInt(prodOriginal.Estoque) - item.qtd,
            metodoPagamento: metodo,
            codigoPedido: codigoPedidoUnico,
            financeiro: {
                preco: item.preco,
                custo: item.custo,
                desconto: descontoDoItem,
                taxa_maquininha: taxaDoItem,
                faturamento: fatRealItem,
                lucro: lucroDoItem
            }
        };
    });

    try {
        const res = await fetch('/api/registrar-venda', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itens: payloadItens })
        });
        
        if (res.ok) { 
            mostrarNotificacao(`Pedido ${codigoPedidoUnico} registrado!`); 
            
            carrinhoVendas = [];
            document.getElementById("descontoVenda").value = "";
            document.getElementById("taxaVenda").value = "";
            document.getElementById("clienteVenda").value = "";
            renderizarCarrinho();
            
            await carregarDados(); 
        } else {
            mostrarNotificacao("O banco de dados recusou os valores.", "erro");
        }
    } catch (e) { 
        mostrarNotificacao("Erro ao salvar o pedido no servidor.", "erro"); 
    } finally {
        document.querySelector('.btn-success').innerText = "Finalizar Pedido";
        document.querySelector('.btn-success').disabled = false;
    }
}

// ----------------------------------------------------
// CRUDS RESTANTES E EDIÇÃO DE VENDA
// ----------------------------------------------------
async function salvarEdicaoVenda() {
    const id = document.getElementById("editVendaID").value, qA = parseInt(document.getElementById("editVendaQtdAntiga").value);
    const nQ = parseInt(document.getElementById("editVendaQuantidade").value), pr = limparNumero(document.getElementById("editVendaPreco").value);
    const cus = limparNumero(document.getElementById("editVendaCusto").value), desc = limparNumero(document.getElementById("editVendaDesconto").value);
    const tP = limparNumero(document.getElementById("editVendaTaxa").value);
    const codPedido = document.getElementById("editVendaCodigo").value;
    
    const fR = Number(((pr * nQ) - desc).toFixed(2));
    const vT = Number((fR * (tP / 100)).toFixed(2));
    const luc = Number((fR - vT - (cus * nQ)).toFixed(2));

    const payload = {
        id, produtoID: document.getElementById("editVendaProdutoID").value, diferencaEstoque: qA - nQ,
        novaVenda: { Quantidade: nQ, cliente: document.getElementById("editVendaCliente").value, Data: document.getElementById("editVendaData").value, Desconto: desc, Metodo_Pagamento: document.getElementById("editVendaMetodo").value, Taxa_Maquininha: vT, Faturamento: fR, Lucro_Venda: luc, Codigo_Pedido: codPedido }
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
    document.getElementById("editVendaCodigo").value = v.Codigo_Pedido || "";
    
    let nomeProduto = v.Produtos[0].value;
    const prodEncontrado = produtosGlobais.find(p => p.id === v.Produtos[0].id);
    if(prodEncontrado) { nomeProduto = `${prodEncontrado.Produto} ${prodEncontrado.Modelo} - ${prodEncontrado.Cor} (${prodEncontrado.Tamanho})`; }
    
    document.getElementById("editVendaProdutoNome").value = nomeProduto;
    document.getElementById("editVendaCliente").value = v.cliente || "";
    document.getElementById("editVendaData").value = v.Data?.split('T')[0] || "";
    document.getElementById("editVendaQuantidade").value = v.Quantidade;
    document.getElementById("editVendaDesconto").value = limparNumero(v.Desconto);
    
    let metodoTxt = "Dinheiro";
    if (v.Metodo_Pagamento) { metodoTxt = typeof v.Metodo_Pagamento === 'object' ? (v.Metodo_Pagamento.value || "Dinheiro") : v.Metodo_Pagamento; }
    document.getElementById("editVendaMetodo").value = metodoTxt;
    
    let fR = limparNumero(v.Faturamento), vT = limparNumero(v.Taxa_Maquininha);
    document.getElementById("editVendaTaxa").value = fR > 0 ? (vT / fR * 100).toFixed(2) : 0;
    document.getElementById("modalEdicaoVenda").classList.add("ativo");
}
function fecharModalVenda() { document.getElementById("modalEdicaoVenda").classList.remove("ativo"); }

async function entradaEstoque() {
    const id = document.getElementById("produtoEntrada").value;
    const q = parseInt(document.getElementById("quantidadeEntrada").value);
    const custo = limparNumero(document.getElementById("custoEntrada").value);
    const p = produtosGlobais.find(x => x.id == id);
    
    if (!id || !q || q <= 0 || custo <= 0) return mostrarNotificacao("Preencha quantidade e custo pago.", "aviso");
    
    try {
        const res = await fetch('/api/entrada-estoque', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ produtoID: id, quantidade: q, custo: custo, novoEstoque: (parseInt(p.Estoque) || 0) + q }) 
        });
        if(res.ok) { 
            mostrarNotificacao("Estoque atualizado e Histórico salvo!"); 
            document.getElementById("quantidadeEntrada").value = "";
            document.getElementById("custoEntrada").value = "";
            carregarDados(); 
        } else { mostrarNotificacao("Erro do Servidor.", "erro"); }
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
// DASHBOARD BI
// ----------------------------------------------------
function renderizarDashboard() {
    try {
        let capEstoque = produtosGlobais.reduce((acc, p) => acc + (limparNumero(p.Custo) * (parseInt(p.Estoque)||0)), 0);
        document.getElementById('biCapitalEstoque').innerText = formatarMoeda(capEstoque);

        const hoje = new Date().toLocaleDateString('en-CA');
        const mesAtual = hoje.substring(0, 7); 
        
        let fatMes = 0, lucroMes = 0, pecasVendidasMes = 0, codigosDePedidoMes = new Set();
        let faturamentoPorDia = {}; let lucroPorDia = {}; let qtdPorProduto = {}; let fatPorPagamento = {};

        Chart.defaults.color = '#aaaaaa';
        Chart.defaults.borderColor = '#333333';

        vendasGlobais.forEach(v => {
            let dataIso = v.Data?.split('T')[0] || "";
            const fR = limparNumero(v.Faturamento);
            const lR = limparNumero(v.Lucro_Venda);
            const qtd = parseInt(v.Quantidade) || 0;
            
            let prodNome = "Outro";
            let corDoProduto = ""; 
            if (v.Produtos && v.Produtos.length > 0) {
                const pID = v.Produtos[0].id;
                const produtoNoBanco = produtosGlobais.find(p => p.id === pID);
                if (produtoNoBanco) {
                    prodNome = `${produtoNoBanco.Produto} ${produtoNoBanco.Modelo} - ${produtoNoBanco.Cor} (${produtoNoBanco.Tamanho})`;
                    corDoProduto = produtoNoBanco.Cor ? produtoNoBanco.Cor.toLowerCase() : "";
                } else { prodNome = v.Produtos[0].value; }
            }
            
            let met = "Dinheiro";
            if(v.Metodo_Pagamento) { met = typeof v.Metodo_Pagamento === 'object' ? (v.Metodo_Pagamento.value || "Dinheiro") : v.Metodo_Pagamento; }

            if (dataIso.startsWith(mesAtual)) {
                fatMes += fR; lucroMes += lR; pecasVendidasMes += qtd;
                
                if (v.Codigo_Pedido) codigosDePedidoMes.add(v.Codigo_Pedido);
                else codigosDePedidoMes.add(v.id); 
                
                let dia = dataIso.split('-')[2];
                if(dia) {
                    faturamentoPorDia[dia] = (faturamentoPorDia[dia] || 0) + fR;
                    lucroPorDia[dia] = (lucroPorDia[dia] || 0) + lR;
                }
            }

            if(!qtdPorProduto[prodNome]) { qtdPorProduto[prodNome] = { qtd: 0, cor: corDoProduto }; }
            qtdPorProduto[prodNome].qtd += qtd;
            fatPorPagamento[met] = (fatPorPagamento[met] || 0) + fR;
        });

        document.getElementById('biFatMes').innerText = formatarMoeda(fatMes);
        document.getElementById('biLucroMes').innerText = formatarMoeda(lucroMes);
        document.getElementById('biPecasMes').innerText = pecasVendidasMes + " un.";
        
        let ticketMedio = codigosDePedidoMes.size > 0 ? (fatMes / codigosDePedidoMes.size) : 0;
        document.getElementById('biTicketMedio').innerText = formatarMoeda(ticketMedio);

        // GRAFICOS
        if(graficoEvolucaoVendas) graficoEvolucaoVendas.destroy();
        const diasOrdenados = Object.keys(faturamentoPorDia).sort();
        graficoEvolucaoVendas = new Chart(document.getElementById('graficoLinha'), {
            type: 'line', data: { labels: diasOrdenados.map(d => `Dia ${d}`), datasets: [ { label: 'Faturamento', data: diasOrdenados.map(d => faturamentoPorDia[d]), borderColor: '#5c6bc0', backgroundColor: 'rgba(92, 107, 192, 0.2)', fill: true, tension: 0.3 }, { label: 'Lucro', data: diasOrdenados.map(d => lucroPorDia[d]), borderColor: '#66bb6a', backgroundColor: 'transparent', tension: 0.3 } ] }, options: { responsive: true, maintainAspectRatio: false }
        });

        if(graficoTopProdutos) graficoTopProdutos.destroy();
        let produtosOrdenados = Object.entries(qtdPorProduto).sort((a, b) => b[1].qtd - a[1].qtd).slice(0, 5);
        let coresDasBarras = produtosOrdenados.map(p => {
            let corText = p[1].cor;
            if (corText.includes("amarel")) return "#ffd54f"; if (corText.includes("azul")) return "#64b5f6";   
            if (corText.includes("pret")) return "#616161"; if (corText.includes("branc")) return "#e0e0e0";  
            if (corText.includes("verd")) return "#81c784"; if (corText.includes("vermelh")) return "#e57373"; 
            return "#ffa726";
        });

        graficoTopProdutos = new Chart(document.getElementById('graficoBarras'), {
            type: 'bar', data: { labels: produtosOrdenados.map(p => { let nome = p[0]; return nome.length > 50 ? nome.substring(0, 50) + '...' : nome; }), datasets: [{ label: 'Unidades Vendidas', data: produtosOrdenados.map(p => p[1].qtd), backgroundColor: coresDasBarras, borderRadius: 4 }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
        });

        if(graficoPagamentos) graficoPagamentos.destroy();
        graficoPagamentos = new Chart(document.getElementById('graficoPizza'), {
            type: 'doughnut', data: { labels: Object.keys(fatPorPagamento), datasets: [{ data: Object.values(fatPorPagamento), backgroundColor: ['#5c6bc0', '#66bb6a', '#ffa726', '#ef5350'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false }
        });
    } catch (e) { console.error("Erro ao montar BI:", e); }
}

carregarDados();