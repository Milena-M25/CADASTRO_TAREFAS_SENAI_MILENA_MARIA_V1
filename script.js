
const $ = (id) => document.getElementById(id);

const campoTarefa = $("campo-tarefa");
const formulario = $("formulario-tarefa");
const listaTarefas = $("lista-tarefas");
const campoPesquisa = $("campo-pesquisa");
const filtroStatus = $("filtro-status");
const filtroOrdem = $("filtro-ordem");
const filtroPrioridade = $("filtro-prioridade");
const botaoFuncoes = $("botao-funcoes");
const listaFuncoes = $("lista-funcoes");

const CHAVE = "senai_painel_tarefas_elegante";
const CHAVE_HISTORICO = "senai_painel_historico";

let tarefas = carregarJSON(CHAVE, []);
let historico = carregarJSON(CHAVE_HISTORICO, []);
let idEmEdicao = null;
let intervaloPomodoro = null;
let segundosRestantes = 25 * 60;
let temporizadorNotificacao = null;
let mostrarLixeira = false;
let idsAvisados = new Set();

/* FUNÇÕES AUXILIARES */

function carregarJSON(chave, padrao) {
  try {
    const dados = JSON.parse(localStorage.getItem(chave));

    return Array.isArray(padrao)
      ? (Array.isArray(dados) ? dados : padrao)
      : (dados ?? padrao);
  } catch {
    return padrao;
  }
}

function salvarTarefas() {
  localStorage.setItem(CHAVE, JSON.stringify(tarefas));
  localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(historico));
}

function mostrarNotificacao(mensagem) {
  const caixa = $("notificacao");

  caixa.textContent = mensagem;
  caixa.classList.remove("escondido");

  clearTimeout(temporizadorNotificacao);

  temporizadorNotificacao = setTimeout(() => {
    caixa.classList.add("escondido");
  }, 3500);
}

function gerarId() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8);
}

function dataLocalISO(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function dataParaTexto(valor) {
  if (!valor) return "";

  const [ano, mes, dia] = valor.split("-").map(Number);

  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR");
}

function ehAtrasada(tarefa) {
  return Boolean(
    tarefa.prazo &&
    !tarefa.concluida &&
    !tarefa.excluida &&
    tarefa.prazo < dataLocalISO()
  );
}

function tarefasAtivas() {
  return tarefas.filter(t => !t.excluida);
}

function prioridadesNumero(valor) {
  return { alta: 3, media: 2, baixa: 1 }[valor] || 2;
}

function criarBotao(icone, classe, titulo, acao) {
  const botao = document.createElement("button");

  botao.type = "button";
  botao.className = `acao-tarefa ${classe}`;
  botao.title = titulo;
  botao.setAttribute("aria-label", titulo);

  const i = document.createElement("i");
  i.className = icone;

  botao.appendChild(i);
  botao.addEventListener("click", acao);

  return botao;
}

/* 1, 3, 4, 6 E 8 — ADICIONAR E EDITAR TAREFAS */

formulario.addEventListener("submit", evento => {
  evento.preventDefault();

  const texto = campoTarefa.value.trim();

  if (!texto) {
    mostrarNotificacao("Digite o nome da tarefa.");
    return;
  }

  const prioridade = $("campo-prioridade").value;
  const prazo = $("campo-prazo").value;

  const subtarefas = $("campo-subtarefas").value
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .map(texto => ({
      id: gerarId(),
      texto,
      concluida: false
    }));

  if (idEmEdicao !== null) {
    const tarefa = tarefas.find(t => t.id === idEmEdicao);

    if (tarefa) {
      tarefa.texto = texto;
      tarefa.prioridade = prioridade;
      tarefa.prazo = prazo;

      if ($("campo-subtarefas").value.trim()) {
        tarefa.subtarefas = subtarefas;
      }
    }

    cancelarEdicao();
    mostrarNotificacao("Tarefa atualizada com sucesso.");
  } else {
    tarefas.unshift({
      id: gerarId(),
      texto,
      concluida: false,
      favorita: false,
      criadaEm: Date.now(),
      prioridade,
      prazo,
      subtarefas,
      excluida: false,
      concluidaEm: null
    });

    formulario.reset();
    $("campo-prioridade").value = "media";

    mostrarNotificacao("Sua nova tarefa foi adicionada.");
  }

  salvarTarefas();
  renderizarTarefas();
  renderizarCalendario();
  atualizarHistorico();
  verificarAtrasadas();
});

function editarTarefa(id) {
  const tarefa = tarefas.find(t => t.id === id && !t.excluida);

  if (!tarefa) return;

  idEmEdicao = id;
  campoTarefa.value = tarefa.texto;

  $("campo-prioridade").value = tarefa.prioridade || "media";
  $("campo-prazo").value = tarefa.prazo || "";

  $("campo-subtarefas").value =
    (tarefa.subtarefas || []).map(s => s.texto).join(", ");

  $("titulo-formulario").textContent = "Editar tarefa";

  $("botao-adicionar").innerHTML =
    '<i class="fa-regular fa-floppy-disk"></i> Salvar alterações';

  $("botoes-edicao").classList.remove("escondido");

  $("secao-formulario").scrollIntoView({
    behavior: "smooth"
  });

  campoTarefa.focus();
}

function cancelarEdicao() {
  idEmEdicao = null;

  formulario.reset();

  $("campo-prioridade").value = "media";
  $("titulo-formulario").textContent = "Nova tarefa";

  $("botao-adicionar").innerHTML =
    '<i class="fa-solid fa-plus"></i> Adicionar';

  $("botoes-edicao").classList.add("escondido");
}

$("botao-cancelar-edicao").addEventListener(
  "click",
  cancelarEdicao
);

/* 7 — CONCLUIR TAREFAS E REGISTRAR O HISTÓRICO */

function alternarConclusao(id) {
  const tarefa = tarefas.find(t => t.id === id && !t.excluida);

  if (!tarefa) return;

  tarefa.concluida = !tarefa.concluida;

  if (tarefa.concluida) {
    tarefa.concluidaEm = Date.now();

    historico.unshift({
      id: gerarId(),
      tarefaId: tarefa.id,
      texto: tarefa.texto,
      data: tarefa.concluidaEm
    });

    mostrarNotificacao("Tarefa concluída! ✨");
  } else {
    tarefa.concluidaEm = null;

    historico = historico.filter(
      h => h.tarefaId !== tarefa.id
    );

    mostrarNotificacao("Tarefa voltou para pendentes.");
  }

  salvarTarefas();
  renderizarTarefas();
  atualizarHistorico();
  renderizarCalendario();
}

/* 9 — FAVORITAR TAREFAS */

function alternarFavorita(id) {
  const tarefa = tarefas.find(t => t.id === id);

  if (!tarefa) return;

  tarefa.favorita = !tarefa.favorita;

  salvarTarefas();
  renderizarTarefas();

  mostrarNotificacao(
    tarefa.favorita
      ? "Adicionada às favoritas."
      : "Removida das favoritas."
  );
}

/* 10 — DUPLICAR TAREFAS */

function duplicarTarefa(id) {
  const tarefa = tarefas.find(
    t => t.id === id && !t.excluida
  );

  if (!tarefa) return;

  const copia = {
    ...tarefa,
    id: gerarId(),
    texto: `${tarefa.texto} (cópia)`,
    criadaEm: Date.now(),
    concluida: false,
    concluidaEm: null,
    favorita: false,
    excluida: false,

    subtarefas: (tarefa.subtarefas || []).map(s => ({
      ...s,
      id: gerarId(),
      concluida: false
    }))
  };

  tarefas.unshift(copia);

  salvarTarefas();
  renderizarTarefas();

  mostrarNotificacao("Tarefa duplicada.");
}

/* 8 — MARCAR SUBTAREFAS */

function alternarSubtarefa(tarefaId, subtarefaId, marcada) {
  const tarefa = tarefas.find(t => t.id === tarefaId);

  const subtarefa = tarefa?.subtarefas?.find(
    s => s.id === subtarefaId
  );

  if (!subtarefa) return;

  subtarefa.concluida = marcada;

  salvarTarefas();
  renderizarTarefas();
}

function criarEtiqueta(texto, classe = "") {
  const span = document.createElement("span");

  span.className = `etiqueta ${classe}`.trim();
  span.textContent = texto;

  return span;
}

/* 1, 2, 3, 4, 5, 8 E 9 — PESQUISAR, FILTRAR E MOSTRAR TAREFAS */

function renderizarTarefas() {
  listaTarefas.innerHTML = "";

  let visiveis = tarefasAtivas();

  if (mostrarLixeira) {
    $("titulo-lista").textContent = "Tarefas na lixeira";

    $("botao-sair-lixeira").classList.remove("escondido");
    $("filtro-status").disabled = true;
    $("filtro-prioridade").disabled = true;

    listaTarefas.classList.add("escondido");
    $("mensagem-vazia").classList.add("escondido");
    $("secao-lixeira").classList.remove("escondido");

    renderizarLixeira();
    return;
  }

  $("titulo-lista").textContent = "Lista de tarefas";

  $("botao-sair-lixeira").classList.add("escondido");
  $("filtro-status").disabled = false;
  $("filtro-prioridade").disabled = false;

  listaTarefas.classList.remove("escondido");
  $("secao-lixeira").classList.add("escondido");

  const pesquisa = campoPesquisa.value
    .trim()
    .toLocaleLowerCase("pt-BR");

  const status = filtroStatus.value;
  const prioridade = filtroPrioridade.value;
  const ordem = filtroOrdem.value;

  visiveis = visiveis.filter(t => {
    const textoCombina = t.texto
      .toLocaleLowerCase("pt-BR")
      .includes(pesquisa);

    const statusCombina =
      status === "todas" ||
      (status === "pendentes" && !t.concluida) ||
      (status === "concluidas" && t.concluida) ||
      (status === "favoritas" && t.favorita) ||
      (status === "atrasadas" && ehAtrasada(t));

    const prioridadeCombina =
      prioridade === "todas" ||
      (t.prioridade || "media") === prioridade;

    return textoCombina && statusCombina && prioridadeCombina;
  });

  /* 5 — ORDENAÇÃO */

  if (ordem === "recentes") {
    visiveis.sort((a, b) => b.criadaEm - a.criadaEm);
  }

  if (ordem === "antigas") {
    visiveis.sort((a, b) => a.criadaEm - b.criadaEm);
  }

  if (ordem === "alfabetica") {
    visiveis.sort(
      (a, b) => a.texto.localeCompare(b.texto, "pt-BR")
    );
  }

  if (ordem === "conclusao") {
    visiveis.sort(
      (a, b) => Number(b.concluida) - Number(a.concluida)
    );
  }

  if (ordem === "prazo") {
    visiveis.sort(
      (a, b) => (a.prazo || "9999-99-99")
        .localeCompare(b.prazo || "9999-99-99")
    );
  }

  if (ordem === "prioridade") {
    visiveis.sort(
      (a, b) =>
        prioridadesNumero(b.prioridade) -
        prioridadesNumero(a.prioridade)
    );
  }

  visiveis.forEach(tarefa => {
    const item = document.createElement("li");
    item.className = "tarefa";

    if (tarefa.concluida) {
      item.classList.add("tarefa-concluida");
    }

    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.className = "checkbox-tarefa";
    checkbox.checked = tarefa.concluida;
    checkbox.setAttribute("aria-label", "Marcar como concluída");

    checkbox.addEventListener("change", () => {
      alternarConclusao(tarefa.id);
    });

    const conteudo = document.createElement("div");
    conteudo.className = "conteudo-tarefa";

    const texto = document.createElement("span");
    texto.className = "texto-tarefa";
    texto.textContent = tarefa.texto;

    conteudo.appendChild(texto);

    const meta = document.createElement("div");
    meta.className = "meta-tarefa";

    const prio = tarefa.prioridade || "media";

    meta.appendChild(
      criarEtiqueta(`Prioridade ${prio}`, prio)
    );

    if (tarefa.prazo) {
      meta.appendChild(
        criarEtiqueta(`Entrega: ${dataParaTexto(tarefa.prazo)}`)
      );
    }

    if (ehAtrasada(tarefa)) {
      meta.appendChild(
        criarEtiqueta("Atrasada", "atrasada")
      );
    }

    if (tarefa.subtarefas?.length) {
      const feitas = tarefa.subtarefas.filter(
        s => s.concluida
      ).length;

      meta.appendChild(
        criarEtiqueta(
          `${feitas}/${tarefa.subtarefas.length} subtarefas`
        )
      );
    }

    conteudo.appendChild(meta);

    /* Lista de subtarefas */

    if (tarefa.subtarefas?.length) {
      const subs = document.createElement("div");
      subs.className = "subtarefas";

      tarefa.subtarefas.forEach(sub => {
        const linha = document.createElement("label");

        linha.className =
          `subtarefa${sub.concluida ? " concluida" : ""}`;

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = Boolean(sub.concluida);

        cb.addEventListener("change", () => {
          alternarSubtarefa(
            tarefa.id,
            sub.id,
            cb.checked
          );
        });

        const st = document.createElement("span");
        st.textContent = sub.texto;

        linha.append(cb, st);
        subs.appendChild(linha);
      });

      conteudo.appendChild(subs);
    }

    /* Ações da tarefa */

    const acoes = document.createElement("div");
    acoes.className = "acoes-tarefa";

    acoes.append(
      criarBotao(
        tarefa.favorita
          ? "fa-solid fa-star"
          : "fa-regular fa-star",
        "botao-favorito" + (tarefa.favorita ? " ativo" : ""),
        tarefa.favorita
          ? "Remover favorita"
          : "Adicionar favorita",
        () => alternarFavorita(tarefa.id)
      ),

      criarBotao(
        "fa-regular fa-copy",
        "botao-duplicar",
        "Duplicar tarefa",
        () => duplicarTarefa(tarefa.id)
      ),

      criarBotao(
        "fa-regular fa-pen-to-square",
        "botao-editar",
        "Editar",
        () => editarTarefa(tarefa.id)
      ),

      criarBotao(
        "fa-regular fa-trash-can",
        "botao-excluir",
        "Mover para lixeira",
        () => moverParaLixeira(tarefa.id)
      )
    );

    item.append(checkbox, conteudo, acoes);
    listaTarefas.appendChild(item);
  });

  $("mensagem-vazia").classList.toggle(
    "escondido",
    visiveis.length > 0
  );

  atualizarResumo();
  atualizarConquistas();
}

[campoPesquisa, filtroStatus, filtroOrdem, filtroPrioridade]
  .forEach(el => {
    el.addEventListener(
      el.tagName === "INPUT" ? "input" : "change",
      renderizarTarefas
    );
  });

/* 7 E 17 — ESTATÍSTICAS, PROGRESSO E META DIÁRIA */

function atualizarResumo() {
  const ativas = tarefasAtivas();

  const concluidas = ativas.filter(t => t.concluida).length;
  const pendentes = ativas.length - concluidas;

  $("contador-tarefas").textContent = ativas.length;
  $("contador-concluidas").textContent = concluidas;
  $("contador-pendentes").textContent = pendentes;

  const porcentagem = ativas.length
    ? Math.round(concluidas / ativas.length * 100)
    : 0;

  $("porcentagem-progresso").textContent = `${porcentagem}%`;

  $("progresso-preenchido").style.width =
    `${porcentagem}%`;

  $("mensagem-progresso").textContent =
    !ativas.length
      ? "Toda conquista começa com o primeiro passo."
      : porcentagem === 100
        ? "Parabéns! Você concluiu todas as tarefas! ✨"
        : "Continue assim. Você está avançando!";

  const meta = Math.max(
    1,
    Number($("campo-meta").value) || 3
  );

  const hoje = dataLocalISO();

  const concluidasHoje = historico.filter(h =>
    dataLocalISO(new Date(h.data)) === hoje
  ).length;

  $("texto-meta").textContent =
    `${Math.min(concluidasHoje, meta)} de ${meta} concluídas hoje`;

  $("progresso-meta").style.width =
    `${Math.min(100, concluidasHoje / meta * 100)}%`;
}

$("campo-meta").addEventListener("change", () => {
  const valor = Math.max(
    1,
    Math.min(100, Number($("campo-meta").value) || 3)
  );

  $("campo-meta").value = valor;

  localStorage.setItem("senai_meta_diaria", String(valor));

  atualizarResumo();
});

const metaSalva = Number(
  localStorage.getItem("senai_meta_diaria")
);

if (metaSalva > 0) {
  $("campo-meta").value = metaSalva;
}

/* 19 — SISTEMA DE CONQUISTAS */

function atualizarConquistas() {
  const quantidade = historico.length;

  definirConquista("conquista-primeira", quantidade >= 1);
  definirConquista("conquista-cinco", quantidade >= 5);
  definirConquista("conquista-dez", quantidade >= 10);
}

function definirConquista(id, desbloqueada) {
  const elemento = $(id);

  elemento.classList.toggle(
    "desbloqueada",
    desbloqueada
  );

  elemento.querySelector(".status-conquista").textContent =
    desbloqueada ? "Desbloqueada!" : "Bloqueada";
}

/* 11 — EXPORTAR TAREFAS PARA CSV */

function exportarTarefas() {
  const ativas = tarefasAtivas();

  if (!ativas.length) {
    mostrarNotificacao("Não há tarefas para exportar.");
    return;
  }

  const escapar = valor =>
    `"${String(valor ?? "").replace(/"/g, '""')}"`;

  const linhas = [[
    "Tarefa",
    "Status",
    "Favorita",
    "Prioridade",
    "Data de entrega",
    "Subtarefas",
    "Criada em"
  ]];

  ativas.forEach(t => {
    linhas.push([
      t.texto,
      t.concluida ? "Concluída" : "Pendente",
      t.favorita ? "Sim" : "Não",
      t.prioridade || "media",
      t.prazo ? dataParaTexto(t.prazo) : "",
      (t.subtarefas || [])
        .map(s => `${s.concluida ? "[x]" : "[ ]"} ${s.texto}`)
        .join(" | "),
      new Date(t.criadaEm).toLocaleString("pt-BR")
    ]);
  });

  const csv = "\uFEFF" +
    linhas.map(l => l.map(escapar).join(";")).join("\r\n");

  const arquivo = new Blob([csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");

  link.href = url;
  link.download = "minhas-tarefas-senai.csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  mostrarNotificacao("Arquivo CSV exportado com sucesso.");
}

/* 12 — LIXEIRA E RESTAURAÇÃO */

function moverParaLixeira(id) {
  const tarefa = tarefas.find(t => t.id === id);

  if (!tarefa) return;

  if (!confirm(`Mover "${tarefa.texto}" para a lixeira?`)) {
    return;
  }

  tarefa.excluida = true;

  if (idEmEdicao === id) {
    cancelarEdicao();
  }

  salvarTarefas();
  renderizarTarefas();
  renderizarLixeira();
  atualizarResumo();

  mostrarNotificacao(
    "Tarefa movida para a lixeira. Você pode restaurá-la."
  );
}

function renderizarLixeira() {
  const ul = $("lista-lixeira");
  ul.innerHTML = "";

  const apagadas = tarefas.filter(t => t.excluida);

  apagadas.forEach(t => {
    const li = document.createElement("li");
    li.className = "item-lixeira";

    const info = document.createElement("div");
    info.className = "info-lixeira";

    const nome = document.createElement("strong");
    nome.textContent = t.texto;

    const detalhe = document.createElement("span");
    detalhe.className = "texto-suave";

    detalhe.textContent =
      `Prioridade: ${t.prioridade || "média"}` +
      (t.prazo
        ? " · Entrega: " + dataParaTexto(t.prazo)
        : "");

    info.append(nome, detalhe);

    const acoes = document.createElement("div");
    acoes.className = "acoes-lixeira";

    acoes.append(
      criarBotao(
        "fa-solid fa-rotate-left",
        "botao-restaurar",
        "Restaurar tarefa",
        () => {
          t.excluida = false;

          salvarTarefas();
          renderizarTarefas();
          renderizarLixeira();

          mostrarNotificacao("Tarefa restaurada.");
        }
      ),

      criarBotao(
        "fa-regular fa-trash-can",
        "botao-excluir-permanente",
        "Excluir permanentemente",
        () => {
          if (!confirm(
            `Excluir "${t.texto}" permanentemente?`
          )) {
            return;
          }

          tarefas = tarefas.filter(x => x.id !== t.id);

          historico = historico.filter(
            h => h.tarefaId !== t.id
          );

          salvarTarefas();
          renderizarTarefas();
          renderizarLixeira();

          mostrarNotificacao(
            "Tarefa excluída permanentemente."
          );
        }
      )
    );

    li.append(info, acoes);
    ul.appendChild(li);
  });

  $("lixeira-vazia").classList.toggle(
    "escondido",
    apagadas.length > 0
  );

  $("botao-esvaziar-lixeira").classList.toggle(
    "escondido",
    apagadas.length === 0
  );
}

function abrirLixeira() {
  mostrarLixeira = true;

  $("secao-lixeira").classList.remove("escondido");

  $("secao-lista").scrollIntoView({
    behavior: "smooth"
  });

  renderizarTarefas();
}

function sairLixeira() {
  mostrarLixeira = false;
  renderizarTarefas();
}

$("botao-sair-lixeira").addEventListener(
  "click",
  sairLixeira
);

$("botao-esvaziar-lixeira").addEventListener("click", () => {
  const apagadas = tarefas.filter(t => t.excluida);

  if (!apagadas.length) return;

  if (!confirm(
    "Excluir permanentemente todas as tarefas da lixeira?"
  )) {
    return;
  }

  const ids = new Set(apagadas.map(t => t.id));

  tarefas = tarefas.filter(t => !t.excluida);

  historico = historico.filter(
    h => !ids.has(h.tarefaId)
  );

  salvarTarefas();
  renderizarTarefas();
  renderizarLixeira();

  mostrarNotificacao("Lixeira esvaziada.");
});

$("botao-limpar").addEventListener("click", () => {
  const ativas = tarefasAtivas();

  if (!ativas.length) {
    mostrarNotificacao(
      "Não há tarefas para mover à lixeira."
    );
    return;
  }

  if (!confirm(
    "Mover todas as tarefas ativas para a lixeira?"
  )) {
    return;
  }

  tarefas.forEach(t => {
    if (!t.excluida) t.excluida = true;
  });

  salvarTarefas();
  renderizarTarefas();
  renderizarLixeira();

  mostrarNotificacao(
    "Tarefas movidas para a lixeira."
  );
});

/* 13 E 18 — LEMBRETES E TAREFAS ATRASADAS */

function verificarAtrasadas() {
  const atrasadas = tarefasAtivas().filter(ehAtrasada);

  if (atrasadas.length) {
    $("notificacao").classList.remove("escondido");

    $("notificacao").textContent =
      `Você tem ${atrasadas.length} tarefa(s) atrasada(s). Confira os prazos na lista.`;
  }

  const hoje = dataLocalISO();

  tarefasAtivas()
    .filter(t =>
      !t.concluida &&
      t.prazo === hoje &&
      !idsAvisados.has(t.id)
    )
    .forEach(t => {
      idsAvisados.add(t.id);

      mostrarNotificacao(
        `Lembrete: "${t.texto}" vence hoje.`
      );

      if (
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification("Lembrete de tarefa", {
          body: `"${t.texto}" vence hoje.`
        });
      }
    });
}

async function ativarLembretes() {
  if (!("Notification" in window)) {
    mostrarNotificacao(
      "Este navegador não oferece notificações. Os avisos dentro do painel continuam funcionando."
    );
    return;
  }

  try {
    const permissao = await Notification.requestPermission();

    if (permissao === "granted") {
      mostrarNotificacao(
        "Lembretes ativados! Os avisos são verificados enquanto o painel estiver aberto."
      );

      verificarAtrasadas();
    } else {
      mostrarNotificacao(
        "Permissão de notificação não concedida. Os avisos aparecerão dentro do painel."
      );
    }
  } catch {
    mostrarNotificacao(
      "Não foi possível ativar notificações neste navegador."
    );
  }
}

setInterval(verificarAtrasadas, 60000);

/* 14 — HISTÓRICO DE CONCLUSÃO */

function atualizarHistorico() {
  const ul = $("lista-historico");

  ul.innerHTML = "";

  historico.slice(0, 20).forEach(h => {
    const li = document.createElement("li");
    li.className = "item-historico";

    const info = document.createElement("div");
    info.className = "info-historico";

    const nome = document.createElement("strong");
    nome.textContent = h.texto;

    const data = document.createElement("span");
    data.className = "texto-suave";
    data.textContent = new Date(h.data).toLocaleString("pt-BR");

    info.append(nome, data);
    li.append(info);
    ul.appendChild(li);
  });

  $("historico-vazio").classList.toggle(
    "escondido",
    historico.length > 0
  );
}

/* 15 — CALENDÁRIO DE TAREFAS */

function renderizarCalendario() {
  const data = $("campo-data-calendario").value || dataLocalISO();

  const ul = $("lista-calendario");
  ul.innerHTML = "";

  const doDia = tarefasAtivas().filter(
    t => t.prazo === data
  );

  if (!doDia.length) {
    const p = document.createElement("p");

    p.className = "texto-suave";
    p.textContent =
      "Nenhuma tarefa com prazo para esta data.";

    ul.appendChild(p);
    return;
  }

  doDia.forEach(t => {
    const item = document.createElement("div");
    item.className = "item-calendario";

    const nome = document.createElement("strong");
    nome.textContent = t.texto;

    const status = document.createElement("span");

    status.textContent =
      `${t.concluida ? "Concluída" : "Pendente"}` +
      ` · Prioridade ${t.prioridade || "média"}` +
      `${ehAtrasada(t) ? " · Atrasada" : ""}`;

    item.append(nome, status);
    ul.appendChild(item);
  });
}

$("campo-data-calendario").value = dataLocalISO();

$("campo-data-calendario").addEventListener(
  "change",
  renderizarCalendario
);

/* 20 — TEMA CLARO E ESCURO */

const botaoTema = $("botao-alternar-tema");

function atualizarIconeTema() {
  const escuro =
    document.body.classList.contains("modo-escuro");

  botaoTema.innerHTML = escuro
    ? '<i class="fa-regular fa-sun"></i>'
    : '<i class="fa-regular fa-moon"></i>';

  botaoTema.setAttribute(
    "aria-label",
    escuro ? "Ativar tema claro" : "Ativar tema escuro"
  );
}

function alternarTema() {
  document.body.classList.toggle("modo-escuro");

  localStorage.setItem(
    "senai_tema_escuro",
    document.body.classList.contains("modo-escuro")
      ? "sim"
      : "nao"
  );

  atualizarIconeTema();
}

if (localStorage.getItem("senai_tema_escuro") === "sim") {
  document.body.classList.add("modo-escuro");
}

atualizarIconeTema();

botaoTema.addEventListener("click", alternarTema);

/* MENU DAS 20 FUNÇÕES */

function fecharMenu() {
  listaFuncoes.classList.add("escondido");

  botaoFuncoes.classList.remove("aberto");

  botaoFuncoes.setAttribute("aria-expanded", "false");
}

botaoFuncoes.addEventListener("click", () => {
  const abrir = listaFuncoes.classList.contains("escondido");

  listaFuncoes.classList.toggle("escondido", !abrir);
  botaoFuncoes.classList.toggle("aberto", abrir);

  botaoFuncoes.setAttribute(
    "aria-expanded",
    String(abrir)
  );
});

function irPara(id) {
  $(id).scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

listaFuncoes.querySelectorAll("[data-acao]").forEach(botao => {
  botao.addEventListener("click", () => {
    fecharMenu();

    switch (botao.dataset.acao) {
      case "pesquisar":
        irPara("secao-lista");
        campoPesquisa.focus();
        break;

      case "filtrar":
        irPara("secao-lista");
        filtroStatus.focus();
        break;

      case "prioridades":
        irPara("secao-lista");
        filtroPrioridade.focus();
        mostrarNotificacao(
          "Defina a prioridade ao criar ou editar uma tarefa."
        );
        break;

      case "prazos":
        irPara("secao-formulario");
        $("campo-prazo").focus();
        mostrarNotificacao(
          "Escolha uma data de entrega para sua tarefa."
        );
        break;

      case "ordenar":
        irPara("secao-lista");
        filtroOrdem.focus();
        break;

      case "salvar":
        salvarTarefas();
        mostrarNotificacao(
          "Salvamento automático ativo: as alterações são guardadas neste navegador."
        );
        break;

      case "progresso":
        irPara("secao-estatisticas");
        break;

      case "subtarefas":
        irPara("secao-formulario");
        $("campo-subtarefas").focus();
        mostrarNotificacao(
          "Digite subtarefas separadas por vírgulas."
        );
        break;

      case "favoritas":
        filtroStatus.value = "favoritas";
        renderizarTarefas();
        irPara("secao-lista");
        break;

      case "duplicar":
        irPara("secao-lista");
        mostrarNotificacao(
          "Use o ícone de cópia ao lado de uma tarefa para duplicá-la."
        );
        break;

      case "exportar":
        exportarTarefas();
        break;

      case "lixeira":
        abrirLixeira();
        break;

      case "lembretes":
        ativarLembretes();
        break;

      case "historico":
        irPara("secao-historico");
        break;

      case "calendario":
        irPara("secao-calendario");
        break;

      case "pomodoro":
        irPara("secao-pomodoro");
        break;

      case "meta":
        irPara("secao-progresso");
        $("campo-meta").focus();
        break;

      case "atrasadas":
        filtroStatus.value = "atrasadas";
        renderizarTarefas();
        irPara("secao-lista");
        verificarAtrasadas();
        break;

      case "conquistas":
        irPara("secao-conquistas");
        break;

      case "tema":
        alternarTema();
        break;
    }
  });
});

document.addEventListener("click", evento => {
  if (!evento.target.closest(".menu-container")) {
    fecharMenu();
  }
});

/* 16 — CRONÔMETRO POMODORO */

function atualizarTemporizador() {
  const minutos = Math.floor(segundosRestantes / 60);
  const segundos = segundosRestantes % 60;

  $("temporizador").textContent =
    `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
}

$("botao-iniciar-pomodoro").addEventListener("click", () => {
  if (intervaloPomodoro !== null) return;

  mostrarNotificacao("Cronômetro iniciado. Bom estudo!");

  intervaloPomodoro = setInterval(() => {
    segundosRestantes--;
    atualizarTemporizador();

    if (segundosRestantes <= 0) {
      clearInterval(intervaloPomodoro);
      intervaloPomodoro = null;

      mostrarNotificacao(
        "Tempo concluído! Faça uma pausa."
      );

      alert(
        "Seu tempo de foco terminou. Hora de fazer uma pausa!"
      );
    }
  }, 1000);
});

$("botao-pausar-pomodoro").addEventListener("click", () => {
  if (intervaloPomodoro !== null) {
    clearInterval(intervaloPomodoro);
    intervaloPomodoro = null;

    mostrarNotificacao("Cronômetro pausado.");
  }
});

$("botao-reiniciar-pomodoro").addEventListener("click", () => {
  clearInterval(intervaloPomodoro);

  intervaloPomodoro = null;
  segundosRestantes = 25 * 60;

  atualizarTemporizador();

  mostrarNotificacao("Cronômetro reiniciado.");
});

/* INICIALIZAÇÃO */

atualizarTemporizador();
renderizarTarefas();
renderizarCalendario();
atualizarHistorico();
verificarAtrasadas();
