
// ==========================================
// MEU PAINEL DE TAREFAS - SENAI
// ==========================================

const $ = id => document.getElementById(id);

const CHAVE_TAREFAS = "senai_painel_tarefas_v3";
const CHAVE_LIXEIRA = "senai_painel_lixeira_v3";
const CHAVE_TEMA = "senai_painel_tema_v3";
const CHAVE_META = "senai_painel_meta_v3";

function ler(chave, padrao) {
  try {
    const valor = localStorage.getItem(chave);
    return valor === null ? padrao : JSON.parse(valor);
  } catch {
    return padrao;
  }
}

function gravar(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch {
    alert("Não foi possível salvar os dados no navegador.");
    return false;
  }
}

function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function normalizarTarefa(t) {
  return {
    id: t.id || gerarId(),
    texto: String(t.texto || t.nome || ""),
    prioridade: ["alta", "media", "baixa"].includes(t.prioridade)
      ? t.prioridade : "media",
    data: t.data || "",
    concluida: Boolean(t.concluida ?? t.concluido),
    concluidaEm: t.concluidaEm || null,
    favorita: Boolean(t.favorita),
    criacao: Number(t.criacao) || Date.now()
  };
}

let tarefas = ler(CHAVE_TAREFAS, null);
if (!Array.isArray(tarefas)) {
  tarefas = ler("senai_painel_tarefas_v2", null);
}
if (!Array.isArray(tarefas)) {
  tarefas = ler("minhasTarefas", []);
}
tarefas = tarefas.map(normalizarTarefa);

let lixeira = ler(CHAVE_LIXEIRA, null);
if (!Array.isArray(lixeira)) {
  lixeira = ler("senai_painel_lixeira_v2", []);
}
lixeira = lixeira.map(normalizarTarefa);

let metaDiaria = Number(ler(CHAVE_META, 5));
if (!Number.isFinite(metaDiaria) || metaDiaria < 1) metaDiaria = 5;

gravar(CHAVE_TAREFAS, tarefas);

// ==========================================
// ELEMENTOS DO HTML
// ==========================================

const form = $("form-tarefa");
const campoTarefa = $("campo-tarefa");
const campoPrioridade = $("campo-prioridade");
const campoData = $("campo-data");
const campoPesquisa = $("campo-pesquisa");
const filtroStatus = $("filtro-status");
const ordenacao = $("ordenacao");

const listaTarefas = $("lista-tarefas");
const mensagemVazia = $("mensagem-vazia");

const totalTarefas = $("total-tarefas");
const totalPendentes = $("total-pendentes");
const totalConcluidas = $("total-concluidas");
const porcentagem = $("porcentagem");
const barraPreenchida = $("barra-preenchida");
const textoProgresso = $("texto-progresso");

const botaoTema = $("botao-tema");
const botaoInfo = $("botao-info");
const modalInfo = $("modal-info");
const fecharModal = $("fechar-modal");
const entendiModal = $("entendi-modal");

const botaoExportar = $("botao-exportar");
const botaoLimpar = $("botao-limpar");
const botaoLixeira = $("botao-lixeira");
const fecharLixeira = $("fechar-lixeira");
const esvaziarLixeira = $("esvaziar-lixeira");
const secaoLixeira = $("secao-lixeira");
const listaLixeira = $("lista-lixeira");
const lixeiraVazia = $("lixeira-vazia");

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function salvarTarefas() {
  return gravar(CHAVE_TAREFAS, tarefas);
}

function salvarLixeira() {
  return gravar(CHAVE_LIXEIRA, lixeira);
}

function formatarData(data) {
  if (!data) return "";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function hojeISO() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

function criarBotao(icone, titulo, classe, acao) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "botao-acao " + (classe || "");
  botao.title = titulo;
  botao.setAttribute("aria-label", titulo);

  const simbolo = document.createElement("i");
  simbolo.className = icone;
  botao.appendChild(simbolo);
  botao.addEventListener("click", acao);

  return botao;
}

function criarTarefa(texto, prioridade, data) {
  return {
    id: gerarId(),
    texto,
    prioridade: prioridade || "media",
    data: data || "",
    concluida: false,
    concluidaEm: null,
    favorita: false,
    criacao: Date.now()
  };
}

// ==========================================
// ADICIONAR TAREFAS
// ==========================================

form.addEventListener("submit", evento => {
  evento.preventDefault();

  const texto = campoTarefa.value.trim();
  if (!texto) {
    campoTarefa.focus();
    return;
  }

  const tarefa = criarTarefa(
    texto,
    campoPrioridade.value,
    campoData.value
  );

  tarefas.unshift(tarefa);

  if (!salvarTarefas()) {
    tarefas = tarefas.filter(t => t.id !== tarefa.id);
    return;
  }

  form.reset();
  campoPrioridade.value = "media";
  campoTarefa.focus();
  atualizarTudo();
});

// ==========================================
// PESQUISA, FILTROS E ORDENAÇÃO
// ==========================================

campoPesquisa.addEventListener("input", renderizarTarefas);
filtroStatus.addEventListener("change", renderizarTarefas);
ordenacao.addEventListener("change", renderizarTarefas);

function obterTarefasVisiveis() {
  const pesquisa = campoPesquisa.value.trim().toLocaleLowerCase("pt-BR");
  const filtro = filtroStatus.value;

  const resultado = tarefas.filter(tarefa => {
    const combinaTexto = tarefa.texto
      .toLocaleLowerCase("pt-BR")
      .includes(pesquisa);

    let combinaFiltro = true;

    if (filtro === "pendentes") combinaFiltro = !tarefa.concluida;
    if (filtro === "concluidas") combinaFiltro = tarefa.concluida;
    if (filtro === "favoritas") combinaFiltro = tarefa.favorita;

    return combinaTexto && combinaFiltro;
  });

  const peso = { alta: 0, media: 1, baixa: 2 };

  if (ordenacao.value === "prioridade") {
    resultado.sort((a, b) => peso[a.prioridade] - peso[b.prioridade]);
  } else if (ordenacao.value === "data") {
    resultado.sort((a, b) => {
      if (!a.data && !b.data) return 0;
      if (!a.data) return 1;
      if (!b.data) return -1;
      return a.data.localeCompare(b.data);
    });
  } else if (ordenacao.value === "alfabetica") {
    resultado.sort((a, b) => a.texto.localeCompare(b.texto, "pt-BR"));
  } else {
    resultado.sort((a, b) => b.criacao - a.criacao);
  }

  return resultado;
}

// ==========================================
// EXIBIR TAREFAS
// ==========================================

function renderizarTarefas() {
  listaTarefas.replaceChildren();

  const visiveis = obterTarefasVisiveis();
  mensagemVazia.hidden = visiveis.length > 0;
  mensagemVazia.textContent = tarefas.length === 0
    ? "Nenhuma tarefa cadastrada."
    : "Nenhuma tarefa encontrada com esses filtros.";

  visiveis.forEach(tarefa => {
    const item = document.createElement("li");
    item.className = "item-tarefa";
    if (tarefa.concluida) item.classList.add("concluida");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "check-tarefa";
    checkbox.checked = tarefa.concluida;
    checkbox.setAttribute("aria-label", "Concluir tarefa");

    checkbox.addEventListener("change", () => {
      const anterior = {
        concluida: tarefa.concluida,
        concluidaEm: tarefa.concluidaEm
      };

      tarefa.concluida = checkbox.checked;
      tarefa.concluidaEm = tarefa.concluida ? Date.now() : null;

      if (!salvarTarefas()) {
        tarefa.concluida = anterior.concluida;
        tarefa.concluidaEm = anterior.concluidaEm;
        return;
      }

      atualizarTudo();
    });

    const conteudo = document.createElement("div");
    conteudo.className = "conteudo-tarefa";

    const texto = document.createElement("div");
    texto.className = "texto-tarefa";
    texto.textContent = tarefa.texto;

    const detalhes = document.createElement("div");
    detalhes.className = "detalhes-tarefa";

    const prioridade = document.createElement("span");
    prioridade.className = "etiqueta prioridade-" + tarefa.prioridade;
    prioridade.textContent = "Prioridade: " + {
      alta: "Alta", media: "Média", baixa: "Baixa"
    }[tarefa.prioridade];

    detalhes.appendChild(prioridade);

    if (tarefa.data) {
      const prazo = document.createElement("span");
      prazo.className = "etiqueta";
      prazo.textContent = "Prazo: " + formatarData(tarefa.data);

      if (!tarefa.concluida && tarefa.data < hojeISO()) {
        prazo.classList.add("prazo-atrasado");
        prazo.textContent = "Atrasada: " + formatarData(tarefa.data);
      }

      detalhes.appendChild(prazo);
    }

    conteudo.append(texto, detalhes);

    const acoes = document.createElement("div");
    acoes.className = "acoes-tarefa";

    acoes.appendChild(criarBotao(
      tarefa.favorita ? "fa-solid fa-star" : "fa-regular fa-star",
      tarefa.favorita ? "Remover favorita" : "Favoritar",
      tarefa.favorita ? "favorito-ativo" : "",
      () => {
        tarefa.favorita = !tarefa.favorita;
        if (salvarTarefas()) atualizarTudo();
      }
    ));

    acoes.appendChild(criarBotao(
      "fa-solid fa-pen",
      "Editar tarefa",
      "",
      () => {
        const novoTexto = prompt("Edite a tarefa:", tarefa.texto);
        if (novoTexto === null) return;

        if (!novoTexto.trim()) {
          alert("O nome não pode ficar vazio.");
          return;
        }

        const anterior = tarefa.texto;
        tarefa.texto = novoTexto.trim();

        if (!salvarTarefas()) {
          tarefa.texto = anterior;
          return;
        }

        atualizarTudo();
      }
    ));

    acoes.appendChild(criarBotao(
      "fa-regular fa-copy",
      "Duplicar tarefa",
      "",
      () => {
        const copia = {
          ...tarefa,
          id: gerarId(),
          texto: tarefa.texto + " (cópia)",
          concluida: false,
          concluidaEm: null,
          criacao: Date.now()
        };

        tarefas.unshift(copia);

        if (!salvarTarefas()) {
          tarefas = tarefas.filter(t => t.id !== copia.id);
          return;
        }

        atualizarTudo();
      }
    ));

    acoes.appendChild(criarBotao(
      "fa-solid fa-trash-can",
      "Mover para lixeira",
      "excluir",
      () => moverParaLixeira(tarefa.id)
    ));

    item.append(checkbox, conteudo, acoes);
    listaTarefas.appendChild(item);
  });
}

// ==========================================
// ESTATÍSTICAS GERAIS
// ==========================================

function renderizarProgresso() {
  const total = tarefas.length;
  const concluidas = tarefas.filter(t => t.concluida).length;
  const pendentes = total - concluidas;
  const percentual = total ? Math.round(concluidas / total * 100) : 0;

  totalTarefas.textContent = total;
  totalPendentes.textContent = pendentes;
  totalConcluidas.textContent = concluidas;
  porcentagem.textContent = percentual + "%";
  barraPreenchida.style.width = percentual + "%";
  textoProgresso.textContent = total
    ? `${concluidas} de ${total} tarefas concluídas`
    : "Vamos começar!";
}

// ==========================================
// LIXEIRA
// ==========================================

function moverParaLixeira(id) {
  const indice = tarefas.findIndex(t => t.id === id);
  if (indice < 0) return;

  const tarefa = tarefas[indice];
  tarefas.splice(indice, 1);
  lixeira.unshift(tarefa);

  if (!salvarTarefas() || !salvarLixeira()) {
    lixeira = lixeira.filter(t => t.id !== tarefa.id);
    tarefas.splice(indice, 0, tarefa);
    salvarTarefas();
    salvarLixeira();
    return;
  }

  atualizarTudo();
}

function renderizarLixeira() {
  listaLixeira.replaceChildren();
  lixeiraVazia.hidden = lixeira.length > 0;

  lixeira.forEach(tarefa => {
    const item = document.createElement("li");
    item.className = "item-tarefa";

    const conteudo = document.createElement("div");
    conteudo.className = "conteudo-tarefa";

    const texto = document.createElement("div");
    texto.className = "texto-tarefa";
    texto.textContent = tarefa.texto;
    conteudo.appendChild(texto);

    const acoes = document.createElement("div");
    acoes.className = "acoes-tarefa";

    acoes.appendChild(criarBotao(
      "fa-solid fa-rotate-left",
      "Restaurar",
      "",
      () => {
        const antigaTarefas = [...tarefas];
        const antigaLixeira = [...lixeira];

        lixeira = lixeira.filter(t => t.id !== tarefa.id);
        tarefas.unshift(tarefa);

        if (!salvarTarefas() || !salvarLixeira()) {
          tarefas = antigaTarefas;
          lixeira = antigaLixeira;
          salvarTarefas();
          salvarLixeira();
          return;
        }

        atualizarTudo();
      }
    ));

    acoes.appendChild(criarBotao(
      "fa-solid fa-trash-can",
      "Excluir permanentemente",
      "excluir",
      () => {
        if (!confirm("Excluir esta tarefa permanentemente?")) return;

        const anterior = [...lixeira];
        lixeira = lixeira.filter(t => t.id !== tarefa.id);

        if (!salvarLixeira()) {
          lixeira = anterior;
          return;
        }

        renderizarLixeira();
      }
    ));

    item.append(conteudo, acoes);
    listaLixeira.appendChild(item);
  });
}

botaoLixeira.addEventListener("click", () => {
  secaoLixeira.hidden = false;
  renderizarLixeira();
  secaoLixeira.scrollIntoView({ behavior: "smooth", block: "start" });
});

fecharLixeira.addEventListener("click", () => {
  secaoLixeira.hidden = true;
});

esvaziarLixeira.addEventListener("click", () => {
  if (!lixeira.length) return;
  if (!confirm("Esvaziar a lixeira permanentemente?")) return;

  const anterior = [...lixeira];
  lixeira = [];

  if (!salvarLixeira()) {
    lixeira = anterior;
    return;
  }

  renderizarLixeira();
});

botaoLimpar.addEventListener("click", () => {
  if (!tarefas.length) {
    alert("Sua lista já está vazia.");
    return;
  }

  if (!confirm("Mover todas as tarefas para a lixeira?")) return;

  const antigasTarefas = [...tarefas];
  const antigaLixeira = [...lixeira];

  lixeira = [...tarefas, ...lixeira];
  tarefas = [];

  if (!salvarTarefas() || !salvarLixeira()) {
    tarefas = antigasTarefas;
    lixeira = antigaLixeira;
    salvarTarefas();
    salvarLixeira();
    return;
  }

  atualizarTudo();
});

// ==========================================
// EXPORTAR CSV
// ==========================================

botaoExportar.addEventListener("click", () => {
  if (!tarefas.length) {
    alert("Não há tarefas para exportar.");
    return;
  }

  const escapar = valor => '"' + String(valor ?? "").replace(/"/g, '""') + '"';

  const linhas = [
    ["Tarefa", "Status", "Prioridade", "Prazo", "Favorita"],
    ...tarefas.map(t => [
      t.texto,
      t.concluida ? "Concluída" : "Pendente",
      t.prioridade,
      t.data ? formatarData(t.data) : "",
      t.favorita ? "Sim" : "Não"
    ])
  ];

  const csv = "\uFEFF" + linhas
    .map(linha => linha.map(escapar).join(";"))
    .join("\r\n");

  const arquivo = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");

  link.href = url;
  link.download = "minhas-tarefas.csv";
  link.click();

  URL.revokeObjectURL(url);
});

// ==========================================
// TEMA CLARO E ESCURO
// ==========================================

function aplicarTema(tema) {
  const escuro = tema === "escuro";
  document.body.classList.toggle("modo-escuro", escuro);

  botaoTema.innerHTML = escuro
    ? '<i class="fa-solid fa-sun"></i>'
    : '<i class="fa-solid fa-moon"></i>';

  botaoTema.title = escuro ? "Tema claro" : "Tema escuro";
}

aplicarTema(ler(CHAVE_TEMA, "claro"));

botaoTema.addEventListener("click", () => {
  const novoTema = document.body.classList.contains("modo-escuro")
    ? "claro" : "escuro";

  aplicarTema(novoTema);
  gravar(CHAVE_TEMA, novoTema);
});

// ==========================================
// JANELA DE INFORMAÇÕES
// ==========================================

function fecharJanelaInfo() {
  modalInfo.hidden = true;
  botaoInfo.focus();
}

botaoInfo.addEventListener("click", () => {
  modalInfo.hidden = false;
  fecharModal.focus();
});

fecharModal.addEventListener("click", fecharJanelaInfo);
entendiModal.addEventListener("click", fecharJanelaInfo);

modalInfo.addEventListener("click", evento => {
  if (evento.target === modalInfo) fecharJanelaInfo();
});

document.addEventListener("keydown", evento => {
  if (evento.key === "Escape" && !modalInfo.hidden) fecharJanelaInfo();
});

// ==========================================
// FUNÇÃO 16: CALENDÁRIO DE TAREFAS
// ==========================================

const dataCalendario = $("data-calendario");
const resumoCalendario = $("resumo-calendario");
const listaCalendario = $("lista-calendario");
const calendarioVazio = $("calendario-vazio");

dataCalendario.value = hojeISO();

function renderizarCalendario() {
  listaCalendario.replaceChildren();

  const dataSelecionada = dataCalendario.value;
  const doDia = tarefas.filter(t => t.data === dataSelecionada);

  resumoCalendario.textContent = dataSelecionada
    ? `${formatarData(dataSelecionada)} · ${doDia.length} tarefa(s)`
    : "Selecione uma data.";

  calendarioVazio.hidden = doDia.length > 0;
  calendarioVazio.textContent = dataSelecionada
    ? "Nenhuma tarefa com prazo nessa data."
    : "Selecione uma data para consultar as tarefas.";

  doDia.forEach(tarefa => {
    const item = document.createElement("li");
    item.className = "item-tarefa";
    if (tarefa.concluida) item.classList.add("concluida");

    const texto = document.createElement("div");
    texto.className = "conteudo-tarefa";

    const nome = document.createElement("div");
    nome.className = "texto-tarefa";
    nome.textContent = tarefa.texto;

    const status = document.createElement("span");
    status.className = "etiqueta";
    status.textContent = tarefa.concluida ? "Concluída" : "Pendente";

    texto.append(nome, status);
    item.appendChild(texto);

    item.appendChild(criarBotao(
      tarefa.concluida ? "fa-solid fa-rotate-left" : "fa-solid fa-check",
      tarefa.concluida ? "Reabrir tarefa" : "Concluir tarefa",
      "",
      () => {
        const anterior = {
          concluida: tarefa.concluida,
          concluidaEm: tarefa.concluidaEm
        };

        tarefa.concluida = !tarefa.concluida;
        tarefa.concluidaEm = tarefa.concluida ? Date.now() : null;

        if (!salvarTarefas()) {
          tarefa.concluida = anterior.concluida;
          tarefa.concluidaEm = anterior.concluidaEm;
          return;
        }

        atualizarTudo();
      }
    ));

    listaCalendario.appendChild(item);
  });
}

dataCalendario.addEventListener("change", renderizarCalendario);

// ==========================================
// FUNÇÃO 17: CRONÔMETRO POMODORO
// ==========================================

const relogioPomodoro = $("relogio-pomodoro");
const rotuloPomodoro = $("rotulo-pomodoro");
const iniciarPomodoro = $("iniciar-pomodoro");
const reiniciarPomodoro = $("reiniciar-pomodoro");
const botoesModo = document.querySelectorAll(".modo-pomodoro");

let duracaoPomodoro = 25 * 60;
let segundosRestantes = duracaoPomodoro;
let temporizadorPomodoro = null;
let fimPomodoro = null;
let modoPomodoro = "foco";

function mostrarRelogio() {
  const minutos = Math.floor(segundosRestantes / 60);
  const segundos = segundosRestantes % 60;

  relogioPomodoro.textContent =
    String(minutos).padStart(2, "0") + ":" +
    String(segundos).padStart(2, "0");
}

function pararPomodoro() {
  if (temporizadorPomodoro !== null) {
    clearInterval(temporizadorPomodoro);
    temporizadorPomodoro = null;
  }
  fimPomodoro = null;
  iniciarPomodoro.innerHTML = '<i class="fa-solid fa-play"></i> Iniciar';
}

function selecionarModoPomodoro(botao) {
  pararPomodoro();

  modoPomodoro = botao.dataset.modo;
  duracaoPomodoro = Number(botao.dataset.minutos) * 60;
  segundosRestantes = duracaoPomodoro;

  botoesModo.forEach(b => b.classList.toggle("ativo", b === botao));

  rotuloPomodoro.textContent = modoPomodoro === "foco"
    ? "Hora de focar!" : "Hora de descansar!";

  mostrarRelogio();
}

botoesModo.forEach(botao => {
  botao.addEventListener("click", () => selecionarModoPomodoro(botao));
});

iniciarPomodoro.addEventListener("click", () => {
  if (temporizadorPomodoro !== null) {
    pararPomodoro();
    return;
  }

  if (segundosRestantes <= 0) {
    segundosRestantes = duracaoPomodoro;
  }

  fimPomodoro = Date.now() + segundosRestantes * 1000;
  iniciarPomodoro.innerHTML = '<i class="fa-solid fa-pause"></i> Pausar';

  temporizadorPomodoro = setInterval(() => {
    segundosRestantes = Math.max(
      0,
      Math.ceil((fimPomodoro - Date.now()) / 1000)
    );

    mostrarRelogio();

    if (segundosRestantes <= 0) {
      pararPomodoro();
      rotuloPomodoro.textContent = "Sessão finalizada!";
      alert(modoPomodoro === "foco"
        ? "Parabéns! Você terminou sua sessão de foco. Faça uma pausa!"
        : "Pausa finalizada! Quando quiser, comece outra sessão de foco.");
    }
  }, 250);
});

reiniciarPomodoro.addEventListener("click", () => {
  pararPomodoro();
  segundosRestantes = duracaoPomodoro;
  rotuloPomodoro.textContent = modoPomodoro === "foco"
    ? "Hora de focar!" : "Hora de descansar!";
  mostrarRelogio();
});

// ==========================================
// FUNÇÃO 18: META DIÁRIA
// ==========================================

const campoMeta = $("meta-diaria");
const salvarMeta = $("salvar-meta");
const textoMeta = $("texto-meta");
const percentualMeta = $("percentual-meta");
const barraMeta = $("barra-meta");

campoMeta.value = metaDiaria;

salvarMeta.addEventListener("click", () => {
  const valor = Number(campoMeta.value);

  if (!Number.isInteger(valor) || valor < 1 || valor > 100) {
    alert("Escolha uma meta entre 1 e 100 tarefas.");
    campoMeta.value = metaDiaria;
    return;
  }

  const anterior = metaDiaria;
  metaDiaria = valor;

  if (!gravar(CHAVE_META, metaDiaria)) {
    metaDiaria = anterior;
    campoMeta.value = anterior;
    return;
  }

  renderizarMeta();
});

function renderizarMeta() {
  const hoje = hojeISO();

  const concluidasHoje = tarefas.filter(t => {
    if (!t.concluida || !t.concluidaEm) return false;
    return new Date(t.concluidaEm).toLocaleDateString("en-CA") === hoje;
  }).length;

  const percentual = Math.min(
    100,
    Math.round(concluidasHoje / metaDiaria * 100)
  );

  textoMeta.textContent =
    `${concluidasHoje} de ${metaDiaria} tarefas concluídas hoje`;
  percentualMeta.textContent = percentual + "%";
  barraMeta.style.width = percentual + "%";
}

// ==========================================
// ATUALIZAÇÃO GERAL
// ==========================================

function atualizarTudo() {
  renderizarTarefas();
  renderizarProgresso();
  renderizarLixeira();
  renderizarCalendario();
  renderizarMeta();
}

// Inicialização
renderizarRelogio();
atualizarTudo();
