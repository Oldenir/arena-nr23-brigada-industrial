import { api } from "./api.js";
import { normalizeCompact, normalizeText } from "./scoring.js";

const runButton = document.querySelector("#runTestBtn");
const testList = document.querySelector("#testList");
const overallStatus = document.querySelector("#overallStatus");
const overallDetail = document.querySelector("#overallDetail");
const summaryChip = document.querySelector("#summaryChip");

const labels = {
  approved: "APROVADO",
  warning: "ATENÇÃO",
  error: "ERRO",
  pending: "AGUARDANDO"
};

runButton.addEventListener("click", runSelfTest);
renderResults([
  result("pending", "Pronto para executar", "Clique em Executar self-test para iniciar as verificações.")
]);

async function runSelfTest() {
  runButton.disabled = true;
  runButton.textContent = "Executando...";
  summaryChip.className = "status-chip";
  summaryChip.textContent = "executando";

  const results = [];
  let tempSession = null;
  let instructorToken = "";

  try {
    results.push(checkBrowserStorage());
    results.push(checkNormalization());

    const health = await api.health();
    results.push(result(
      health.status === "online" ? "approved" : "warning",
      "API de saúde",
      `Serviço respondeu como ${health.status || "indefinido"}.`
    ));

    const created = await api.createSession({
      className: `Self-test ${new Date().toISOString()}`,
      moduleId: "nr23"
    });
    tempSession = created.session;
    instructorToken = created.instructorToken;
    results.push(result("approved", "Sessão temporária", `Sessão ${tempSession.code} criada para diagnóstico.`));

    const joined = await api.joinSession(tempSession.code, {
      name: "Equipe Self-test",
      members: "Diagnóstico automático",
      color: "#ffd24a",
      symbol: "S"
    });
    results.push(result(
      joined.team?.id ? "approved" : "error",
      "Entrada de equipe",
      joined.team?.id ? "Equipe temporária entrou e recebeu identificação local." : "A equipe temporária não foi criada."
    ));

    const nr23Catalog = tempSession.catalog;
    const aidSession = await api.activity(tempSession.code, {
      action: "module",
      moduleId: "first-aid"
    }, instructorToken);
    const aidCatalog = aidSession.session.catalog;
    results.push(checkCatalog("Brigada Industrial", nr23Catalog, 6));
    results.push(checkCatalog("Primeiros Socorros", aidCatalog, 4));

    const refreshed = await api.getSession(tempSession.code, { instructorToken });
    const hasTeam = refreshed.session.teams.some((team) => team.name === "Equipe Self-test");
    results.push(result(
      hasTeam ? "approved" : "error",
      "Persistência básica",
      hasTeam ? "Sessão reaberta com equipe temporária preservada." : "A sessão reaberta não preservou a equipe temporária."
    ));
  } catch (error) {
    results.push(result("error", "Execução interrompida", error.message || "Falha inesperada no self-test."));
  } finally {
    if (tempSession?.code && instructorToken) {
      try {
        await api.deleteSession(tempSession.code, instructorToken);
        results.push(result("approved", "Limpeza", "Sessão temporária removida ao final do diagnóstico."));
      } catch (error) {
        results.push(result("warning", "Limpeza", `Remova manualmente a sessão temporária ${tempSession.code}.`));
      }
    }
    renderResults(results);
    runButton.disabled = false;
    runButton.textContent = "Executar self-test";
  }
}

function checkBrowserStorage() {
  try {
    const key = "arena-sl-self-test";
    localStorage.setItem(key, "ok");
    const ok = localStorage.getItem(key) === "ok";
    localStorage.removeItem(key);
    return result(ok ? "approved" : "warning", "Armazenamento do navegador", ok
      ? "LocalStorage disponível para recuperar equipe/instrutor no mesmo aparelho."
      : "LocalStorage não confirmou gravação e leitura.");
  } catch {
    return result("warning", "Armazenamento do navegador", "LocalStorage bloqueado neste navegador.");
  }
}

function checkNormalization() {
  const textOk = normalizeText("Água pressurizada") === "AGUA PRESSURIZADA";
  const compactOk = normalizeCompact("Classe A - papel") === "CLASSEAPAPEL";
  return result(textOk && compactOk ? "approved" : "error", "Normalização de respostas", textOk && compactOk
    ? "Acentos, espaços e pontuação são tratados antes da correção."
    : "A normalização local não retornou o valor esperado.");
}

function checkCatalog(name, catalog, expectedMinimum) {
  const count = catalog?.activities?.length || 0;
  return result(count >= expectedMinimum ? "approved" : "warning", `Catálogo ${name}`, `${count} atividades encontradas.`);
}

function result(status, title, detail) {
  return { status, title, detail };
}

function renderResults(results) {
  testList.innerHTML = "";
  for (const item of results) {
    const row = document.createElement("article");
    row.className = `test-item ${item.status}`;

    const badge = document.createElement("span");
    badge.className = "test-badge";
    badge.textContent = labels[item.status] || item.status;

    const content = document.createElement("div");
    content.className = "test-content";
    const title = document.createElement("strong");
    title.textContent = item.title;
    const detail = document.createElement("p");
    detail.textContent = item.detail;

    content.append(title, detail);
    row.append(badge, content);
    testList.append(row);
  }

  const hasError = results.some((item) => item.status === "error");
  const hasWarning = results.some((item) => item.status === "warning");
  const pending = results.every((item) => item.status === "pending");
  if (pending) {
    setOverall("pending", "Aguardando execução", "Nenhuma alteração será feita nas sessões reais.");
  } else if (hasError) {
    setOverall("error", "ERRO", "Corrija os itens em vermelho antes de usar em aula.");
  } else if (hasWarning) {
    setOverall("warning", "ATENÇÃO", "O jogo funciona, mas há pontos para conferir antes da aula.");
  } else {
    setOverall("approved", "APROVADO", "API, catálogos, normalização e persistência básica responderam corretamente.");
  }
}

function setOverall(status, title, detail) {
  overallStatus.textContent = title;
  overallDetail.textContent = detail;
  summaryChip.textContent = labels[status] || status;
  summaryChip.className = `status-chip ${status === "approved" ? "online" : status === "error" ? "error" : ""}`;
}
