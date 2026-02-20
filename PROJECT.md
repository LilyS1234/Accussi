# ACCUSSI

## Overview

Accussi is an immersive, scene-based web application designed to teach Sicilian through environmental interaction.

The core principle is world-first, learning-second. Interaction should feel exploratory, never quiz-like.

## Current Architecture

- `index.html`: semantic shell for scene, interaction panel, and scene navigation.
- `styles.css`: immersive visual styling and hotspot overlays.
- `app.js`: separated modules for village map scene, location scenes, vocabulary data, and learning-state persistence.
- `assets/images/scenes/village-map-provided.png`: preferred main village map image (drop-in asset).
- `assets/images/scenes/village-map.svg`: automatic fallback map if the preferred image file is missing.
- `assets/images/scenes/*.svg`: location backdrops used after traveling from the map.

## Learning State

Persisted in `localStorage` under `accussi_learning_state`.

Each vocabulary entry tracks:

- `exposures`
- `lastSeen`

## Current Scenes

- Village map hub (`The Village of Accussi`) as the default entry experience.
- Vineyard
- Piazza
- Lemon grove
- Nonna's kitchen
- Alimentari
- Market
- Caffè
- Beach
- Post office

## Immediate Next Steps

- Add the exact owner-provided village map image file at `assets/images/scenes/village-map-provided.png`.
- Replace placeholder location art with dedicated scene illustrations per location.
- Add richer scene transition effects.
- Introduce lightweight character interaction hooks while keeping scene and learning systems decoupled.
