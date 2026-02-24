const vocabulary = {
  racina: { sicilian: "a racina", english: "the grape", audio: "assets/audio/racina.mp3" },
  suli: { sicilian: "u suli", english: "the sun", audio: "assets/audio/suli.mp3" },
  terra: { sicilian: "a terra", english: "the earth", audio: "assets/audio/terra.mp3" },
  acqua: { sicilian: "l'acqua", english: "the water", audio: "assets/audio/acqua.mp3" },
  limuna: { sicilian: "a limuna", english: "the lemon", audio: "assets/audio/limuna.mp3" },
  pani: { sicilian: "u pani", english: "the bread", audio: "assets/audio/pani.mp3" },
  cafi: { sicilian: "u cafè", english: "the coffee", audio: "assets/audio/cafi.mp3" },
  pisci: { sicilian: "u pisci", english: "the fish", audio: "assets/audio/pisci.mp3" },
  littra: { sicilian: "a littra", english: "the letter", audio: "assets/audio/littra.mp3" },
};

const providedSceneImage = "assets/images/scenes/village-map-provided.png";
const vineyardSceneImage = "assets/images/vineyard.png";
const introSceneId = "flight-to-sicily";
const mapSceneId = "map";
const mapMusicSrc = "assets/audio/pixel-passeggiata.mp3";
const musicPrefKey = "accussi_music_enabled";
let introTimer = null;
let introFlightAudio = null;
let mapMusicAudio = null;
let mapMusicPrimed = false;
let mapMusicUnlockListenersAttached = false;

const vineyardGamePrompts = [
  {
    prompt: "A ___ è duci.",
    choices: ["racina", "limuna"],
    correctChoice: "racina",
  },
  {
    prompt: "U viddanu metti a racina ntra u ___.",
    choices: ["panaru", "suli"],
    correctChoice: "panaru",
  },
  {
    prompt: "Pi fari vinu, cogghimu a ___.",
    choices: ["racina", "acqua"],
    correctChoice: "racina",
  },
  {
    prompt: "A vigna voli suli e ___.",
    choices: ["acqua", "pisci"],
    correctChoice: "acqua",
  },
  {
    prompt: "Angelo dici: Cogghi a ___ matura!",
    choices: ["racina", "littra"],
    correctChoice: "racina",
  },
  {
    prompt: "Doppu a vindemmia, purtamu u ___.",
    choices: ["panaru", "cafi"],
    correctChoice: "panaru",
  },
];

const vineyardGameState = {
  isActive: false,
  round: 0,
  score: 0,
  basketGrapes: 0,
  groundGrapes: 0,
  prompts: [],
};

const sceneTemplate = (id, name, description, image, vocabId) => ({
  id,
  name,
  description,
  backgroundImage: image,
  hotspots: [
    { type: "vocab", vocabId, label: vocabulary[vocabId]?.sicilian || "Parola", left: 38, top: 52, width: 24, height: 26 },
    { type: "scene", targetSceneId: mapSceneId, label: "Torna ô paisi", left: 2, top: 4, width: 22, height: 14 },
  ],
});

const scenes = {
  [introSceneId]: {
    id: introSceneId,
    name: "Flight to Sicily",
    description: "A playful takeoff scene before arriving in Accussi.",
    backgroundImage: [
      "linear-gradient(180deg, #6ec8ff 0%, #7fd5ff 34%, #bfe9ff 100%)",
      "radial-gradient(circle at 20% 25%, rgba(255, 255, 255, 0.5) 0 18%, transparent 50%)",
      "radial-gradient(circle at 72% 40%, rgba(255, 255, 255, 0.45) 0 16%, transparent 46%)",
    ],
    hotspots: [],
    isIntro: true,
  },
  [mapSceneId]: {
    id: mapSceneId,
    name: "The Village of Accussi",
    description: "Choose a place in the village map to begin your scene.",
    backgroundImage: providedSceneImage,
    hotspots: [
      { type: "scene", targetSceneId: "lemon-grove", label: "U Giardini di Limuna", left: 6, top: 16, width: 25, height: 19 },
      { type: "scene", targetSceneId: "vineyard", label: "A Vigna", left: 35, top: 16, width: 22, height: 20 },
      { type: "scene", targetSceneId: "nonnas-kitchen", label: "A Cucina di Nonna", left: 64, top: 16, width: 30, height: 21 },
      { type: "scene", targetSceneId: "alimentari", label: "U Negoziu", left: 8, top: 41, width: 23, height: 18 },
      { type: "scene", targetSceneId: "piazza", label: "A Chiazza", left: 38, top: 37, width: 23, height: 20 },
      { type: "scene", targetSceneId: "market", label: "U Mercatu", left: 69, top: 43, width: 24, height: 19 },
      { type: "scene", targetSceneId: "caffe", label: "U Caffè", left: 8, top: 66, width: 24, height: 19 },
      { type: "scene", targetSceneId: "beach", label: "A Spiaggia", left: 67, top: 67, width: 25, height: 21 },
      { type: "scene", targetSceneId: "posta", label: "La Posta", left: 52, top: 48, width: 10, height: 12 },
    ],
  },
  vineyard: {
    ...sceneTemplate("vineyard", "A Vigna", "Rows of vines and harvest words.", vineyardSceneImage, "racina"),
    hotspots: [
      { type: "vocab", vocabId: "racina", label: vocabulary.racina.sicilian, left: 52, top: 58, width: 20, height: 23 },
      { type: "scene", targetSceneId: mapSceneId, label: "Torna ô paisi", left: 2, top: 4, width: 22, height: 14 },
    ],
  },
  piazza: sceneTemplate("piazza", "A Chiazza", "Water, stone, and conversation.", providedSceneImage, "acqua"),
  "lemon-grove": sceneTemplate("lemon-grove", "U Giardini di Limuna", "Trees and citrus in warm light.", providedSceneImage, "limuna"),
  "nonnas-kitchen": sceneTemplate("nonnas-kitchen", "A Cucina di Nonna", "Family cooking and home language.", providedSceneImage, "pani"),
  alimentari: sceneTemplate("alimentari", "U Negoziu", "Shopping language in the village shop.", providedSceneImage, "pani"),
  market: sceneTemplate("market", "U Mercatu", "Produce stalls and spoken bargains.", providedSceneImage, "pisci"),
  caffe: sceneTemplate("caffe", "U Caffè", "Counter chatter and café rhythms.", providedSceneImage, "cafi"),
  beach: sceneTemplate("beach", "A Spiaggia", "Sea breeze and coastal vocabulary.", providedSceneImage, "suli"),
  posta: sceneTemplate("posta", "La Posta", "Letters, stamps, and formal phrases.", providedSceneImage, "littra"),
};

const storageKey = "accussi_learning_state";
const appState = { currentSceneId: introSceneId, learningState: loadLearningState(), musicEnabled: loadMusicEnabled() };

const sceneBackgroundEl = document.getElementById("scene-background");
const hotspotLayerEl = document.getElementById("hotspot-layer");
const sceneNavEl = document.getElementById("scene-nav");

renderSceneNav();
renderScene();
primeMapMusicForAutoplay();
updateMapMusicState();

function renderSceneNav() {
  const isIntroScene = Boolean(scenes[appState.currentSceneId]?.isIntro);
  sceneNavEl.classList.toggle("hidden", isIntroScene);

  if (isIntroScene) {
    sceneNavEl.innerHTML = "";
    return;
  }

  sceneNavEl.innerHTML = "";

  const mapButton = document.createElement("button");
  mapButton.type = "button";
  mapButton.className = "scene-button";
  mapButton.textContent = "Main Map";
  mapButton.addEventListener("click", () => setScene(mapSceneId));
  if (appState.currentSceneId === mapSceneId) mapButton.classList.add("active");
  sceneNavEl.appendChild(mapButton);

  Object.values(scenes)
    .filter((scene) => scene.id !== mapSceneId && !scene.isIntro)
    .forEach((scene) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "scene-button";
      button.textContent = scene.name;
      button.addEventListener("click", () => {
        if (scene.id === "caffe") {
          window.location.href = "locations/caffe.html";
          return;
        }
        setScene(scene.id);
      });
      if (scene.id === appState.currentSceneId) button.classList.add("active");
      sceneNavEl.appendChild(button);
    });

  const musicToggle = document.createElement("button");
  musicToggle.type = "button";
  musicToggle.className = "scene-button music-toggle";
  musicToggle.textContent = appState.musicEnabled ? "Music: On" : "Music: Off";
  musicToggle.setAttribute("aria-pressed", String(appState.musicEnabled));
  musicToggle.addEventListener("click", () => {
    appState.musicEnabled = !appState.musicEnabled;
    persistMusicEnabled(appState.musicEnabled);
    updateMapMusicState();
    renderSceneNav();
  });
  sceneNavEl.appendChild(musicToggle);
}

function setScene(sceneId) {
  if (!scenes[sceneId]) return;
  if (introTimer) {
    clearTimeout(introTimer);
    introTimer = null;
  }
  if (sceneId !== introSceneId) stopIntroFlightSound();
  appState.currentSceneId = sceneId;
  if (sceneId === mapSceneId) primeMapMusicForAutoplay();
  renderScene();
  renderSceneNav();
  updateMapMusicState();
}

function renderScene() {
  const scene = scenes[appState.currentSceneId];
  if (!scene) return;
  sceneBackgroundEl.style.backgroundImage = buildBackgroundImage(scene.backgroundImage);
  const isMapScene = scene.id === mapSceneId;
  sceneBackgroundEl.classList.toggle("map-reveal-bg", isMapScene);
  hotspotLayerEl.classList.toggle("map-hotspots", isMapScene);
  hotspotLayerEl.classList.toggle("intro-hotspots", Boolean(scene.isIntro));
  hotspotLayerEl.classList.toggle("map-reveal", isMapScene);
  hotspotLayerEl.innerHTML = "";

  if (scene.isIntro) {
    renderIntroScene();
    return;
  }

  scene.hotspots.forEach((hotspot) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `hotspot hotspot-${hotspot.type}`;
    button.style.left = `${hotspot.left}%`;
    button.style.top = `${hotspot.top}%`;
    button.style.width = `${hotspot.width}%`;
    button.style.height = `${hotspot.height}%`;
    button.setAttribute("aria-label", hotspot.label);

    const label = document.createElement("span");
    label.className = "hotspot-label";
    label.textContent = hotspot.label;
    button.appendChild(label);

    button.addEventListener("click", () => onHotspotInteract(hotspot));
    hotspotLayerEl.appendChild(button);
  });

  if (scene.id === "vineyard") {
    renderVineyardCharacter();
    renderVineyardGameLauncher();
    if (vineyardGameState.isActive) renderVineyardGameOverlay();
  }
}

function renderVineyardCharacter() {
  const bubbleWrap = document.createElement("div");
  bubbleWrap.className = "vineyard-character-wrap";

  const speechBubble = document.createElement("div");
  speechBubble.className = "vineyard-bubble";
  speechBubble.textContent = "Ciau! Sugnu Angelo! È tempu di cogghiri i racini!";
  speechBubble.setAttribute("aria-label", "Angelo says hello and invites the player to pick grapes.");
  bubbleWrap.appendChild(speechBubble);

  hotspotLayerEl.appendChild(bubbleWrap);
}

function renderVineyardGameLauncher() {
  const startButton = document.createElement("button");
  startButton.type = "button";
  startButton.className = "vineyard-game-start";
  startButton.textContent = vineyardGameState.isActive ? "Game Running" : "Start Dui Panara";
  startButton.disabled = vineyardGameState.isActive;
  startButton.addEventListener("click", () => {
    startVineyardGame();
    renderScene();
  });

  hotspotLayerEl.appendChild(startButton);
}

function startVineyardGame() {
  vineyardGameState.isActive = true;
  vineyardGameState.round = 0;
  vineyardGameState.score = 0;
  vineyardGameState.basketGrapes = 0;
  vineyardGameState.groundGrapes = 0;
  vineyardGameState.prompts = shuffleArray(vineyardGamePrompts).slice(0, 5);
}

function renderVineyardGameOverlay() {
  const panel = document.createElement("section");
  panel.className = "vineyard-game-panel";

  if (vineyardGameState.round >= vineyardGameState.prompts.length) {
    panel.innerHTML = `
      <h3>Vendemmia finita!</h3>
      <p>Punti: <strong>${vineyardGameState.score}</strong> / ${vineyardGameState.prompts.length}</p>
      <p>🍇 Ntô panaru: <strong>${vineyardGameState.basketGrapes}</strong> &nbsp;|&nbsp; 🍇 Nterra: <strong>${vineyardGameState.groundGrapes}</strong></p>
    `;

    const restartButton = document.createElement("button");
    restartButton.type = "button";
    restartButton.className = "scene-button";
    restartButton.textContent = "Play Again";
    restartButton.addEventListener("click", () => {
      startVineyardGame();
      renderScene();
    });
    panel.appendChild(restartButton);

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "scene-button";
    closeButton.textContent = "Close";
    closeButton.addEventListener("click", () => {
      vineyardGameState.isActive = false;
      renderScene();
    });
    panel.appendChild(closeButton);

    hotspotLayerEl.appendChild(panel);
    return;
  }

  const roundData = vineyardGameState.prompts[vineyardGameState.round];
  panel.innerHTML = `
    <h3>Dui Panara</h3>
    <p class="vineyard-game-progress">Round ${vineyardGameState.round + 1} / ${vineyardGameState.prompts.length}</p>
    <p class="vineyard-game-prompt">${roundData.prompt}</p>
    <p class="vineyard-game-score">🍇 Ntô panaru: <strong>${vineyardGameState.basketGrapes}</strong> &nbsp;|&nbsp; 🍇 Nterra: <strong>${vineyardGameState.groundGrapes}</strong></p>
  `;

  const baskets = document.createElement("div");
  baskets.className = "vineyard-baskets";

  roundData.choices.forEach((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "vineyard-basket";
    button.innerHTML = `<span class="vineyard-basket-icon">🧺</span><span>${choice}</span>`;
    button.addEventListener("click", () => {
      const isCorrect = choice === roundData.correctChoice;
      if (isCorrect) {
        vineyardGameState.score += 1;
        vineyardGameState.basketGrapes += 3;
      } else {
        vineyardGameState.groundGrapes += 2;
      }
      vineyardGameState.round += 1;
      renderScene();
    });
    baskets.appendChild(button);
  });

  panel.appendChild(baskets);
  hotspotLayerEl.appendChild(panel);
}

function renderIntroScene() {
  startIntroFlightSound();

  const cloudPositions = [
    { left: 8, top: 16, delay: "0s" },
    { left: 28, top: 30, delay: "0.5s" },
    { left: 52, top: 18, delay: "1s" },
    { left: 74, top: 34, delay: "1.4s" },
    { left: 18, top: 54, delay: "1.8s" },
    { left: 66, top: 58, delay: "2.3s" },
  ];

  cloudPositions.forEach((cloud) => {
    const cloudEl = document.createElement("span");
    cloudEl.className = "intro-cloud";
    cloudEl.textContent = "☁️";
    cloudEl.style.left = `${cloud.left}%`;
    cloudEl.style.top = `${cloud.top}%`;
    cloudEl.style.animationDelay = cloud.delay;
    hotspotLayerEl.appendChild(cloudEl);
  });

  const planeWrap = document.createElement("div");
  planeWrap.className = "intro-plane-wrap";

  const speechBubble = document.createElement("div");
  speechBubble.className = "intro-bubble";
  speechBubble.textContent = "Buongiorno, dreamers! Captain Luminari here — we're swirling through sun-kissed clouds, so sip the sky and get ready for a grand arrival in Accussi!";
  planeWrap.appendChild(speechBubble);

  const plane = document.createElement("span");
  plane.className = "intro-plane";
  plane.textContent = "✈️";
  planeWrap.appendChild(plane);

  hotspotLayerEl.appendChild(planeWrap);

  const skipButton = document.createElement("button");
  skipButton.type = "button";
  skipButton.className = "intro-skip";
  skipButton.textContent = "Skip flight";
  skipButton.addEventListener("click", () => setScene(mapSceneId));
  hotspotLayerEl.appendChild(skipButton);

  introTimer = setTimeout(() => {
    if (appState.currentSceneId === introSceneId) setScene(mapSceneId);
  }, 9800);
}

function startIntroFlightSound() {
  if (introFlightAudio) return;

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const context = new AudioCtx();
    const masterGain = context.createGain();
    masterGain.gain.value = 0.03;
    masterGain.connect(context.destination);

    const engine = context.createOscillator();
    engine.type = "sawtooth";
    engine.frequency.value = 78;

    const harmonics = context.createOscillator();
    harmonics.type = "triangle";
    harmonics.frequency.value = 156;

    const wobble = context.createOscillator();
    wobble.type = "sine";
    wobble.frequency.value = 0.22;

    const wobbleDepth = context.createGain();
    wobbleDepth.gain.value = 7;

    wobble.connect(wobbleDepth);
    wobbleDepth.connect(engine.frequency);
    wobbleDepth.connect(harmonics.frequency);

    engine.connect(masterGain);
    harmonics.connect(masterGain);

    engine.start();
    harmonics.start();
    wobble.start();

    introFlightAudio = { context, engine, harmonics, wobble, masterGain };

    if (context.state === "suspended") {
      const resumeAudio = () => {
        context.resume().catch(() => {});
        window.removeEventListener("pointerdown", resumeAudio);
      };

      window.addEventListener("pointerdown", resumeAudio, { once: true });
    }
  } catch {
    introFlightAudio = null;
  }
}

function stopIntroFlightSound() {
  if (!introFlightAudio) return;

  const { engine, harmonics, wobble, masterGain, context } = introFlightAudio;
  const now = context.currentTime;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setValueAtTime(masterGain.gain.value, now);
  masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.25);

  const stopAt = now + 0.26;
  engine.stop(stopAt);
  harmonics.stop(stopAt);
  wobble.stop(stopAt);

  setTimeout(() => {
    context.close().catch(() => {});
  }, 320);

  introFlightAudio = null;
}



function ensureMapMusicAudio() {
  if (mapMusicAudio) return mapMusicAudio;

  mapMusicAudio = new Audio(mapMusicSrc);
  mapMusicAudio.preload = "auto";
  mapMusicAudio.loop = true;
  mapMusicAudio.volume = 0.5;
  return mapMusicAudio;
}

function attachMapMusicUnlockListeners() {
  if (mapMusicUnlockListenersAttached) return;

  const resumeOnInteraction = () => {
    updateMapMusicState();

    if (appState.currentSceneId === mapSceneId && appState.musicEnabled && mapMusicAudio && !mapMusicAudio.paused) {
      ["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
        window.removeEventListener(eventName, resumeOnInteraction);
      });
      mapMusicUnlockListenersAttached = false;
    }
  };

  ["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
    window.addEventListener(eventName, resumeOnInteraction);
  });
  mapMusicUnlockListenersAttached = true;
}

function primeMapMusicForAutoplay() {
  const music = ensureMapMusicAudio();
  if (mapMusicPrimed) return;

  const shouldRemainPlaying = appState.currentSceneId === mapSceneId && appState.musicEnabled;
  music.muted = true;
  music
    .play()
    .then(() => {
      if (!shouldRemainPlaying) {
        music.pause();
        music.currentTime = 0;
      }
      mapMusicPrimed = true;
    })
    .catch(() => {});
}

function updateMapMusicState() {
  const shouldPlay = appState.currentSceneId === mapSceneId && appState.musicEnabled;
  const music = ensureMapMusicAudio();

  if (!shouldPlay) {
    music.pause();
    return;
  }

  music.muted = false;
  music.play().catch(() => {
    attachMapMusicUnlockListeners();
  });
}

function buildBackgroundImage(backgroundImage) {
  const imageList = Array.isArray(backgroundImage) ? backgroundImage : [backgroundImage];
  return imageList.map((imagePath) => (imagePath.startsWith("linear-gradient") || imagePath.startsWith("radial-gradient") ? imagePath : `url(${imagePath})`)).join(", ");
}

function onHotspotInteract(hotspot) {
  if (hotspot.type === "scene") {
    if (hotspot.targetSceneId === "caffe") {
      window.location.href = "locations/caffe.html";
      return;
    }
    return setScene(hotspot.targetSceneId);
  }

  const vocab = vocabulary[hotspot.vocabId];
  if (!vocab) return;

  const state = appState.learningState[hotspot.vocabId] || { exposures: 0, lastSeen: null };
  state.exposures += 1;
  state.lastSeen = Date.now();
  appState.learningState[hotspot.vocabId] = state;
  persistLearningState(appState.learningState);

  playAudio(vocab.audio);
}

function playAudio(src) {
  if (!src) return;
  new Audio(src).play().catch(() => {});
}

function loadLearningState() {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistLearningState(state) {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function loadMusicEnabled() {
  try {
    const raw = localStorage.getItem(musicPrefKey);
    if (raw === null) return true;
    return raw === "true";
  } catch {
    return true;
  }
}

function persistMusicEnabled(enabled) {
  localStorage.setItem(musicPrefKey, String(Boolean(enabled)));
}

function shuffleArray(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}
