# ⚽ Football Predictor by DTech

Plateforme de pronostics de football pilotée par un moteur statistique (loi de Poisson), avec une interface sombre inspirée des outils de trading professionnel. Construit avec **Next.js 14 (App Router)** et **Tailwind CSS**.

## ✨ Fonctionnalités

- Liste des matchs du jour (et des 6 jours suivants) via [football-data.org](https://www.football-data.org/) v4.
- Élargissement automatique de la fenêtre de recherche (jusqu'à 7 jours) si aucun match n'est trouvé à la date exacte — l'interface n'est jamais vide sans raison.
- Analyse IA à la demande : probabilités 1X2, buts attendus, top 3 des scores exacts et indice de confiance adaptatif, calculés à l'ouverture de la fiche de match (et non en amont, pour ménager le quota API).
- Zéro donnée factice : en l'absence de données, l'application affiche un état vide propre plutôt que d'inventer des matchs ou blasons.
- Toutes les requêtes externes utilisent `{ cache: 'no-store' }` pour éviter le cache persistant de Vercel/Next.js.
- Toutes les erreurs réseau/HTTP sont journalisées avec `console.error` (visibles dans **Vercel → Functions → Logs**).

## 🗂️ Structure du projet

```
football-predictor/
├── app/
│   ├── api/
│   │   ├── matches/route.js     # Liste des matchs (avec élargissement de fenêtre)
│   │   └── predict/route.js     # Calcul de la prédiction IA à la demande
│   ├── layout.jsx
│   ├── page.jsx                 # Page principale (grille de matchs + sélecteur de dates)
│   └── globals.css
├── components/
│   ├── DateSelector.jsx
│   ├── MatchCard.jsx
│   └── PredictionModal.jsx
├── lib/
│   ├── dataSources.js           # Accès API football-data.org, no-store, logs, fenêtre glissante
│   └── scoringEngine.js         # Moteur Poisson : xG, 1X2, scores exacts, confiance
├── .env.example
├── next.config.js
├── tailwind.config.js
└── package.json
```

## 🚀 Démarrage local

```bash
git clone <url-de-votre-depot-github>
cd football-predictor
npm install
cp .env.example .env.local
# Éditez .env.local et renseignez FOOTBALL_DATA_API_KEY
npm run dev
```

L'application est disponible sur [http://localhost:3000](http://localhost:3000).

## 🔑 Obtenir une clé API football-data.org

1. Créez un compte gratuit sur **https://www.football-data.org/client/register**
2. Récupérez votre clé (`X-Auth-Token`) depuis **https://www.football-data.org/pricing** (le plan gratuit couvre les compétitions majeures avec des limites de requêtes/minute).
3. Consultez la documentation officielle de l'API v4 ici : **https://docs.football-data.org/general/v4/index.html**

## ☁️ Déploiement sur Vercel (via GitHub)

1. **Poussez le code sur GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit — Football Predictor by DTech"
   git branch -M main
   git remote add origin https://github.com/<votre-utilisateur>/<votre-depot>.git
   git push -u origin main
   ```

2. **Importez le dépôt sur Vercel**
   - Rendez-vous sur **https://vercel.com/new**
   - Sélectionnez votre dépôt GitHub — Vercel détecte automatiquement Next.js, aucune configuration de build n'est nécessaire.

3. **Configurez la variable d'environnement**
   - Dans **Project Settings → Environment Variables** (ou directement via la doc officielle : **https://vercel.com/docs/projects/environment-variables**)
   - Ajoutez :
     | Nom | Valeur | Environnements |
     |---|---|---|
     | `FOOTBALL_DATA_API_KEY` | votre clé football-data.org | Production, Preview, Development |

4. **Déployez**
   - Cliquez sur **Deploy**. Chaque `git push` sur `main` déclenchera automatiquement un nouveau déploiement.

### ⚠️ Éviter les erreurs de mise à jour / cache

- Ne réintroduisez jamais de `fetch` sans `{ cache: 'no-store' }` dans `lib/dataSources.js` : sans cette option, Vercel peut servir une réponse mise en cache et afficher des matchs obsolètes.
- Les deux routes API (`app/api/matches/route.js` et `app/api/predict/route.js`) exportent `export const dynamic = 'force-dynamic'` — ne retirez pas cette ligne, elle empêche Next.js de statiser ces routes au build.
- Si vous ajoutez de nouvelles compétitions ou sources de données, respectez la même règle : toute erreur HTTP doit être journalisée avec `console.error`, jamais avalée en silence.

## 📚 Ressources utiles

- Documentation API football-data.org v4 : **https://docs.football-data.org/general/v4/index.html**
- Inscription / gestion de clé API : **https://www.football-data.org/client/register**
- Documentation Next.js App Router : **https://nextjs.org/docs/app**
- Documentation des routes API Next.js (Route Handlers) : **https://nextjs.org/docs/app/building-your-application/routing/route-handlers**
- Documentation Tailwind CSS : **https://tailwindcss.com/docs/installation**
- Déploiement Next.js sur Vercel : **https://vercel.com/docs/frameworks/nextjs**
- Variables d'environnement sur Vercel : **https://vercel.com/docs/projects/environment-variables**
- Loi de Poisson appliquée aux pronostics sportifs (référence méthodologique) : **https://en.wikipedia.org/wiki/Poisson_distribution**

## 🧠 Note sur le moteur de prédiction

Le moteur (`lib/scoringEngine.js`) calcule les buts attendus (xG) de chaque équipe à partir de sa force offensive/défensive relative à la moyenne de référence (1,35 but/équipe/match), ajustée par l'avantage du terrain. S'il dispose d'un historique de confrontations directes (H2H), il l'intègre avec un poids modéré (25 %) pour éviter le sur-ajustement sur de petits échantillons. Si aucune donnée de forme n'est disponible pour une équipe, le moteur retombe sur la moyenne de référence et réduit simplement son indice de confiance — il ne bloque jamais et n'affiche aucun message d'erreur à l'utilisateur final.

## 📄 Licence

Projet fourni tel quel, à des fins d'information sportive. Aucune garantie n'est donnée quant à l'exactitude des pronostics.
