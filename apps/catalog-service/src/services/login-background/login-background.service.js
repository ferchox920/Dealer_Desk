import db from '../../config/db/db.js';
import LoginBackground from '../../entities/login-background.entity.js';
import LoginBackgroundHistory from '../../entities/login-background-history.entity.js';
import { createHttpError } from '../../utils/errors/app-error.util.js';

const PEXELS_API_URL = 'https://api.pexels.com/v1/search';
const PEXELS_PROVIDER = 'pexels';
const PEXELS_QUERY = 'sports car neon';
const PEXELS_TIMEOUT_MS = 8000;
const PEXELS_RESULTS_PER_PAGE = 12;
const PEXELS_MAX_SEARCH_PAGES = 8;
const LOGIN_BACKGROUND_HISTORY_RETENTION_DAYS = 7;

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw createHttpError(500, `${name} is required.`, `${name}_REQUIRED`);
  }

  return value;
}

function serializeLoginBackground(background) {
  if (!background) {
    return null;
  }

  return {
    image_url: background.image_url,
    photographer_name: background.photographer_name,
    photo_page_url: background.photo_page_url,
    provider: background.provider,
    updated_at: background.updated_at,
  };
}

function pickPhotoUrl(photo) {
  return photo?.src?.large2x
    || photo?.src?.large
    || photo?.src?.original
    || photo?.src?.landscape
    || photo?.src?.portrait
    || null;
}

function buildPexelsSearchUrl(page = 1) {
  const searchUrl = new URL(PEXELS_API_URL);
  searchUrl.searchParams.set('query', PEXELS_QUERY);
  searchUrl.searchParams.set('per_page', String(PEXELS_RESULTS_PER_PAGE));
  searchUrl.searchParams.set('page', String(page));
  return searchUrl;
}

function buildPexelsCandidate(photo) {
  const imageUrl = pickPhotoUrl(photo);

  if (!imageUrl) {
    return null;
  }

  return {
    image_url: imageUrl,
    photographer_name: photo.photographer ?? null,
    photo_page_url: photo.url ?? null,
    provider: PEXELS_PROVIDER,
  };
}

function buildOrderedCandidates(photos) {
  const candidates = [];
  const seenImageUrls = new Set();

  for (const photo of photos) {
    const candidate = buildPexelsCandidate(photo);

    if (!candidate || seenImageUrls.has(candidate.image_url)) {
      continue;
    }

    seenImageUrls.add(candidate.image_url);
    candidates.push(candidate);
  }

  return candidates;
}

function selectBackgroundCandidate(candidates) {
  if (candidates.length === 0) {
    console.warn('Pexels refresh did not return a usable login background.');
    throw createHttpError(502, 'No usable login background was returned.', 'LOGIN_BACKGROUND_PROVIDER_EMPTY');
  }

  return candidates[0];
}

function buildShuffledSearchPages(maxPages) {
  const pages = Array.from({ length: maxPages }, (_value, index) => index + 1);

  for (let index = pages.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = pages[index];
    pages[index] = pages[swapIndex];
    pages[swapIndex] = current;
  }

  return pages;
}

async function fetchPexelsSearchPage(apiKey, page) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PEXELS_TIMEOUT_MS);

  try {
    const response = await fetch(buildPexelsSearchUrl(page), {
      headers: {
        Authorization: apiKey,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(`Pexels refresh failed with status ${response.status}.`);
      throw createHttpError(502, 'Could not refresh the login background right now.', 'LOGIN_BACKGROUND_PROVIDER_ERROR');
    }

    const payload = await response.json().catch(() => null);
    const photos = Array.isArray(payload?.photos) ? payload.photos : [];

    if (photos.length === 0) {
      return [];
    }

    const candidates = buildOrderedCandidates(photos);

    if (candidates.length === 0) {
      return [];
    }

    return candidates;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Pexels refresh timed out.');
      throw createHttpError(504, 'The login background provider timed out.', 'LOGIN_BACKGROUND_PROVIDER_TIMEOUT');
    }

    if (error.statusCode) {
      throw error;
    }

    console.error('Unexpected Pexels refresh error:', error.message);
    throw createHttpError(502, 'Could not refresh the login background right now.', 'LOGIN_BACKGROUND_PROVIDER_ERROR');
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPexelsCandidates({ usedImageUrls = new Set() } = {}) {
  const apiKey = getRequiredEnv('PEXELS_API_KEY');
  const repeatedCandidates = [];
  const repeatedCandidateUrls = new Set();
  const pages = buildShuffledSearchPages(PEXELS_MAX_SEARCH_PAGES);

  for (const page of pages) {
    const pageCandidates = await fetchPexelsSearchPage(apiKey, page);

    if (pageCandidates.length === 0) {
      continue;
    }

    const freshCandidates = pageCandidates.filter((candidate) => !usedImageUrls.has(candidate.image_url));

    if (freshCandidates.length > 0) {
      return freshCandidates;
    }

    for (const candidate of pageCandidates) {
      if (repeatedCandidateUrls.has(candidate.image_url)) {
        continue;
      }

      repeatedCandidateUrls.add(candidate.image_url);
      repeatedCandidates.push(candidate);
    }
  }

  if (repeatedCandidates.length > 0) {
    console.warn('Pexels search did not find a new login background. Falling back to a previously used image.');
    return repeatedCandidates;
  }

  console.warn('Pexels refresh did not return a usable login background.');
  throw createHttpError(502, 'No usable login background was returned.', 'LOGIN_BACKGROUND_PROVIDER_EMPTY');
}

class LoginBackgroundService {
  async getPublicBackground() {
    const background = await LoginBackground.getCurrent();

    if (background) {
      return serializeLoginBackground(background);
    }

    return await this.refreshFromProviderSafely('public initial load');
  }

  async refreshFromProvider() {
    const currentBackground = await LoginBackground.getCurrent();
    const usedImageUrls = new Set(await LoginBackgroundHistory.listUsedImageUrls());

    if (currentBackground?.image_url) {
      usedImageUrls.add(currentBackground.image_url);
    }

    const providerCandidates = await fetchPexelsCandidates({ usedImageUrls });
    const selectedBackground = selectBackgroundCandidate(providerCandidates);
    const savedBackground = await db.withTransaction(async (client) => {
      const executor = client.query.bind(client);
      const current = await LoginBackground.upsert(selectedBackground, executor);

      if (!current) {
        return null;
      }

      await LoginBackgroundHistory.create(selectedBackground, executor);
      return current;
    });

    if (!savedBackground) {
      throw createHttpError(500, 'Could not save the login background.', 'LOGIN_BACKGROUND_SAVE_FAILED');
    }

    console.log('Login background refreshed successfully.');
    return serializeLoginBackground(savedBackground);
  }

  async cleanupHistory() {
    const currentBackground = await LoginBackground.getCurrent();
    const deletedCount = await LoginBackgroundHistory.deleteOlderThan({
      daysToKeep: LOGIN_BACKGROUND_HISTORY_RETENTION_DAYS,
      keepImageUrl: currentBackground?.image_url ?? null,
    });

    console.log(`Login background history cleanup finished. Removed ${deletedCount} old record(s).`);
    return deletedCount;
  }

  async refreshFromProviderSafely(reason = 'scheduled refresh') {
    try {
      return await this.refreshFromProvider();
    } catch (error) {
      console.error(`Login background ${reason} failed:`, error.message);
      return null;
    }
  }

  async ensureInitialBackground() {
    const currentBackground = await LoginBackground.getCurrent();

    if (currentBackground) {
      return serializeLoginBackground(currentBackground);
    }

    console.log('Login background startup check found no stored background. Fetching the first background now.');
    return await this.refreshFromProviderSafely('initial background load');
  }

  async cleanupHistorySafely(reason = 'weekly cleanup') {
    try {
      return await this.cleanupHistory();
    } catch (error) {
      console.error(`Login background ${reason} failed:`, error.message);
      return 0;
    }
  }
}

export default new LoginBackgroundService();
