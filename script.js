import { ref, push, set, onValue, update, remove } from "firebase/database";
import { database } from "./firebase-config.js";

let accountBalance = 0;
let predictedBalance = 0;

// Teste de conexão com o Firebase
document.addEventListener('DOMContentLoaded', () => {
    const testRef = ref(database, 'testConnection');
    set(testRef, { status: 'connected', timestamp: Date.now() })
        .then(() => console.log('Conexão com o Firebase bem-sucedida! (verifique o nó "testConnection" no banco)'))
        .catch((error) => console.error('Erro ao conectar ao Firebase:', error));
});

// Atualiza o saldo no Firebase
function saveAccountBalanceToDatabase() {
    update(ref(database, 'account'), { balance: accountBalance })
        .then(() => console.log('Saldo salvo com sucesso no Firebase!'))
        .catch((error) => console.error('Erro ao salvar saldo no Firebase:', error));
}

// Carrega o saldo do Firebase
function loadAccountBalanceFromDatabase() {
    onValue(ref(database, 'account/balance'), (snapshot) => {
        if (snapshot.exists()) {
            accountBalance = snapshot.val();
            updateAccountBalance();
        } else {
            console.warn('Saldo não encontrado no Firebase.');
        }
    });
}

// Atualiza o saldo previsto no Firebase
function savePredictedBalanceToDatabase() {
    update(ref(database, 'account'), { predictedBalance })
        .then(() => console.log('Saldo previsto salvo com sucesso no Firebase!'))
        .catch((error) => console.error('Erro ao salvar saldo previsto no Firebase:', error));
}

// Carrega o saldo previsto do Firebase
function loadPredictedBalanceFromDatabase() {
    onValue(ref(database, 'account/predictedBalance'), (snapshot) => {
        if (snapshot.exists()) {
            predictedBalance = snapshot.val();
            updatePredictedBalance();
        } else {
            console.warn('Saldo previsto não encontrado no Firebase.');
        }
    });
}

// Salva pendências no Firebase e retorna a referência
function savePendingTransactionToDatabase(type, value, date, source) {
    const newTransactionRef = push(ref(database, 'pendingTransactions'));
    return set(newTransactionRef, { type, value, date, source }).then(() => newTransactionRef.key);
}

// Remove pendência do Firebase
function removePendingTransactionFromDatabase(key) {
    return remove(ref(database, `pendingTransactions/${key}`));
}

// Carrega pendências do Firebase
function loadPendingTransactionsFromDatabase() {
    onValue(ref(database, 'pendingTransactions'), (snapshot) => {
        const transactions = snapshot.val();
        const pendingList = document.getElementById('pendingList');
        pendingList.innerHTML = '';
        if (transactions) {
            Object.entries(transactions).forEach(([key, { type, value, date, source }]) => {
                addPendingTransaction(type, value, date, source, false, key);
            });
        }
    });
}

// Salva transações confirmadas no Firebase
function saveConfirmedTransactionToDatabase(type, value, date, source) {
    const newTransactionRef = push(ref(database, 'confirmedTransactions'));
    set(newTransactionRef, { type, value, date, source });
}

// Carrega transações confirmadas do Firebase
function loadConfirmedTransactionsFromDatabase() {
    onValue(ref(database, 'confirmedTransactions'), (snapshot) => {
        const transactions = snapshot.val();
        if (transactions) {
            document.querySelector('#incomeTable tbody').innerHTML = '';
            document.querySelector('#expenseTable tbody').innerHTML = '';
            Object.keys(transactions).forEach((key) => {
                const { type, value, date, source } = transactions[key];
                addTransactionToTable(type, value, date, source, false); // Não salva novamente
            });
        }
    });
}

// Salva transações deletadas no Firebase
function saveDeletedTransactionToDatabase(type, value, date, source) {
    const newTransactionRef = push(ref(database, 'deletedTransactions'));
    set(newTransactionRef, { type, value, date, source });
}

// Carrega transações deletadas do Firebase
function loadDeletedTransactionsFromDatabase() {
    onValue(ref(database, 'deletedTransactions'), (snapshot) => {
        const transactions = snapshot.val();
        if (transactions) {
            document.querySelector('#deletedPendingTable tbody').innerHTML = '';
            Object.keys(transactions).forEach((key) => {
                const { type, value, date, source } = transactions[key];
                addDeletedTransactionToTable(type, value, date, source, false); // Não salva novamente
            });
        }
    });
}

function updateAccountBalance() {
    document.getElementById('accountBalance').textContent = accountBalance.toFixed(2);
}

function updatePredictedBalance() {
    document.getElementById('predictedBalance').textContent = predictedBalance.toFixed(2);
}

function calculatePredictedBalance() {
    const pendingItems = document.querySelectorAll('#pendingList li');
    let totalPredicted = accountBalance;

    pendingItems.forEach(item => {
        const text = item.textContent;
        const valueMatch = text.match(/R\$ ([\d.,]+)/);
        const typeMatch = text.includes('Recebido') ? 'Recebido' : 'Retirado';

        if (valueMatch) {
            const value = parseFloat(valueMatch[1].replace(',', '.'));
            if (typeMatch === 'Recebido') {
                totalPredicted += value;
            } else if (typeMatch === 'Retirado') {
                totalPredicted -= value;
            }
        }
    });

    predictedBalance = totalPredicted;
    updatePredictedBalance();
}

function addTransaction(type, value, date, source) {
    // Adiciona a transação confirmada à tabela correspondente
    addTransactionToTable(type, value, date, source);
}

function addTransactionToTable(type, value, date, source, saveToDatabase = true) {
    if (saveToDatabase) saveConfirmedTransactionToDatabase(type, value, date, source);
    const tableId = type === 'Recebido' ? 'incomeTable' : 'expenseTable';
    const tableBody = document.querySelector(`#${tableId} tbody`);
    const row = document.createElement('tr');

    const dateCell = document.createElement('td');
    dateCell.textContent = date;

    const sourceCell = document.createElement('td');
    sourceCell.textContent = source;

    const valueCell = document.createElement('td');
    valueCell.textContent = `R$ ${value.toFixed(2)}`;

    const actionCell = document.createElement('td');
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Excluir';
    deleteButton.style.backgroundColor = '#ff6b6b';
    deleteButton.style.color = '#fff';
    deleteButton.style.border = 'none';
    deleteButton.style.borderRadius = '4px';
    deleteButton.style.padding = '5px 10px';
    deleteButton.style.cursor = 'pointer';
    deleteButton.addEventListener('click', () => {
        tableBody.removeChild(row);
        revertTransaction(type, value);
    });

    actionCell.appendChild(deleteButton);

    row.appendChild(dateCell);
    row.appendChild(sourceCell);
    row.appendChild(valueCell);
    row.appendChild(actionCell);

    tableBody.appendChild(row);
}

function revertTransaction(type, value) {
    if (type === 'Recebido') {
        accountBalance -= value;
    } else if (type === 'Retirado') {
        accountBalance += value;
    }
    updateAccountBalance();
    calculatePredictedBalance();
}

// Modifique a função `addPendingTransaction` para salvar no banco
function addPendingTransaction(type, value, date, source, saveToDatabase = true, firebaseKey = null) {
    console.log('Adicionando pendência:', { type, value, date, source });
    if (saveToDatabase) {
        console.log('Salvando pendência no Firebase...');
        savePendingTransactionToDatabase(type, value, date, source)
            .then(() => console.log('Pendência salva com sucesso!'))
            .catch((error) => console.error('Erro ao salvar pendência no Firebase:', error));
    }
    const pendingList = document.getElementById('pendingList');
    const pendingItem = document.createElement('li');

    // Cria elementos para cada informação
    const typeSpan = document.createElement('span');
    typeSpan.textContent = type;

    const valueSpan = document.createElement('span');
    valueSpan.textContent = `R$${value.toFixed(2)}`; // Removido o espaço entre "R$" e o valor

    const dateSpan = document.createElement('span');
    dateSpan.textContent = date;

    const sourceSpan = document.createElement('span');
    sourceSpan.textContent = source;

    const buttonContainer = document.createElement('div'); // Contêiner para os botões
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '5px'; // Espaçamento entre os botões

    const confirmButton = document.createElement('button');
    confirmButton.textContent = '✔ Confirmar';
    confirmButton.addEventListener('click', () => {
        pendingList.removeChild(pendingItem);
        if (firebaseKey) removePendingTransactionFromDatabase(firebaseKey);

        // Atualiza o saldo atual
        if (type === 'Recebido') {
            accountBalance += value;
        } else if (type === 'Retirado') {
            accountBalance -= value;
        }
        updateAccountBalance();
        saveAccountBalanceToDatabase();

        // Recalcula a previsão de saldo
        calculatePredictedBalance();
        savePredictedBalanceToDatabase();

        // Adiciona a transação confirmada ao relatório
        saveConfirmedTransactionToDatabase(type, value, date, source);
        addTransaction(type, value, date, source);
    });

    const deleteButton = document.createElement('button');
    deleteButton.textContent = '✖ Deletar';
    deleteButton.classList.add('delete');
    deleteButton.addEventListener('click', () => {
        pendingList.removeChild(pendingItem);
        if (firebaseKey) removePendingTransactionFromDatabase(firebaseKey);
        saveDeletedTransactionToDatabase(type, value, date, source);

        // Adiciona a transação deletada ao relatório
        addDeletedPendingTransaction(type, value, date, source);

        // Recalcula a previsão de saldo
        calculatePredictedBalance();
        savePredictedBalanceToDatabase();
    });

    // Adiciona os botões ao contêiner
    buttonContainer.appendChild(confirmButton);
    buttonContainer.appendChild(deleteButton);

    // Adiciona os elementos ao item da lista
    pendingItem.appendChild(typeSpan);
    pendingItem.appendChild(valueSpan);
    pendingItem.appendChild(dateSpan);
    pendingItem.appendChild(sourceSpan);
    pendingItem.appendChild(buttonContainer);

    // Adiciona o item à lista e organiza por data
    pendingList.appendChild(pendingItem);
    sortPendingListByDate();

    // Salva no banco apenas se for uma nova pendência
    if (saveToDatabase) {
        savePendingTransactionToDatabase(type, value, date, source)
            .then((key) => {
                // Salva o key para futuras remoções
                pendingItem.dataset.firebaseKey = key;
            })
            .catch((error) => console.error('Erro ao salvar pendência no Firebase:', error));
    } else if (firebaseKey) {
        pendingItem.dataset.firebaseKey = firebaseKey;
    }
}

function sortPendingListByDate() {
    const pendingList = document.getElementById('pendingList');
    const items = Array.from(pendingList.children);

    items.sort((a, b) => {
        const dateA = new Date(a.textContent.match(/Data: (\d{4}-\d{2}-\d{2})/)[1]);
        const dateB = new Date(b.textContent.match(/Data: (\d{4}-\d{2}-\d{2})/)[1]);
        return dateA - dateB;
    });

    items.forEach(item => pendingList.appendChild(item));
}

function addDeletedPendingTransaction(type, value, date, source) {
    const deletedPendingTableBody = document.querySelector('#deletedPendingTable tbody');
    const row = document.createElement('tr');

    const dateCell = document.createElement('td');
    dateCell.textContent = date;

    const sourceCell = document.createElement('td');
    sourceCell.textContent = source;

    const valueCell = document.createElement('td');
    valueCell.textContent = `R$ ${value.toFixed(2)}`;

    const typeCell = document.createElement('td');
    typeCell.textContent = type;

    row.appendChild(dateCell);
    row.appendChild(sourceCell);
    row.appendChild(valueCell);
    row.appendChild(typeCell);

    deletedPendingTableBody.appendChild(row);
}

const closedMonths = [];

function closeCurrentMonth() {
    const currentDate = new Date();
    const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    // Salva os dados do mês atual
    const closedMonthData = {
        month: monthKey,
        income: Array.from(document.querySelectorAll('#incomeTable tbody tr')).map(row => ({
            date: row.children[0].textContent,
            source: row.children[1].textContent,
            value: row.children[2].textContent
        })),
        expenses: Array.from(document.querySelectorAll('#expenseTable tbody tr')).map(row => ({
            date: row.children[0].textContent,
            source: row.children[1].textContent,
            value: row.children[2].textContent
        })),
        deleted: Array.from(document.querySelectorAll('#deletedPendingTable tbody tr')).map(row => ({
            date: row.children[0].textContent,
            source: row.children[1].textContent,
            value: row.children[2].textContent,
            type: row.children[3].textContent
        })),
        finalBalance: accountBalance // Salva o saldo encerrado
    };

    closedMonths.push(closedMonthData);

    // Atualiza a lista de meses encerrados
    updateClosedMonthsList();

    // Limpa os dados do mês atual
    document.querySelector('#incomeTable tbody').innerHTML = '';
    document.querySelector('#expenseTable tbody').innerHTML = '';
    document.querySelector('#deletedPendingTable tbody').innerHTML = '';
    document.getElementById('pendingList').innerHTML = '';
    accountBalance = 0;
    predictedBalance = 0;
    updateAccountBalance();
    updatePredictedBalance();
}

function updateClosedMonthsList() {
    const closedMonthsList = document.getElementById('closedMonthsList');
    closedMonthsList.innerHTML = '';

    closedMonths.forEach(month => {
        const listItem = document.createElement('li');
        listItem.textContent = `Mês: ${month.month} | Saldo Encerrado: R$ ${month.finalBalance.toFixed(2)}`;
        listItem.addEventListener('click', () => {
            viewClosedMonthReport(month);
        });
        closedMonthsList.appendChild(listItem);
    });
}

let editingMonth = null;

function viewClosedMonthReport(month) {
    editingMonth = month;
    const editMonthContainer = document.getElementById('editMonthContainer');
    editMonthContainer.classList.add('visible');

    populateEditableTables(month);
}

function populateEditableTables(month) {
    const editIncomeTableBody = document.querySelector('#editIncomeTable tbody');
    const editExpenseTableBody = document.querySelector('#editExpenseTable tbody');
    const editDeletedTableBody = document.querySelector('#editDeletedTable tbody');

    editIncomeTableBody.innerHTML = '';
    editExpenseTableBody.innerHTML = '';
    editDeletedTableBody.innerHTML = '';

    month.income.forEach(entry => {
        const row = createEditableRow(entry.date, entry.source, entry.value, 'income');
        editIncomeTableBody.appendChild(row);
    });

    month.expenses.forEach(entry => {
        const row = createEditableRow(entry.date, entry.source, entry.value, 'expense');
        editExpenseTableBody.appendChild(row);
    });

    month.deleted.forEach(entry => {
        const row = createEditableRow(entry.date, entry.source, entry.value, 'deleted', entry.type);
        editDeletedTableBody.appendChild(row);
    });
}

function createEditableRow(date, source, value, type, extra = '') {
    const row = document.createElement('tr');

    const dateCell = document.createElement('td');
    const sourceCell = document.createElement('td');
    const valueCell = document.createElement('td');
    const actionCell = document.createElement('td');

    dateCell.textContent = date;
    sourceCell.textContent = source;
    valueCell.textContent = value;

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Deletar';
    deleteButton.style.backgroundColor = '#ff3b30';
    deleteButton.style.color = '#fff';
    deleteButton.style.border = 'none';
    deleteButton.style.borderRadius = '4px';
    deleteButton.style.padding = '5px 10px';
    deleteButton.style.cursor = 'pointer';
    deleteButton.addEventListener('click', () => {
        row.remove();
    });

    actionCell.appendChild(deleteButton);
    row.appendChild(dateCell);
    row.appendChild(sourceCell);
    row.appendChild(valueCell);

    if (type === 'deleted') {
        const typeCell = document.createElement('td');
        typeCell.textContent = extra;
        row.appendChild(typeCell);
    }

    row.appendChild(actionCell);
    return row;
}

function saveEditedMonth() {
    if (!editingMonth) return;

    const editIncomeTableBody = document.querySelector('#editIncomeTable tbody');
    const editExpenseTableBody = document.querySelector('#editExpenseTable tbody');
    const editDeletedTableBody = document.querySelector('#editDeletedTable tbody');

    editingMonth.income = Array.from(editIncomeTableBody.children).map(row => ({
        date: row.children[0].textContent,
        source: row.children[1].textContent,
        value: row.children[2].textContent
    }));

    editingMonth.expenses = Array.from(editExpenseTableBody.children).map(row => ({
        date: row.children[0].textContent,
        source: row.children[1].textContent,
        value: row.children[2].textContent
    }));

    editingMonth.deleted = Array.from(editDeletedTableBody.children).map(row => ({
        date: row.children[0].textContent,
        source: row.children[1].textContent,
        value: row.children[2].textContent,
        type: row.children[3]?.textContent || ''
    }));

    alert('Alterações salvas com sucesso!');
    document.getElementById('editMonthContainer').classList.remove('visible');
    editingMonth = null;
}

// Verifique se os elementos HTML existem antes de adicionar eventos
document.addEventListener('DOMContentLoaded', () => {
    const registerButton = document.getElementById('registerButton');
    const reportButton = document.getElementById('reportButton');
    const closeMonthButton = document.getElementById('closeMonthButton');

    if (registerButton) {
        registerButton.addEventListener('click', () => {
            const value = parseFloat(document.getElementById('value').value);
            const date = document.getElementById('date').value;
            const source = document.getElementById('source').value;
            const type = document.getElementById('transactionType').value;

            if (!isNaN(value) && date && source) {
                addPendingTransaction(type, value, date, source);

                // Recalcula a previsão de saldo
                calculatePredictedBalance();

                // Limpa os campos do formulário após o cadastro
                document.getElementById('value').value = '';
                document.getElementById('date').value = '';
                document.getElementById('source').value = '';
                document.getElementById('transactionType').value = 'Recebido';
            }
        });
    }

    if (reportButton) {
        reportButton.addEventListener('click', () => {
            const reportContainer = document.getElementById('reportContainer');
            reportContainer.classList.toggle('visible');
        });
    }

    if (closeMonthButton) {
        closeMonthButton.addEventListener('click', () => {
            closeCurrentMonth();
        });
    }

    // Carregar dados do Firebase
    loadAccountBalanceFromDatabase();
    loadPredictedBalanceFromDatabase();
    loadPendingTransactionsFromDatabase();
    loadConfirmedTransactionsFromDatabase();
    loadDeletedTransactionsFromDatabase();
});

// Carregar dados ao iniciar
document.addEventListener('DOMContentLoaded', () => {
    loadAccountBalanceFromDatabase();
    loadPredictedBalanceFromDatabase();
    loadPendingTransactionsFromDatabase();
    loadConfirmedTransactionsFromDatabase();
    loadDeletedTransactionsFromDatabase();
});