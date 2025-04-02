// Função principal para capturar e processar as parcelas
function capturarParcelas() {
    // Pega o valor do textarea e converte para número
    const inputValores = parseFloat(document.getElementById("valorInput").value.replace(/[^\d,]/g, '').replace(',', '.'));

    // Verifica se o valor é válido
    if (isNaN(inputValores)) {
        alert("Por favor, insira um valor válido.");
        return;
    }

    // Tabela de alíquotas progressivas
    const aliquota = [
        { min: 20000.01, max: Infinity, taxa: 0.05, adicional: 2900 },
        { min: 15000.01, max: 20000, taxa: 0.1, adicional: 1900 },
        { min: 10000.01, max: 15000, taxa: 0.15, adicional: 1150 },
        { min: 5000.01, max: 10000, taxa: 0.2, adicional: 650 },
        { min: 1000.01, max: 5000, taxa: 0.3, adicional: 150 },
        { min: 500.01, max: 1000, taxa: 0.3, adicional: 150 },
        { min: -Infinity, max: 500, taxa: 0.5, adicional: 0 },
    ];

    let parcelasA = [];
    let saldoRestante = inputValores;
    
    for (let i = 0; i < 10; i++) {
        const regra = aliquota.find(r => saldoRestante > r.min && saldoRestante <= r.max);
        if (!regra) break;
        
        const valorParcela = saldoRestante * regra.taxa + regra.adicional;
        
        parcelasA.push(valorParcela);
        saldoRestante -= valorParcela;
    }
    
    console.log("Parcelas calculadas:", parcelasA);

    // Extrai o mês da parcela direto do textarea
    const mesNascimento = parseInt(document.getElementById("mesAniv").value);
    if (isNaN(mesNascimento) || mesNascimento < 1 || mesNascimento > 12) {
        alert("Por favor, insira um mês de aniversário válido (1-12).");
        return;
    }

    // Pega a taxa de juros do input
    const taxaJurosInput = 1.79;
    const taxaJurosMensal = parseFloat(taxaJurosInput) / 100; // Converte para decimal
    
    // Calcula a taxa anual (a.a.)
    const taxaAnual = calcularTaxaAnual(taxaJurosMensal);

    // Calcula a taxa ao dia (a.d.)
    const taxaDia = calcularTaxaDia(taxaAnual);

    // Calcula as datas de vencimento com base no mês de aniversário (uma vez por ano)
    const datasVencimento = calcularDatasVencimento(mesNascimento, parcelasA.length);

    // Calcula o deságio para cada parcela
    const desagios = calcularDesagios(datasVencimento, taxaDia);

    // Calcula o valor descontado de cada parcela
    const valoresDescontados = parcelasA.map((parcela, index) => parcela / desagios[index]);
    
    // Exibe os valores na lista com as datas de vencimento e deságios
    exibirParcelas(parcelasA, datasVencimento, desagios, valoresDescontados, taxaAnual, taxaDia);
    
    return parcelasA;
}

// Função para calcular a taxa anual (a.a.)
function calcularTaxaAnual(taxaMensal) {
    // Fórmula: (1 + i)^12 - 1
    return Math.pow(1 + taxaMensal, 12) - 1;
}

// Função para calcular a taxa ao dia (a.d.)
function calcularTaxaDia(taxaAnual) {
    // Fórmula: (1 + taxaAnual)^(1/360) - 1
    return Math.pow(1 + taxaAnual, 1 / 360) - 1;
}

// Função para calcular as datas de vencimento
function calcularDatasVencimento(mesNascimento, totalParcelas) {
    const datasVencimento = [];
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1; // getMonth() retorna 0-11

    // Encontra o próximo mês de aniversário
    let anoAniversario = anoAtual;

    if (mesNascimento < mesAtual+1) {
        // Se o mês de aniversário já passou este ano, o próximo será no próximo ano
        anoAniversario++;
    }

    // Calcula as datas de vencimento para cada parcela (uma vez por ano, no mês de aniversário)
    for (let i = 0; i < totalParcelas; i++) {
        const dataVencimento = new Date(anoAniversario + i, mesNascimento - 1, 1); // Primeiro dia do mês de aniversário
        datasVencimento.push(dataVencimento);
    }

    return datasVencimento;
}

// Função para calcular os deságios
function calcularDesagios(datasVencimento, taxaDia) {
    const hoje = new Date();
    const desagios = [];

    datasVencimento.forEach(dataVencimento => {
        // Calcula a diferença em dias entre a data atual e a data de vencimento
        const diferencaDias = Math.ceil((dataVencimento - hoje) / (1000 * 60 * 60 * 24));

        // Calcula o deságio: (1 + taxaDia)^diferencaDias
        const desagio = Math.pow(1 + taxaDia, diferencaDias);
        desagios.push(desagio);
    });

    return desagios;
}

// Função para exibir as parcelas na lista
function exibirParcelas(parcelas, datasVencimento, desagios, valoresDescontados, taxaAnual, taxaDia) {
    const listaParcelas = document.getElementById("listaParcelas");
    listaParcelas.innerHTML = ""; // Limpa a lista antes de adicionar novos itens

    // Adiciona cada parcela à lista com a data de vencimento e deságio
    parcelas.forEach((parcela, index) => {
        const itemLista = document.createElement("li");

        // Texto da parcela
        const textoParcela = document.createElement("span");
        textoParcela.textContent = `Parcela ${index + 1}: R$ ${parcela.toFixed(2)} - Vencimento: ${formatarData(datasVencimento[index])}`;

        // Interruptor (toggle switch)
        const switchContainer = document.createElement("label");
        switchContainer.classList.add("switch");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = true; // Por padrão, todas as parcelas são usáveis
        checkbox.dataset.index = index; // Adiciona um índice para identificar a parcela

        // Adiciona um evento para ativar as parcelas acima
        checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
                // Ativa todas as parcelas acima
                for (let i = 0; i <= index; i++) {
                    const checkboxes = document.querySelectorAll(`input[type="checkbox"]`);
                    checkboxes[i].checked = true;
                }
            } else {
                // Desativa todas as parcelas abaixo
                for (let i = index; i < parcelas.length; i++) {
                    const checkboxes = document.querySelectorAll(`input[type="checkbox"]`);
                    checkboxes[i].checked = false;
                }
            }
            // Recalcula os totais com base nas parcelas selecionadas
            recalcularTotais(parcelas, datasVencimento, desagios, valoresDescontados, taxaAnual, taxaDia);
        });

        const slider = document.createElement("span");
        slider.classList.add("slider");

        switchContainer.appendChild(checkbox);
        switchContainer.appendChild(slider);

        // Adiciona texto e interruptor ao item da lista
        itemLista.appendChild(textoParcela);
        itemLista.appendChild(switchContainer);

        // Adiciona o item à lista
        listaParcelas.appendChild(itemLista);
    });

    // Exibe os resultados na coluna do meio
    recalcularTotais(parcelas, datasVencimento, desagios, valoresDescontados, taxaAnual, taxaDia);
}

// Função para recalcular os totais com base nas parcelas selecionadas
function recalcularTotais(parcelas, datasVencimento, desagios, valoresDescontados, taxaAnual, taxaDia) {
    const checkboxes = document.querySelectorAll(`input[type="checkbox"]`);

    // Filtra as parcelas selecionadas
    const parcelasSelecionadas = parcelas.filter((_, index) => checkboxes[index].checked);
    const valoresDescontadosSelecionados = valoresDescontados.filter((_, index) => checkboxes[index].checked);
    const datasVencimentoSelecionadas = datasVencimento.filter((_, index) => checkboxes[index].checked);

    // Soma todos os valores descontados das parcelas selecionadas
    const totalValoresDescontados = valoresDescontadosSelecionados.reduce((total, valor) => total + valor, 0);

    // Calcula o IOF para cada parcela selecionada
    const iofPorParcela = parcelasSelecionadas.map((parcela, index) => {
        const dias = Math.ceil((datasVencimentoSelecionadas[index] - new Date()) / (1000 * 60 * 60 * 24));
        const iofDiario = Math.min(0.000082 * dias, 0.03); // IOF diário limitado a 3%
        const iofTotal = (0.0038 + iofDiario) * valoresDescontadosSelecionados[index]; // IOF fixo + IOF diário
        return iofTotal;
    });

    // Soma o IOF de todas as parcelas selecionadas
    const iofTotal = iofPorParcela.reduce((total, iof) => total + iof, 0);

    // Calcula o valor líquido final (total dos valores descontados - IOF total)
    const valorLiquidoFinal = totalValoresDescontados - iofTotal;
    const valorAtualParcelas = parcelasSelecionadas.reduce((total, parcela) => total + parcela, 0);    
    const valorTotalParcelas = parcelas.reduce((total, parcela) => total + parcela, 0);

    // Exibe os resultados na coluna do meio
    const colMiddle = document.querySelector(".col-middle");
    colMiddle.innerHTML = `
        <h2>Resultados:</h2>
        <br>
        <div class="resultado">
            <p>Valor total das parcelas: R$ ${valorTotalParcelas.toFixed(2)}</p>
        </div>
        <div class="resultado">
            <p>IOF total: R$ ${iofTotal.toFixed(2)}</p>
        </div>
        <div class="total">
            <p>Total antecipado: R$ ${valorAtualParcelas.toFixed(2)}</p>
        </div>
        <div class="liberado">
            <p><big>Valor Liberado: <strong>R$ ${valorLiquidoFinal.toFixed(2)}</strong></big></p>
        </div>
    `;
}

// Função para formatar datas no formato DD/MM/AAAA
function formatarData(data) {
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0'); // getMonth() retorna 0-11
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
}
