function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function scaleTo100(value, maxExpected) {
  if (maxExpected <= 0) return 0;
  return clamp((value / maxExpected) * 100);
}

export function calculateScores({ repos = [], events = [] } = {}) {
  const safeRepos = Array.isArray(repos) ? repos : [];
  const safeEvents = Array.isArray(events) ? events : [];

  const ownedRepos = safeRepos.filter((repo) => !repo?.fork);
  const uniqueLanguages = new Set(ownedRepos.map((repo) => repo?.language).filter(Boolean));
  const totalStars = ownedRepos.reduce((sum, repo) => sum + (repo?.stargazers_count || 0), 0);

  const pushEvents = safeEvents.filter((event) => event?.type === 'PushEvent');
  const totalPushedCommits = pushEvents.reduce(
    (sum, event) => sum + (Array.isArray(event?.payload?.commits) ? event.payload.commits.length : 0),
    0
  );

  const activeDays = new Set(safeEvents.map((event) => event?.created_at?.slice(0, 10)).filter(Boolean)).size;

  const now = Date.now();
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

  const recent7Events = safeEvents.filter((event) => {
    const ts = new Date(event?.created_at || 0).getTime();
    return Number.isFinite(ts) && ts >= sevenDaysAgo;
  }).length;

  const recent30Events = safeEvents.filter((event) => {
    const ts = new Date(event?.created_at || 0).getTime();
    return Number.isFinite(ts) && ts >= thirtyDaysAgo;
  }).length;

  const lastEventTimestamp = safeEvents[0]?.created_at ? new Date(safeEvents[0].created_at).getTime() : 0;
  const daysSinceLastEvent = lastEventTimestamp ? (now - lastEventTimestamp) / (24 * 60 * 60 * 1000) : 365;

  const repoCountScore = scaleTo100(ownedRepos.length, 12);
  const languageScore = scaleTo100(uniqueLanguages.size, 8);
  const starsScore = scaleTo100(totalStars, 120);
  const commitsScore = scaleTo100(totalPushedCommits, 120);

  const activityConsistencyScore = scaleTo100(activeDays, 25);
  const weeklyMomentumScore = scaleTo100(recent7Events, 20);
  const monthlyMomentumScore = scaleTo100(recent30Events, 80);

  const recencyScore = clamp(100 - scaleTo100(daysSinceLastEvent, 30));

  const technicalCredibility = Math.round(
    0.3 * commitsScore +
    0.25 * languageScore +
    0.25 * repoCountScore +
    0.2 * starsScore
  );

  const execution = Math.round(
    0.45 * activityConsistencyScore +
    0.35 * monthlyMomentumScore +
    0.2 * weeklyMomentumScore
  );

  const reliabilityScore = Math.round(
    0.6 * recencyScore +
    0.4 * activityConsistencyScore
  );

  const composite = Math.round(
    0.4 * technicalCredibility +
    0.35 * execution +
    0.25 * reliabilityScore
  );

  return {
    technicalCredibility: clamp(technicalCredibility),
    execution: clamp(execution),
    reliabilityScore: clamp(reliabilityScore),
    composite: clamp(composite),
    metrics: {
      repoCount: ownedRepos.length,
      languageCount: uniqueLanguages.size,
      totalStars,
      pushedCommits: totalPushedCommits,
      activeDays,
      eventsLast7Days: recent7Events,
      eventsLast30Days: recent30Events,
      daysSinceLastEvent: Math.max(0, Math.round(daysSinceLastEvent)),
    },
  };
}
