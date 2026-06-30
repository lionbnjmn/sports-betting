(() => {
  const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
  const KNOCKOUT_ROUNDS = [
    { key: "Round of 32", count: 16 },
    { key: "Round of 16", count: 8 },
    { key: "Quarter-final", count: 4 },
    { key: "Semi-final", count: 2 },
    { key: "Final", count: 1 },
  ];

  async function init() {
    await Data.init();
    renderBracket();
    renderGroups();
    const flags = document.querySelectorAll(".group-card .flag");
    if (flags.length > 0) {
      let loaded = 0;
      const total = flags.length;
      const onLoad = () => { if (++loaded >= total) equalizeGroupHeights(); };
      flags.forEach((img) => {
        if (img.complete) loaded++;
        else { img.addEventListener("load", onLoad); img.addEventListener("error", onLoad); }
      });
      if (loaded >= total) requestAnimationFrame(equalizeGroupHeights);
    } else {
      requestAnimationFrame(equalizeGroupHeights);
    }
  }

  const BRACKET_COLUMNS = [
    { label: "R32",   nums: [74, 77, 73, 75, 83, 84, 81, 82] },
    { label: "R16",   nums: [89, 90, 93, 94] },
    { label: "QF",    nums: [97, 98] },
    { label: "SF",    nums: [101] },
    { label: "Final", nums: [104] },
    { label: "SF",    nums: [102] },
    { label: "QF",    nums: [99, 100] },
    { label: "R16",   nums: [91, 92, 95, 96] },
    { label: "R32",   nums: [76, 78, 79, 80, 86, 88, 85, 87] },
  ];

  function renderBracket() {
    const container = document.getElementById("bracket");
    const byNum = new Map();
    for (const m of Data.getMatches()) {
      if (m.num != null) byNum.set(m.num, m);
    }

    function winnerSide(score) {
      if (!score) return null;
      for (const key of ["p", "et", "ft"]) {
        const s = score[key];
        if (!s) continue;
        if (s[0] > s[1]) return "home";
        if (s[1] > s[0]) return "away";
      }
      return null;
    }

    function resolveTeam(name) {
      const match = /^([WL])(\d+)$/.exec(name || "");
      if (!match) return name;
      const ref = byNum.get(parseInt(match[2], 10));
      const side = ref && winnerSide(ref.score);
      if (!side) return name;
      const wantWinner = match[1] === "W";
      const winner = side === "home" ? ref.team1 : ref.team2;
      const loser = side === "home" ? ref.team2 : ref.team1;
      return wantWinner ? winner : loser;
    }

    function teamHtml(name, known, goal, pens) {
      const fifa = known ? Data.getFifaCodeByName(name) : null;
      const flag = fifa ? Data.flagImg(fifa) : "";
      const pensHtml = pens != null ? ` <span class="bm-pens">(${pens})</span>` : "";
      const goalHtml = goal != null ? `<span class="bm-goal">${goal}${pensHtml}</span>` : "";
      const nameClass = known ? "bm-team-name" : "bm-team-name unknown";
      return `<span class="bm-team"><span class="${nameClass}">${flag}${name}</span>${goalHtml}</span>`;
    }

    function slotHtml(m) {
      if (!m) return `<div class="bracket-match empty"><span class="bm-team"></span><span class="bm-score">vs</span><span class="bm-team"></span></div>`;
      const hasScore = !!(m.score && m.score.ft);
      const team1 = resolveTeam(m.team1);
      const team2 = resolveTeam(m.team2);
      const t1Known = !!Data.getFifaCodeByName(team1);
      const t2Known = !!Data.getFifaCodeByName(team2);
      const [g1, g2] = hasScore ? m.score.ft : [null, null];
      const pens = m.score && m.score.p ? m.score.p : null;
      const [p1, p2] = pens ? pens : [null, null];
      return `
        <div class="bracket-match${hasScore ? " resolved" : ""}">
          ${teamHtml(team1, t1Known, g1, p1)}
          <span class="bm-score">vs</span>
          ${teamHtml(team2, t2Known, g2, p2)}
        </div>
      `;
    }

    let html = '<div class="bracket-tree">';
    for (const col of BRACKET_COLUMNS) {
      html += `<div class="bracket-col">`;
      html += `<span class="bracket-col-label">${col.label}</span>`;
      for (const num of col.nums) {
        html += slotHtml(byNum.get(num));
      }
      html += `</div>`;
    }
    html += "</div>";
    container.innerHTML = html;
  }

  function renderGroups() {
    const container = document.getElementById("groups-container");
    let html = "";
    for (const group of GROUPS) {
      const groupTeams = Data.getTeamsByGroup(group);
      const groupMatches = Data.getMatchesByGroup(group);
      const table = Data.buildGroupTable(group);
      html += `<div class="group-card">`;
      html += `<h3>Group ${group}</h3>`;
      html += renderTable(table);
      html += renderGroupFixtures(groupMatches, groupTeams);
      html += `</div>`;
    }
    container.innerHTML = html;
  }

  function renderTable(rows) {
    if (rows.length === 0) return '<p class="no-data">No teams yet</p>';
    let html = `<table class="group-table">
      <thead><tr><th></th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>
      <tbody>`;
    for (const r of rows) {
      html += `<tr>
        <td class="team-name">${r.flag} ${r.team}</td>
        <td>${r.won}</td><td>${r.drawn}</td><td>${r.lost}</td>
        <td>${r.gd >= 0 ? "+" : ""}${r.gd}</td>
        <td><strong>${r.pts}</strong></td>
      </tr>`;
    }
    html += "</tbody></table>";
    return html;
  }

  function renderGroupFixtures(matches, teams) {
    let html = '<div class="group-fixtures">';
    if (matches.length === 0 && teams.length >= 4) {
      const names = teams.map((t) => t.name);
      for (const [i, j] of [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]]) {
        html += `<div class="group-fixture upcoming"><span>${names[i]}</span><span class="gf-score">vs</span><span>${names[j]}</span></div>`;
      }
    } else {
      for (const m of matches) {
        const score = m.score ? `${m.score.ft[0]} - ${m.score.ft[1]}` : "vs";
        html += `<div class="group-fixture${m.score ? "" : " upcoming"}"><span>${m.team1}</span><span class="gf-score">${score}</span><span>${m.team2}</span></div>`;
      }
    }
    html += "</div>";
    return html;
  }

  function equalizeGroupHeights() {
    const cards = document.querySelectorAll(".group-card");
    if (cards.length === 0) return;
    cards.forEach((card) => {
      card.querySelectorAll(".group-table tr").forEach((r) => (r.style.height = ""));
      card.querySelectorAll(".group-fixture").forEach((r) => (r.style.height = ""));
    });
    for (let i = 0; i < 5; i++) {
      let maxH = 0;
      cards.forEach((card) => {
        const rows = card.querySelectorAll(".group-table tr");
        if (rows[i]) maxH = Math.max(maxH, rows[i].offsetHeight);
      });
      cards.forEach((card) => {
        const rows = card.querySelectorAll(".group-table tr");
        if (rows[i]) rows[i].style.height = maxH + "px";
      });
    }
    for (let i = 0; i < 6; i++) {
      let maxH = 0;
      cards.forEach((card) => {
        const fixtures = card.querySelectorAll(".group-fixture");
        if (fixtures[i]) maxH = Math.max(maxH, fixtures[i].offsetHeight);
      });
      cards.forEach((card) => {
        const fixtures = card.querySelectorAll(".group-fixture");
        if (fixtures[i]) fixtures[i].style.height = maxH + "px";
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
