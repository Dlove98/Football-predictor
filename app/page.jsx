'use client';

import { useEffect, useState } from 'react';
import DateSelector from '../components/DateSelector';
import MatchCard from '../components/MatchCard';
import PredictionModal from '../components/PredictionModal';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function CardSkeleton() {
  return (
    <div className="rounded-xl2 border border-line bg-base-900/70 p-4 h-[148px] animate-pulse">
      <div className="h-3 w-24 bg-base-700 rounded mb-6" />
      <div className="h-4 bg-base-700 rounded mb-8" />
      <div className="h-8 bg-base-700 rounded" />
    </div>
  );
}

function EmptyState({ dateLabel }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center text-center py-20 px-6 rounded-xl2 border border-dashed border-line">
      <div className="w-12 h-12 rounded-full bg-base-800 border border-line flex items-center justify-center mb-4">
        <span className="text-xl">⚽</span>
      </div>
      <p className="text-ink-100 font-medium mb-1">Calme plat sur {dateLabel}</p>
      <p className="text-sm text-ink-500 max-w-sm">
        Aucune rencontre majeure recensée pour le moment. Essayez une autre date dans le sélecteur
        ci-dessus.
      </p>
    </div>
  );
}

export default function HomePage() {
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMatch, setActiveMatch] = useState(null);
  const [windowExpanded, setWindowExpanded] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadMatches() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/matches?date=${selectedDate}`, { cache: 'no-store' });
        if (!response.ok) {
          console.error(`[HomePage] Échec HTTP ${response.status} sur /api/matches`);
        }
        const data = await response.json();
        if (!isCancelled) {
          setMatches(Array.isArray(data.matches) ? data.matches : []);
          setWindowExpanded(Boolean(data.windowExpanded));
        }
      } catch (error) {
        console.error('[HomePage] Erreur lors du chargement des matchs —', error);
        if (!isCancelled) {
          setMatches([]);
          setWindowExpanded(false);
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadMatches();
    return () => {
      isCancelled = true;
    };
  }, [selectedDate]);

  const dateLabel = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${selectedDate}T00:00:00`));

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-signal-home/15 border border-signal-home/30 flex items-center justify-center text-signal-home font-bold text-sm">
            FP
          </div>
          <div>
            <h1 className="text-sm font-semibold text-ink-100 leading-none">
              Football Predictor
            </h1>
            <p className="text-[11px] text-ink-500 leading-none mt-1">by DTech</p>
          </div>
        </div>
      </header>

      <section className="mb-6">
        <DateSelector selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      </section>

      <section className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink-500 capitalize">{dateLabel}</p>
        {windowExpanded && !isLoading && matches.length > 0 && (
          <p className="text-[11px] text-ink-700">Fenêtre élargie automatiquement</p>
        )}
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : matches.length === 0 ? (
          <EmptyState dateLabel={dateLabel} />
        ) : (
          matches.map((match) => (
            <MatchCard key={match.id} match={match} onOpenAnalysis={setActiveMatch} />
          ))
        )}
      </section>

      {activeMatch && (
        <PredictionModal match={activeMatch} onClose={() => setActiveMatch(null)} />
      )}
    </main>
  );
}
