const Scoring = (() => {
  const ROUND_POINTS = {
    round_of_32: 2,
    round_of_16: 4,
    quarter_finals: 8,
    semi_finals: 16,
    final: 32,
  };

  const ROUND_NUM_RANGES = {
    round_of_32: [73, 88],
    round_of_16: [89, 96],
    quarter_finals: [97, 100],
    semi_finals: [101, 102],
  };

  function getActualKOMatch(round, index, results) {
    if (round === "final") {
      return results.find((m) => m.round === "Final");
    }
    const range = ROUND_NUM_RANGES[round];
    if (!range) return null;
    const num = range[0] + index;
    if (num > range[1]) return null;
    return results.find((m) => m.num === num);
  }

  function finalScore(score) {
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

  function actualWinnerName(match) {
    const side = actualWinnerSide(match.score);
    if (side === "home") return match.team1;
    if (side === "away") return match.team2;
    return null;
  }

  function findGroupMatch(pred, group, results) {
    const key = (pred.team1 + "|" + pred.team2).toLowerCase();
    return results.find(
      (m) => m.group === group && m.matchKey === key && m.score,
    );
  }

  function groupMatchPoints(pred, actual) {
    const ft = actual.score && actual.score.ft;
    if (!ft) return 0;
    if (pred.score[0] === ft[0] && pred.score[1] === ft[1]) return 1;
    return 0;
  }

  function groupStandingsPoints(predicted, actual) {
    if (!predicted || !actual || actual.length !== 4) return 0;
    const actualTop = new Set(actual.slice(0, 2));
    let pts = 0;
    predicted.forEach((team, i) => {
      if (actual[i] === team) pts += 0.5;
      const predictedInTopHalf = i < 2;
      const teamInActualTopHalf = actualTop.has(team);
      if (predictedInTopHalf === teamInActualTopHalf) pts += 0.5;
    });
    return pts;
  }

  function knockoutMatchPoints(pred, actual, round) {
    if (!actual || !actual.score) return 0;
    const total = ROUND_POINTS[round];
    if (!total) return 0;
    const half = total / 2;

    let pts = 0;
    const winner = actualWinnerName(actual);
    if (winner && pred.winner && pred.winner !== "TBD") {
      if (pred.winner.toLowerCase() === winner.toLowerCase()) {
        pts += half;
      }
    }

    const fs = finalScore(actual.score);
    if (fs && pred.score && pred.score[0] === fs[0] && pred.score[1] === fs[1]) {
      pts += half;
    }
    return pts;
  }

  function calculatePoints(playerPredictions, results) {
    const breakdown = {
      group_matches: 0,
      group_standings: 0,
      round_of_32: 0,
      round_of_16: 0,
      quarter_finals: 0,
      semi_finals: 0,
      final: 0,
    };

    if (playerPredictions.group_stage) {
      for (const [group, data] of Object.entries(playerPredictions.group_stage)) {
        if (data.standings) {
          const actualStandings = Data.getGroupStandings(group);
          breakdown.group_standings += groupStandingsPoints(data.standings, actualStandings);
        }
        if (!data.matches) continue;
        for (const pred of data.matches) {
          const actual = findGroupMatch(pred, group, results);
          if (!actual) continue;
          breakdown.group_matches += groupMatchPoints(pred, actual);
        }
      }
    }

    if (playerPredictions.knockout) {
      for (const round of Object.keys(ROUND_POINTS)) {
        const preds = playerPredictions.knockout[round];
        if (!preds) continue;
        preds.forEach((pred, i) => {
          const actual = getActualKOMatch(round, i, results);
          breakdown[round] += knockoutMatchPoints(pred, actual, round);
        });
      }
    }

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

  function getPointsForMatch(playerPredictions, match, results) {
    if (!match.score) return 0;

    if (match.group && playerPredictions.group_stage) {
      const data = playerPredictions.group_stage[match.group];
      if (!data || !data.matches) return 0;
      const pred = data.matches.find(
        (p) =>
          p.team1.toLowerCase() === match.team1.toLowerCase() &&
          p.team2.toLowerCase() === match.team2.toLowerCase(),
      );
      if (!pred) return 0;
      return groupMatchPoints(pred, match);
    }

    if (!playerPredictions.knockout) return 0;

    let round = null;
    let index = -1;
    if (match.round === "Final") {
      round = "final";
      index = 0;
    } else if (match.num != null) {
      for (const [r, [lo, hi]] of Object.entries(ROUND_NUM_RANGES)) {
        if (match.num >= lo && match.num <= hi) {
          round = r;
          index = match.num - lo;
          break;
        }
      }
    }
    if (!round) return 0;

    const preds = playerPredictions.knockout[round];
    if (!preds || !preds[index]) return 0;
    return knockoutMatchPoints(preds[index], match, round);
  }

  return { calculatePoints, calculateAllPlayers, getPointsForMatch };
})();
