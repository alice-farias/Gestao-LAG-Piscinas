// Inicia o banco de dados SQLite
let db;

async function iniciarBanco() {
    const SQL = await initSqlJs({ locateFile: file => `db/sql-wasm.wasm` });
    db = new SQL.Database();

    // Cria as tabelas se não existirem
    db.run(`
        CREATE TABLE IF NOT EXISTS Clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT,
            email TEXT,
            endereco TEXT,
            detalhes TEXT
        );

        CREATE TABLE IF NOT EXISTS Orcamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER,
            servico TEXT,
            preco REAL,
            detalhes TEXT,
            FOREIGN KEY (cliente_id) REFERENCES Clientes (id)
        );

        CREATE TABLE IF NOT EXISTS Contatos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER,
            nota TEXT,
            prioridade TEXT,
            FOREIGN KEY (cliente_id) REFERENCES Clientes (id)
        );

        CREATE TABLE IF NOT EXISTS Pagamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER,
            valor REAL,
            forma_pagamento TEXT,
            data TEXT,
            pago BOOLEAN,
            FOREIGN KEY (cliente_id) REFERENCES Clientes (id)
        );
    `);
    
    // Adiciona clientes e contatos de exemplo
    adicionarClientesExemplo();
    adicionarContatosExemplo();
    atualizarListas();
}

// Função para adicionar clientes de exemplo
function adicionarClientesExemplo() {
    const clientes = [
        { nome: "João da Silva", email: "joao@example.com", endereco: "Rua A, 123", detalhes: "Cliente VIP" },
        { nome: "Maria Souza", email: "maria@example.com", endereco: "Rua B, 456", detalhes: "Cliente Regular" },
        { nome: "Carlos Pereira", email: "carlos@example.com", endereco: "Rua C, 789", detalhes: "Cliente Ocasional" }
    ];

    clientes.forEach(cliente => {
        db.run("INSERT INTO Clientes (nome, email, endereco, detalhes) VALUES (?, ?, ?, ?)", 
            [cliente.nome, cliente.email, cliente.endereco, cliente.detalhes]);
    });
}

// Função para adicionar contatos de exemplo
function adicionarContatosExemplo() {
    const contatos = [
        { clienteId: 1, nota: "Retornar ligação", prioridade: "Alta" },
        { clienteId: 2, nota: "Enviar proposta", prioridade: "Média" },
        { clienteId: 3, nota: "Acompanhamento", prioridade: "Baixa" }
    ];

    contatos.forEach(contato => {
        db.run("INSERT INTO Contatos (cliente_id, nota, prioridade) VALUES (?, ?, ?)", 
            [contato.clienteId, contato.nota, contato.prioridade]);
    });
}

// Função auxiliar para atualizar todas as listas na interface
function atualizarListas() {
    listarClientes();
    listarOrcamentos();
    listarContatos();
    listarPagamentos();
    listarClientesSelect(); // Atualiza a lista de clientes nos selects
}

// Função para listar clientes nos selects
function listarClientesSelect() {
    const contatoSelect = document.getElementById('contatoClienteId');
    const orcamentoSelect = document.getElementById('orcamentoClienteId');
    const pagamentoSelect = document.getElementById('pagamentoClienteId');

    const clientes = db.exec("SELECT * FROM Clientes");

    // Limpa as opções antes de adicionar
    contatoSelect.innerHTML = '<option value="">Selecione um cliente</option>';
    orcamentoSelect.innerHTML = '<option value="">Selecione um cliente</option>';
    pagamentoSelect.innerHTML = '<option value="">Selecione um cliente</option>';

    if (clientes.length > 0) {
        const rows = clientes[0].values;
        rows.forEach(row => {
            const option = document.createElement('option');
            option.value = row[0]; // ID do cliente
            option.textContent = row[1]; // Nome do cliente

            // Adiciona a opção aos três selects
            contatoSelect.appendChild(option.cloneNode(true));
            orcamentoSelect.appendChild(option.cloneNode(true));
            pagamentoSelect.appendChild(option.cloneNode(true));
        });
    }
}

// Exibe a seção selecionada e oculta as outras
function mostrarSecao(secao) {
    document.querySelectorAll('.secao').forEach(s => s.classList.remove('active'));
    document.getElementById(secao).classList.add('active');
}

// Variável para armazenar o ID do cliente a ser editado
let clienteEditandoId = null;

// Função para cadastrar ou editar um cliente
document.getElementById('formCadastro').addEventListener('submit', function (e) {
    e.preventDefault();
    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;
    const endereco = document.getElementById('endereco').value;
    const detalhes = document.getElementById('detalhes').value;

    if (clienteEditandoId === null) {
        // Cadastrar novo cliente
        db.run("INSERT INTO Clientes (nome, email, endereco, detalhes) VALUES (?, ?, ?, ?)", [nome, email, endereco, detalhes]);
        alert("Cliente cadastrado com sucesso!");
    } else {
        // Atualizar cliente existente
        db.run("UPDATE Clientes SET nome = ?, email = ?, endereco = ?, detalhes = ? WHERE id = ?", [nome, email, endereco, detalhes, clienteEditandoId]);
        alert("Cliente atualizado com sucesso!");
        clienteEditandoId = null; // Resetar o ID de edição
    }

    // Limpa os campos do formulário
    e.target.reset(); 

    atualizarListas();
});

// Função para listar clientes
function listarClientes() {
    const lista = document.getElementById('clientesLista');
    lista.innerHTML = '';
    const clientes = db.exec("SELECT * FROM Clientes");

    if (clientes.length > 0) {
        const rows = clientes[0].values;
        rows.forEach(row => {
            const container = document.createElement('div');
            container.classList.add('lista-item-container'); // Novo container

            const div = document.createElement('div');
            div.textContent = `ID: ${row[0]}, Nome: ${row[1]}, Email: ${row[2]}`;

            const editarBtn = document.createElement('span');
            editarBtn.textContent = 'Editar';
            editarBtn.classList.add('acao', 'btn-editar'); // Adicionando classe para estilização
            editarBtn.onclick = () => editarCliente(row[0]);

            const excluirBtn = document.createElement('span');
            excluirBtn.textContent = 'Excluir';
            excluirBtn.classList.add('acao', 'btn-excluir'); // Adicionando classe para estilização
            excluirBtn.onclick = () => {
                if (confirm("Tem certeza que deseja excluir este cliente?")) {
                    excluirCliente(row[0]);
                }
            };

            container.appendChild(div);
            container.appendChild(editarBtn);
            container.appendChild(excluirBtn);
            lista.appendChild(container);
        });
    }
}

// Função para editar cliente
function editarCliente(id) {
    const cliente = db.exec("SELECT * FROM Clientes WHERE id = ?", [id])[0].values[0];
    document.getElementById('nome').value = cliente[1];
    document.getElementById('email').value = cliente[2];
    document.getElementById('endereco').value = cliente[3];
    document.getElementById('detalhes').value = cliente[4];

    clienteEditandoId = id;
}

// Função para excluir cliente
function excluirCliente(id) {
    db.run("DELETE FROM Clientes WHERE id = ?", [id]);
    alert("Cliente excluído com sucesso!");
    atualizarListas();
}

// Função para cadastrar orçamentos
document.getElementById('formOrcamento').addEventListener('submit', function (e) {
    e.preventDefault();
    const clienteId = document.getElementById('orcamentoClienteId').value;
    const servico = "Serviço Exemplo"; // Certifique-se de que este campo existe ou modifique conforme necessário
    const preco = parseFloat(document.getElementById('orcamentoPreco').value);
    const detalhes = document.getElementById('orcamentoDetalhes').value;

    if (!clienteId) {
        alert("Por favor, selecione um cliente.");
        return;
    }

    db.run("INSERT INTO Orcamentos (cliente_id, servico, preco, detalhes) VALUES (?, ?, ?, ?)", [clienteId, servico, preco, detalhes]);
    alert("Orçamento solicitado com sucesso!");

    atualizarListas();
    e.target.reset();
});

// Função para listar orçamentos
function listarOrcamentos() {
    const lista = document.getElementById('orcamentosLista');
    lista.innerHTML = '';
    const orcamentos = db.exec("SELECT * FROM Orcamentos");

    if (orcamentos.length > 0) {
        const rows = orcamentos[0].values;
        rows.forEach(row => {
            const container = document.createElement('div');
            container.classList.add('lista-item-container'); // Novo container

            const div = document.createElement('div');
            div.textContent = `ID: ${row[0]}, Cliente ID: ${row[1]}, Serviço: ${row[2]}, Preço: R$${row[3].toFixed(2)}`;

            const excluirBtn = document.createElement('span');
            excluirBtn.textContent = 'Excluir';
            excluirBtn.classList.add('acao', 'btn-excluir'); // Adicionando classe para estilização
            excluirBtn.onclick = () => {
                if (confirm("Tem certeza que deseja excluir este orçamento?")) {
                    excluirOrcamento(row[0]);
                }
            };

            container.appendChild(div);
            container.appendChild(excluirBtn);
            lista.appendChild(container);
        });
    }
}

// Função para excluir orçamento
function excluirOrcamento(id) {
    db.run("DELETE FROM Orcamentos WHERE id = ?", [id]);
    alert("Orçamento excluído com sucesso!");
    atualizarListas();
}

// Função para cadastrar ou editar contatos
document.getElementById('formContato').addEventListener('submit', function (e) {
    e.preventDefault();
    const clienteId = document.getElementById('contatoClienteId').value;
    const nota = document.getElementById('notaContato').value;
    const prioridade = document.getElementById('prioridade').value;

    if (!clienteId) {
        alert("Por favor, selecione um cliente.");
        return;
    }

    db.run("INSERT INTO Contatos (cliente_id, nota, prioridade) VALUES (?, ?, ?)", [clienteId, nota, prioridade]);
    alert("Contato cadastrado com sucesso!");

    atualizarListas();
    e.target.reset();
});

// Função para listar contatos
// Função para listar contatos
function listarContatos() {
    const lista = document.getElementById('contatosLista');
    lista.innerHTML = '';
    const contatos = db.exec("SELECT * FROM Contatos");

    if (contatos.length > 0) {
        const rows = contatos[0].values;
        rows.forEach(row => {
            const container = document.createElement('div');
            container.classList.add('lista-item-container');

            const div = document.createElement('div');
            div.textContent = `ID: ${row[0]}, Cliente ID: ${row[1]}, Nota: ${row[2]}`;

            const prioridadeBtn = document.createElement('button');
            prioridadeBtn.classList.add('btn-prioridade', `btn-prioridade-${row[3].toLowerCase()}`); // Garante que a classe seja correta
            prioridadeBtn.textContent = row[3]; // Alta, Média ou Baixa
            prioridadeBtn.onclick = () => editarPrioridade(row[0]);
            

            container.appendChild(div);
            container.appendChild(prioridadeBtn);

            const excluirBtn = document.createElement('span');
            excluirBtn.textContent = 'Excluir';
            excluirBtn.classList.add('acao', 'btn-excluir');
            excluirBtn.onclick = () => {
                if (confirm("Tem certeza que deseja excluir este contato?")) {
                    excluirContato(row[0]);
                }
            };

            container.appendChild(excluirBtn);
            lista.appendChild(container);
        });
    }
}




function editarPrioridade(id) {
    const novaPrioridade = prompt("Insira a nova prioridade (Alta, Média, Baixa):");
    if (novaPrioridade) {
        db.run("UPDATE Contatos SET prioridade = ? WHERE id = ?", [novaPrioridade, id]);
        alert("Prioridade atualizada com sucesso!");
        atualizarListas(); // Isso já chama listarContatos, então a cor deve ser atualizada
    }
}




// Função para excluir contato
function excluirContato(id) {
    db.run("DELETE FROM Contatos WHERE id = ?", [id]);
    alert("Contato excluído com sucesso!");
    atualizarListas();
}

// Funções para listar pagamentos
function listarPagamentos() {
    const lista = document.getElementById('pagamentosLista');
    lista.innerHTML = '';
    const pagamentos = db.exec("SELECT * FROM Pagamentos");

    if (pagamentos.length > 0) {
        const rows = pagamentos[0].values;
        rows.forEach(row => {
            const container = document.createElement('div');
            container.classList.add('lista-item-container'); // Novo container

            const div = document.createElement('div');
            div.textContent = `ID: ${row[0]}, Cliente ID: ${row[1]}, Valor: R$${row[2].toFixed(2)}, Forma: ${row[3]}, Pago: ${row[5] ? 'Sim' : 'Não'}`;

            const excluirBtn = document.createElement('span');
            excluirBtn.textContent = 'Excluir';
            excluirBtn.classList.add('acao', 'btn-excluir'); // Adicionando classe para estilização
            excluirBtn.onclick = () => {
                if (confirm("Tem certeza que deseja excluir este pagamento?")) {
                    excluirPagamento(row[0]);
                }
            };

            container.appendChild(div);
            container.appendChild(excluirBtn);
            lista.appendChild(container);
        });
    }
}

// Função para cadastrar ou editar pagamentos
document.getElementById('formPagamento').addEventListener('submit', function (e) {
    e.preventDefault();
    const clienteId = document.getElementById('pagamentoClienteId').value;
    const valor = parseFloat(document.getElementById('valorPagamento').value);
    const formaPagamento = document.getElementById('pagamentoForma').value;
    const data = new Date().toISOString().split('T')[0]; // Data atual no formato YYYY-MM-DD
    const pago = document.getElementById('pagamentoPago').checked ? 1 : 0; // 1 para pago, 0 para não pago

    if (!clienteId) {
        alert("Por favor, selecione um cliente.");
        return;
    }

    if (isNaN(valor) || valor <= 0) {
        alert("Por favor, insira um valor válido.");
        return;
    }

    db.run("INSERT INTO Pagamentos (cliente_id, valor, forma_pagamento, data, pago) VALUES (?, ?, ?, ?, ?)", 
        [clienteId, valor, formaPagamento, data, pago]);
    
    // Mensagem de sucesso
    alert("Pagamento registrado com sucesso!");

    // Simular um comprovante
    simularComprovante(clienteId, valor, formaPagamento, data);

    atualizarListas();
    e.target.reset();
});

function simularComprovante(clienteId, valor, formaPagamento, data) {
    const cliente = db.exec("SELECT nome FROM Clientes WHERE id = ?", [clienteId])[0].values[0][0];
    
    const comprovante = `
        -------------------------------
        COMPROVANTE DE PAGAMENTO
        -------------------------------
        Cliente: ${cliente}
        Valor: R$${valor.toFixed(2)}
        Forma de Pagamento: ${formaPagamento}
        Data: ${data}
        -------------------------------
        Obrigado pela preferência!
        -------------------------------
    `;

    // Criar um blob com o conteúdo do comprovante
    const blob = new Blob([comprovante], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    // Criar um link temporário para download
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprovante_${clienteId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    alert("Comprovante gerado e baixado com sucesso!");
}

// Função para excluir pagamento
function excluirPagamento(id) {
    db.run("DELETE FROM Pagamentos WHERE id = ?", [id]);
    alert("Pagamento excluído com sucesso!");
    atualizarListas();
}

// Inicia o banco de dados ao carregar a página
window.onload = iniciarBanco;
