const DEVPOST_OPEN_API_URL = 'https://devpost.com/api/hackathons?status[]=open&per_page=40';
const DEVPOST_INPERSON_API_URL = 'https://devpost.com/api/hackathons?status[]=open&challenge_type[]=in-person&per_page=40';
const DEVPOST_UPCOMING_API_URL = 'https://devpost.com/api/hackathons?status[]=upcoming&per_page=40';
const DEVPOST_UPCOMING_INPERSON_API_URL = 'https://devpost.com/api/hackathons?status[]=upcoming&challenge_type[]=in-person&per_page=40';
const DEVPOST_UK_API_URL = 'https://devpost.com/api/hackathons?status[]=open&status[]=upcoming&search=UK+university&per_page=40';
const MLH_EVENTS_URL = 'https://mlh.io/seasons/2026/events';
const MLH_EU_EVENTS_URL = 'https://mlh.io/seasons/2026/events?location=Europe';

const UNIVERSITY_PATTERN = /\b(university|college|campus|institute|iit|mit|stanford|oxford|harvard|school|student|collegiate|undergraduate|graduate|ucl|imperial|kings college|lse|warwick|durham|southampton|manchester|cambridge)\b/i;
const UK_PATTERN = /\b(uk|u\.k\.|united kingdom|england|scotland|wales|northern ireland|london|manchester|birmingham|leeds|bristol|glasgow|edinburgh|cardiff|belfast|liverpool|sheffield|newcastle|nottingham|southampton|cambridge|oxford)\b/i;

const COUNTRY_CODE_MAP = {
  US: 'United States', CA: 'Canada', GB: 'United Kingdom', UK: 'United Kingdom',
  DE: 'Germany', FR: 'France', IN: 'India', AU: 'Australia', NL: 'Netherlands',
  IE: 'Ireland', ES: 'Spain', IT: 'Italy', BR: 'Brazil', JP: 'Japan',
  KR: 'South Korea', SG: 'Singapore', SE: 'Sweden', CH: 'Switzerland',
  PL: 'Poland', PT: 'Portugal', MX: 'Mexico', IL: 'Israel', AE: 'UAE',
  HK: 'Hong Kong', TW: 'Taiwan', NZ: 'New Zealand', BE: 'Belgium',
  AT: 'Austria', NO: 'Norway', DK: 'Denmark', FI: 'Finland', CZ: 'Czech Republic',
  RO: 'Romania', HU: 'Hungary', GR: 'Greece', TR: 'Turkey', PH: 'Philippines',
  MY: 'Malaysia', TH: 'Thailand', ID: 'Indonesia', VN: 'Vietnam', PK: 'Pakistan',
  NG: 'Nigeria', KE: 'Kenya', ZA: 'South Africa', EG: 'Egypt', CO: 'Colombia',
  AR: 'Argentina', CL: 'Chile', PE: 'Peru',
};

const LOCATION_COUNTRY_PATTERNS = [
  [/\bunited states\b|\busa\b|\bu\.s\.a?\b/i, 'United States'],
  [/\bunited kingdom\b/i, 'United Kingdom'],
  [/\bengland\b|\bscotland\b|\bwales\b|\bnorthern ireland\b/i, 'United Kingdom'],
  [/,\s*(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/i, 'United States'],
  [/\bcanada\b/i, 'Canada'],
  [/\bgermany\b|\bdeutschland\b/i, 'Germany'],
  [/\bfrance\b/i, 'France'],
  [/\bindia\b/i, 'India'],
  [/\baustralia\b/i, 'Australia'],
  [/\bsingapore\b/i, 'Singapore'],
  [/\bireland\b/i, 'Ireland'],
  [/\bspain\b/i, 'Spain'],
  [/\bitaly\b/i, 'Italy'],
  [/\bbrazil\b|\bbrasil\b/i, 'Brazil'],
  [/\bjapan\b/i, 'Japan'],
  [/\bnetherlands\b|\bholland\b/i, 'Netherlands'],
  [/\bsouth korea\b|\bkorea\b/i, 'South Korea'],
  [/\bswitzerland\b/i, 'Switzerland'],
  [/\bsweden\b/i, 'Sweden'],
  [/\bpoland\b/i, 'Poland'],
  [/\bnigeria\b/i, 'Nigeria'],
  [/\bmexico\b/i, 'Mexico'],
  [/\bisrael\b/i, 'Israel'],
  [/\bturkey\b|\btürkiye\b/i, 'Turkey'],
  [/\bchina\b/i, 'China'],
  [/\bmalaysia\b/i, 'Malaysia'],
  [/\bphilippines\b/i, 'Philippines'],
  [/\bpakistan\b/i, 'Pakistan'],
  [/\bkenya\b/i, 'Kenya'],
  [/\bsouth africa\b/i, 'South Africa'],
];

function detectCountry(locationText, countryCode) {
  if (countryCode) {
    const upper = countryCode.toUpperCase();
    if (COUNTRY_CODE_MAP[upper]) return COUNTRY_CODE_MAP[upper];
  }
  if (!locationText) return 'Unknown';
  for (const [pattern, country] of LOCATION_COUNTRY_PATTERNS) {
    if (pattern.test(locationText)) return country;
  }
  // Check if last segment after comma looks like a country
  const segments = locationText.split(',').map(s => s.trim()).filter(Boolean);
  if (segments.length >= 2) {
    const last = segments[segments.length - 1];
    // Check country code map values
    for (const name of Object.values(COUNTRY_CODE_MAP)) {
      if (last.toLowerCase() === name.toLowerCase()) return name;
    }
  }
  return 'Unknown';
}

async function fetchDevpostList(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'forge-app/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Upstream fetch failed with status ${response.status}`);
  }

  const payload = await response.json();
  return Array.isArray(payload?.hackathons) ? payload.hackathons : [];
}

function decodeHtml(input) {
  return (input || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<!--\s*-->/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractFirst(text, regex) {
  const match = text.match(regex);
  return match ? decodeHtml(match[1]) : '';
}

async function fetchMlhEvents(url) {
  const response = await fetch(url || MLH_EVENTS_URL, {
    headers: {
      Accept: 'text/html',
      'User-Agent': 'forge-app/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`MLH fetch failed with status ${response.status}`);
  }

  const html = await response.text();
  const cards = html.match(/<a class="block no-underline hover:no-underline"[\s\S]*?<\/a>/g) || [];

  return cards.map((card, index) => {
    const url = extractFirst(card, /href="([^"]+)"/i);
    const name = extractFirst(card, /<h3[^>]*>[\s\S]*?<span itemProp="name">([\s\S]*?)<\/span>/i)
      || extractFirst(card, /<span itemProp="name">([\s\S]*?)<\/span>/i);
    const date = extractFirst(card, /<p class="text-gray-600 text-sm mb-1">([\s\S]*?)<meta itemProp="startDate"/i);
    const location = extractFirst(card, /<p class="font-bold text-gray-700 mb-3">([\s\S]*?)<\/p>/i) || 'Location not announced';
    const countryCode = extractFirst(card, /itemProp="addressCountry" content="([^"]+)"/i);
    const attendanceMode = extractFirst(card, /itemProp="eventAttendanceMode" content="([^"]+)"/i);
    const organizer = 'Major League Hacking';
    const isOnlineFromMode = /OnlineEventAttendanceMode/i.test(attendanceMode);
    const isOnlineFromLocation = /\b(online|virtual|remote|worldwide|everywhere|discord)\b/i.test(location);
    const isOnline = isOnlineFromMode || isOnlineFromLocation;

    return {
      id: `mlh-${index}-${name || 'event'}`,
      title: name || 'MLH Hackathon',
      url,
      submission_period_dates: date || 'Dates not announced',
      displayed_location: {
        location,
      },
      organization_name: organizer,
      open_state: 'upcoming',
      time_left_to_submission: 'Upcoming',
      registrations_count: 0,
      thumbnail_url: null,
      themes: [],
      countryCode,
      isOnlineOverride: isOnline,
    };
  }).filter((item) => item.url && item.title);
}

function classifyHackathon(item, locationText) {
  const title = item?.title || '';
  const organizer = item?.organization_name || '';
  const combined = `${title} ${organizer} ${locationText}`;

  const isOnline = /\b(online|virtual|remote)\b/i.test(locationText);
  const isUk = UK_PATTERN.test(combined);
  const isUniversity = UNIVERSITY_PATTERN.test(combined);
  const isInPerson = !isOnline;

  return {
    isOnline,
    isUk,
    isUniversity,
    isInPerson,
    tags: [
      isOnline ? 'online' : 'inperson',
      isUniversity ? 'university' : null,
      isUk ? 'uk' : null,
    ].filter(Boolean),
  };
}

export function normalizeHackathon(item) {
  const themes = Array.isArray(item?.themes) ? item.themes.map((theme) => theme?.name).filter(Boolean) : [];
  const location = item?.displayed_location?.location || 'Location not announced';
  const format = classifyHackathon(item, location);
  const isOnline = typeof item?.isOnlineOverride === 'boolean' ? item.isOnlineOverride : format.isOnline;
  const isInPerson = !isOnline;
  const countryCode = (item?.countryCode || '').toUpperCase();
  const isUk = countryCode ? (countryCode === 'GB' || countryCode === 'UK') : format.isUk;
  const isUniversity = format.isUniversity;
  const imageUrl = item?.thumbnail_url
    ? item.thumbnail_url.startsWith('//')
      ? `https:${item.thumbnail_url}`
      : item.thumbnail_url
    : null;

  const country = detectCountry(location, item?.countryCode);

  return {
    id: item?.id,
    name: item?.title || 'Untitled Hackathon',
    url: item?.url || '#',
    date: item?.submission_period_dates || 'Dates not announced',
    location,
    country,
    description: themes.length > 0
      ? `Themes: ${themes.slice(0, 3).join(', ')}`
      : (item?.organization_name ? `Hosted by ${item.organization_name}` : 'Open hackathon event'),
    organizer: item?.organization_name || 'Unknown organizer',
    registrationsCount: item?.registrations_count || 0,
    timeLeft: item?.time_left_to_submission || 'Open',
    imageUrl,
    openState: item?.open_state || 'open',
    tags: [
      isOnline ? 'online' : 'inperson',
      isUniversity ? 'university' : null,
      isUk ? 'uk' : null,
    ].filter(Boolean),
    isOnline,
    isUk,
    isUniversity,
    isInPerson,
  };
}

export async function fetchUpcomingHackathons(limit = 24) {
  const results = await Promise.allSettled([
    fetchMlhEvents(MLH_EVENTS_URL),
    fetchMlhEvents(MLH_EU_EVENTS_URL),
    fetchDevpostList(DEVPOST_OPEN_API_URL),
    fetchDevpostList(DEVPOST_INPERSON_API_URL),
    fetchDevpostList(DEVPOST_UPCOMING_API_URL),
    fetchDevpostList(DEVPOST_UPCOMING_INPERSON_API_URL),
    fetchDevpostList(DEVPOST_UK_API_URL),
  ]);

  const combined = results
    .filter((result) => result.status === 'fulfilled')
    .flatMap((result) => result.value);

  const mergedById = new Map();
  combined.forEach((item) => {
    const key = item?.id || item?.url || `${item?.title}-${item?.submission_period_dates}`;
    if (!mergedById.has(key)) {
      mergedById.set(key, item);
    }
  });

  return Array.from(mergedById.values())
    .map(normalizeHackathon)
    .slice(0, Math.max(1, Math.min(120, limit)));
}
