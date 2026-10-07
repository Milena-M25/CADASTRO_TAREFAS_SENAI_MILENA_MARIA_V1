
const campoTarefa = document.getElementById('campo-tarefa');
const botaoAdicionar = document.getElementById('botao-adicionar');
const listaTarefas = document.getElementById('lista-tarefas');
const contadorTarefas = document.getElementById('contador-tarefas');
const contadorConcluidas = document.getElementById('contador-concluidas');
const botaoAlternarTema = document.getElementById('botao-alternar-tema');
const campoPesquisa = document.getElementById('campo-pesquisa');
const botaoLimpar = document.getElementById('botao-limpar');

botaoAdicionar.addEventListener('click', adicionarTarefa);

campoTarefa.addEventListener('keypress', function(evento) {
    if (evento.key === 'Enter') {
        adicionarTarefa();
    }
});
let totalDeTarefas = 0;

function adicionarTarefa() {
    if (!campoTarefa || !listaTarefas) {
        return;
    }

    const texto = campoTarefa.value.trim();

    if (texto === '') {
        alert('Por favor, digite uma tarefa!');
        return;
    }

    const itemLista = document.createElement('li');
    itemLista.classList.add('item-tarefa');

    itemLista.innerHTML = ` 
        <span class="texto-tarefa">${texto}</span> 
        <div class="acoes-tarefa"> 
            <button class="botao-acao concluir">
                <i class="fa-regular fa-circle-check"></i>
            </button> 
            <button class="botao-acao editar" title="Editar tarefa">
                <i class="fa-solid fa-pen"></i>
            </button> 
            <button class="botao-acao excluir">
                <i class="fa-solid fa-trash"></i>
            </button> 
        </div> 
    `;

    const botaoConcluir = itemLista.querySelector('.concluir');

    botaoConcluir.addEventListener('click', function () {
        itemLista.classList.toggle('concluido');
        atualizarConcluidas();
        salvarTarefas();
    });

    const botaoEditar = itemLista.querySelector('.editar');

    botaoEditar.addEventListener('click', function () {
        const textoAtual = itemLista
            .querySelector('.texto-tarefa')
            .textContent;

        const novoTexto = prompt(
            'Digite o novo nome da tarefa:',
            textoAtual
        );

        if (novoTexto !== null && novoTexto.trim() !== '') {
            itemLista.querySelector('.texto-tarefa').textContent =
                novoTexto.trim();

            salvarTarefas();
        }
    });

    const botaoExcluir = itemLista.querySelector('.excluir');

    botaoExcluir.addEventListener('click', function () {
        itemLista.remove();

        totalDeTarefas--;

        atualizarContador();
        atualizarConcluidas();
        salvarTarefas();
    });

    listaTarefas.appendChild(itemLista);

    campoTarefa.value = '';

    totalDeTarefas++;

    atualizarContador();
    atualizarConcluidas();
    salvarTarefas();
}

function atualizarContador() {
    if (!contadorTarefas) {
        return;
    }

    if (totalDeTarefas === 1) {
        contadorTarefas.textContent = '1 tarefa na lista';
    } else {
        contadorTarefas.textContent =
            totalDeTarefas + ' tarefas na lista';
    }
}

function atualizarConcluidas() {
    if (!contadorConcluidas || !listaTarefas) {
        return;
    }

    const tarefasConcluidas =
        listaTarefas.querySelectorAll(
            '.item-tarefa.concluido'
        ).length;

    if (tarefasConcluidas === 1) {
        contadorConcluidas.textContent = '1 concluída';
    } else {
        contadorConcluidas.textContent =
            tarefasConcluidas + ' concluídas';
    }
}

function pesquisarTarefas() {
    if (!campoPesquisa) {
        return;
    }

    const pesquisa = campoPesquisa.value
        .toLowerCase()
        .trim();

    const tarefas =
        listaTarefas.querySelectorAll('.item-tarefa');

    tarefas.forEach(function (tarefa) {
        const texto = tarefa
            .querySelector('.texto-tarefa')
            .textContent
            .toLowerCase();

        tarefa.style.display =
            texto.includes(pesquisa)
                ? 'flex'
                : 'none';
    });
}

function limparTodasAsTarefas() {
    if (totalDeTarefas === 0) {
        alert('Não existem tarefas para limpar.');
        return;
    }

    const confirmar = confirm(
        'Tem certeza que deseja excluir todas as tarefas?'
    );

    if (!confirmar) {
        return;
    }

    listaTarefas.innerHTML = '';

    totalDeTarefas = 0;

    atualizarContador();
    atualizarConcluidas();
    salvarTarefas();
}

function salvarTarefas() {
    const tarefas = [];

    const itens =
        listaTarefas.querySelectorAll('.item-tarefa');

    itens.forEach(function (item) {
        tarefas.push({
            texto: item
                .querySelector('.texto-tarefa')
                .textContent
                .trim(),

            concluido:
                item.classList.contains('concluido')
        });
    });

    localStorage.setItem(
        'minhasTarefas',
        JSON.stringify(tarefas)
    );
}

function carregarTarefas() {
    const dados =
        localStorage.getItem('minhasTarefas');

    if (!dados) {
        atualizarContador();
        atualizarConcluidas();
        return;
    }

    const tarefasSalvas = JSON.parse(dados);

    tarefasSalvas.forEach(function (tarefa) {
        campoTarefa.value = tarefa.texto;

        adicionarTarefa();

        const ultimaTarefa =
            listaTarefas.lastElementChild;

        if (tarefa.concluido) {
            ultimaTarefa.classList.add('concluido');
        }
    });

    campoTarefa.value = '';

    atualizarContador();
    atualizarConcluidas();
}

if (botaoAdicionar) {
    botaoAdicionar.addEventListener(
        'click',
        adicionarTarefa
    );
}

if (campoTarefa) {
    campoTarefa.addEventListener(
        'keypress',
        function (evento) {
            if (evento.key === 'Enter') {
                adicionarTarefa();
            }
        }
    );
}

if (campoPesquisa) {
    campoPesquisa.addEventListener(
        'input',
        pesquisarTarefas
    );
}

if (botaoLimpar) {
    botaoLimpar.addEventListener(
        'click',
        limparTodasAsTarefas
    );
}

if (botaoAlternarTema) {
    botaoAlternarTema.addEventListener(
        'click',
        function () {
            document.body.classList.toggle(
                'modo-escuro'
            );

            const icone =
                botaoAlternarTema.querySelector('i');

            if (icone) {
                icone.classList.toggle('fa-moon');
                icone.classList.toggle('fa-sun');
            }
        }
    );
}

carregarTarefas();
