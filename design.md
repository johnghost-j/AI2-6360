# Argus — Design

Console d'agent autonome personnelle (web uniquement). Un agent IA avec accès complet : internet,
navigateur réel, shell, installation de logiciels, fichiers, exécution de code, APIs externes et
tâches planifiées. Direction visuelle : **terminal de mission** — fond quasi noir, grille technique,
accent lime phosphorescent, typographie mono pour toute donnée machine.

## Brand & Colors

CSS variables dans `packages/web/src/web/styles.css` (dark-only, pas de mode clair).

| Token | Valeur | Usage |
|-------|--------|-------|
| bg | #07080A | Fond de page |
| surface | #0D0F13 | Panneaux, cartes |
| surface-2 | #141820 | Hover, inputs, bulles |
| border | #1E242E | Filets 1px |
| foreground | #E8EBF0 | Texte principal |
| muted | #7C8698 | Texte secondaire, métadonnées |
| accent | #C7F751 | Lime — actions, actif, agent |
| accent-dim | rgba(199,247,81,.12) | Fonds d'état actif |
| info | #5AC8FA | Outils web/réseau |
| warn | #FFB84D | Outils système/shell |
| danger | #FF5C5C | Erreurs, suppressions |

Catégories d'outils colorées : web/réseau = info, système/code = warn, fichiers = accent,
planification/mémoire = violet #A78BFA.

## Typography

- **Display / UI** : Sora (600/700) — titres, navigation, boutons.
- **Mono / données** : JetBrains Mono (400/500) — logs, commandes, chemins, JSON, chiffres.
- Corps de texte : Sora 400, `leading-relaxed`.
- Chargées via Google Fonts dans `index.html`.

## Layout

- Rail de navigation vertical fixe à gauche (72px, icônes + label au survol).
- Zone de contenu pleine hauteur, jamais de conteneur centré étroit : l'app est un cockpit.
- Chat : colonne de 820px max centrée, liste des sessions en panneau repliable.
- Fond : grille subtile (lignes 1px à 4% d'opacité) + halo lime radial en haut à gauche, noise léger.
- Bordures fines, rayons 10px max, pas d'ombres portées douces — des filets nets.

## Pages

1. **Console** (`/`) — chat streaming avec l'agent, sessions, appels d'outils dépliables en direct.
2. **Activité** (`/activity`) — journal de tous les appels d'outils (filtre par catégorie), stats.
3. **Tâches** (`/tasks`) — création/gestion des jobs autonomes (once / X minutes / horaire / quotidien / hebdo), exécution manuelle.
4. **Workspace** (`/workspace`) — explorateur de fichiers de l'agent + aperçu texte/image.
5. **Réglages** (`/settings`) — credentials pour APIs externes ({{secret.NOM}}), mémoire longue durée, infos machine, inventaire des capacités.

## UX patterns

- Chaque appel d'outil s'affiche comme une ligne mono repliable : `▸ shell · 0.4s · exit 0`.
- Statut du stream : point lime pulsant + "l'agent travaille".
- Aucune boîte de confirmation : mode autonomie totale, tout est tracé dans Activité.
- Vide = liste des capacités avec exemples de prompts cliquables.
