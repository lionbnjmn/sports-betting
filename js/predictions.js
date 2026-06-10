const Predictions = (() => {
  let allPredictions = [];
  let results = [];

  function init(predictions, matchResults) {
    allPredictions = predictions;
    results = matchResults;
    populateDropdown();
    document
      .getElementById("player-select")
      .addEventListener("change", onPlayerSelect);
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

  function onPlayerSelect(e) {
    const name = e.target.value;
    const container = document.getElementById("player-predictions");
    if (!name) {
      container.innerHTML = "";
      return;
    }

    const player = allPredictions.find((p) => p.name === name);
    if (!player) return;

    renderPredictions(player, container);
  }

  function renderPredictions(player, container) {
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

    if (!html) {
      html = '<p class="no-data">No predictions available</p>';
    }

    container.innerHTML = html;
  }

  return { init };
})();
