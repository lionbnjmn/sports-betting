(() => {
  const OPENFOOTBALL_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

  const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const KNOCKOUT_ROUNDS = [
    { key: 'Round of 32', slots: 16 },
    { key: 'Round of 16', slots: 8 },
    { key: 'Quarter-finals', slots: 4 },
    { key: 'Semi-finals', slots: 2 },
    { key: 'Final', slots: 1 }
  ];

  async function init() {
    let matches = [];
    try {
      const res = await fetch(OPENFOOTBALL_URL);
      const json = await res.json();
      matches = json.matches || [];
    } catch (e) {
      console.error('Failed to fetch fixtures:', e);
    }

    renderBracket(matches);
    renderGroups(matches);
  }

  function renderBracket(matches) {
    const container = document.getElementById('bracket');
    let html = '';

    for (const round of KNOCKOUT_ROUNDS) {
      const roundMatches = matches.filter(m =>
        m.round && m.round.toLowerCase().includes(round.key.toLowerCase())
      );

      html += `<div class="bracket-round"><h3>${round.key}</h3>`;

      if (roundMatches.length > 0) {
        for (const m of roundMatches) {
          const score = m.score ? `${m.score.ft[0]} - ${m.score.ft[1]}` : 'vs';
          html += `
            <div class="bracket-match">
              <span>${m.team1}</span>
              <span class="bracket-score">${score}</span>
              <span>${m.team2}</span>
            </div>
          `;
        }
      } else {
        for (let i = 0; i < round.slots; i++) {
          html += `
            <div class="bracket-match empty">
              <span>TBD</span>
              <span class="bracket-score">vs</span>
              <span>TBD</span>
            </div>
          `;
        }
      }

      html += '</div>';
    }

    container.innerHTML = html;
  }

  function renderGroups(matches) {
    const container = document.getElementById('groups-container');
    let html = '';

    for (const group of GROUPS) {
      const groupMatches = matches.filter(m => m.group === group);
      const teams = extractTeams(groupMatches);
      const table = buildTable(teams, groupMatches);

      html += `<div class="group-card">`;
      html += `<h3>Group ${group}</h3>`;
      html += renderTable(table);
      html += renderGroupFixtures(groupMatches);
      html += `</div>`;
    }

    container.innerHTML = html;
  }

  function extractTeams(matches) {
    const teams = new Set();
    for (const m of matches) {
      if (m.team1) teams.add(m.team1);
      if (m.team2) teams.add(m.team2);
    }
    return Array.from(teams);
  }

  function buildTable(teams, matches) {
    const stats = {};
    for (const t of teams) {
      stats[t] = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 };
    }

    for (const m of matches) {
      if (!m.score || !m.score.ft) continue;
      const [h, a] = m.score.ft;
      stats[m.team1].played++;
      stats[m.team2].played++;
      stats[m.team1].gf += h;
      stats[m.team1].ga += a;
      stats[m.team2].gf += a;
      stats[m.team2].ga += h;

      if (h > a) {
        stats[m.team1].won++;
        stats[m.team1].pts += 3;
        stats[m.team2].lost++;
      } else if (h < a) {
        stats[m.team2].won++;
        stats[m.team2].pts += 3;
        stats[m.team1].lost++;
      } else {
        stats[m.team1].drawn++;
        stats[m.team2].drawn++;
        stats[m.team1].pts += 1;
        stats[m.team2].pts += 1;
      }
    }

    return Object.entries(stats)
      .map(([team, s]) => ({ team, ...s, gd: s.gf - s.ga }))
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  }

  function renderTable(rows) {
    if (rows.length === 0) return '<p class="no-data">No teams yet</p>';

    let html = `<table class="group-table">
      <thead><tr><th></th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>
      <tbody>`;

    for (const r of rows) {
      html += `<tr>
        <td class="team-name">${r.team}</td>
        <td>${r.played}</td>
        <td>${r.won}</td>
        <td>${r.drawn}</td>
        <td>${r.lost}</td>
        <td>${r.gd >= 0 ? '+' : ''}${r.gd}</td>
        <td><strong>${r.pts}</strong></td>
      </tr>`;
    }

    html += '</tbody></table>';
    return html;
  }

  function renderGroupFixtures(matches) {
    if (matches.length === 0) return '';

    let html = '<div class="group-fixtures">';
    for (const m of matches) {
      const score = m.score ? `${m.score.ft[0]} - ${m.score.ft[1]}` : 'vs';
      const cls = m.score ? '' : 'upcoming';
      html += `
        <div class="group-fixture ${cls}">
          <span>${m.team1}</span>
          <span class="gf-score">${score}</span>
          <span>${m.team2}</span>
        </div>
      `;
    }
    html += '</div>';
    return html;
  }

  document.addEventListener('DOMContentLoaded', init);
})();
