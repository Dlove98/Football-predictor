// app/api/predict/route.js
//
// Route serveur : calcule la prédiction IA d'un match précis, à la demande
// (quand l'utilisateur ouvre la modale d'analyse). Ce découpage évite de
// saturer le quota de l'API football-data.org en n'allant chercher forme
// récente + H2H que pour le match réellement consulté.

import { NextResponse } from 'next/server';
import { fetchTeamRecentMatches, fetchHeadToHead } from '../../../lib/dataSources';
import { generatePrediction } from '../../../lib/scoringEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get('matchId');
  const homeTeamId = searchParams.get('homeTeamId');
  const awayTeamId = searchParams.get('awayTeamId');

  if (!matchId || !homeTeamId || !awayTeamId) {
    console.error(
      `[api/predict] Paramètres manquants — matchId=${matchId}, homeTeamId=${homeTeamId}, awayTeamId=${awayTeamId}`
    );
    return NextResponse.json(
      { error: 'Paramètres matchId, homeTeamId et awayTeamId requis.' },
      { status: 400 }
    );
  }

  try {
    // Les trois appels sont indépendants : on les lance en parallèle pour
    // rester rapide. Chacun est déjà résilient individuellement (voir
    // lib/dataSources.js) et renvoie un tableau vide en cas d'échec plutôt
    // que de lever une exception.
    const [homeRecentMatches, awayRecentMatches, h2hResult] = await Promise.all([
      fetchTeamRecentMatches(homeTeamId, 10),
      fetchTeamRecentMatches(awayTeamId, 10),
      fetchHeadToHead(matchId, 8),
    ]);

    const prediction = generatePrediction({
      homeTeamId: Number(homeTeamId),
      awayTeamId: Number(awayTeamId),
      homeRecentMatches,
      awayRecentMatches,
      h2hMatches: h2hResult.matches,
    });

    return NextResponse.json({ matchId, prediction });
  } catch (error) {
    console.error(`[api/predict] Erreur inattendue pour le match ${matchId} —`, error);
    // Même en cas d'erreur imprévue, l'IA "ne bloque jamais" : on retombe
    // sur une prédiction basée uniquement sur les moyennes de référence.
    const fallbackPrediction = generatePrediction({
      homeTeamId: Number(homeTeamId),
      awayTeamId: Number(awayTeamId),
      homeRecentMatches: [],
      awayRecentMatches: [],
      h2hMatches: [],
    });
    return NextResponse.json({ matchId, prediction: fallbackPrediction, degraded: true });
  }
}
