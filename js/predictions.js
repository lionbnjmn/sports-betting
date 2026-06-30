const Predictions = (() => {
  const KO_ROUNDS = [
    { label: "Round of 32", lo: 73, hi: 88 },
    { label: "Round of 16", lo: 89, hi: 96 },
    { label: "Quarter-finals", lo: 97, hi: 100 },
    { label: "Semi-finals", lo: 101, hi: 102 },
    { label: "Third place", lo: 103, hi: 103 },
    { label: "Final", lo: 104, hi: 104 },
  ];

  let allPredictions = [];
  let results = [];
  let resultsByNum = new Map();

  function init(predictions, matchResults) {
    allPredictions = predictions;
    results = matchResults;
    resultsByNum = new Map();
    for (const m of results) {
      if (m.num != null) resultsByNum.set(m.num, m);
      else if (m.round === "Final") resultsByNum.set(104, m);
    }
    populateDropdown();
    document
      .getElementById("player-select")
      .addEventListener("change", rerender);
    document
      .getElementById("stage-select")
      .addEventListener("change", rerender);
  }

  function populateDropdown() {
    const select = document.getElementById("player-select");
    select.innerHTML = '<option value="">Select someone</option>';
    for (const player of allPredictions) {
      const option = document.createElement("option");
      option.value = player.name;
      option.textContent = player.name;
      select.appendChild(option);
    }
  }

  function rerender() {
    const name = document.getElementById("player-select").value;
    const stage = document.getElementById("stage-select").value;
    const container = document.getElementById("player-predictions");
    if (!name) {
      container.innerHTML = "";
      return;
    }
    const player = allPredictions.find((p) => p.name === name);
    if (!player) return;

    if (stage === "group_stage") {
      renderGroupStage(player, container);
    } else {
      renderKnockout(player, container);
    }
  }

  function renderGroupStage(player, container) {
    let html = "";
    if (player.group_stage) {
      for (const [group, data] of Object.entries(player.group_stage)) {
        html += `<div class="prediction-group"><h3>Group ${group}</h3>`;
        if (data.matches) {
          for (const pred of data.matches) {
            const key = (pred.team1 + "|" + pred.team2).toLowerCase();
            const actual = results.find((m) => m.group === group && m.matchKey === key && m.score);
            let statusClass = "";
            let actualDisplay = "";

            if (actual) {
              const predHome = pred.score[0];
              const predAway = pred.score[1];
              const actHome = actual.score.ft[0];
              const actAway = actual.score.ft[1];

              statusClass =
                predHome === actHome && predAway === actAway
                  ? "correct"
                  : "wrong";
              actualDisplay = `<span class="actual-score">(${actHome}-${actAway})</span>`;
            }

            html += `
              <div class="prediction-match ${statusClass}">
                <span class="actual-slot"></span>
                <span class="team">${pred.team1}</span>
                <span class="pred-score">${pred.score[0]} - ${pred.score[1]}</span>
                <span class="team">${pred.team2}</span>
                <span class="actual-slot">${actualDisplay}</span>
              </div>
            `;
          }
        }
        html += "</div>";
      }
    }
    container.innerHTML = html || '<p class="no-data">No predictions available</p>';
  }

  function parsePredScore(s) {
    if (s == null) return null;
    if (Array.isArray(s) && s.length === 2) {
      const a = Number(s[0]);
      const b = Number(s[1]);
      if (Number.isFinite(a) && Number.isFinite(b)) return [a, b];
      return null;
    }
    if (typeof s === "string") {
      const m = s.match(/^\s*(\d+)\s*[-:]\s*(\d+)\s*$/);
      if (m) return [parseInt(m[1], 10), parseInt(m[2], 10)];
    }
    return null;
  }

  function predWinnerSide(score) {
    if (!score) return null;
    if (score[0] > score[1]) return "home";
    if (score[1] > score[0]) return "away";
    return null;
  }

  function actualFinalScore(score) {
    if (!score) return null;
    return score.et || score.ft || null;
  }

  function actualWinnerSide(score) {
    if (!score) return null;
    if (score.p) {
      if (score.p[0] > score.p[1]) return "home";
      if (score.p[1] > score.p[0]) return "away";
    }
    if (score.et) {
      if (score.et[0] > score.et[1]) return "home";
      if (score.et[1] > score.et[0]) return "away";
    }
    if (score.ft) {
      if (score.ft[0] > score.ft[1]) return "home";
      if (score.ft[1] > score.ft[0]) return "away";
    }
    return null;
  }

  function renderKnockout(player, container) {
    const preds = Array.isArray(player.knockout) ? player.knockout : [];
    if (preds.length === 0) {
      container.innerHTML = '<p class="no-data">No knockout predictions yet</p>';
      return;
    }
    const byNum = new Map(preds.map((p) => [p.num, p]));

    let html = "";
    for (const round of KO_ROUNDS) {
      html += `<div class="prediction-group"><h3>${round.label}</h3>`;
      for (let num = round.lo; num <= round.hi; num++) {
        const pred = byNum.get(num);
        if (!pred) continue;
        html += renderKoMatch(pred);
      }
      html += "</div>";
    }
    container.innerHTML = html;
  }

  function renderKoMatch(pred) {
    const predScore = parsePredScore(pred.score);
    const actual = resultsByNum.get(pred.num);
    const fs = actual ? actualFinalScore(actual.score) : null;

    let statusClass = "";
    let actualDisplay = "";
    if (fs) {
      const aSide = actualWinnerSide(actual.score);
      const pSide = predWinnerSide(predScore);
      const scoreMatch = predScore && predScore[0] === fs[0] && predScore[1] === fs[1];
      if (scoreMatch) statusClass = "correct";
      else if (pSide && aSide && pSide === aSide) statusClass = "partial";
      else statusClass = "wrong";
      actualDisplay = `<span class="actual-score">(${fs[0]}-${fs[1]})</span>`;
    }

    const predScoreDisplay = predScore ? `${predScore[0]} - ${predScore[1]}` : "—";
    return `
      <div class="prediction-match ${statusClass}">
        <span class="actual-slot"></span>
        <span class="team">${pred.team1}</span>
        <span class="pred-score">${predScoreDisplay}</span>
        <span class="team">${pred.team2}</span>
        <span class="actual-slot">${actualDisplay}</span>
      </div>
    `;
  }

  return { init };
})();
