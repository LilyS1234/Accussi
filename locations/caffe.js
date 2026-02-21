const prompts = [
  { id: "coffee", sicilian: "U cafè", english: "Coffee" },
  { id: "brioche", sicilian: "A brioscia", english: "The brioche" },
  { id: "barista", sicilian: "U barista", english: "The barista" },
  { id: "machine", sicilian: "A machina dû cafè", english: "The espresso machine" },
];

const hotspotNameToObject = {
  espresso: "machine",
  cup: "coffee",
  brioche: "brioche",
  barista: "barista",
  machine: "machine",
  coffee: "coffee",
};

let hotspotConfig = [
  { name: "espresso", objectId: "machine", left: 89, top: 37, width: 11, height: 17 },
  { name: "cup", objectId: "coffee", left: 61.8, top: 49.5, width: 5.2, height: 7.2 },
  { name: "brioche", objectId: "brioche", left: 71, top: 47, width: 21, height: 17 },
  { name: "barista", objectId: "barista", left: 53, top: 30, width: 21, height: 28 },
];

const baristaGreetingDelayMs = 3200;
const baristaGreetingDurationMs = 3600;
const lessonFeedbackBubbleDurationMs = 1800;
const ambiencePrefKey = "accussi_caffe_ambience_enabled";
const hotspotConfigStorageKey = "accussi_caffe_hotspot_config";

let currentIndex = 0;
let gameActive = false;
let greetingTimer = null;

const promptSicilian = document.getElementById("prompt-sicilian");
const promptEnglish = document.getElementById("prompt-english");
const progressEl = document.getElementById("progress");
const feedbackEl = document.getElementById("feedback");
const startButton = document.getElementById("start-button");
const ambienceToggle = document.getElementById("ambience-toggle");
const hotspotStage = document.getElementById("hotspot-stage");
const sceneWrapper = document.getElementById("scene-wrapper");

const debugToggle = document.getElementById("debug-toggle");
const editorToggle = document.getElementById("editor-toggle");
const editorLayer = document.getElementById("editor-layer");
const editorSelection = document.getElementById("editor-selection");
const hotspotNameInput = document.getElementById("hotspot-name");
const saveHotspotButton = document.getElementById("save-hotspot");
const editorOutput = document.getElementById("editor-output");
const editorControls = document.getElementById("editor-controls");

const lessonPopup = document.getElementById("lesson-popup");
const popupInstruction = document.getElementById("popup-instruction");
const baristaBubble = document.getElementById("barista-bubble");
let baristaBubbleTimer = null;

let ambienceEnabled = loadAmbienceEnabled();
let ambienceContext = null;
let ambienceNodes = null;
let ambienceOneshotTimer = null;
let ambienceUnlockAttached = false;

const params = new URLSearchParams(window.location.search);
let debugMode = params.has("devtools") || params.has("debugHotspots");
let editorMode = false;
let isDrawing = false;
let dragStartPercent = null;
let latestDrawnHotspot = null;

function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

function roundPct(value) {
  return Number(value.toFixed(2));
}

function calculatePercentPoint(event) {
  const rect = sceneWrapper.getBoundingClientRect();
  const x = clampPercent(((event.clientX - rect.left) / rect.width) * 100);
  const y = clampPercent(((event.clientY - rect.top) / rect.height) * 100);
  return { x, y };
}

function styleHotspotElement(el, hotspot) {
  el.style.left = `${hotspot.left}%`;
  el.style.top = `${hotspot.top}%`;
  el.style.width = `${hotspot.width}%`;
  el.style.height = `${hotspot.height}%`;
}

function renderHotspots() {
  hotspotStage.textContent = "";
  hotspotConfig.forEach((hotspot) => {
    const button = document.createElement("button");
    button.className = "hotspot";
    button.type = "button";
    button.dataset.object = hotspot.objectId;
    button.setAttribute("aria-label", `${hotspot.name} hotspot`);
    styleHotspotElement(button, hotspot);
    button.addEventListener("click", () => handleHotspotTap(hotspot.objectId));
    hotspotStage.appendChild(button);
  });
}

function syncModeClasses() {
  document.body.classList.toggle("debug-hotspots", debugMode);
  document.body.classList.toggle("editor-mode", editorMode);
  editorLayer.hidden = !editorMode;
}

function syncEditorVisibility() {
  const showControls = debugMode;
  editorControls.hidden = !showControls;

  if (!showControls && editorMode) {
    editorMode = false;
    editorToggle.checked = false;
    editorSelection.hidden = true;
  }
}

function hotspotToConfigLine(hotspot) {
  return `  { name: "${hotspot.name}", objectId: "${hotspot.objectId}", left: ${hotspot.left}, top: ${hotspot.top}, width: ${hotspot.width}, height: ${hotspot.height} }`;
}

function writeEditorOutput(hotspot) {
  const valuesText = `left:${hotspot.left}% top:${hotspot.top}% width:${hotspot.width}% height:${hotspot.height}%`;
  const configArray = `const hotspotConfig = [\n${hotspotConfig.map(hotspotToConfigLine).join(",\n")}\n];`;
  editorOutput.textContent = `${valuesText}\n${configArray}`;
  console.log("Hotspot percentages", hotspot);
  console.log(configArray);
}

function beginDraw(event) {
  if (!editorMode || event.button !== 0) return;
  isDrawing = true;
  dragStartPercent = calculatePercentPoint(event);
  latestDrawnHotspot = null;

  editorSelection.hidden = false;
  editorSelection.style.left = `${dragStartPercent.x}%`;
  editorSelection.style.top = `${dragStartPercent.y}%`;
  editorSelection.style.width = "0%";
  editorSelection.style.height = "0%";
}

function drawMove(event) {
  if (!isDrawing || !dragStartPercent) return;

  const current = calculatePercentPoint(event);
  const left = Math.min(dragStartPercent.x, current.x);
  const top = Math.min(dragStartPercent.y, current.y);
  const width = Math.abs(current.x - dragStartPercent.x);
  const height = Math.abs(current.y - dragStartPercent.y);

  editorSelection.style.left = `${left}%`;
  editorSelection.style.top = `${top}%`;
  editorSelection.style.width = `${width}%`;
  editorSelection.style.height = `${height}%`;
}

function endDraw(event) {
  if (!isDrawing || !dragStartPercent) return;
  isDrawing = false;

  const current = calculatePercentPoint(event);
  const left = roundPct(Math.min(dragStartPercent.x, current.x));
  const top = roundPct(Math.min(dragStartPercent.y, current.y));
  const width = roundPct(Math.abs(current.x - dragStartPercent.x));
  const height = roundPct(Math.abs(current.y - dragStartPercent.y));

  dragStartPercent = null;

  if (width < 0.4 || height < 0.4) {
    editorOutput.textContent = "Draw a larger rectangle to create a hotspot.";
    editorSelection.hidden = true;
    return;
  }

  const selectedName = hotspotNameInput.value;
  latestDrawnHotspot = {
    name: selectedName,
    objectId: hotspotNameToObject[selectedName] || selectedName,
    left,
    top,
    width,
    height,
  };

  writeEditorOutput(latestDrawnHotspot);
}

function saveLatestHotspot() {
  if (!latestDrawnHotspot) {
    editorOutput.textContent = "Draw a hotspot first, then save.";
    return;
  }

  const index = hotspotConfig.findIndex((hotspot) => hotspot.name === latestDrawnHotspot.name);
  if (index >= 0) {
    hotspotConfig[index] = latestDrawnHotspot;
  } else {
    hotspotConfig.push(latestDrawnHotspot);
  }

  renderHotspots();
  persistHotspotConfig();
  writeEditorOutput(latestDrawnHotspot);
  editorOutput.textContent += "\nSaved locally. Refresh to verify it persists.";
}

function normalizeHotspot(hotspot) {
  if (!hotspot || typeof hotspot !== "object") return null;

  const name = typeof hotspot.name === "string" ? hotspot.name.trim() : "";
  const objectId = typeof hotspot.objectId === "string" ? hotspot.objectId.trim() : "";
  const left = Number(hotspot.left);
  const top = Number(hotspot.top);
  const width = Number(hotspot.width);
  const height = Number(hotspot.height);

  if (!name || !objectId) return null;
  if (![left, top, width, height].every(Number.isFinite)) return null;

  return {
    name,
    objectId,
    left: roundPct(clampPercent(left)),
    top: roundPct(clampPercent(top)),
    width: roundPct(clampPercent(width)),
    height: roundPct(clampPercent(height)),
  };
}

function loadPersistedHotspotConfig() {
  if (!debugMode) return;
  try {
    const raw = localStorage.getItem(hotspotConfigStorageKey);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;

    const normalized = parsed.map(normalizeHotspot).filter(Boolean);
    if (!normalized.length) return;

    hotspotConfig = normalized;
  } catch {
    // Ignore storage or parse failures.
  }
}

function persistHotspotConfig() {
  if (!debugMode) return;
  try {
    localStorage.setItem(hotspotConfigStorageKey, JSON.stringify(hotspotConfig));
  } catch {
    // Ignore storage failures in restricted browsers.
  }
}

function loadAmbienceEnabled() {
  try {
    const stored = localStorage.getItem(ambiencePrefKey);
    if (stored === null) return true;
    return stored === "true";
  } catch {
    return true;
  }
}

function persistAmbienceEnabled() {
  try {
    localStorage.setItem(ambiencePrefKey, String(ambienceEnabled));
  } catch {
    // Ignore storage failures in restricted browsers.
  }
}

function updateAmbienceToggleLabel() {
  ambienceToggle.textContent = ambienceEnabled ? "Caffè Sounds: On" : "Caffè Sounds: Off";
  ambienceToggle.setAttribute("aria-pressed", String(ambienceEnabled));
}

function createNoiseBuffer(context, seconds = 2) {
  const sampleRate = context.sampleRate;
  const frameCount = sampleRate * seconds;
  const buffer = context.createBuffer(1, frameCount, sampleRate);
  const channel = buffer.getChannelData(0);

  let previous = 0;
  for (let i = 0; i < frameCount; i += 1) {
    const white = Math.random() * 2 - 1;
    previous = (previous + 0.02 * white) / 1.02;
    channel[i] = previous * 3.1;
  }

  return buffer;
}

function playCupClink(context, output) {
  const now = context.currentTime;
  const clink = context.createOscillator();
  clink.type = "triangle";
  clink.frequency.setValueAtTime(1400 + Math.random() * 500, now);

  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.02, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

  clink.connect(gain);
  gain.connect(output);
  clink.start(now);
  clink.stop(now + 0.25);
}

function playRegisterBeep(context, output) {
  const now = context.currentTime;
  const beep = context.createOscillator();
  beep.type = "square";

  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.011, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

  beep.frequency.setValueAtTime(980, now);
  beep.frequency.linearRampToValueAtTime(1320, now + 0.08);

  beep.connect(gain);
  gain.connect(output);
  beep.start(now);
  beep.stop(now + 0.14);
}

function scheduleAmbienceOneShots() {
  if (!ambienceContext || !ambienceNodes || !ambienceEnabled) return;

  const delayMs = 3600 + Math.random() * 4200;
  ambienceOneshotTimer = setTimeout(() => {
    if (!ambienceContext || !ambienceNodes || !ambienceEnabled) return;

    playCupClink(ambienceContext, ambienceNodes.output);
    if (Math.random() > 0.62) {
      playRegisterBeep(ambienceContext, ambienceNodes.output);
    }

    scheduleAmbienceOneShots();
  }, delayMs);
}

function buildAmbienceGraph(context) {
  const output = context.createGain();
  output.gain.value = 0.75;
  output.connect(context.destination);

  const roomNoise = context.createBufferSource();
  roomNoise.buffer = createNoiseBuffer(context, 3);
  roomNoise.loop = true;

  const roomFilter = context.createBiquadFilter();
  roomFilter.type = "bandpass";
  roomFilter.frequency.value = 540;
  roomFilter.Q.value = 0.7;

  const roomGain = context.createGain();
  roomGain.gain.value = 0.014;

  const steamNoise = context.createBufferSource();
  steamNoise.buffer = createNoiseBuffer(context, 2);
  steamNoise.loop = true;

  const steamFilter = context.createBiquadFilter();
  steamFilter.type = "highpass";
  steamFilter.frequency.value = 2200;

  const steamGain = context.createGain();
  steamGain.gain.value = 0.003;

  const steamLfo = context.createOscillator();
  steamLfo.type = "sine";
  steamLfo.frequency.value = 0.11;

  const steamLfoDepth = context.createGain();
  steamLfoDepth.gain.value = 0.002;

  const murmurOsc = context.createOscillator();
  murmurOsc.type = "triangle";
  murmurOsc.frequency.value = 180;

  const murmurFilter = context.createBiquadFilter();
  murmurFilter.type = "lowpass";
  murmurFilter.frequency.value = 460;

  const murmurGain = context.createGain();
  murmurGain.gain.value = 0.0026;

  roomNoise.connect(roomFilter);
  roomFilter.connect(roomGain);
  roomGain.connect(output);

  steamNoise.connect(steamFilter);
  steamFilter.connect(steamGain);
  steamGain.connect(output);

  steamLfo.connect(steamLfoDepth);
  steamLfoDepth.connect(steamGain.gain);

  murmurOsc.connect(murmurFilter);
  murmurFilter.connect(murmurGain);
  murmurGain.connect(output);

  roomNoise.start();
  steamNoise.start();
  murmurOsc.start();
  steamLfo.start();

  return {
    output,
    roomNoise,
    steamNoise,
    murmurOsc,
    steamLfo,
  };
}

function stopAmbienceOneShots() {
  if (ambienceOneshotTimer) {
    clearTimeout(ambienceOneshotTimer);
    ambienceOneshotTimer = null;
  }
}

function ensureAmbience() {
  if (!ambienceEnabled) return;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  if (!ambienceContext) {
    ambienceContext = new AudioCtx();
    ambienceNodes = buildAmbienceGraph(ambienceContext);
  }

  if (ambienceContext.state === "suspended") {
    ambienceContext.resume().catch(() => {});
  }

  stopAmbienceOneShots();
  scheduleAmbienceOneShots();
}

function stopAmbience() {
  stopAmbienceOneShots();

  if (!ambienceContext) return;

  if (ambienceContext.state === "running") {
    ambienceContext.suspend().catch(() => {});
  }
}

function attachAmbienceUnlock() {
  if (ambienceUnlockAttached) return;

  const unlock = () => {
    ensureAmbience();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    ambienceUnlockAttached = false;
  };

  ambienceUnlockAttached = true;
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

function setAmbienceEnabled(nextValue) {
  ambienceEnabled = nextValue;
  persistAmbienceEnabled();
  updateAmbienceToggleLabel();

  if (ambienceEnabled) {
    ensureAmbience();
    attachAmbienceUnlock();
    return;
  }

  stopAmbience();
}

function showBaristaBubble(message, durationMs = lessonFeedbackBubbleDurationMs) {
  if (!baristaBubble) return;

  baristaBubble.textContent = message;
  baristaBubble.hidden = false;
  if (baristaBubbleTimer) {
    clearTimeout(baristaBubbleTimer);
  }

  baristaBubbleTimer = setTimeout(() => {
    baristaBubble.hidden = true;
    baristaBubbleTimer = null;
  }, durationMs);
}

function setFeedback(message, type = "") {
  feedbackEl.textContent = message;
  feedbackEl.classList.remove("correct", "wrong");
  if (type) feedbackEl.classList.add(type);
}

function updatePromptHud() {
  if (!gameActive) {
    progressEl.textContent = `0/${prompts.length}`;
    promptSicilian.textContent = "Ready?";
    promptEnglish.textContent = "Press Start Lesson to play.";
    return;
  }

  const prompt = prompts[currentIndex];
  progressEl.textContent = `${currentIndex + 1}/${prompts.length}`;
  promptSicilian.textContent = prompt.sicilian;
  promptEnglish.textContent = prompt.english;
}

function updatePopupInstruction() {
  if (!gameActive) {
    lessonPopup.hidden = true;
    return;
  }

  const prompt = prompts[currentIndex];
  popupInstruction.textContent = `Click on ${prompt.sicilian}`;
  lessonPopup.hidden = false;
}

function startGame() {
  gameActive = true;
  currentIndex = 0;
  setFeedback("Find the object in the scene.");
  updatePromptHud();
  updatePopupInstruction();
  startButton.disabled = true;
}

function finishGame() {
  gameActive = false;
  lessonPopup.hidden = true;
  setFeedback("Great! You matched all the words. Press Start Lesson to play again.", "correct");
  startButton.disabled = false;
  updatePromptHud();
}

function handleHotspotTap(objectId) {
  if (!gameActive) {
    setFeedback("Explore the café, then press Start Lesson when you are ready.");
    return;
  }

  const prompt = prompts[currentIndex];
  if (objectId !== prompt.id) {
    setFeedback(`Not quite — click on ${prompt.sicilian}.`, "wrong");
    showBaristaBubble("Pruvaci n'autra vota.");
    return;
  }

  setFeedback("Correct!", "correct");
  showBaristaBubble("Bravu!");

  if (currentIndex === prompts.length - 1) {
    finishGame();
    return;
  }

  currentIndex += 1;
  updatePromptHud();
  updatePopupInstruction();
}

function bootCaffeScene() {
  greetingTimer = setTimeout(() => {
    showBaristaBubble("Bongiornu! Chi disii?", baristaGreetingDurationMs);
  }, baristaGreetingDelayMs);
}

startButton.addEventListener("click", () => {
  if (gameActive) return;
  startGame();
});

ambienceToggle.addEventListener("click", () => {
  setAmbienceEnabled(!ambienceEnabled);
});

debugToggle.addEventListener("change", () => {
  debugMode = debugToggle.checked;
  syncEditorVisibility();
  syncModeClasses();
});

editorToggle.addEventListener("change", () => {
  if (!debugMode) {
    editorToggle.checked = false;
    editorMode = false;
    return;
  }

  editorMode = editorToggle.checked;
  editorSelection.hidden = true;
  syncModeClasses();
});

editorLayer.addEventListener("mousedown", beginDraw);
window.addEventListener("mousemove", drawMove);
window.addEventListener("mouseup", endDraw);
saveHotspotButton.addEventListener("click", saveLatestHotspot);

window.addEventListener("beforeunload", () => {
  if (greetingTimer) clearTimeout(greetingTimer);
  if (baristaBubbleTimer) clearTimeout(baristaBubbleTimer);
  stopAmbienceOneShots();

  if (ambienceContext) {
    ambienceContext.close().catch(() => {});
  }
});

loadPersistedHotspotConfig();
renderHotspots();
debugToggle.checked = debugMode;
syncEditorVisibility();
syncModeClasses();
updatePromptHud();
setFeedback("Take in the scene, then press Start Lesson when you are ready.");
updatePopupInstruction();
updateAmbienceToggleLabel();
if (ambienceEnabled) {
  ensureAmbience();
  attachAmbienceUnlock();
}
bootCaffeScene();
