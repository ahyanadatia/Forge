import { fetchUpcomingHackathons } from '../../lib/hackathons';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
let cachedPayload = null;
let cacheTimestamp = 0;

export default async function handler(req, res) {
  try {
    const limitRaw = Array.isArray(req.query?.limit) ? req.query.limit[0] : req.query?.limit;
    const limit = Number.isFinite(Number(limitRaw)) ? Math.max(1, Math.min(30, Number(limitRaw))) : 12;
    const typeRaw = Array.isArray(req.query?.type) ? req.query.type[0] : req.query?.type;
    const type = typeof typeRaw === 'string' ? typeRaw.toLowerCase() : 'all';

    const applyTypeFilter = (items) => {
      if (type === 'university') return items.filter((item) => item.isUniversity);
      if (type === 'online') return items.filter((item) => item.isOnline);
      if (type === 'real' || type === 'inperson') return items.filter((item) => item.isInPerson);
      if (type === 'uk-university') return items.filter((item) => item.isUniversity && item.isUk);
      if (type === 'uk-real' || type === 'uk-inperson') return items.filter((item) => item.isInPerson && item.isUk);
      return items;
    };

    const now = Date.now();
    const isCacheFresh = cachedPayload && now - cacheTimestamp < ONE_DAY_MS;
    if (isCacheFresh) {
      const filtered = applyTypeFilter(cachedPayload.hackathons);
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=86400');
      return res.status(200).json({
        ...cachedPayload,
        cache: 'hit',
        type,
        count: filtered.slice(0, limit).length,
        hackathons: filtered.slice(0, limit),
      });
    }

    const allHackathons = await fetchUpcomingHackathons(30);
    const filteredAll = applyTypeFilter(allHackathons);
    const payload = {
      source: 'devpost+mlh',
      fetchedAt: new Date().toISOString(),
      hackathons: allHackathons,
    };

    cachedPayload = payload;
    cacheTimestamp = now;

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=86400');
    return res.status(200).json({
      ...payload,
      cache: 'miss',
      type,
      count: filteredAll.slice(0, limit).length,
      hackathons: filteredAll.slice(0, limit),
    });
  } catch (error) {
    if (cachedPayload) {
      const filtered = cachedPayload.hackathons.filter((item) => {
        if (type === 'university') return item.isUniversity;
        if (type === 'online') return item.isOnline;
        if (type === 'real' || type === 'inperson') return item.isInPerson;
        if (type === 'uk-university') return item.isUniversity && item.isUk;
        if (type === 'uk-real' || type === 'uk-inperson') return item.isInPerson && item.isUk;
        return true;
      });
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).json({
        ...cachedPayload,
        cache: 'stale-fallback',
        type,
        count: filtered.slice(0, 12).length,
        hackathons: filtered.slice(0, 12),
      });
    }
    return res.status(500).json({ error: 'Unable to load hackathons at this time.' });
  }
}
