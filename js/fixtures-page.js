(() => {
  const OPENFOOTBALL_URL =
    "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

  const FIFA_TO_ISO = {
    MEX: "mx",
    RSA: "za",
    KOR: "kr",
    CZE: "cz",
    CAN: "ca",
    BIH: "ba",
    QAT: "qa",
    SUI: "ch",
    BRA: "br",
    MAR: "ma",
    HAI: "ht",
    SCO: "gb-sct",
    USA: "us",
    PAR: "py",
    AUS: "au",
    TUR: "tr",
    GER: "de",
    CUW: "cw",
    CIV: "ci",
    ECU: "ec",
    NED: "nl",
    JPN: "jp",
    SWE: "se",
    TUN: "tn",
    BEL: "be",
    EGY: "eg",
    IRN: "ir",
    NZL: "nz",
    ESP: "es",
    CPV: "cv",
    KSA: "sa",
    URU: "uy",
    FRA: "fr",
    SEN: "sn",
    IRQ: "iq",
    NOR: "no",
    ARG: "ar",
    ALG: "dz",
    AUT: "at",
    JOR: "jo",
    POR: "pt",
    COD: "cd",
    UZB: "uz",
    COL: "co",
    ENG: "gb-eng",
    CRO: "hr",
    GHA: "gh",
    PAN: "pa",
  };

  function flagImg(fifaCode) {
    const iso = FIFA_TO_ISO[fifaCode];
    if (!iso) return "";
    return `<img class="flag" src="https://flagcdn.com/w40/${iso}.png" alt="${fifaCode}" width="20" height="15">`;
  }

  const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
  const KNOCKOUT_ROUNDS = [
    { key: "Round of 32", slots: 16 },
    { key: "Round of 16", slots: 8 },
    { key: "Quarter-finals", slots: 4 },
    { key: "Semi-finals", slots: 2 },
    { key: "Final", slots: 1 },
  ];

  async function init() {
    let matches = [];
    let teamsData = [];

    try {
      const [matchRes, teamsRes] = await Promise.all([
        fetch(OPENFOOTBALL_URL),
        fetch("./data/teams/teams.json"),
      ]);
      const json = await matchRes.json();
      matches = json.matches || [];
      teamsData = await teamsRes.json();
    } catch (e) {
      console.error("Failed to fetch data:", e);
    }

    renderBracket(matches);
    renderGroups(matches, teamsData);

    // Wait for flag images to load before equalizing
    const flags = document.querySelectorAll(".group-card .flag");
    if (flags.length > 0) {
      let loaded = 0;
      const total = flags.length;
      const onLoad = () => {
        loaded++;
        if (loaded >= total) equalizeGroupHeights();
      };
      flags.forEach((img) => {
        if (img.complete) { loaded++; }
        else { img.addEventListener("load", onLoad); img.addEventListener("error", onLoad); }
      });
      if (loaded >= total) requestAnimationFrame(equalizeGroupHeights);
    } else {
      requestAnimationFrame(equalizeGroupHeights);
    }
  }

  function renderBracket(matches) {
    const container = document.getElementById("bracket");

    const tbd = { team1: "TBD", team2: "TBD", score: "vs", empty: true };

    function makeSlots(count) {
      return Array.from({ length: count }, () => ({ ...tbd }));
    }

    const leftRo32 = makeSlots(8);
    const rightRo32 = makeSlots(8);
    const leftRo16 = makeSlots(4);
    const rightRo16 = makeSlots(4);
    const leftQf = makeSlots(2);
    const rightQf = makeSlots(2);
    const leftSf = makeSlots(1);
    const rightSf = makeSlots(1);
    const finalMatch = makeSlots(1);

    const cols = [
      { label: "R32", matches: leftRo32 },
      { label: "R16", matches: leftRo16 },
      { label: "QF", matches: leftQf },
      { label: "SF", matches: leftSf },
      { label: "Final", matches: finalMatch },
      { label: "SF", matches: rightSf },
      { label: "QF", matches: rightQf },
      { label: "R16", matches: rightRo16 },
      { label: "R32", matches: rightRo32 },
    ];

    let html = '<div class="bracket-tree">';
    for (const col of cols) {
      html += `<div class="bracket-col">`;
      html += `<span class="bracket-col-label">${col.label}</span>`;
      for (const m of col.matches) {
        const cls = m.empty ? "bracket-match empty" : "bracket-match";
        html += `
          <div class="${cls}">
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

  function renderGroups(matches, teamsData) {
    const container = document.getElementById("groups-container");
    let html = "";

    for (const group of GROUPS) {
      const groupTeams = teamsData.filter((t) => t.group === group);
      const groupMatches = matches.filter((m) => m.group === group);
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
      stats[t.name] = {
        fifaCode: t.fifa_code,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0,
        ga: 0,
        pts: 0,
      };
    }

    for (const m of matches) {
      if (!m.score || !m.score.ft) continue;
      const [h, a] = m.score.ft;
      const t1 = findTeamName(m.team1, stats);
      const t2 = findTeamName(m.team2, stats);
      if (!t1 || !t2) continue;

      stats[t1].played++;
      stats[t2].played++;
      stats[t1].gf += h;
      stats[t1].ga += a;
      stats[t2].gf += a;
      stats[t2].ga += h;

      if (h > a) {
        stats[t1].won++;
        stats[t1].pts += 3;
        stats[t2].lost++;
      } else if (h < a) {
        stats[t2].won++;
        stats[t2].pts += 3;
        stats[t1].lost++;
      } else {
        stats[t1].drawn++;
        stats[t2].drawn++;
        stats[t1].pts += 1;
        stats[t2].pts += 1;
      }
    }

    return Object.entries(stats)
      .map(([team, s]) => ({
        team,
        flag: flagImg(s.fifaCode),
        ...s,
        gd: s.gf - s.ga,
      }))
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  }

  function findTeamName(matchName, stats) {
    if (stats[matchName]) return matchName;
    for (const name of Object.keys(stats)) {
      if (name.toLowerCase() === matchName.toLowerCase()) return name;
    }
    return null;
  }

  function renderTable(rows) {
    if (rows.length === 0) return '<p class="no-data">No teams yet</p>';

    let html = `<table class="group-table">
      <thead><tr><th></th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>
      <tbody>`;

    for (const r of rows) {
      html += `<tr>
        <td class="team-name">${r.flag} ${r.team}</td>
        <td>${r.played}</td>
        <td>${r.won}</td>
        <td>${r.drawn}</td>
        <td>${r.lost}</td>
        <td>${r.gd >= 0 ? "+" : ""}${r.gd}</td>
        <td><strong>${r.pts}</strong></td>
      </tr>`;
    }

    html += "</tbody></table>";
    return html;
  }

  function renderGroupFixtures(matches, teams) {
    if (matches.length === 0) {
      // Generate expected fixtures from team list
      if (teams.length < 4) return "";
      const names = teams.map((t) => t.name);
      let html = '<div class="group-fixtures">';
      const pairs = [
        [0, 1],
        [2, 3],
        [0, 2],
        [1, 3],
        [0, 3],
        [1, 2],
      ];
      for (const [i, j] of pairs) {
        html += `
          <div class="group-fixture upcoming">
            <span>${names[i]}</span>
            <span class="gf-score">vs</span>
            <span>${names[j]}</span>
          </div>
        `;
      }
      html += "</div>";
      return html;
    }

    let html = '<div class="group-fixtures">';
    for (const m of matches) {
      const score = m.score ? `${m.score.ft[0]} - ${m.score.ft[1]}` : "vs";
      const cls = m.score ? "" : "upcoming";
      html += `
        <div class="group-fixture ${cls}">
          <span>${m.team1}</span>
          <span class="gf-score">${score}</span>
          <span>${m.team2}</span>
        </div>
      `;
    }
    html += "</div>";
    return html;
  }

  function equalizeGroupHeights() {
    const cards = document.querySelectorAll(".group-card");
    if (cards.length === 0) return;

    // Reset heights first
    cards.forEach((card) => {
      card.querySelectorAll(".group-table tr").forEach((r) => (r.style.height = ""));
      card.querySelectorAll(".group-fixture").forEach((r) => (r.style.height = ""));
      const tbl = card.querySelector(".group-table");
      if (tbl) tbl.style.height = "";
    });

    // Find max table height
    let maxTableHeight = 0;
    cards.forEach((card) => {
      const tbl = card.querySelector(".group-table");
      if (tbl) maxTableHeight = Math.max(maxTableHeight, tbl.offsetHeight);
    });

    // Set all tables to same height
    cards.forEach((card) => {
      const tbl = card.querySelector(".group-table");
      if (tbl) tbl.style.height = maxTableHeight + "px";
    });

    // Equalize individual table row heights (row N across all cards)
    const maxRows = 5; // header + 4 teams
    for (let i = 0; i < maxRows; i++) {
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

    // Equalize fixture row heights
    const maxFixtures = 6;
    for (let i = 0; i < maxFixtures; i++) {
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
