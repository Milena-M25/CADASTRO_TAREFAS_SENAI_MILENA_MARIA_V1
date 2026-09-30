const campoTarefa = document.getElementById('campo-tarefa');
const botaoAdicionar = document.getElementById('botao-adicionar');
const listaTarefas = document.getElementById('lista-tarefas');
const contadorTarefas = document.getElementById('contador-tarefas');
const botaoAlternarTema = document.getElementById('botao-alternar-tema');

let totalDeTarefas = 0;

function adicionarTarefa() {
    const textoTarefa = campoTarefa.value.trim();

    if (textoTarefa === '') {
        alert('Por favor, digite uma tarefa!');
        return;
    }

    const itemLista = document.createElement('li');
    itemLista.className = 'item-tarefa';

    itemLista.innerHTML = `
        <span>${textoTarefa}</span>
        <div class="acoes-tarefa">
            <button class="botao-acao concluir"><i class="fa-regular fa-circle-check"></i></button>
            <button class="botao-acao excluir"><i class="fa-solid fa-trash"></i></button>
        </div>
    `;

    itemLista.querySelector('.concluir').addEventListener('click', () => {
        itemLista.classList.toggle('concluido');
    });

    itemLista.querySelector('.excluir').addEventListener('click', () => {
        itemLista.remove();
        totalDeTarefas--;
        atualizarContador();
    });

    listaTarefas.appendChild(itemLista);
    campoTarefa.value = '';
    totalDeTarefas++;
    atualizarContador();
}

function atualizarContador() {
    contadorTarefas.textContent = `${totalDeTarefas} ${totalDeTarefas === 1 ? 'tarefa' : 'tarefas'} na lista`;
}

botaoAlternarTema.addEventListener('click', () => {
    document.body.classList.toggle('modo-escuro');
    const iconeTema = botaoAlternarTema.querySelector('i');
    iconeTema.classList.toggle('fa-moon');
    iconeTema.classList.toggle('fa-sun');
});

botaoAdicionar.addEventListener('click', adicionarTarefa);

campoTarefa.addEventListener('keypress', (evento) => {
    if (evento.key === 'Enter') {
        adicionarTarefa();
    }
});