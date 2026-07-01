const Data = (() => {
  const OPENFOOTBALL_URL =
    "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";
  // const OPENFOOTBALL_URL = "http://localhost:8081";
  const ROOT = new URL("../", document.currentScript.src).href;
  const TEAMS_URL = ROOT + "data/bracket/teams.json";
  const CACHE_KEY = "wc2026_results";
  const CACHE_TTL = 2 * 60 * 1000;

  const FIFA_TO_ISO = {
    MEX: "mx",
    RSA: "za",
    KOR: "kr",
    CZE: "cz",
    CAN: "ca",
    BIH: "ba",
    QAT: "qa",
    SUI: "ch",
    BRA: "br",
    MAR: "ma",
    HAI: "ht",
    SCO: "gb-sct",
    USA: "us",
    PAR: "py",
    AUS: "au",
    TUR: "tr",
    GER: "de",
    CUW: "cw",
    CIV: "ci",
    ECU: "ec",
    NED: "nl",
    JPN: "jp",
    SWE: "se",
    TUN: "tn",
    BEL: "be",
    EGY: "eg",
    IRN: "ir",
    NZL: "nz",
    ESP: "es",
    CPV: "cv",
    KSA: "sa",
    URU: "uy",
    FRA: "fr",
    SEN: "sn",
    IRQ: "iq",
    NOR: "no",
    ARG: "ar",
    ALG: "dz",
    AUT: "at",
    JOR: "jo",
    POR: "pt",
    COD: "cd",
    UZB: "uz",
    COL: "co",
    ENG: "gb-eng",
    CRO: "hr",
    GHA: "gh",
    PAN: "pa",
  };

  let matches = null;
  let teams = null;
  let nameIndex = null;

  function parseTime(timeStr, dateStr) {
    const [hhmm, utcPart] = timeStr.split(" ");
    const [h, m] = hhmm.split(":").map(Number);
    const offsetMatch = utcPart.match(/UTC([+-]?\d+)/);
    const offset = offsetMatch ? parseInt(offsetMatch[1]) : 0;
    const localMs = new Date(`${dateStr}T${hhmm}:00Z`).getTime();
    return localMs - offset * 3600000;
  }

  function normalizeMatch(raw) {
    return {
      team1: raw.team1,
      team2: raw.team2,
      date: raw.date,
      time: parseTime(raw.time, raw.date),
      group: raw.group ? raw.group.replace("Group ", "") : null,
      round: raw.round,
      num: raw.num || null,
      ground: raw.ground || null,
      score: raw.score || null,
      matchKey: raw.group ? (raw.team1 + "|" + raw.team2).toLowerCase() : null,
    };
  }

  async function init() {
    const [matchData, teamsData] = await Promise.all([
      fetchMatches(),
      fetchTeams(),
    ]);
    matches = matchData;
    teams = teamsData;
  }

  async function fetchMatches() {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) return data;
    }
    try {
      const res = await fetch(OPENFOOTBALL_URL);
      const json = await res.json();
      const raw = json.matches || [];
      const data = raw.map(normalizeMatch).sort((a, b) => a.time - b.time);
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ data, timestamp: Date.now() }),
      );
      return data;
    } catch (e) {
      console.error("Failed to fetch match data:", e);
      return [];
    }
  }

  async function fetchTeams() {
    try {
      const res = await fetch(TEAMS_URL);
      return await res.json();
    } catch (e) {
      console.error("Failed to fetch teams data:", e);
      return [];
    }
  }

  function getMatches() {
    return matches || [];
  }

  function getTeams() {
    return teams || [];
  }

  function getTeamsByGroup(group) {
    return (teams || []).filter((t) => t.group === group);
  }

  function getMatchesByGroup(group) {
    return (matches || []).filter((m) => m.group === group);
  }

  function getPlayedMatches() {
    return (matches || []).filter((m) => m.score && m.score.ft);
  }

  function getRecentMatches(count = 3) {
    return getPlayedMatches().slice(-count);
  }

  function getLiveMatches() {
    const now = Date.now();
    return (matches || []).filter((m) => {
      if (m.score && m.score.ft) return false;
      if (!m.time) return false;
      const elapsed = now - m.time;
      return elapsed > 0 && elapsed < 3 * 3600000;
    });
  }

  function isBracketPlaceholder(s) {
    return typeof s === "string" && /^[WL]\d+$/.test(s.trim());
  }

  function buildKnownNameSet() {
    const set = new Set();
    for (const t of teams || []) {
      if (t.name) set.add(t.name.toLowerCase());
      if (t.name_normalised) set.add(t.name_normalised.toLowerCase());
    }
    return set;
  }

  function validatePredictionTeams(allPredictions) {
    if (!teams) return [];
    const known = buildKnownNameSet();
    const issues = [];

    const check = (player, location, value) => {
      if (value == null || value === "") return;
      const str = String(value).trim();
      if (!str) return;
      if (isBracketPlaceholder(str)) return;
      if (known.has(str.toLowerCase())) return;
      issues.push({ player: player.name, location, value: str });
    };

    for (const player of allPredictions || []) {
      if (Array.isArray(player.knockout)) {
        for (const pred of player.knockout) {
          check(player, `knockout #${pred.num} team1`, pred.team1);
          check(player, `knockout #${pred.num} team2`, pred.team2);
        }
      }
      check(player, "winner", player.winner);
    }

    if (issues.length > 0) {
      console.warn(
        `[Predictions] ${issues.length} unknown team name(s) — must match "name" (or "name_normalised") in data/bracket/teams.json:`,
      );
      for (const i of issues) {
        console.warn(`  ${i.player} · ${i.location}: "${i.value}"`);
      }
    }
    return issues;
  }

  function getFifaCodeByName(name) {
    if (!teams) return null;
    if (!nameIndex) {
      nameIndex = new Map();
      for (const t of teams) {
        nameIndex.set(t.name.toLowerCase(), t.fifa_code);
        if (t.name_normalised)
          nameIndex.set(t.name_normalised.toLowerCase(), t.fifa_code);
      }
    }
    return nameIndex.get((name || "").toLowerCase()) || null;
  }

  function flagImg(fifaCode) {
    const iso = FIFA_TO_ISO[fifaCode];
    if (!iso) return "";
    return `<img class="flag" src="https://flagcdn.com/w40/${iso}.png" alt="${fifaCode}" width="20" height="15">`;
  }

  function findTeamName(name, statsMap) {
    if (statsMap[name]) return name;
    for (const key of Object.keys(statsMap)) {
      if (key.toLowerCase() === name.toLowerCase()) return key;
    }
    return null;
  }

  function buildGroupTable(group) {
    const groupTeams = getTeamsByGroup(group);
    const groupMatches = getMatchesByGroup(group);
    const stats = {};
    for (const t of groupTeams) {
      stats[t.name] = {
        team: t.name,
        fifaCode: t.fifa_code,
        played: 0, won: 0, drawn: 0, lost: 0,
        gf: 0, ga: 0, pts: 0,
      };
    }
    for (const m of groupMatches) {
      if (!m.score || !m.score.ft) continue;
      const [h, a] = m.score.ft;
      const t1 = findTeamName(m.team1, stats);
      const t2 = findTeamName(m.team2, stats);
      if (!t1 || !t2) continue;
      stats[t1].played++; stats[t2].played++;
      stats[t1].gf += h; stats[t1].ga += a;
      stats[t2].gf += a; stats[t2].ga += h;
      if (h > a)      { stats[t1].won++;   stats[t1].pts += 3; stats[t2].lost++; }
      else if (h < a) { stats[t2].won++;   stats[t2].pts += 3; stats[t1].lost++; }
      else            { stats[t1].drawn++; stats[t2].drawn++; stats[t1].pts++; stats[t2].pts++; }
    }
    const rows = Object.values(stats).map((s) => ({
      ...s,
      flag: flagImg(s.fifaCode),
      gd: s.gf - s.ga,
    }));
    rows.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    return applyHeadToHead(rows, groupMatches);
  }

  function applyHeadToHead(rows, groupMatches) {
    const out = [];
    let i = 0;
    while (i < rows.length) {
      let j = i + 1;
      while (j < rows.length && rows[j].pts === rows[i].pts) j++;
      const block = rows.slice(i, j);
      out.push(...(block.length > 1 ? sortByHeadToHead(block, groupMatches) : block));
      i = j;
    }
    return out;
  }

  function sortByHeadToHead(block, groupMatches) {
    const teams = new Set(block.map((r) => r.team));
    const h2h = {};
    for (const r of block) h2h[r.team] = { pts: 0, gd: 0, gf: 0 };
    for (const m of groupMatches) {
      if (!m.score || !m.score.ft) continue;
      if (!teams.has(m.team1) || !teams.has(m.team2)) continue;
      const [h, a] = m.score.ft;
      h2h[m.team1].gf += h; h2h[m.team2].gf += a;
      h2h[m.team1].gd += h - a; h2h[m.team2].gd += a - h;
      if (h > a)      h2h[m.team1].pts += 3;
      else if (h < a) h2h[m.team2].pts += 3;
      else            { h2h[m.team1].pts++; h2h[m.team2].pts++; }
    }
    return [...block].sort((a, b) => {
      const A = h2h[a.team], B = h2h[b.team];
      return B.pts - A.pts || B.gd - A.gd || B.gf - A.gf
        || b.gd - a.gd || b.gf - a.gf;
    });
  }

  function getGroupStandings(group) {
    return buildGroupTable(group).map((r) => r.team);
  }

  return {
    init,
    getMatches,
    getTeams,
    getTeamsByGroup,
    getMatchesByGroup,
    getPlayedMatches,
    getRecentMatches,
    getLiveMatches,
    flagImg,
    getFifaCodeByName,
    findTeamName,
    buildGroupTable,
    getGroupStandings,
    validatePredictionTeams,
  };
})();
