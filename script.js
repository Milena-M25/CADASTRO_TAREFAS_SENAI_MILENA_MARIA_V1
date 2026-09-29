const campoTarefa = document.getElementById("campo-tarefa");
const botaoAdicionar = document.getElementById("botao-adicionar");
const listaTarefa = document.getElementById("lista-tarefa");
const contadorTarefa = document.getElementById("contador-tarefa");
const botaoTema = document.getElementById("botao-alternar-tema");

let tarefas = [];


// ============================================
// ADICIONAR TAREFA
// ============================================

function adicionarTarefa() {

    const texto = campoTarefa.value.trim();

    if (texto === "") {
        return;
    }

    tarefas.push({
        id: Date.now(),
        texto: texto,
        concluida: false,
        editando: false
    });

    campoTarefa.value = "";

    mostrarTarefas();
}


// Botão adicionar
botaoAdicionar.addEventListener("click", adicionarTarefa);


// Tecla Enter
campoTarefa.addEventListener("keydown", function(event) {

    if (event.key === "Enter") {
        adicionarTarefa();
    }

});


// ============================================
// MOSTRAR TAREFAS
// ============================================

function mostrarTarefas() {

    listaTarefa.innerHTML = "";

    tarefas.forEach(function(tarefa) {

        const item = document.createElement("li");

        item.classList.add("item-tarefa");

        // ====================================
        // TEXTO NORMAL
        // ====================================

        const texto = document.createElement("span");

        texto.classList.add("texto-tarefa");

        texto.textContent = tarefa.texto;


        // Se estiver concluída
        if (tarefa.concluida) {

            texto.style.textDecoration = "line-through";
            texto.style.opacity = "0.5";

        }


        // ====================================
        // BOTÕES
        // ====================================

        const botoes = document.createElement("div");

        botoes.classList.add("acoes-tarefa");


        // ------------------------------------
        // BOTÃO CONCLUIR
        // ------------------------------------

        const botaoConcluir = document.createElement("button");

        botaoConcluir.classList.add("botao-concluir");

        botaoConcluir.title =
            tarefa.concluida
                ? "Desmarcar tarefa"
                : "Concluir tarefa";

        botaoConcluir.innerHTML =
            tarefa.concluida
                ? '<i class="fa-solid fa-circle-check"></i>'
                : '<i class="fa-regular fa-circle-check"></i>';


        botaoConcluir.addEventListener("click", function() {

            concluirTarefa(tarefa.id);

        });

        // ------------------------------------
        // BOTÃO LIXEIRA
        // ------------------------------------

        const botaoExcluir = document.createElement("button");

        botaoExcluir.classList.add("botao-excluir");

        botaoExcluir.title = "Excluir tarefa";

        botaoExcluir.innerHTML =
        '<i class="fa-solid fa-trash-can"></i>';

        botaoExcluir.addEventListener("click", function() {

            excluirTarefa(tarefa.id);

        });


        // Adiciona os botões
        botoes.appendChild(botaoConcluir);
        botoes.appendChild(botaoExcluir);


        // Adiciona tudo na tarefa
        item.appendChild(texto);
        item.appendChild(botoes);

        listaTarefa.appendChild(item);

    });

    atualizarContador();
}


// ============================================
// CONCLUIR TAREFA
// ============================================

function concluirTarefa(id) {

    const tarefa = tarefas.find(function(item) {
        return item.id === id;
    });

    if (!tarefa) {
        return;
    }

    tarefa.concluida = !tarefa.concluida;

    mostrarTarefas();
}

// ============================================
// EXCLUIR TAREFA
// ============================================

function excluirTarefa(id) {

    tarefas = tarefas.filter(function(tarefa) {

        return tarefa.id !== id;

    });

    mostrarTarefas();
}


// ============================================
// CONTADOR
// ============================================

function atualizarContador() {

    const quantidade = tarefas.length;


    if (quantidade === 0) {

        contadorTarefa.textContent =
            "0 tarefas na lista";

    }

    else if (quantidade === 1) {

        contadorTarefa.textContent =
            "1 tarefa na lista";

    }

    else {

        contadorTarefa.textContent =
            quantidade + " tarefas na lista";

    }
}

// ============================================
// MODO ESCURO / CLARO
// ============================================

botaoTema.addEventListener("click", function() {

    document.body.classList.toggle("modo-escuro");

    const icone = botaoTema.querySelector("i");


    if (document.body.classList.contains("modo-escuro")) {

        icone.classList.remove("fa-moon");
        icone.classList.add("fa-sun");

    }

    else {

        icone.classList.remove("fa-sun");
        icone.classList.add("fa-moon");

    }

});


// ============================================
// INICIAR
// ============================================

mostrarTarefas();
