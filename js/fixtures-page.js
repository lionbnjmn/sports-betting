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

  function renderBracket() {
    const container = document.getElementById("bracket");
    const allMatches = Data.getMatches();

    const r32 = allMatches.filter(m => m.round === "Round of 32").sort((a, b) => a.num - b.num);
    const r16 = allMatches.filter(m => m.round === "Round of 16").sort((a, b) => a.num - b.num);
    const qf = allMatches.filter(m => m.round === "Quarter-final").sort((a, b) => a.num - b.num);
    const sf = allMatches.filter(m => m.round === "Semi-final").sort((a, b) => a.num - b.num);
    const final = allMatches.filter(m => m.round === "Final");

    function toSlot(m) {
      const hasScore = m.score && m.score.ft;
      return {
        team1: m.team1,
        team2: m.team2,
        score: hasScore ? `${m.score.ft[0]} - ${m.score.ft[1]}` : "vs",
        empty: !hasScore,
      };
    }

    const cols = [
      { label: "R32",   matches: r32.slice(0, 8).map(toSlot) },
      { label: "R16",   matches: r16.slice(0, 4).map(toSlot) },
      { label: "QF",    matches: qf.slice(0, 2).map(toSlot) },
      { label: "SF",    matches: sf.slice(0, 1).map(toSlot) },
      { label: "Final", matches: final.map(toSlot) },
      { label: "SF",    matches: sf.slice(1, 2).map(toSlot) },
      { label: "QF",    matches: qf.slice(2, 4).map(toSlot) },
      { label: "R16",   matches: r16.slice(4, 8).map(toSlot) },
      { label: "R32",   matches: r32.slice(8, 16).map(toSlot) },
    ];

    let html = '<div class="bracket-tree">';
    for (const col of cols) {
      html += `<div class="bracket-col">`;
      html += `<span class="bracket-col-label">${col.label}</span>`;
      for (const m of col.matches) {
        html += `
          <div class="bracket-match${m.empty ? " empty" : ""}">
            <span class="bm-team">${m.team1}</span>
            <span class="bm-score">${m.score}</span>
            <span class="bm-team">${m.team2}</span>
          </div>
        `;
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
      const table = buildTable(groupTeams, groupMatches);
      html += `<div class="group-card">`;
      html += `<h3>Group ${group}</h3>`;
      html += renderTable(table);
      html += renderGroupFixtures(groupMatches, groupTeams);
      html += `</div>`;
    }
    container.innerHTML = html;
  }

  function buildTable(teams, matches) {
    const stats = {};
    for (const t of teams) {
      stats[t.name] = { fifaCode: t.fifa_code, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 };
    }
    for (const m of matches) {
      if (!m.score || !m.score.ft) continue;
      const [h, a] = m.score.ft;
      const t1 = Data.findTeamName(m.team1, stats);
      const t2 = Data.findTeamName(m.team2, stats);
      if (!t1 || !t2) continue;
      stats[t1].played++; stats[t2].played++;
      stats[t1].gf += h; stats[t1].ga += a;
      stats[t2].gf += a; stats[t2].ga += h;
      if (h > a)      { stats[t1].won++; stats[t1].pts += 3; stats[t2].lost++; }
      else if (h < a) { stats[t2].won++; stats[t2].pts += 3; stats[t1].lost++; }
      else            { stats[t1].drawn++; stats[t2].drawn++; stats[t1].pts++; stats[t2].pts++; }
    }
    return Object.entries(stats)
      .map(([team, s]) => ({ team, flag: Data.flagImg(s.fifaCode), ...s, gd: s.gf - s.ga }))
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  }

  function renderTable(rows) {
    if (rows.length === 0) return '<p class="no-data">No teams yet</p>';
    let html = `<table class="group-table">
      <thead><tr><th></th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>
      <tbody>`;
    for (const r of rows) {
      html += `<tr>
        <td class="team-name">${r.flag} ${r.team}</td>
        <td>${r.played}</td><td>${r.won}</td><td>${r.drawn}</td><td>${r.lost}</td>
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
