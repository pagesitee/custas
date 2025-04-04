document.addEventListener('DOMContentLoaded', function() {
    // Configuração do Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyCfuB7wfMOXajWuAV1cS2xPsp-3Hx9Upk4",
        authDomain: "calccustas.firebaseapp.com",
        projectId: "calccustas",
        storageBucket: "calccustas.appspot.com",
        messagingSenderId: "912892414256",
        appId: "1:912892414256:web:b56f75b3a4441a1696e0f5",
        measurementId: "G-3Y1SZK94DT"
    };

    // Inicializa o Firebase se ainda não estiver inicializado
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.firestore();

    // Valores em reais conforme a tabela (UFIR convertida)
    const valores = {
        'civil-geral': {
            percentual: 0.01,
            min: 10.64,
            max: 1915.38,
            min_50: 5.32,
            max_50: 957.69,
            descricao: 'Ação Civil Geral (1% do valor da causa, mínimo R$ 10,64, máximo R$ 1.915,38)'
        },
        'cautelar': {
            percentual: 0.005,
            min: 5.32,
            max: 957.69,
            descricao: 'Processo Cautelar/Jurisdição Voluntária (50% dos valores da ação civil, mínimo R$ 5,32, máximo R$ 957,69)'
        },
        'inestimavel': {
            fixo: 10.64,
            fixo_50: 5.32,
            descricao: 'Causa de Valor Inestimável - Valor fixo R$ 10,64'
        },
        'agravo': {
            fixo: 138.95,
            descricao: 'Agravo de Instrumento - Valor fixo R$ 138,95'
        },
        'penal-geral': {
            fixo: 297.95,
            descricao: 'Ação Penal Geral (pelo vencido) - Valor fixo R$ 297,95'
        },
        'penal-privada': {
            fixo: 106.41,
            descricao: 'Ação Penal Privada - Valor fixo R$ 106,41'
        },
        'notificacoes': {
            fixo: 53.20,
            descricao: 'Notificações/Interpelações/Procedimentos Cautelares - Valor fixo R$ 53,20'
        }
    };

    // Códigos de recolhimento
    const codigosRecolhimento = {
        'primeiro-grau': '18740-2: STN Custas Judiciais',
        'segundo-grau': '18750-0: STN Custas Judiciais - 2ª Instância'
    };

    // Mapeamento completo de UGs
    const unidadesGestoras = {
        '090024': 'Seção Judiciária do Acre',
        '090037': 'Seção Judiciária do Amapá',
        '090002': 'Seção Judiciária do Amazonas',
        '090012': 'Seção Judiciária da Bahia',
        '090023': 'Seção Judiciária do Distrito Federal',
        '090022': 'Seção Judiciária de Goiás',
        '090004': 'Seção Judiciária do Maranhão',
        '090021': 'Seção Judiciária do Mato Grosso',
        '090003': 'Seção Judiciária do Pará',
        '090005': 'Seção Judiciária do Piauí',
        '090025': 'Seção Judiciária de Rondônia',
        '090039': 'Seção Judiciária de Roraima',
        '090038': 'Seção Judiciária do Tocantins',
        '090027': 'TRF da 1ª Região'
    };

    // Elementos do DOM
    const form = document.getElementById('form-custas');
    const tipoProcessoSelect = document.getElementById('tipo-processo');
    const valorCausaInput = document.getElementById('valor-causa');
    const valorCausaGroup = document.getElementById('valor-causa-group');
    const dataAjuizamentoInput = document.getElementById('data-ajuizamento');
    const dataAjuizamentoGroup = document.getElementById('data-ajuizamento-group');
    const faseProcessoSelect = document.getElementById('fase-processo');
    const faseProcessoGroup = document.getElementById('fase-processo-group');
    const instanciaSelect = document.getElementById('instancia');
    const unidadeGestoraSelect = document.getElementById('unidade-gestora');
    const resultadoDiv = document.getElementById('resultado');
    const dataCalculoSpan = document.getElementById('data-calculo');
    const atualizacaoDiv = document.getElementById('atualizacao-monetaria');
    const valorOriginalInput = document.getElementById('valor-original');
    const valorAtualizadoInput = document.getElementById('valor-atualizado');
    const indiceAcumuladoInput = document.getElementById('indice-acumulado');
    const periodoAtualizacaoInput = document.getElementById('periodo-atualizacao');
    const limparBtn = document.getElementById('limpar-btn');
    const ajudaBtn = document.getElementById('ajuda-btn');
    const btnInfo = document.getElementById('info-atualizacao');
    const btnExport = document.getElementById('export-indices');
    const modal = document.getElementById('info-modal');
    const spanClose = document.querySelector('#info-modal .close');
    const faseResultadoContainer = document.getElementById('fase-resultado-container');
    const dobroResultado = document.getElementById('dobro-resultado');
    const custasComplementaresGroup = document.getElementById('custas-complementares-group');
    const complementarOption = document.getElementById('complementar-option');
    const custasComplementaresFields = document.getElementById('custas-complementares-fields');
    const valorComplementarInput = document.getElementById('valor-complementar');
    const dataComplementarInput = document.getElementById('data-complementar');
    const descricaoComplementarInput = document.getElementById('descricao-complementar');
    const infoComplementarBtn = document.getElementById('info-complementar');
    const infoComplementarModal = document.getElementById('info-complementar-modal');
    const spanCloseComplementar = document.querySelector('#info-complementar-modal .close');
    const complementarResultado = document.getElementById('complementar-resultado');
    const valorComplementarResultado = document.getElementById('valor-complementar-resultado');
    const custasDobroSelect = document.getElementById('custas-dobro');
    const custasDobroGroup = document.getElementById('custas-dobro-group');
    const infoDobroBtn = document.getElementById('info-dobro');
    const infoDobroModal = document.getElementById('info-dobro-modal');
    const spanCloseDobro = document.querySelector('#info-dobro-modal .close');

    // Funções auxiliares
    function formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor).replace('R$', '').trim();
    }

    function parseMoeda(valor) {
        if (!valor) return 0;
        return parseFloat(valor.replace(/\./g, '').replace(',', '.'));
    }

    function validarDataMMAAAA(dataStr) {
        if (!/^\d{2}\/\d{4}$/.test(dataStr)) {
            return { valido: false, mensagem: 'Formato de data inválido. Use mm/aaaa' };
        }

        const [mesStr, anoStr] = dataStr.split('/');
        const mes = parseInt(mesStr);
        const ano = parseInt(anoStr);
        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth() + 1;

        if (mes < 1 || mes > 12 || ano < 1900 || ano > anoAtual) {
            return { 
                valido: false, 
                mensagem: `Data inválida. Use mm/aaaa entre 01/1900 e 12/${anoAtual}`
            };
        }

        if (ano > anoAtual || (ano === anoAtual && mes > mesAtual)) {
            return { 
                valido: false, 
                mensagem: 'A data deve ser anterior ou igual ao mês atual'
            };
        }

        return { valido: true, mes, ano };
    }

    function criarLink(texto, url) {
        const link = document.createElement('a');
        link.href = url;
        link.textContent = texto;
        link.target = '_blank';
        link.style.color = 'var(--secondary-color)';
        link.style.textDecoration = 'none';
        link.style.fontWeight = '500';
        link.style.margin = '0 5px';
        return link;
    }

    // Máscaras para os campos
    valorCausaInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        value = (value / 100).toFixed(2) + '';
        value = value.replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
        e.target.value = value;
    });

    dataAjuizamentoInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 2) {
            value = value.substring(0, 2) + '/' + value.substring(2, 6);
        }
        e.target.value = value;
    });

    valorComplementarInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        value = (value / 100).toFixed(2) + '';
        value = value.replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
        e.target.value = value;
    });

    dataComplementarInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 2) {
            value = value.substring(0, 2) + '/' + value.substring(2, 6);
        }
        e.target.value = value;
    });

    // Atualizar campos visíveis conforme seleções
    function atualizarCamposVisiveis() {
        const tipoProcesso = tipoProcessoSelect.value;
        const showValorCausa = ['civil-geral', 'cautelar'].includes(tipoProcesso);
        valorCausaGroup.style.display = showValorCausa ? 'block' : 'none';
        
        const showDataAjuizamento = tipoProcesso === 'civil-geral' && faseProcessoSelect.value === 'recursal';
        dataAjuizamentoGroup.style.display = showDataAjuizamento ? 'block' : 'none';
        
        const showComplementar = ['civil-geral', 'cautelar', 'inestimavel', 'agravo'].includes(tipoProcesso);
        custasComplementaresGroup.style.display = showComplementar ? 'block' : 'none';
        
        const showFaseProcesso = !['penal-geral', 'penal-privada', 'notificacoes', 'agravo'].includes(tipoProcesso);
        faseProcessoGroup.style.display = showFaseProcesso ? 'block' : 'none';
        
        const showCustasDobro = !['penal-geral', 'penal-privada', 'notificacoes'].includes(tipoProcesso);
        custasDobroGroup.style.display = showCustasDobro ? 'block' : 'none';
        
        atualizacaoDiv.style.display = 'none';
        resultadoDiv.style.display = 'none';
    }

    // Modal de informações
    if (btnInfo && modal && spanClose) {
        btnInfo.onclick = function() {
            modal.style.display = 'block';
        }

        spanClose.onclick = function() {
            modal.style.display = 'none';
        }
    }

    // Modal de informações sobre custas complementares
    if (infoComplementarBtn && infoComplementarModal && spanCloseComplementar) {
        infoComplementarBtn.onclick = function() {
            infoComplementarModal.style.display = 'block';
        }

        spanCloseComplementar.onclick = function() {
            infoComplementarModal.style.display = 'none';
        }
    }

    // Modal de informações sobre custas em dobro
    if (infoDobroBtn && infoDobroModal && spanCloseDobro) {
        infoDobroBtn.onclick = function() {
            infoDobroModal.style.display = 'block';
        }

        spanCloseDobro.onclick = function() {
            infoDobroModal.style.display = 'none';
        }
    }

    window.onclick = function(event) {
        if (modal && event.target == modal) {
            modal.style.display = 'none';
        }
        if (infoComplementarModal && event.target == infoComplementarModal) {
            infoComplementarModal.style.display = 'none';
        }
        if (infoDobroModal && event.target == infoDobroModal) {
            infoDobroModal.style.display = 'none';
        }
    }

    // Exportar índices
    if (btnExport) {
        btnExport.onclick = function() {
            exportarIndicesParaExcel();
        }
    }

    async function exportarIndicesParaExcel() {
        try {
            const doc = await db.collection('indices').doc('IPCA-E').get();
            const indices = doc.exists ? doc.data() : {
                "2024": {1: 0.42, 2: 0.83, 3: 0.71, 4: 0.38, 5: 0.46, 6: 0.39, 7: 0.01, 8: 0.00, 9: 0.00, 10: 0.00, 11: 0.00, 12: 0.00},
                "2023": {1: 0.53, 2: 0.84, 3: 0.71, 4: 0.61, 5: 0.23, 6: -0.08, 7: 0.12, 8: 0.44, 9: 0.26, 10: 0.24, 11: 0.28, 12: 0.56},
                "2022": {1: 0.54, 2: 1.01, 3: 1.62, 4: 1.06, 5: 0.47, 6: 0.67, 7: -0.68, 8: -0.36, 9: -0.29, 10: 0.59, 11: 0.41, 12: 0.62}
            };
            
            let csvContent = "Ano;Jan;Fev;Mar;Abr;Mai;Jun;Jul;Ago;Set;Out;Nov;Dez\n";
            
            for (const ano in indices) {
                const rowData = [ano];
                for (let mes = 1; mes <= 12; mes++) {
                    rowData.push((indices[ano][mes] || 0).toFixed(2).replace('.', ','));
                }
                csvContent += rowData.join(';') + "\n";
            }
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'indices_ipca_' + new Date().toISOString().slice(0, 10) + '.csv';
            link.click();
        } catch (error) {
            console.error('Erro ao exportar índices:', error);
            alert('Erro ao exportar índices. Verifique o console para mais detalhes.');
        }
    }

    // Calcular atualização monetária
    async function calcularAtualizacaoMonetaria(valorOriginal, dataStr) {
        if (isNaN(valorOriginal)) {
            return { erro: 'Informe um valor válido para a causa' };
        }

        const validacaoData = validarDataMMAAAA(dataStr);
        if (!validacaoData.valido) {
            return { erro: validacaoData.mensagem };
        }

        const { mes, ano } = validacaoData;
        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth() + 1;

        try {
            const doc = await db.collection('indices').doc('IPCA-E').get();
            const ipcaIndices = doc.exists ? doc.data() : {
                "2024": {1: 0.42, 2: 0.83, 3: 0.71, 4: 0.38, 5: 0.46, 6: 0.39, 7: 0.01, 8: 0.00, 9: 0.00, 10: 0.00, 11: 0.00, 12: 0.00},
                "2023": {1: 0.53, 2: 0.84, 3: 0.71, 4: 0.61, 5: 0.23, 6: -0.08, 7: 0.12, 8: 0.44, 9: 0.26, 10: 0.24, 11: 0.28, 12: 0.56},
                "2022": {1: 0.54, 2: 1.01, 3: 1.62, 4: 1.06, 5: 0.47, 6: 0.67, 7: -0.68, 8: -0.36, 9: -0.29, 10: 0.59, 11: 0.41, 12: 0.62}
            };

            let coeficiente = 1;
            
            for (let a = ano; a <= anoAtual; a++) {
                const mesesInicio = (a === ano) ? mes : 1;
                const mesesFim = (a === anoAtual) ? mesAtual : 12;
                
                if (!ipcaIndices[a.toString()]) {
                    return { erro: `Faltam índices para o ano ${a}` };
                }
                
                for (let m = mesesInicio; m <= mesesFim; m++) {
                    if (ipcaIndices[a][m] === undefined || ipcaIndices[a][m] === null) {
                        return { erro: `Faltam índices para ${m}/${a}` };
                    }
                    
                    coeficiente *= (1 + ipcaIndices[a][m] / 100);
                }
            }

            const valorAtualizado = valorOriginal * coeficiente;

            return {
                valorOriginal: valorOriginal,
                valorAtualizado: valorAtualizado,
                coeficiente: coeficiente,
                periodo: `${mes.toString().padStart(2, '0')}/${ano} a ${mesAtual.toString().padStart(2, '0')}/${anoAtual}`
            };
        } catch (error) {
            console.error('Erro ao calcular atualização:', error);
            return { erro: 'Erro ao calcular atualização monetária' };
        }
    }

    // Calcular custas quando o formulário for submetido
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const tipoProcesso = tipoProcessoSelect.value;
        const faseProcesso = faseProcessoSelect.value;
        const instancia = instanciaSelect.value;
        const ugCodigo = unidadeGestoraSelect.value;
        
        if (!tipoProcesso || !ugCodigo) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        let valorUsado = 0;
        if (['civil-geral', 'cautelar'].includes(tipoProcesso)) {
            valorUsado = parseMoeda(valorCausaInput.value);
            if (isNaN(valorUsado) || valorUsado <= 0) {
                alert('Informe um valor válido para a causa');
                return;
            }
        }

        let resultadoAtualizacao = null;
        if (tipoProcesso === 'civil-geral' && faseProcesso === 'recursal') {
            if (!dataAjuizamentoInput.value) {
                alert('Informe a data de ajuizamento para cálculo de apelação');
                return;
            }

            resultadoAtualizacao = await calcularAtualizacaoMonetaria(valorUsado, dataAjuizamentoInput.value);
            if (resultadoAtualizacao.erro) {
                alert(resultadoAtualizacao.erro);
                return;
            }

            valorOriginalInput.value = formatarMoeda(resultadoAtualizacao.valorOriginal);
            valorAtualizadoInput.value = formatarMoeda(resultadoAtualizacao.valorAtualizado);
            indiceAcumuladoInput.value = resultadoAtualizacao.coeficiente.toFixed(6);
            periodoAtualizacaoInput.value = resultadoAtualizacao.periodo;
            atualizacaoDiv.style.display = 'block';
            
            valorUsado = resultadoAtualizacao.valorAtualizado;
        }

        // Calcular valor base
        let valorBase = 0;
        let valorTotal = 0;
        let descricaoTipo = valores[tipoProcesso].descricao;

        if (tipoProcesso === 'civil-geral') {
            valorBase = valorUsado * valores[tipoProcesso].percentual;
            valorBase = Math.max(valores[tipoProcesso].min, Math.min(valores[tipoProcesso].max, valorBase));
            
            if (faseProcesso === 'inicial' || faseProcesso === 'recursal') {
                valorTotal = valorBase * 0.5;
                valorTotal = Math.max(valores[tipoProcesso].min_50, Math.min(valores[tipoProcesso].max_50, valorTotal));
                descricaoTipo = 'Ação Civil Geral (0,5% do valor da causa, mínimo R$ 5,32, máximo R$ 957,69)';
            } else {
                valorTotal = valorBase;
            }
        } 
        else if (tipoProcesso === 'cautelar') {
            valorBase = valorUsado * 0.005;
            valorBase = Math.max(valores[tipoProcesso].min, Math.min(valores[tipoProcesso].max, valorBase));
            
            if (faseProcesso === 'inicial' || faseProcesso === 'recursal') {
                valorTotal = valorBase * 0.5;
                valorTotal = Math.max(valores[tipoProcesso].min, Math.min(valores[tipoProcesso].max, valorTotal));
                descricaoTipo = 'Processo Cautelar (50% do valor calculado, mínimo R$ 2,66, máximo R$ 478,85)';
            } else {
                valorTotal = valorBase;
            }
        }
        else if (valores[tipoProcesso].fixo !== undefined) {
            valorBase = valores[tipoProcesso].fixo;
            valorTotal = valores[tipoProcesso].fixo;
        }

        // Processar custas complementares se selecionado
        let valorComplementarAtualizado = 0;
        let descricaoComplementar = '';
        
        if (complementarOption.value === 'sim' && ['civil-geral', 'cautelar', 'inestimavel', 'agravo'].includes(tipoProcesso)) {
            const valorComplementar = parseMoeda(valorComplementarInput.value);
            const dataComplementar = dataComplementarInput.value;
            descricaoComplementar = descricaoComplementarInput.value || 'Custas complementares';

            if (isNaN(valorComplementar) || valorComplementar <= 0) {
                alert('Informe um valor válido para as custas complementares');
                return;
            }

            if (!dataComplementar) {
                alert('Informe a data de pagamento das custas complementares');
                return;
            }

            const resultadoComplementar = await calcularAtualizacaoMonetaria(valorComplementar, dataComplementar);
            if (resultadoComplementar.erro) {
                alert(resultadoComplementar.erro);
                return;
            }

            valorComplementarAtualizado = resultadoComplementar.valorAtualizado;
            valorTotal = Math.max(0, valorTotal - valorComplementarAtualizado);

            complementarResultado.style.display = 'flex';
            valorComplementarResultado.textContent = `${descricaoComplementar}: R$ ${valorComplementarAtualizado.toFixed(2).replace('.', ',')} (valor atualizado)`;
        } else {
            complementarResultado.style.display = 'none';
        }

        // Aplicar custas em dobro se selecionado
        if (custasDobroSelect.value === 'sim' && !['penal-geral', 'penal-privada', 'notificacoes'].includes(tipoProcesso)) {
            valorTotal *= 2;
            dobroResultado.style.display = 'flex';
            descricaoTipo += ' (Custas em dobro - §4º art. 1.007 CPC)';
        } else {
            dobroResultado.style.display = 'none';
        }

        // Descrição da fase
        let descricaoFase = '';
        if (['civil-geral', 'cautelar', 'inestimavel'].includes(tipoProcesso)) {
            descricaoFase = faseProcesso === 'inicial' ? 
                'Inicial (50% da tabela)' : 
                (faseProcesso === 'recursal' ? 'Apelação (50% da tabela)' : 'Final (100% da tabela)');
            faseResultadoContainer.style.display = 'flex';
        } else {
            faseResultadoContainer.style.display = 'none';
        }

        // Descrição da instância
        const descricaoInstancia = instancia === 'primeiro-grau' ? 
            '1ª Instância (Justiça Federal de Primeiro Grau)' : 
            '2ª Instância (Justiça Federal de Segundo Grau)';

        // Obter UG selecionada
        const ugDescricao = unidadesGestoras[ugCodigo] || 'Não especificada';
        const ugCompleta = `${ugCodigo} - ${ugDescricao}`;

        // Atualizar resultados na tela
        document.getElementById('tipo-custa').textContent = descricaoTipo;
        document.getElementById('valor-base').textContent = `R$ ${valorBase.toFixed(2).replace('.', ',')}`;
        document.getElementById('fase-resultado').textContent = descricaoFase;
        document.getElementById('instancia-resultado').textContent = descricaoInstancia;
        document.getElementById('ug-resultado').textContent = ugCompleta;
        document.getElementById('codigo-recolhimento').textContent = codigosRecolhimento[instancia];
        document.getElementById('valor-total').textContent = `R$ ${valorTotal.toFixed(2).replace('.', ',')}`;

        // Atualizar data do cálculo
        dataCalculoSpan.textContent = `Calculado em: ${new Date().toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}`;

        // Mostrar resultados
        resultadoDiv.style.display = 'block';

        // Adicionar aviso e links
        const avisoDiv = document.createElement('div');
        avisoDiv.style.marginTop = '20px';
        avisoDiv.style.padding = '15px';
        avisoDiv.style.backgroundColor = '#fff8e1';
        avisoDiv.style.borderLeft = '4px solid #ffc107';
        avisoDiv.style.borderRadius = '4px';

        const avisoTexto = document.createElement('p');
        avisoTexto.textContent = 'Este sistema é somente para fins de cálculo, não gera a GRU automaticamente. ';
        avisoTexto.style.marginBottom = '10px';

        const linkGru = criarLink('Emitir GRU no PagTesouro', 'https://pagtesouro.tesouro.gov.br/portal-gru/#/emissao-gru');
        const linkManual = criarLink('Manual de Orientação (2022)', 'https://sicom.cjf.jus.br/arquivos/pdf/manual_de_calculos_revisado_ultima_versao_com_resolucao_e_apresentacao.pdf');

        const linksDiv = document.createElement('div');
        linksDiv.style.marginTop = '10px';
        linksDiv.appendChild(document.createTextNode('Acesse: '));
        linksDiv.appendChild(linkGru);
        linksDiv.appendChild(document.createTextNode(' | '));
        linksDiv.appendChild(linkManual);

        avisoDiv.appendChild(avisoTexto);
        avisoDiv.appendChild(linksDiv);

        resultadoDiv.appendChild(avisoDiv);
        resultadoDiv.scrollIntoView({ behavior: 'smooth' });
    });

    // Limpar formulário
    limparBtn.addEventListener('click', function() {
        form.reset();
        resultadoDiv.style.display = 'none';
        atualizacaoDiv.style.display = 'none';
        custasComplementaresFields.style.display = 'none';
        complementarResultado.style.display = 'none';
        dobroResultado.style.display = 'none';
        custasDobroSelect.value = 'nao';
        atualizarCamposVisiveis();
    });

    // Botão de ajuda
    ajudaBtn.addEventListener('click', function() {
        alert('Sistema de Cálculo de Custas Processuais\n\n' +
              '1. Selecione o tipo de processo\n' +
              '2. Informe o valor da causa (se aplicável)\n' +
              '3. Para apelações, informe a data de ajuizamento\n' +
              '4. Selecione a fase (quando aplicável), instância e unidade gestora\n' +
              '5. Clique em "Calcular Custas"\n\n' +
              'Custas Complementares:\n' +
              '- Informe valores já pagos para abatimento\n' +
              '- O sistema atualiza o valor para a data atual\n' +
              '- O valor atualizado é subtraído do total\n\n' +
              'Custas em Dobro:\n' +
              '- Aplica o dobro do valor calculado\n' +
              '- Disponível apenas para processos não criminais');
    });

    // Mostrar/ocultar campos de custas complementares
    complementarOption.addEventListener('change', function() {
        custasComplementaresFields.style.display = this.value === 'sim' ? 'block' : 'none';
    });

    // Atualizar campos visíveis quando mudar seleções
    tipoProcessoSelect.addEventListener('change', atualizarCamposVisiveis);
    faseProcessoSelect.addEventListener('change', atualizarCamposVisiveis);

    // Inicializar campos visíveis
    atualizarCamposVisiveis();
});