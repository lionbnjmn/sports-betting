const Scoring = (() => {
  function getMatchOutcome(score) {
    if (!score || score.length < 2) return null;
    if (score[0] > score[1]) return 'home';
    if (score[0] < score[1]) return 'away';
    return 'draw';
  }

  function calculatePoints(playerPredictions, results) {
    const breakdown = {
      group_matches: 0,
      group_standings: 0,
      round_of_32: 0,
      round_of_16: 0,
      quarter_finals: 0,
      semi_finals: 0,
      final: 0
    };

    // Score group stage matches
    if (playerPredictions.group_stage) {
      for (const [group, data] of Object.entries(playerPredictions.group_stage)) {
        if (!data.matches) continue;
        for (const pred of data.matches) {
          const actual = results.find(m => m.num === pred.num && m.score);
          if (!actual) continue;

          const predOutcome = getMatchOutcome(pred.score);
          const actualOutcome = getMatchOutcome(actual.score.ft);

          // 1 point for correct outcome
          if (predOutcome === actualOutcome) {
            breakdown.group_matches += 1;
          }
          // Bonus: 2 extra points for exact score
          if (pred.score[0] === actual.score.ft[0] && pred.score[1] === actual.score.ft[1]) {
            breakdown.group_matches += 2;
          }
        }
      }
    }

    // TODO: Score group standings
    // TODO: Score knockout rounds (scaling points per round)
    // These will be implemented once the full point system is provided

    const total = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
    return { total, breakdown };
  }

  function calculateAllPlayers(allPredictions, results) {
    const scores = [];
    for (const player of allPredictions) {
      const { total, breakdown } = calculatePoints(player, results);
      scores.push({ name: player.name, total, breakdown });
    }
    scores.sort((a, b) => b.total - a.total);
    return scores;
  }

  function getPointsForMatch(playerPredictions, matchNum, results) {
    const actual = results.find(m => m.num === matchNum && m.score);
    if (!actual || !playerPredictions.group_stage) return 0;

    for (const [, data] of Object.entries(playerPredictions.group_stage)) {
      if (!data.matches) continue;
      const pred = data.matches.find(m => m.num === matchNum);
      if (!pred) continue;

      let pts = 0;
      const predOutcome = getMatchOutcome(pred.score);
      const actualOutcome = getMatchOutcome(actual.score.ft);
      if (predOutcome === actualOutcome) pts += 1;
      if (pred.score[0] === actual.score.ft[0] && pred.score[1] === actual.score.ft[1]) pts += 2;
      return pts;
    }
    return 0;
  }

  return { calculatePoints, calculateAllPlayers, getPointsForMatch };
})();
