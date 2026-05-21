const Fixtures = (() => {
  // const OPENFOOTBALL_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';
  const OPENFOOTBALL_URL = 'http://localhost:8081';
  const CACHE_KEY = 'wc2026_results';
  const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

  let matchData = null;

  async function fetchResults() {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        matchData = data;
        return data;
      }
    }

    try {
      const res = await fetch(OPENFOOTBALL_URL);
      const json = await res.json();
      matchData = json.matches || [];
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data: matchData, timestamp: Date.now() }));
      return matchData;
    } catch (e) {
      console.error('Failed to fetch OpenFootball data:', e);
      return matchData || [];
    }
  }

  function getPlayedMatches(matches) {
    return matches.filter(m => m.score && m.score.ft);
  }

  function getRecentMatches(matches, count = 3) {
    const played = getPlayedMatches(matches);
    return played.slice(-count);
  }

  function getTodayMatches(matches) {
    const today = new Date().toISOString().split('T')[0];
    return matches.filter(m => m.date === today);
  }

  function getLiveMatches(matches) {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    return matches.filter(m => {
      if (m.date !== today) return false;
      if (m.score && m.score.ft) return false; // already finished
      if (!m.time) return false;
      const [hours, minutes] = m.time.split(':');
      const matchStart = new Date(today + 'T' + hours + ':' + minutes + ':00');
      return now >= matchStart;
    });
  }

  function renderTicker(matches) {
    const ticker = document.getElementById('ticker');
    const live = getLiveMatches(matches);

    if (live.length === 0) {
      ticker.classList.add('hidden');
      return;
    }

    ticker.classList.remove('hidden');
    ticker.innerHTML = live.map(m => `
      <div class="ticker-match">
        <span class="live-dot"></span>
        <span>${m.team1}</span>
        <span>${m.score ? m.score.ft[0] + ' - ' + m.score.ft[1] : 'vs'}</span>
        <span>${m.team2}</span>
      </div>
    `).join('');
  }

  function renderRecentFixtures(matches) {
    const container = document.getElementById('recent-fixtures');
    const recent = getRecentMatches(matches);

    if (recent.length === 0) {
      container.innerHTML = '<p class="no-data">No matches played yet</p>';
      return;
    }

    container.innerHTML = recent.map(m => `
      <div class="fixture-card">
        <span class="team">${m.team1}</span>
        <span class="score">${m.score.ft[0]} - ${m.score.ft[1]}</span>
        <span class="team">${m.team2}</span>
      </div>
    `).join('');
  }

  function getMatches() {
    return matchData || [];
  }

  return { fetchResults, renderTicker, renderRecentFixtures, getPlayedMatches, getRecentMatches, getMatches };
})();
