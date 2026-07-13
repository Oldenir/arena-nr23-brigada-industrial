import { escapeHTML, formatDateTime } from "./utils.js";

export function renderRanking(target, ranking = []) {
  if (!target) return;
  if (!ranking.length) {
    target.innerHTML = "<p class=\"empty\">Nenhuma equipe no ranking.</p>";
    return;
  }
  target.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Pos.</th>
          <th>Equipe</th>
          <th>Pontos</th>
          <th>Acertos</th>
          <th>Erros</th>
          <th>Concluídas</th>
          <th>Última pontuação</th>
        </tr>
      </thead>
      <tbody>
        ${ranking.map((entry) => `
          <tr>
            <td>${entry.position}</td>
            <td><span class="team-badge" style="background:${escapeHTML(entry.color || "#e23a34")}"></span> ${escapeHTML(entry.name)}</td>
            <td><strong>${entry.score.points}</strong></td>
            <td>${entry.score.correct}</td>
            <td>${entry.score.wrong}</td>
            <td>${entry.score.completed}</td>
            <td>${formatDateTime(entry.score.lastScoreAt)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

export function renderPodium(target, ranking = []) {
  if (!target) return;
  const top = ranking.slice(0, 3);
  if (!top.length) {
    target.innerHTML = "<p class=\"empty\">Aguardando pontuação.</p>";
    return;
  }
  target.innerHTML = top.map((entry) => `
    <article class="podium-card">
      <small>${entry.position}º lugar</small>
      <strong>${escapeHTML(entry.name)}</strong>
      <span>${entry.score.points} pontos</span>
    </article>
  `).join("");
}
