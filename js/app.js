const App = (() => {
  const PREDICTIONS_DIR = "./data/predictions/";
  const PLAYERS_INDEX = "./data/predictions/index.yml";

  async function loadPredictions() {
    try {
      const res = await fetch(PLAYERS_INDEX);
      const indexYaml = await res.text();
      const playerFiles = jsyaml.load(indexYaml);
      const predictions = await Promise.all(
        playerFiles.map(async (file) => {
          const r = await fetch(PREDICTIONS_DIR + file);
          const text = await r.text();
          return jsyaml.load(text);
        }),
      );
      return predictions;
    } catch (e) {
      console.error("Failed to load predictions:", e);
      return [];
    }
  }

  async function init() {
    const [, predictions] = await Promise.all([
      Data.init(),
      loadPredictions(),
    ]);

    const results = Data.getMatches();

    Fixtures.renderTicker();
    Fixtures.renderRecentFixtures();

    const scores = Scoring.calculateAllPlayers(predictions, results);
    Leaderboard.render(scores);

    renderTopPerformers(predictions);

    Predictions.init(predictions, results);
  }

  function renderTopPerformers(predictions) {
    const container = document.getElementById("top-performers");
    const recent = Data.getRecentMatches();
    const results = Data.getMatches();

    if (recent.length === 0 || predictions.length === 0) {
      container.innerHTML = "";
      return;
    }

    const performers = predictions
      .map((player) => {
        let pts = 0;
        for (const match of recent) {
          pts += Scoring.getPointsForMatch(player, match, results);
        }
        return { name: player.name, pts };
      })
      .filter((p) => p.pts > 0)
      .sort((a, b) => b.pts - a.pts)
      .slice(0, 3);

    if (performers.length === 0) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = `
      <h3>Top performers (last ${recent.length} matches)</h3>
      ${performers.map((p) => `
        <div class="performer-row">
          <span>${p.name}</span>
          <span class="pts">+${p.pts}</span>
        </div>
      `).join("")}
    `;
  }

  document.addEventListener("DOMContentLoaded", init);
  return { init };
})();
