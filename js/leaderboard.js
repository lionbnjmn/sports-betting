const Leaderboard = (() => {
  function render(scores) {
    const container = document.getElementById('leaderboard-table');

    if (!scores || scores.length === 0) {
      container.innerHTML = '<p class="no-data">No scores yet</p>';
      return;
    }

    const header = `
      <div class="leaderboard-header">
        <span>#</span>
        <span>Player</span>
        <span style="text-align:right">Points</span>
      </div>
    `;

    const rows = scores.map((player, i) => {
      const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
      return `
        <div class="leaderboard-row">
          <span class="rank ${rankClass}">${i + 1}</span>
          <span class="name">${player.name}</span>
          <span class="points">${player.total}</span>
        </div>
      `;
    }).join('');

    container.innerHTML = header + rows;
  }

  return { render };
})();
