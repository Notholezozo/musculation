# Forge — carnet de musculation

Un assistant personnel pour préparer et noter ses séances de musculation, jour par jour, puis suivre sa
progression exercice par exercice.

- **Séances** : un calendrier mensuel ; pour chaque jour, une ou plusieurs séances. Une séance contient des
  exercices, et chaque exercice ses séries (répétitions et charge, série par série).
- **Exercices** : ton catalogue personnel. Tu crées, modifies et supprimes tes exercices, rangés par groupe
  musculaire. On peut aussi en créer un à la volée depuis une séance.
- **Progression** : pour chaque exercice, une courbe dans le temps (charge max, 1RM estimé ou volume), les
  chiffres clés et l'historique des séances.
- **Profil** : prénom, taille, poids, IMC, totaux et meilleures performances par exercice.
- Un seul utilisateur, pas de compte. Tout est enregistré dans une base SQLite locale.

## Démarrer

Prérequis : .NET 10 et Node.js.

```bash
cd frontend
npm install
npm run build          # compile le front dans backend/src/Forge.Api/wwwroot
cd ../backend
dotnet run --project src/Forge.Api
```

L'application est alors sur <http://localhost:5090>. La base est créée au premier démarrage dans
`backend/src/Forge.Api/App_Data/forge.db` : pour la sauvegarder, copie ce fichier.

En développement, lance l'API (`dotnet run --project backend/src/Forge.Api`) et le front à part
(`npm start` dans `frontend`, sur <http://localhost:4300>, avec rechargement à chaud ; `/api` est relayé vers l'API).

Tests : `dotnet test` dans `backend`.

## Règles

| Sujet | Règle |
|---|---|
| Série | 1 à 500 répétitions, 0 à 1000 kg. Une charge vide ou à 0 = poids du corps |
| Nouvelle série | Reprend les valeurs de la série précédente |
| Ajout d'un exercice à une séance | Prérempli avec les séries de son dernier passage (avant le jour de la séance), rappelé sous le titre |
| Volume | Somme des répétitions × charge |
| 1RM estimé | Formule d'Epley : charge × (1 + répétitions / 30) ; une série d'une répétition vaut sa charge |
| Record de charge | La série la plus lourde ; à égalité, le plus de répétitions, puis la date la plus ancienne |
| Suppression d'un exercice | Refusée tant qu'il figure dans une séance : l'historique en dépend |
| Noms d'exercices | Uniques, sans tenir compte de la casse |

## Design system « Forge »

Thème sombre « fonte » : surfaces graphite, texte craie, accent braise (orange) pour l'action principale et la
donnée mise en avant. Les couleurs des disques d'haltérophilie identifient les groupes musculaires, toujours
accompagnées de leur libellé. Titres et chiffres en Barlow Condensed, texte en Barlow.

- Jetons : [_tokens.scss](frontend/src/styles/_tokens.scss). Aucun composant ne code une couleur en dur.
- Classes communes (boutons, champs, cartes, tuiles, tableaux, badges, messages) :
  [styles.scss](frontend/src/styles.scss).
- Vitrine vivante : page `/design-system` de l'application
  ([design-system.ts](frontend/src/app/features/design-system/design-system.ts)).
- Pensé d'abord pour le téléphone, à la salle : barre d'onglets en bas, zones tactiles de 44 px, gros champs
  numériques. À partir de 900 px, la navigation passe dans un rail à gauche.
- Le graphique ([line-chart.ts](frontend/src/app/shared/ui/line-chart.ts)) est un SVG maison, sans
  bibliothèque : une série, axe des dates proportionnel au temps, repère et infobulle au survol ou à l'appui.

## Architecture

```
backend/                      .NET 10
  src/Forge.Domain            Entités (exercice, séance, série, profil) et calcul du 1RM ; aucune dépendance
  src/Forge.Application       Cas d'usage, validations, calculs de progression et de records, contrats de l'API
  src/Forge.Infrastructure    EF Core + SQLite : DbContext, migrations, repositories
  src/Forge.Api               Contrôleurs REST, erreurs en « problem details », hébergement du front compilé
  tests/Forge.Tests           Tests du 1RM, de la progression et des records
frontend/                     Angular 22 (composants autonomes, signaux, sans zone.js)
  src/styles                  Jetons du design system
  src/app/core                Client de l'API, modèles, formats (dates, nombres, groupes musculaires)
  src/app/shared/ui           Graphique en courbe
  src/app/features            journal, workout-editor, exercises, progress, profile, design-system
```

### API

| Méthode | Route | Rôle |
|---|---|---|
| GET, POST | `/api/exercises` | Lister, créer |
| PUT, DELETE | `/api/exercises/{id}` | Modifier, supprimer |
| GET | `/api/exercises/{id}/progress` | Un point par séance pour la courbe |
| GET | `/api/exercises/{id}/last?before=AAAA-MM-JJ` | Dernier passage (204 s'il n'y en a pas) |
| GET | `/api/workouts?from=&to=` | Résumés des séances d'une période |
| GET, PUT, DELETE | `/api/workouts/{id}` | Lire, remplacer, supprimer une séance |
| POST | `/api/workouts` | Créer une séance |
| GET, PUT | `/api/profile` | Profil et totaux |
| GET | `/api/profile/records` | Meilleures performances par exercice |

Ajouter une migration après un changement de modèle :

```bash
cd backend
dotnet tool restore
dotnet ef migrations add NomDeLaMigration --project src/Forge.Infrastructure --startup-project src/Forge.Api --output-dir Persistence/Migrations
```
