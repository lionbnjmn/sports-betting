const Fixtures = (() => {
  function renderTicker() {
    const ticker = document.getElementById("ticker");
    const live = Data.getLiveMatches();

    if (live.length === 0) {
      ticker.classList.add("hidden");
      return;
    }

    ticker.classList.remove("hidden");
    ticker.innerHTML = live.map((m) => `
      <div class="ticker-match">
        <span class="live-dot"></span>
        <span>${m.team1}</span>
        <span>${m.score ? m.score.ft[0] + " - " + m.score.ft[1] : "vs"}</span>
        <span>${m.team2}</span>
      </div>
    `).join("");
  }

  function renderRecentFixtures() {
    const container = document.getElementById("recent-fixtures");
    const recent = Data.getRecentMatches();

    if (recent.length === 0) {
      container.innerHTML = '<p class="no-data">No matches played yet</p>';
      return;
    }

    container.innerHTML = recent.map((m) => `
      <div class="fixture-card">
        <span class="team">${m.team1}</span>
        <span class="score">${m.score.ft[0]} - ${m.score.ft[1]}</span>
        <span class="team">${m.team2}</span>
      </div>
    `).join("");
  }

  return { renderTicker, renderRecentFixtures };
})();
