const tabelasConfig = {
    "PARANÁ TAC": { taxa: 1.79, calcTac: (v) => aplicarAlíquotaPtac(v), calcMeta: (t) => t * 0.7825 }, 
    "PARANÁ": { taxa: 1.79, calcTac: (v) => v, calcMeta: (t) => t * 0.7825 },
    "PARANÁ SEG": { taxa: 1.79, calcTac: (v, e) => Math.max(v-(e / (100/6)), v - 600), calcMeta: (t) => t * 0.8 },
    "SENNA": { taxa: 1.8, calcTac: (v, e) => v - (e/(100/22)), calcMeta: (t) => t * 1.10 },
    "PRIME": { taxa: 1.8, calcTac: (v) => v - 70, calcMeta: (t) => t * 0.68 },
    "MONACO": { taxa: 1.8, calcTac: (v, e) => v * 0.815, calcMeta: (t) => t * 0.9 },
    "GOLD POWER": { taxa: 1.8, calcTac: (v) => v * 0.85, calcMeta: (t) => t * 0.8 },
    "LIGHT": { taxa: 1.8, calcTac: (v) => v, calcMeta: (t) => t * 0.39 }
};

// Funções auxiliares
const calcularTaxaAnual = (taxaMensal) => Math.pow(1 + taxaMensal, 12) - 1;
const calcularTaxaDia = (taxaAnual) => Math.pow(1 + taxaAnual, 1 / 360) - 1;

const aliquota = [
        { min: 20000.01, max: Infinity, taxa: 0.05, adicional: 2900 },
        { min: 15000.01, max: 20000, taxa: 0.1, adicional: 1900 },
        { min: 10000.01, max: 15000, taxa: 0.15, adicional: 1150 },
        { min: 5000.01, max: 10000, taxa: 0.2, adicional: 650 },
        { min: 1000.01, max: 5000, taxa: 0.3, adicional: 150 },
        { min: 500.01, max: 1000, taxa: 0.4, adicional: 50 },
        { min: -Infinity, max: 500, taxa: 0.5, adicional: 0 },
    ];


function calcularDesagios(datasVencimento, taxaDia) {
    const hoje = new Date();
    return datasVencimento.map(data => {
        const dias = Math.ceil((data - hoje) / (1000 * 60 * 60 * 24));
        return Math.pow(1 + taxaDia, dias);
    });
}

// Função principal
function capturarParcelas() {
    // Obter dados de entrada
    const valores = document.getElementById("valoresInput").value;
    const tabelaSelecionada = document.getElementById("tabela").value;
    const config = tabelasConfig[tabelaSelecionada] || tabelasConfig["PARANÁ"];

    const mesNascimento = document.getElementById("mesAniv").value;

    let saldoRestante = valores;
    let parcelasA = [];
    for (let i = 0; i < 10; i++) {
        const regra = aliquota.find(r => saldoRestante > r.min && saldoRestante <= r.max);
        if (!regra) break;
        const valorParcela = saldoRestante * regra.taxa + regra.adicional;
        if (valorParcela < 0.01) break;
        parcelasA.push(valorParcela);
        saldoRestante -= valorParcela;
    }
    console.log("Parcelas calculadas:", parcelasA);
    
    const datasVencimento = calcularDatasVencimento(mesNascimento, parcelasA.length);

    // Cálculos financeiros
    const taxaDia = calcularTaxaDia(calcularTaxaAnual(config.taxa / 100));
    const desagios = calcularDesagios(datasVencimento, taxaDia);
    const valoresDescontados = parcelasA.map((v, i) => v / (desagios[i] || 1));

    // Exibir resultados
    exibirParcelas(
        parcelasA.slice(0, 10),
        desagios.slice(0, 10),
        valoresDescontados.slice(0, 10),
        calcularTaxaAnual(config.taxa / 100),
        taxaDia,
        datasVencimento.slice(0, 10),
        config
    );
}

function exibirParcelas(parcelasA, desagios, valoresDescontados, taxaAnual, taxaDia, datasVencimento, config) {
    const listaParcelas = document.getElementById("listaParcelas");
    const textoParcela = document.createElement("span");
    listaParcelas.innerHTML = "";
    listaParcelas.innerHTML = parcelasA.map((p, i) => `
      <li>
        <span>Parcela ${i+1}: ${brl(p)} - Vencimento: ${formatarData(datasVencimento[i])|| "N/A"}</span>
        <label class="switch">
          <input type="checkbox" checked data-index="${i}">
          <span class="slider"></span>
        </label>
      </li>
    `).join('');

    // Configurar eventos dos checkboxes
    document.querySelectorAll('.switch input').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const index = parseInt(this.dataset.index);
            document.querySelectorAll('.switch input').forEach((cb, i) => {
                cb.checked = this.checked ? (i <= index) : (i < index);
            });
            recalcularTotais(parcelasA, valoresDescontados, config, datasVencimento);
        });
    });

    recalcularTotais(parcelasA, valoresDescontados, config, datasVencimento);
}

function recalcularTotais(parcelasA, valoresDescontados, config, datasVencimento) {
    const checkboxes = document.querySelectorAll('.switch input:checked');
    const indices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.index));

    const parcelasSelecionadas = indices.map(i => parcelasA[i]);
    const valoresSelecionados = indices.map(i => valoresDescontados[i]);
    const datasSelecionadas = indices.map(i => datasVencimento[i]);

    const totalDescontado = valoresSelecionados.reduce((a, b) => a + b, 0);

    // Cálculo correto do IOF
    const iofTotal = valoresSelecionados.reduce((total, valor, i) => {
        const hoje = new Date();
        const dataVenc = datasSelecionadas[i];
        const dias = Math.ceil((dataVenc - hoje) / (1000 * 60 * 60 * 24));

        const limitedias = Math.min(dias,365);
        const iofTotal = valor*0.0038+valor*0.000082*limitedias;

        return total + iofTotal;
    }, 0);

    const valorLiquido = totalDescontado - iofTotal;

    // Aplica o ptac apenas se a tabela for PARANÁ
    const tac = config.tabela === "PARANÁ" ? aplicarAlíquotaPtac(valorLiquido) : config.calcTac(valorLiquido, totalDescontado);

    // Calculando o valor da meta
    const valorMeta = config.calcMeta(tac);
    const f = tac.toLocaleString('pt-br',{style: 'currency', currency: 'BRL'});
    console.log(f)
    console.log(brl(valorMeta))
    document.querySelector(".col-middle").innerHTML = `
      <h2>Resultados:</h2>
      <div class="resultado"><p>Valor meta: ${brl(valorMeta)}</p></div>
      <div class="resultado"><p>IOF total: ${brl(iofTotal)}</p></div>
      <div class="resultado"><p>Total antecipado: ${brl(parcelasSelecionadas.reduce((a, b) => a + b, 0))}</p></div>
      <div class="liberado"><p><big>Valor Liberado: <strong>${brl(tac)}</strong></big></p></div>
    `;
}

// Função para aplicar a alíquota do ptac
function aplicarAlíquotaPtac(valor) {
    const ptac = [
        { min: 2501.00, max: Infinity, tac: 0.05 },
        { min: 500.01, max: 2500.00, tac: 0.075 },
        { min: -Infinity, max: 500.00, tac: 0.1 },
    ];

    // Encontra o tac correspondente ao valor
    const faixa = ptac.find(p => valor >= p.min && valor <= p.max);

    if (faixa) {
        return valor - valor * faixa.tac;  // Aplica a alíquota (tac) encontrada
    }
    return valor;  // Caso não encontre uma faixa válida, retorna o valor original
}



function brl(float) {
        let brl = float.toLocaleString('pt-br',{style: 'currency', currency: 'brl'});
        return brl
}

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

function formatarData(data) {
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0'); // getMonth() retorna 0-11
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
}
