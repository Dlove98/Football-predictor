'use client';

import Image from 'next/image';

function formatKickoffTime(utcDate) {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(utcDate));
  } catch (error) {
    console.error('[MatchCard] Impossible de formater la date de coup d\'envoi —', error);
    return '--:--';
  }
}

function TeamCrest({ crest, name }) {
  if (!crest) {
    // Pas de blason fourni par l'API : on affiche une pastille avec
    // l'initiale de l'équipe plutôt qu'une icône d'erreur ou un logo factice.
    return (
      <div className="w-9 h-9 rounded-full bg-base-700 border border-line flex items-center justify-center text-xs font-semibold text-ink-300">
        {name?.charAt(0) ?? '?'}
      </div>
    );
  }
  return (
    <div className="w-9 h-9 relative shrink-0">
      <Image src={crest} alt={name} fill sizes="36px" className="object-contain" unoptimized />
    </div>
  );
}

export default function MatchCard({ match, onOpenAnalysis }) {
  const kickoff = formatKickoffTime(match.utcDate);
  const isLive = match.status === 'IN_PLAY' || match.status === 'PAUSED';
  const isFinished = match.status === 'FINISHED';

  return (
    <div className="group rounded-xl2 border border-line bg-base-900/70 shadow-card p-4 flex flex-col gap-4 hover:border-ink-700 transition-colors">
      <div className="flex items-center justify-between text-xs text-ink-500">
        <div className="flex items-center gap-2 truncate">
          {match.competition?.emblem ? (
            <div className="w-4 h-4 relative shrink-0">
              <Image
                src={match.competition.emblem}
                alt=""
                fill
                sizes="16px"
                className="object-contain"
                unoptimized
              />
            </div>
          ) : null}
          <span className="truncate">{match.competition?.name}</span>
        </div>
        {isLive ? (
          <span className="flex items-center gap-1 text-signal-away font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-signal-away animate-pulse" />
            LIVE
          </span>
        ) : (
          <span className="font-mono">{kickoff}</span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <TeamCrest crest={match.homeTeam.crest} name={match.homeTeam.name} />
          <span className="truncate text-sm font-medium text-ink-100">{match.homeTeam.name}</span>
        </div>
        <div className="font-mono text-sm text-ink-500 px-2">
          {isFinished && match.score
            ? `${match.score.home} - ${match.score.away}`
            : 'vs'}
        </div>
        <div className="flex items-center gap-2.5 min-w-0 flex-1 justify-end text-right">
          <span className="truncate text-sm font-medium text-ink-100">{match.awayTeam.name}</span>
          <TeamCrest crest={match.awayTeam.crest} name={match.awayTeam.name} />
        </div>
      </div>

      <button
        onClick={() => onOpenAnalysis(match)}
        className="w-full rounded-lg border border-signal-home/30 bg-signal-home/10 text-signal-home text-sm font-medium py-2 transition-colors hover:bg-signal-home/15"
      >
        Voir l'analyse IA
      </button>
    </div>
  );
}
