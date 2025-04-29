const tabelasConfig = {
    "PARANÁ TAC": { taxa: 1.79, calcTac: (v) => aplicarAlíquotaPtac(v), calcMeta: (t) => t * 0.6956 }, 
    "PARANÁ": { taxa: 1.79, calcTac: (v) => v, calcMeta: (t) => t * 0.6956 },
    "SENNA": { taxa: 1.8, calcTac: (v, e) => v - (e / (100/22)), calcMeta: (t) => t * 1.10 },
    "PRIME": { taxa: 1.8, calcTac: (v) => v - 70, calcMeta: (t) => t * 0.68 },
    "MONACO": { taxa: 1.8, calcTac: (v) => v * 0.815, calcMeta: (t) => t * 0.90 },
    "GOLD POWER": { taxa: 1.8, calcTac: (v) => v * 0.85, calcMeta: (t) => t * 0.80 },
    "LIGHT": { taxa: 1.8, calcTac: (v) => v, calcMeta: (t) => t * 0.39 }
};

// Funções auxiliares
const calcularTaxaAnual = (taxaMensal) => Math.pow(1 + taxaMensal, 12) - 1;
const calcularTaxaDia = (taxaAnual) => Math.pow(1 + taxaAnual, 1 / 360) - 1;

function parseDataString(dataStr) {
    const parts = dataStr.split('/').map(Number);
    return parts.length === 3 
      ? new Date(parts[2], parts[1] - 1, parts[0]) // Formato dd/mm/aaaa
      : new Date(parts[1], parts[0], 1); // Formato mm/aaaa (primeiro dia do mês seguinte)
}

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
    const inputValores = document.getElementById("parcelasInput").value;
    const tabelaSelecionada = document.getElementById("tabela").value;
    const config = tabelasConfig[tabelaSelecionada] || tabelasConfig["PARANÁ"];

    // Extrair valores e datas
    const valores = (inputValores.match(/R\$\s*\d{1,6}(?:\.\d{3})*(?:,\d{2})?/g) || [])
      .map(v => parseFloat(v.replace(/R\$|\s|\./g, '').replace(',', '.')));

    const datasVencimentoStr = inputValores.match(/(\d{2}\/\d{2}\/\d{4})|(\d{2}\/\d{4})/g) || [];
    const datasVencimento = datasVencimentoStr.map(parseDataString);

    if (!valores.length) {
        alert("Nenhum valor válido encontrado!");
        return;
    }

    // Cálculos financeiros
    const taxaDia = calcularTaxaDia(calcularTaxaAnual(config.taxa / 100));
    const desagios = calcularDesagios(datasVencimento, taxaDia);
    const valoresDescontados = valores.map((v, i) => v / (desagios[i] || 1));

    // Exibir resultados
    exibirParcelas(
        valores.slice(0, 10),
        datasVencimentoStr.slice(0, 10),
        desagios.slice(0, 10),
        valoresDescontados.slice(0, 10),
        calcularTaxaAnual(config.taxa / 100),
        taxaDia,
        datasVencimento.slice(0, 10),
        config
    );
}

function exibirParcelas(parcelas, datasStr, desagios, valoresDescontados, taxaAnual, taxaDia, datasVencimento, config) {
    const listaParcelas = document.getElementById("listaParcelas");
    listaParcelas.innerHTML = parcelas.map((p, i) => `
      <li>
        <span>Parcela ${i+1}: ${brl(p)} - Vencimento: ${datasStr[i] || "N/A"}</span>
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
            recalcularTotais(parcelas, valoresDescontados, config, datasVencimento);
        });
    });

    recalcularTotais(parcelas, valoresDescontados, config, datasVencimento);
}

function recalcularTotais(parcelas, valoresDescontados, config, datasVencimento) {
    const checkboxes = document.querySelectorAll('.switch input:checked');
    const indices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.index));

    const parcelasSelecionadas = indices.map(i => parcelas[i]);
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
    console.log(config.calcTac(valorLiquido, totalDescontado))
    console.log("emissão " + totalDescontado)
    console.log("valor "+tac)
    // Calculando o valor da meta
    const valorMeta = config.calcMeta(tac);
    document.querySelector(".col-middle").innerHTML = `
      <h2>Resultados:</h2>
      <div class="resultado"><p>Valor meta: ${brl(valorMeta)}</p></div>
      <div class="resultado"><p>IOF total: ${brl(iofTotal)}</p></div>
      <div class="total"><p>Total antecipado: ${brl(parcelasSelecionadas.reduce((a, b) => a + b, 0))}</p></div>
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
