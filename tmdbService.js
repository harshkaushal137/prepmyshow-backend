/**
 * ================================================================
 *  tmdbService.js  — TMDB API Layer
 *  PrepMyShow × Journey to Smile Cabs
 * ----------------------------------------------------------------
 *  Responsibilities:
 *    1. searchMovie()       — Search TMDB by title (+ optional year)
 *    2. getMovieDetails()   — Full details by TMDB movie ID
 *    3. buildPosterURL()    — Smart poster URL builder
 *                             (TMDB + IMDb fallback + Fanart.tv support)
 *    4. formatMovieCard()   — Shape data for the frontend card
 * ================================================================
 */

const axios = require('axios');

// ─── Config ───────────────────────────────────────────────────────────────────
const TMDB_API_KEY   = '97869ba618d473e0893cec7364724845';   // ← Replace before deploying
const TMDB_BASE      = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_CDN = 'https://image.tmdb.org/t/p';

// Poster size options: w92 | w154 | w185 | w342 | w500 | w780 | original
const POSTER_SIZE_DEFAULT  = 'w500';
const POSTER_SIZE_THUMB    = 'w185';
const POSTER_SIZE_BACKDROP = 'w1280';

// Axios instance with defaults
const tmdb = axios.create({
  baseURL: TMDB_BASE,
  params : { api_key: TMDB_API_KEY, language: 'en-US' },
  timeout: 15000, // 15 seconds (increased from 8s)
});

// ── Auto-retry on ECONNRESET (network drops) ─────────────────────────────────
async function tmdbGet(url, config = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await tmdb.get(url, config);
    } catch (err) {
      const isLastTry = i === retries - 1;
      const isRetryable = err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED';
      if (isLastTry || !isRetryable) throw err;
      console.warn(`[tmdbService] Retry ${i + 1}/${retries - 1} for ${url} — ${err.code}`);
      await new Promise(r => setTimeout(r, 1000 * (i + 1))); // 1s, 2s wait
    }
  }
}


// ─────────────────────────────────────────────────────────────────────────────
//  POSTER URL BUILDER
//  Priority:  TMDB path → IMDb poster → Fanart.tv → local placeholder
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {string|null} tmdbPath    — e.g. "/abc123.jpg"  (from TMDB API)
 * @param {string}      size        — TMDB size key, default 'w500'
 * @param {string|null} imdbUrl     — direct IMDb image URL if available
 * @param {string|null} fanartUrl   — Fanart.tv HD poster URL if available
 * @returns {string}  Full image URL ready to use in <img src="...">
 */
function buildPosterURL(tmdbPath, size = POSTER_SIZE_DEFAULT, imdbUrl = null, fanartUrl = null) {
  // 1. Prefer Fanart.tv (highest quality, no watermark)
  if (fanartUrl && fanartUrl.startsWith('http')) {
    return fanartUrl;
  }

  // 2. TMDB path (most common)
  if (tmdbPath && tmdbPath.startsWith('/')) {
    return `${TMDB_IMAGE_CDN}/${size}${tmdbPath}`;
  }

  // 3. IMDb direct URL (sometimes in metadata)
  if (imdbUrl && imdbUrl.startsWith('http')) {
    return imdbUrl;
  }

  // 4. Fallback placeholder with movie-reel aesthetic
  return `https://placehold.co/500x750/111118/facc15?text=No+Poster`;
}

/**
 * Same helper but returns an object with multiple sizes — useful for
 * responsive <picture> or srcset.
 */
function buildPosterURLSet(tmdbPath, imdbUrl = null, fanartUrl = null) {
  return {
    thumb    : buildPosterURL(tmdbPath, POSTER_SIZE_THUMB,    imdbUrl, fanartUrl),
    standard : buildPosterURL(tmdbPath, POSTER_SIZE_DEFAULT,  imdbUrl, fanartUrl),
    backdrop : tmdbPath ? `${TMDB_IMAGE_CDN}/${POSTER_SIZE_BACKDROP}${tmdbPath}` : null,
  };
}


// ─────────────────────────────────────────────────────────────────────────────
//  SEARCH MOVIE  — returns top N results
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {string}      title  — Movie title (cleaned by Gemini)
 * @param {number|null} year   — Optional release year for precision
 * @param {number}      limit  — Max results to return (default 6)
 * @returns {Array<FormattedMovieCard>}
 */
async function searchMovie(title, year = null, limit = 6) {
  try {
    const params = { query: title };
    if (year) params.year = year;

    const { data } = await tmdbGet('/search/movie', { params });

    if (!data.results || data.results.length === 0) {
      return [];
    }

    // Sort by popularity (TMDB already does this, but just in case)
    const sorted = data.results
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);

    return sorted.map(formatMovieCard);
  } catch (err) {
    console.error('[tmdbService] searchMovie error:', err.message);
    throw new Error('TMDB search failed. Please try again.');
  }
}


// ─────────────────────────────────────────────────────────────────────────────
//  GET FULL MOVIE DETAILS by TMDB ID
// ─────────────────────────────────────────────────────────────────────────────
async function getMovieDetails(tmdbId) {
  try {
    const [detailsRes, creditsRes, videosRes] = await Promise.all([
      tmdbGet(`/movie/${tmdbId}`, {
        params: { append_to_response: 'release_dates,keywords' }
      }),
      tmdbGet(`/movie/${tmdbId}/credits`),
      tmdbGet(`/movie/${tmdbId}/videos`),
    ]);

    const movie   = detailsRes.data;
    const credits = creditsRes.data;
    const videos  = videosRes.data;

    // Extract trailer
    const trailer = videos.results?.find(
      v => v.type === 'Trailer' && v.site === 'YouTube'
    );

    // Extract cast (top 5)
    const cast = (credits.cast || []).slice(0, 5).map(c => ({
      name      : c.name,
      character : c.character,
      photo     : buildPosterURL(c.profile_path, 'w185'),
    }));

    // Extract director
    const director = (credits.crew || []).find(c => c.job === 'Director');

    // Certification (e.g. PG-13, A, U/A)
    const indiaRelease = movie.release_dates?.results?.find(r => r.iso_3166_1 === 'IN');
    const usRelease    = movie.release_dates?.results?.find(r => r.iso_3166_1 === 'US');
    const certification =
      indiaRelease?.release_dates?.[0]?.certification ||
      usRelease?.release_dates?.[0]?.certification ||
      'NR';

    return {
      ...formatMovieCard(movie),
      tagline       : movie.tagline || '',
      runtime       : movie.runtime,
      budget        : movie.budget,
      revenue       : movie.revenue,
      status        : movie.status,
      certification,
      genres        : (movie.genres || []).map(g => g.name),
      keywords      : (movie.keywords?.keywords || []).map(k => k.name).slice(0, 10),
      cast,
      director      : director ? { name: director.name, photo: buildPosterURL(director.profile_path, 'w185') } : null,
      trailerKey    : trailer?.key || null,
      trailerURL    : trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
      posterSet     : buildPosterURLSet(movie.poster_path),
      backdropURL   : movie.backdrop_path
                        ? `${TMDB_IMAGE_CDN}/${POSTER_SIZE_BACKDROP}${movie.backdrop_path}`
                        : null,
    };
  } catch (err) {
    console.error('[tmdbService] getMovieDetails error:', err.message);
    throw new Error('Could not fetch movie details. Please try again.');
  }
}


// ─────────────────────────────────────────────────────────────────────────────
//  FORMAT MOVIE CARD  — minimal shape for list/grid views
// ─────────────────────────────────────────────────────────────────────────────
function formatMovieCard(movie) {
  return {
    tmdbId      : movie.id,
    title       : movie.title,
    originalTitle: movie.original_title,
    year        : movie.release_date ? parseInt(movie.release_date.split('-')[0]) : null,
    releaseDate : movie.release_date || null,
    overview    : movie.overview || 'No overview available.',
    rating      : movie.vote_average ? parseFloat(movie.vote_average.toFixed(1)) : null,
    voteCount   : movie.vote_count || 0,
    popularity  : parseFloat((movie.popularity || 0).toFixed(1)),
    language    : movie.original_language,
    adult       : movie.adult || false,
    posterURL   : buildPosterURL(movie.poster_path),
    posterThumb : buildPosterURL(movie.poster_path, POSTER_SIZE_THUMB),
    genreIds    : movie.genre_ids || [],
  };
}


module.exports = {
  searchMovie,
  getMovieDetails,
  buildPosterURL,
  buildPosterURLSet,
  formatMovieCard,
  TMDB_IMAGE_CDN,
  POSTER_SIZE_DEFAULT,
  POSTER_SIZE_THUMB,
};