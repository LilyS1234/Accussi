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
const introSceneId = "flight-to-sicily";
let introTimer = null;
let introFlightAudio = null;

const sceneTemplate = (id, name, description, image, vocabId) => ({
  id,
  name,
  description,
  backgroundImage: image,
  hotspots: [
    { type: "vocab", vocabId, label: vocabulary[vocabId]?.sicilian || "Parola", left: 38, top: 52, width: 24, height: 26 },
    { type: "scene", targetSceneId: "map", label: "Torna ô paisi", left: 2, top: 4, width: 22, height: 14 },
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
  map: {
    id: "map",
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
  vineyard: sceneTemplate("vineyard", "A Vigna", "Rows of vines and harvest words.", providedSceneImage, "racina"),
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
const appState = { currentSceneId: introSceneId, learningState: loadLearningState() };

const sceneBackgroundEl = document.getElementById("scene-background");
const hotspotLayerEl = document.getElementById("hotspot-layer");
const sceneNavEl = document.getElementById("scene-nav");

renderSceneNav();
renderScene();

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
  mapButton.addEventListener("click", () => setScene("map"));
  if (appState.currentSceneId === "map") mapButton.classList.add("active");
  sceneNavEl.appendChild(mapButton);

  Object.values(scenes)
    .filter((scene) => scene.id !== "map" && !scene.isIntro)
    .forEach((scene) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "scene-button";
      button.textContent = scene.name;
      button.addEventListener("click", () => setScene(scene.id));
      if (scene.id === appState.currentSceneId) button.classList.add("active");
      sceneNavEl.appendChild(button);
    });
}

function setScene(sceneId) {
  if (!scenes[sceneId]) return;
  if (introTimer) {
    clearTimeout(introTimer);
    introTimer = null;
  }
  if (sceneId !== introSceneId) stopIntroFlightSound();
  appState.currentSceneId = sceneId;
  renderScene();
  renderSceneNav();
}

function renderScene() {
  const scene = scenes[appState.currentSceneId];
  if (!scene) return;
  sceneBackgroundEl.style.backgroundImage = buildBackgroundImage(scene.backgroundImage);
  hotspotLayerEl.classList.toggle("map-hotspots", scene.id === "map");
  hotspotLayerEl.classList.toggle("intro-hotspots", Boolean(scene.isIntro));
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
  speechBubble.textContent = "Passengers, this is your captain speaking: Sicily ahead — prepare for landing in Accussi!";
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
  skipButton.addEventListener("click", () => setScene("map"));
  hotspotLayerEl.appendChild(skipButton);

  introTimer = setTimeout(() => {
    if (appState.currentSceneId === introSceneId) setScene("map");
  }, 6800);
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

function buildBackgroundImage(backgroundImage) {
  const imageList = Array.isArray(backgroundImage) ? backgroundImage : [backgroundImage];
  return imageList.map((imagePath) => (imagePath.startsWith("linear-gradient") || imagePath.startsWith("radial-gradient") ? imagePath : `url(${imagePath})`)).join(", ");
}

function onHotspotInteract(hotspot) {
  if (hotspot.type === "scene") return setScene(hotspot.targetSceneId);

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
