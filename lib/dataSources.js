// lib/dataSources.js
//
// Couche unique d'accès aux données externes.
// Règles non négociables appliquées ici :
//   1. Toute requête fetch vers une API externe utilise { cache: 'no-store' }.
//   2. Aucune erreur n'est avalée en silence : tout échec HTTP ou réseau est
//      journalisé avec console.error (statut, URL, corps de la réponse).
//   3. Aucune donnée factice n'est jamais injectée. En cas d'échec ou
//      d'absence de résultat, on renvoie un tableau/objet vide, jamais un
//      match ou un blason inventé.
//   4. Si aucun match n'existe à la date demandée, la fenêtre de recherche
//      est élargie automatiquement jour après jour, jusqu'à 7 jours,
//      pour que l'interface ne reste jamais vide sans raison.

const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4';
const MAX_WINDOW_EXPANSION_DAYS = 7;

/**
 * Effectue un fetch JSON "sûr" : ne lève jamais d'exception non gérée,
 * mais journalise systématiquement les échecs pour qu'ils soient visibles
 * dans les logs Vercel (Functions > Logs).
 *
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<{ ok: boolean, status: number, data: any | null }>}
 */
export async function safeFetchJson(url, options = {}) {
  const requestOptions = {
    ...options,
    // RÈGLE CRITIQUE : jamais de cache persistant côté Next.js/Vercel pour
    // les données live de matchs et de cotes.
    cache: 'no-store',
    headers: {
      ...(options.headers || {}),
    },
  };

  try {
    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '<corps illisible>');
      console.error(
        `[dataSources] Échec HTTP ${response.status} sur ${url} — réponse: ${errorBody}`
      );
      return { ok: false, status: response.status, data: null };
    }

    const data = await response.json();
    return { ok: true, status: response.status, data };
  } catch (error) {
    // Erreur réseau, timeout, DNS, JSON invalide, etc.
    console.error(`[dataSources] Erreur réseau/parsing sur ${url} —`, error);
    return { ok: false, status: 0, data: null };
  }
}

function getAuthHeaders() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    // On journalise l'absence de clé mais on ne bloque jamais le rendu :
    // l'appel échouera proprement et sera géré comme un résultat vide.
    console.error(
      '[dataSources] FOOTBALL_DATA_API_KEY est absente des variables d\'environnement.'
    );
  }
  return { 'X-Auth-Token': apiKey || '' };
}

function formatDate(date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

/**
 * Récupère les matchs entre deux dates (incluses) via football-data.org v4.
 *
 * @param {string} dateFrom YYYY-MM-DD
 * @param {string} dateTo YYYY-MM-DD
 * @returns {Promise<Array>} Liste brute des matchs (vide si aucune donnée ou erreur)
 */
export async function fetchMatchesRange(dateFrom, dateTo) {
  const url = `${FOOTBALL_DATA_BASE_URL}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;
  const { ok, data } = await safeFetchJson(url, { headers: getAuthHeaders() });

  if (!ok || !data || !Array.isArray(data.matches)) {
    return [];
  }

  return data.matches;
}

/**
 * Récupère les matchs pour une date donnée. Si aucun match n'est trouvé
 * (trêve internationale, faible couverture du plan gratuit, etc.), la
 * fenêtre est élargie automatiquement jour par jour jusqu'à
 * MAX_WINDOW_EXPANSION_DAYS, afin que l'UI ne se retrouve jamais vide
 * sans qu'on ait vraiment essayé d'aller chercher des données proches.
 *
 * @param {string} baseDateISO YYYY-MM-DD, date demandée par l'utilisateur
 * @returns {Promise<{ matches: Array, effectiveDateFrom: string, effectiveDateTo: string, expanded: boolean }>}
 */
export async function fetchMatchesWithWindowExpansion(baseDateISO) {
  const baseDate = new Date(`${baseDateISO}T00:00:00.000Z`);

  // 1. Tentative exacte sur la date demandée.
  const exactMatches = await fetchMatchesRange(baseDateISO, baseDateISO);
  if (exactMatches.length > 0) {
    return {
      matches: exactMatches,
      effectiveDateFrom: baseDateISO,
      effectiveDateTo: baseDateISO,
      expanded: false,
    };
  }

  // 2. Élargissement progressif : on interroge une fenêtre de plus en plus
  // large jusqu'à MAX_WINDOW_EXPANSION_DAYS, en une seule requête par palier
  // pour rester économe en appels API (plans gratuits limités).
  const expandedTo = formatDate(addDays(baseDate, MAX_WINDOW_EXPANSION_DAYS));
  const expandedMatches = await fetchMatchesRange(baseDateISO, expandedTo);

  return {
    matches: expandedMatches,
    effectiveDateFrom: baseDateISO,
    effectiveDateTo: expandedTo,
    expanded: expandedMatches.length > 0,
  };
}

/**
 * Récupère les derniers matchs terminés d'une équipe (pour estimer sa forme
 * offensive/défensive). Utilisé à la demande, uniquement quand l'utilisateur
 * ouvre l'analyse détaillée d'un match, pour ménager le quota d'API.
 *
 * @param {number|string} teamId
 * @param {number} limit
 * @returns {Promise<Array>} Liste des matchs terminés (vide si indisponible)
 */
export async function fetchTeamRecentMatches(teamId, limit = 10) {
  const url = `${FOOTBALL_DATA_BASE_URL}/teams/${teamId}/matches?status=FINISHED&limit=${limit}`;
  const { ok, data } = await safeFetchJson(url, { headers: getAuthHeaders() });

  if (!ok || !data || !Array.isArray(data.matches)) {
    return [];
  }

  return data.matches;
}

/**
 * Récupère l'historique des confrontations directes (head-to-head) pour un
 * match donné. Cette donnée est un "bonus" pour le moteur statistique :
 * si elle est indisponible, le moteur de scoring doit simplement s'appuyer
 * sur les moyennes de forme récente sans jamais bloquer ni afficher d'erreur.
 *
 * @param {number|string} matchId
 * @param {number} limit
 * @returns {Promise<{ matches: Array, aggregates: object | null }>}
 */
export async function fetchHeadToHead(matchId, limit = 10) {
  const url = `${FOOTBALL_DATA_BASE_URL}/matches/${matchId}/head2head?limit=${limit}`;
  const { ok, data } = await safeFetchJson(url, { headers: getAuthHeaders() });

  if (!ok || !data || !Array.isArray(data.matches)) {
    return { matches: [], aggregates: null };
  }

  return { matches: data.matches, aggregates: data.aggregates || null };
}
