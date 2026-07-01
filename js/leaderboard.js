const Leaderboard = (() => {
  function render(scores) {
    const container = document.getElementById("leaderboard-table");

    if (!scores || scores.length === 0) {
      container.innerHTML = '<p class="no-data">No scores yet</p>';
      return;
    }

    const header = `
      <div class="leaderboard-header">
        <span>#</span>
        <span>Player</span>
        <span style="text-align:right">Group</span>
        <span style="text-align:right">KO</span>
        <span style="text-align:right">Total</span>
      </div>
    `;

    const rows = scores
      .map((player, i) => {
        const rankClass =
          i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "";
        const b = player.breakdown || {};
        const groupPts = (b.group_matches || 0) + (b.group_standings || 0);
        const koPts =
          (b.round_of_32 || 0) +
          (b.round_of_16 || 0) +
          (b.quarter_finals || 0) +
          (b.semi_finals || 0) +
          (b.final || 0);
        return `
        <div class="leaderboard-row">
          <span class="rank ${rankClass}">${i + 1}</span>
          <span class="name">${player.name}</span>
          <span class="stage-pts">${groupPts}</span>
          <span class="stage-pts">${koPts}</span>
          <span class="points">${player.total}</span>
        </div>
      `;
      })
      .join("");

    container.innerHTML = header + rows;
  }

  return { render };
})();
