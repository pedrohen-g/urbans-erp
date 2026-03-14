const API_TOKEN = "T6mZrzUt6vB619pD6Qw0hB2D2nU5oOcR"; 
const TABLE_PRODUTOS = 884394;
const TABLE_VENDAS = 884420;

let produtosGlobais = [];
let vendasGlobais = []; 

// ----------------------------------------------------
// NAVEGAÇÃO POR ABAS E TOASTS
// ----------------------------------------------------
function abrirAba(evento, idAba) {
    let conteudos = document.getElementsByClassName("aba-conteudo");
    for (let i = 0; i < conteudos.length; i++) {
        conteudos[i].classList.remove("ativo");
    }
    let botoes = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < botoes.length; i++) {
        botoes[i].classList.remove("ativo");
    }
    document.getElementById(idAba).classList.add("ativo");
    evento.currentTarget.classList.add("ativo");
}

function mostrarNotificacao(mensagem, tipo = 'sucesso') {
    const container = document.getElementById('toast-container');
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
// FUNÇÕES AUXILIARES
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
// CARREGAR PRODUTOS (ABA 1)
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
                <td colspan="4" style="text-align: right; text-transform: uppercase; font-size: 12px;"><strong>Resumo do Imobilizado:</strong></td>
                <td><strong>${formatarMoeda(capitalInvestido)}</strong></td>
                <td><strong>${formatarMoeda(potencialFaturamento)}</strong></td>
                <td>-</td>
                <td style="font-size: 16px;"><strong>${totalPecas} un.</strong></td>
                <td colspan="2" class="lucro-verde">LUCRO PROJETADO: <br>+ ${formatarMoeda(lucroProjetado)}</td>
            </tr>`;

        atualizarSelects();
    } catch (error) { mostrarNotificacao("Erro ao carregar estoque.", "erro"); }
}

function atualizarSelects() {
    const selectVenda = document.getElementById("produtoVenda");
    const selectEntrada = document.getElementById("produtoEntrada");
    if(!selectVenda || !selectEntrada) return;
    selectVenda.innerHTML = '<option value="">Selecione um produto...</option>';
    selectEntrada.innerHTML = '<option value="">Selecione um produto...</option>';

    produtosGlobais.forEach(produto => {
        const nome = `${produto.Produto} ${produto.Modelo} - ${produto.Cor} (${produto.Tamanho})`;
        selectVenda.add(new Option(nome, produto.id));
        selectEntrada.add(new Option(nome, produto.id));
    });
}

// ----------------------------------------------------
// CARREGAR HISTÓRICO E DASHBOARD (ABA 2)
// ----------------------------------------------------
async function carregarVendasEDashboard() {
    try {
        const resposta = await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_VENDAS}/?user_field_names=true`, { 
            headers: { Authorization: `Token ${API_TOKEN}` }
        });
        const dados = await resposta.json();
        
        vendasGlobais = dados.results.reverse(); 

        // AJUSTE DE FUSO HORÁRIO AQUI
        const hoje = new Date().toLocaleDateString('sv-SE'); 
        const mesAtual = hoje.substring(0, 7); 

        let qtdVendasHoje = 0, lucroHoje = 0, lucroMes = 0;
        const tabelaHistorico = document.getElementById("historicoVendas");
        tabelaHistorico.innerHTML = "";

        vendasGlobais.forEach(venda => {
            let dataVendaIso = venda.Data ? venda.Data.split('T')[0] : "";
            
            // Tratamento se a data vier no formato brasileiro do Baserow
            if (venda.Data && venda.Data.includes('/')) {
                const p = venda.Data.split('/');
                dataVendaIso = `${p[2]}-${p[1]}-${p[0]}`;
            }

            const qtd = parseInt(venda.Quantidade) || 0;
            const lucroVal = limparNumero(venda.Lucro_Venda);

            if (dataVendaIso === hoje) { 
                qtdVendasHoje += qtd; 
                lucroHoje += lucroVal; 
            }
            if (dataVendaIso.startsWith(mesAtual)) { 
                lucroMes += lucroVal; 
            }

            const faturamento = limparNumero(venda.Faturamento);
            const nomeCliente = venda.cliente || "-";
            const dataFormatada = formatarDataBR(venda.Data);
            
            let nomeProduto = "Produto Excluído";
            if (venda.Produtos && venda.Produtos.length > 0) {
                nomeProduto = venda.Produtos[0].value;
            }

            const linha = `
            <tr>
                <td>${dataFormatada}</td>
                <td><strong>${nomeCliente}</strong></td>
                <td>${nomeProduto}</td>
                <td><strong>${qtd}</strong></td>
                <td>${formatarMoeda(faturamento)}</td>
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
    } catch (error) { 
        mostrarNotificacao("Erro ao carregar histórico.", "erro"); 
        console.error(error); 
    }
}

// ----------------------------------------------------
// AÇÕES DE VENDAS
// ----------------------------------------------------
async function registrarVenda() {
    const produtoID = document.getElementById("produtoVenda").value;
    const clienteNome = document.getElementById("clienteVenda").value;
    const quantidade = parseInt(document.getElementById("quantidadeVenda").value);

    if (!produtoID) return mostrarNotificacao("Selecione um produto.", "aviso");
    if (!quantidade || quantidade <= 0) return mostrarNotificacao("Quantidade inválida.", "aviso");

    try {
        const produto = produtosGlobais.find(p => p.id == produtoID);
        const estoqueAtual = parseInt(produto.Estoque || 0);
        
        if (estoqueAtual < quantidade) return mostrarNotificacao(`Estoque insuficiente!`, "erro");

        const precoVenda = limparNumero(produto.Preco_Venda);
        const custo = limparNumero(produto.Custo);
        const novoEstoque = estoqueAtual - quantidade;
        const faturamentoTotal = precoVenda * quantidade;
        const lucroTotal = (precoVenda - custo) * quantidade;
        
        // AJUSTE DE FUSO HORÁRIO NA GRAVAÇÃO
        const dataVenda = new Date().toLocaleDateString('sv-SE');

        await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/${produtoID}/?user_field_names=true`, {
            method: "PATCH", headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({ Estoque: novoEstoque })
        });

        await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_VENDAS}/?user_field_names=true`, {
            method: "POST", headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                Produtos: [parseInt(produtoID)], Quantidade: quantidade, Preco_Venda: precoVenda,
                Faturamento: faturamentoTotal, Custo_Produto: custo, Lucro_Venda: lucroTotal,
                Data: dataVenda, cliente: clienteNome 
            })
        });

        mostrarNotificacao("Venda registrada!");
        document.getElementById("quantidadeVenda").value = "";
        document.getElementById("clienteVenda").value = ""; 
        document.getElementById("produtoVenda").value = ""; 
        
        carregarProdutos();
        carregarVendasEDashboard();
    } catch (error) { mostrarNotificacao("Erro ao salvar.", "erro"); }
}

// ... (Resto das funções: excluirVenda, abrirModalEdicaoVenda, salvarEdicaoVenda, etc continuam iguais)
// Certifique-se de manter as funções de entradaEstoque, cadastrarProduto, abrirModalEdicao e salvarEdicao abaixo

async function excluirVenda(vendaID) {
    if (!confirm("Estornar esta venda?")) return;
    try {
        const venda = vendasGlobais.find(v => v.id === vendaID);
        const quantidadeDevolver = parseInt(venda.Quantidade) || 0;
        if (venda.Produtos && venda.Produtos.length > 0) {
            const produtoID = venda.Produtos[0].id;
            const resProd = await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/${produtoID}/?user_field_names=true`, { headers: { Authorization: `Token ${API_TOKEN}` }});
            const produtoData = await resProd.json();
            const novoEstoque = parseInt(produtoData.Estoque || 0) + quantidadeDevolver;
            await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/${produtoID}/?user_field_names=true`, {
                method: "PATCH", headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
                body: JSON.stringify({ Estoque: novoEstoque })
            });
        }
        await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_VENDAS}/${vendaID}/`, {
            method: "DELETE", headers: { Authorization: `Token ${API_TOKEN}` }
        });
        mostrarNotificacao("Venda estornada!");
        carregarProdutos();
        carregarVendasEDashboard();
    } catch (error) { mostrarNotificacao("Erro ao estornar.", "erro"); }
}

function abrirModalEdicaoVenda(vendaID) {
    const venda = vendasGlobais.find(v => v.id === vendaID);
    if (!venda) return;
    document.getElementById("editVendaID").value = venda.id;
    document.getElementById("editVendaProdutoID").value = venda.Produtos && venda.Produtos.length > 0 ? venda.Produtos[0].id : "";
    document.getElementById("editVendaProdutoNome").value = venda.Produtos && venda.Produtos.length > 0 ? venda.Produtos[0].value : "";
    document.getElementById("editVendaCliente").value = venda.cliente || "";
    let dataF = "";
    if (venda.Data) dataF = venda.Data.includes('/') ? venda.Data.split('/').reverse().join('-') : venda.Data.split('T')[0];
    document.getElementById("editVendaData").value = dataF;
    document.getElementById("editVendaQuantidade").value = venda.Quantidade || 0;
    document.getElementById("editVendaQtdAntiga").value = venda.Quantidade || 0;
    document.getElementById("editVendaPreco").value = limparNumero(venda.Preco_Venda);
    document.getElementById("editVendaCusto").value = limparNumero(venda.Custo_Produto);
    document.getElementById("modalEdicaoVenda").classList.add("ativo");
}

function fecharModalVenda() { document.getElementById("modalEdicaoVenda").classList.remove("ativo"); }

async function salvarEdicaoVenda() {
    const vendaID = document.getElementById("editVendaID").value;
    const produtoID = document.getElementById("editVendaProdutoID").value;
    const qtdAntiga = parseInt(document.getElementById("editVendaQtdAntiga").value);
    const qtdNova = parseInt(document.getElementById("editVendaQuantidade").value);
    const clienteNome = document.getElementById("editVendaCliente").value;
    const dataVenda = document.getElementById("editVendaData").value;
    const preco = parseFloat(document.getElementById("editVendaPreco").value);
    const custo = parseFloat(document.getElementById("editVendaCusto").value);

    try {
        if (produtoID && qtdNova !== qtdAntiga) {
            const diferenca = qtdNova - qtdAntiga;
            const resProd = await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/${produtoID}/?user_field_names=true`, { headers: { Authorization: `Token ${API_TOKEN}` }});
            const produtoData = await resProd.json();
            const novoEstoque = (parseInt(produtoData.Estoque) || 0) - diferenca;
            await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/${produtoID}/?user_field_names=true`, {
                method: "PATCH", headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
                body: JSON.stringify({ Estoque: novoEstoque })
            });
        }
        await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_VENDAS}/${vendaID}/?user_field_names=true`, {
            method: "PATCH", headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({ Quantidade: qtdNova, cliente: clienteNome, Data: dataVenda, Faturamento: preco * qtdNova, Lucro_Venda: (preco - custo) * qtdNova })
        });
        mostrarNotificacao("Venda atualizada!");
        fecharModalVenda(); carregarProdutos(); carregarVendasEDashboard();
    } catch (error) { mostrarNotificacao("Erro ao editar.", "erro"); }
}

async function entradaEstoque() {
    const produtoID = document.getElementById("produtoEntrada").value;
    const quantidade = parseInt(document.getElementById("quantidadeEntrada").value);
    if (!produtoID || quantidade <= 0) return;
    try {
        const produto = produtosGlobais.find(p => p.id == produtoID);
        const novoEstoque = (parseInt(produto.Estoque) || 0) + quantidade;
        await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/${produtoID}/?user_field_names=true`, {
            method: "PATCH", headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({ Estoque: novoEstoque })
        });
        mostrarNotificacao("Estoque atualizado!");
        document.getElementById("quantidadeEntrada").value = ""; carregarProdutos();
    } catch (error) { }
}

async function cadastrarProduto() {
    const nome = document.getElementById("cadProduto").value;
    const custo = parseFloat(document.getElementById("cadCusto").value);
    const preco = parseFloat(document.getElementById("cadPreco").value);
    if (!nome || isNaN(custo) || isNaN(preco)) return;
    try {
        await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/?user_field_names=true`, {
            method: "POST", headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({ 
                Produto: nome, 
                Modelo: document.getElementById("cadModelo").value, 
                Cor: document.getElementById("cadCor").value, 
                Tamanho: document.getElementById("cadTamanho").value, 
                Custo: custo, Preco_Venda: preco, 
                Estoque: parseInt(document.getElementById("cadEstoque").value) || 0 
            })
        });
        mostrarNotificacao("Produto cadastrado!");
        carregarProdutos();
    } catch (error) { }
}

async function excluirProduto(id) {
    if (!confirm("Excluir produto?")) return;
    try {
        await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/${id}/`, { method: "DELETE", headers: { Authorization: `Token ${API_TOKEN}` }});
        carregarProdutos();
    } catch (error) { }
}

function abrirModalEdicao(id) {
    const p = produtosGlobais.find(x => x.id === id);
    if (!p) return;
    document.getElementById("editID").value = p.id;
    document.getElementById("editProduto").value = p.Produto || "";
    document.getElementById("editCusto").value = limparNumero(p.Custo);
    document.getElementById("editPreco").value = limparNumero(p.Preco_Venda);
    document.getElementById("editEstoque").value = p.Estoque || 0;
    document.getElementById("modalEdicao").classList.add("ativo");
}

function fecharModal() { document.getElementById("modalEdicao").classList.remove("ativo"); }

async function salvarEdicao() {
    const id = document.getElementById("editID").value;
    try {
        await fetch(`https://api.baserow.io/api/database/rows/table/${TABLE_PRODUTOS}/${id}/?user_field_names=true`, {
            method: "PATCH", headers: { Authorization: `Token ${API_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({ 
                Produto: document.getElementById("editProduto").value, 
                Custo: parseFloat(document.getElementById("editCusto").value), 
                Preco_Venda: parseFloat(document.getElementById("editPreco").value), 
                Estoque: parseInt(document.getElementById("editEstoque").value) 
            })
        });
        fecharModal(); carregarProdutos();
    } catch (error) { }
}

// INICIALIZAÇÃO
carregarProdutos();
carregarVendasEDashboard();