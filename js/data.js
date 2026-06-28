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

  function getFifaCodeByName(name) {
    if (!teams) return null;
    if (!nameIndex) {
      nameIndex = new Map();
      for (const t of teams) {
        nameIndex.set(t.name.toLowerCase(), t.fifa_code);
        if (t.name_normalised) nameIndex.set(t.name_normalised.toLowerCase(), t.fifa_code);
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
  };
})();
