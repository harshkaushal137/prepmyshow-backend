/**
 * ================================================================
 *  aiServices.js  — Gemini AI Layer
 *  PrepMyShow × Journey to Smile Cabs
 * ----------------------------------------------------------------
 *  Responsibilities:
 *    1. moderateQuery()   — Check for abuse / hate speech via Gemini
 *    2. semanticSearch()  — Natural-language → movie title via Gemini
 *    3. analyzeMovieMood() — Bonus: mood/vibe tags for a movie title
 * ================================================================
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ─── Config ───────────────────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const MODEL_NAME     = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

let model = null;
if (GEMINI_API_KEY) {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: MODEL_NAME });
} else {
  console.warn('[aiServices] Missing Gemini API key. AI backend will use fallback mode.');
}

function getTextFromModelResponse(result) {
  if (!result) return '';
  const textFromResponse = result?.response?.text?.();
  if (textFromResponse) return textFromResponse;
  if (typeof result?.text === 'string') return result.text;
  if (typeof result?.outputText === 'string') return result.outputText;
  return JSON.stringify(result);
}

async function runGeminiPrompt(prompt) {
  if (!model) throw new Error('Gemini model unavailable');

  try {
    if (typeof model.generateContent === 'function') {
      const result = await model.generateContent(prompt);
      return getTextFromModelResponse(result);
    }
    if (typeof model.generateText === 'function') {
      const result = await model.generateText({ prompt });
      return getTextFromModelResponse(result);
    }
    if (typeof model.generate === 'function') {
      const result = await model.generate(prompt);
      return getTextFromModelResponse(result);
    }
    throw new Error('Unsupported Gemini client method');
  } catch (err) {
    console.error('[aiServices] runGeminiPrompt failed:', err.message);
    throw err;
  }
}


// ─── Helper: Safe JSON parse from Gemini text ─────────────────────────────────
function safeParseJSON(text) {
  try {
    // Gemini sometimes wraps JSON in ```json ... ``` fences — strip them
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}


// ─────────────────────────────────────────────────────────────────────────────
//  1.  CONTENT MODERATION
//      Returns: { safe: true } | { safe: false, reason: string }
// ─────────────────────────────────────────────────────────────────────────────
async function moderateQuery(query) {
  if (!query || typeof query !== 'string') {
    return { safe: false, reason: 'Empty or invalid query.' };
  }

  const prompt = `
You are a strict content moderator for a family-friendly movie booking platform.

Analyse the following user search query for:
- Abusive language, profanity, or slurs
- Hate speech targeting any group (religion, gender, race, nationality, etc.)
- Explicit sexual content
- Violence-glorifying language

Query: "${query.slice(0, 300)}"

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "safe": true | false,
  "reason": "<short reason if unsafe, empty string if safe>",
  "severity": "none" | "mild" | "severe"
}`.trim();

  try {
    const text   = await runGeminiPrompt(prompt);
    const parsed = safeParseJSON(text);

    if (!parsed || typeof parsed.safe !== 'boolean') {
      console.warn('[aiServices] moderateQuery: unexpected Gemini output:', text);
      return { safe: true, reason: '' };
    }

    return parsed;
  } catch (err) {
    console.error('[aiServices] moderateQuery error:', err.message);
    return { safe: true, reason: '' };
  }
}


// ─────────────────────────────────────────────────────────────────────────────
//  2.  SEMANTIC SEARCH  →  Movie Title
//      Input : any natural-language description, e.g. "a magical train to wizard school"
//      Output: { title, year, confidence, alternates[] }
// ─────────────────────────────────────────────────────────────────────────────
async function semanticSearch(query) {
  const prompt = `
You are a world-class movie expert with knowledge of all films across languages
(Hollywood, Bollywood, South Indian, Korean, Japanese, European, etc.).

A user on a movie-booking platform typed this search:
"${query.slice(0, 400)}"

Your job:
1. Identify the single most likely movie they are looking for.
2. If the query is already a clean movie title, return it as-is.
3. If the query is a description, plot hint, or partial memory — infer the title.
4. Also provide 2-3 alternate possibilities (in case your top pick is wrong).

Respond ONLY with valid JSON (no markdown):
{
  "title":       "<Best matching movie title in English>",
  "year":        <release year as number, or null if unknown>,
  "language":    "<original language, e.g. English / Hindi / Korean>",
  "confidence":  "high" | "medium" | "low",
  "reasoning":   "<one sentence explaining why you chose this>",
  "alternates":  [
    { "title": "<alt 1>", "year": <year or null> },
    { "title": "<alt 2>", "year": <year or null> }
  ]
}`.trim();

  try {
    const text   = await runGeminiPrompt(prompt);
    const parsed = safeParseJSON(text);

    if (!parsed || !parsed.title) {
      return { title: query, year: null, confidence: 'low', alternates: [] };
    }

    return parsed;
  } catch (err) {
    console.error('[aiServices] semanticSearch error:', err.message);
    return { title: query, year: null, confidence: 'low', alternates: [] };
  }
}


// ─────────────────────────────────────────────────────────────────────────────
//  3.  MOVIE MOOD ANALYSER  (Bonus feature — attach to movie detail page)
//      Input : movie title
//      Output: { mood, vibes[], goodFor[], notFor[], gsapColor }
// ─────────────────────────────────────────────────────────────────────────────
async function analyzeMovieMood(title, overview = '') {
  const prompt = `
You are a cinema mood expert. Given the movie title and optional overview below,
generate a short emotional/vibe profile for a movie booking app.

Title:    "${title}"
Overview: "${overview.slice(0, 300)}"

Respond ONLY with valid JSON (no markdown):
{
  "mood":      "<one-word emotion: e.g. 'Thrilling', 'Heartwarming', 'Eerie', 'Hilarious'>",
  "vibes":     ["<tag1>", "<tag2>", "<tag3>"],
  "goodFor":   ["<context1>", "<context2>"],
  "notFor":    ["<context that would dislike this>"],
  "gsapColor": "<a valid hex color that matches the mood, e.g. #e11d48 for thriller>"
}`.trim();

  try {
    const text   = await runGeminiPrompt(prompt);
    const parsed = safeParseJSON(text);

    return parsed || { mood: 'Exciting', vibes: [], goodFor: [], notFor: [], gsapColor: '#facc15' };
  } catch (err) {
    console.error('[aiServices] analyzeMovieMood error:', err.message);
    return { mood: 'Exciting', vibes: [], goodFor: [], notFor: [], gsapColor: '#facc15' };
  }
}


module.exports = { moderateQuery, semanticSearch, analyzeMovieMood };