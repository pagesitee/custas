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

// Inicializa o Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Variáveis globais
let ipcaIndices = {};
let tiposIndices = [];
let indiceAtual = 'IPCA-E';

// Função para carregar índices do Firestore
async function carregarIndices() {
    try {
        // Carrega os tipos de índices disponíveis
        const tiposSnapshot = await db.collection('indices').doc('tipos').get();
        if (tiposSnapshot.exists) {
            tiposIndices = tiposSnapshot.data().lista || ['IPCA-E'];
        } else {
            tiposIndices = ['IPCA-E'];
            await db.collection('indices').doc('tipos').set({ lista: tiposIndices });
        }

        // Carrega os índices do tipo atual
        const doc = await db.collection('indices').doc(indiceAtual).get();
        if (doc.exists) {
            ipcaIndices = doc.data();
        } else {
            // Dados padrão se não houver salvos
            ipcaIndices = {
                "2024": {1: 0.42, 2: 0.83, 3: 0.71, 4: 0.38, 5: 0.46, 6: 0.39, 7: 0.01, 8: 0.00, 9: 0.00, 10: 0.00, 11: 0.00, 12: 0.00},
                "2023": {1: 0.53, 2: 0.84, 3: 0.71, 4: 0.61, 5: 0.23, 6: -0.08, 7: 0.12, 8: 0.44, 9: 0.26, 10: 0.24, 11: 0.28, 12: 0.56},
                "2022": {1: 0.54, 2: 1.01, 3: 1.62, 4: 1.06, 5: 0.47, 6: 0.67, 7: -0.68, 8: -0.36, 9: -0.29, 10: 0.59, 11: 0.41, 12: 0.62}
            };
            await db.collection('indices').doc(indiceAtual).set(ipcaIndices);
        }
        return ipcaIndices;
    } catch (error) {
        console.error("Erro ao carregar índices:", error);
        // Fallback para dados locais
        ipcaIndices = {
            "2024": {1: 0.42, 2: 0.83, 3: 0.71, 4: 0.38, 5: 0.46, 6: 0.39, 7: 0.01, 8: 0.00, 9: 0.00, 10: 0.00, 11: 0.00, 12: 0.00},
            "2023": {1: 0.53, 2: 0.84, 3: 0.71, 4: 0.61, 5: 0.23, 6: -0.08, 7: 0.12, 8: 0.44, 9: 0.26, 10: 0.24, 11: 0.28, 12: 0.56},
            "2022": {1: 0.54, 2: 1.01, 3: 1.62, 4: 1.06, 5: 0.47, 6: 0.67, 7: -0.68, 8: -0.36, 9: -0.29, 10: 0.59, 11: 0.41, 12: 0.62}
        };
        return ipcaIndices;
    }
}

// Função para salvar índices no Firestore
async function salvarIndices() {
    try {
        await db.collection('indices').doc(indiceAtual).set(ipcaIndices);
        return true;
    } catch (error) {
        console.error("Erro ao salvar índices:", error);
        return false;
    }
}

// Função para adicionar novo tipo de índice
async function adicionarTipoIndice(novoTipo) {
    if (!novoTipo || tiposIndices.includes(novoTipo)) return false;
    
    try {
        tiposIndices.push(novoTipo);
        await db.collection('indices').doc('tipos').set({ lista: tiposIndices });
        return true;
    } catch (error) {
        console.error("Erro ao adicionar tipo de índice:", error);
        return false;
    }
}

// Função para calcular o coeficiente de correção monetária
async function calcularCoeficiente(anoInicio, mesInicio, anoFim, mesFim) {
    const ipcaIndices = await carregarIndices();
    let coeficiente = 1;
    
    for (let ano = anoInicio; ano <= anoFim; ano++) {
        const mesesInicio = (ano === anoInicio) ? mesInicio : 1;
        const mesesFim = (ano === anoFim) ? mesFim : 12;
        
        if (!ipcaIndices[ano.toString()]) {
            console.error(`Faltam índices para o ano ${ano}`);
            return null;
        }
        
        for (let mes = mesesInicio; mes <= mesesFim; mes++) {
            if (ipcaIndices[ano][mes] === undefined || ipcaIndices[ano][mes] === null) {
                console.error(`Faltam índices para ${mes}/${ano}`);
                return null;
            }
            
            coeficiente *= (1 + ipcaIndices[ano][mes] / 100);
        }
    }
    
    return coeficiente;
}

// Função para calcular o índice acumulado (em percentual)
async function calcularIndiceAcumulado(anoInicio, mesInicio, anoFim, mesFim) {
    const coeficiente = await calcularCoeficiente(anoInicio, mesInicio, anoFim, mesFim);
    if (coeficiente === null) return null;
    return (coeficiente - 1) * 100;
}

// Editor de Índices (somente se a página tiver os elementos)
if (document.getElementById('table-body')) {
    document.addEventListener('DOMContentLoaded', async function() {
        await carregarIndices();
        
        const tableBody = document.getElementById('table-body');
        const addYearBtn = document.getElementById('add-year');
        const saveBtn = document.getElementById('save-data');
        const importBtn = document.getElementById('import-data');
        const exportBtn = document.getElementById('export-data');
        const tipoIndiceSelect = document.getElementById('tipo-indice');
        const addTipoBtn = document.getElementById('add-tipo-indice');
        const novoTipoInput = document.getElementById('novo-tipo-indice');

        // Adicionar opções de tipos de índices ao select
        function atualizarTiposIndices() {
            tipoIndiceSelect.innerHTML = '';
            tiposIndices.forEach(tipo => {
                const option = document.createElement('option');
                option.value = tipo;
                option.textContent = tipo;
                option.selected = tipo === indiceAtual;
                tipoIndiceSelect.appendChild(option);
            });
        }

        // Mudar o índice atual
        tipoIndiceSelect.addEventListener('change', async function() {
            indiceAtual = this.value;
            await carregarIndices();
            initializeTable();
        });

        // Adicionar novo tipo de índice
        addTipoBtn.addEventListener('click', async function() {
            const novoTipo = novoTipoInput.value.trim();
            if (!novoTipo) return;
            
            const sucesso = await adicionarTipoIndice(novoTipo);
            if (sucesso) {
                alert(`Tipo de índice "${novoTipo}" adicionado com sucesso!`);
                novoTipoInput.value = '';
                await carregarIndices();
                atualizarTiposIndices();
            } else {
                alert('Erro ao adicionar tipo de índice ou tipo já existe.');
            }
        });

        // Adicionar novo ano
        function addNewYear() {
            const currentYear = new Date().getFullYear();
            let newYear = currentYear;
            
            while (document.getElementById(`year-${newYear}`)) {
                newYear--;
            }
            
            const row = document.createElement('tr');
            row.id = `year-${newYear}`;
            
            const yearCell = document.createElement('td');
            yearCell.textContent = newYear;
            row.appendChild(yearCell);
            
            for (let i = 1; i <= 12; i++) {
                const monthCell = document.createElement('td');
                monthCell.contentEditable = true;
                monthCell.textContent = '0,00';
                monthCell.addEventListener('blur', validateCell);
                row.appendChild(monthCell);
            }
            
            const actionCell = document.createElement('td');
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Excluir';
            deleteBtn.className = 'btn btn-danger btn-sm';
            deleteBtn.addEventListener('click', () => row.remove());
            actionCell.appendChild(deleteBtn);
            row.appendChild(actionCell);
            
            tableBody.prepend(row);
        }

        // Validar célula editada
        function validateCell(e) {
            const value = e.target.textContent.replace(',', '.');
            if (isNaN(value)) {
                e.target.textContent = '0,00';
                alert('Digite um valor numérico válido');
            } else {
                e.target.textContent = parseFloat(value).toFixed(2).replace('.', ',');
            }
        }

        // Importar dados do Excel
        function importFromExcel() {
            const excelData = prompt('Cole aqui os dados copiados do Excel (com cabeçalhos)');
            if (!excelData) return;
            alert('Funcionalidade de importação será implementada completamente na versão final');
        }

        // Exportar para Excel
        function exportToExcel() {
            let csvContent = "Ano;Jan;Fev;Mar;Abr;Mai;Jun;Jul;Ago;Set;Out;Nov;Dez\n";
            
            document.querySelectorAll('#table-body tr').forEach(row => {
                const rowData = [];
                for (let i = 0; i < 13; i++) {
                    rowData.push(row.cells[i].textContent);
                }
                csvContent += rowData.join(';') + "\n";
            });
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `indices_${indiceAtual}.csv`;
            link.click();
        }

        // Inicializar tabela com dados salvos
        function initializeTable() {
            tableBody.innerHTML = '';
            
            for (const year in ipcaIndices) {
                if (year === 'tipos') continue;
                
                const row = document.createElement('tr');
                row.id = `year-${year}`;
                
                const yearCell = document.createElement('td');
                yearCell.textContent = year;
                row.appendChild(yearCell);
                
                for (let month = 1; month <= 12; month++) {
                    const monthCell = document.createElement('td');
                    monthCell.contentEditable = true;
                    monthCell.textContent = ipcaIndices[year][month].toFixed(2).replace('.', ',');
                    monthCell.addEventListener('blur', validateCell);
                    row.appendChild(monthCell);
                }
                
                const actionCell = document.createElement('td');
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Excluir';
                deleteBtn.className = 'btn btn-danger btn-sm';
                deleteBtn.addEventListener('click', () => row.remove());
                actionCell.appendChild(deleteBtn);
                row.appendChild(actionCell);
                
                tableBody.appendChild(row);
            }
        }

        // Event Listeners
        addYearBtn.addEventListener('click', addNewYear);
        saveBtn.addEventListener('click', async function() {
            const data = {};
            const rows = tableBody.querySelectorAll('tr');
            
            rows.forEach(row => {
                const year = row.cells[0].textContent;
                data[year] = {};
                
                for (let i = 1; i <= 12; i++) {
                    const monthValue = parseFloat(row.cells[i].textContent.replace(',', '.'));
                    data[year][i] = isNaN(monthValue) ? 0 : monthValue;
                }
            });
            
            ipcaIndices = data;
            const sucesso = await salvarIndices();
            
            if (sucesso) {
                alert('Índices salvos com sucesso!');
            } else {
                alert('Erro ao salvar índices. Verifique o console para mais detalhes.');
            }
        });
        
        importBtn.addEventListener('click', importFromExcel);
        exportBtn.addEventListener('click', exportToExcel);

        // Inicializar
        atualizarTiposIndices();
        initializeTable();
    });
}

// Carregar índices quando a página for carregada
document.addEventListener('DOMContentLoaded', carregarIndices);