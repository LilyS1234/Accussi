const prompts = [
  { id: "coffee", sicilian: "U cafè", english: "Coffee", emoji: "☕" },
  { id: "brioche", sicilian: "A brioscia", english: "The brioche", emoji: "🥐" },
  { id: "barista", sicilian: "U barista", english: "The barista", emoji: "🧑‍🍳" },
  { id: "machine", sicilian: "A machina dû cafè", english: "The espresso machine", emoji: "🫖" },
];

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

let currentIndex = 0;
let gameActive = false;
let greetingTimer = null;
let selectedWordId = null;
let matchedWordIds = new Set();

const promptSicilian = document.getElementById("prompt-sicilian");
const promptEnglish = document.getElementById("prompt-english");
const progressEl = document.getElementById("progress");
const feedbackEl = document.getElementById("feedback");
const startButton = document.getElementById("start-button");
const ambienceToggle = document.getElementById("ambience-toggle");
const hotspotStage = document.getElementById("hotspot-stage");
const matchingPanel = document.getElementById("matching-panel");
const matchingGrid = document.getElementById("matching-grid");


const lessonPopup = document.getElementById("lesson-popup");
const popupInstruction = document.getElementById("popup-instruction");
const baristaBubble = document.getElementById("barista-bubble");
let baristaBubbleTimer = null;

let ambienceEnabled = loadAmbienceEnabled();
let ambienceContext = null;
let ambienceNodes = null;
let ambienceOneshotTimer = null;
let ambienceUnlockAttached = false;




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

function shuffleList(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function clearSelection() {
  selectedWordId = null;
  matchingGrid.querySelectorAll('.match-card.word').forEach((card) => {
    card.classList.remove('selected');
  });
}

function markPromptMatched(wordId) {
  matchedWordIds.add(wordId);

  const nextIndex = prompts.findIndex((prompt) => !matchedWordIds.has(prompt.id));
  if (nextIndex === -1) {
    finishGame();
    return;
  }

  currentIndex = nextIndex;
  updatePromptHud();
  updatePopupInstruction();
}

function handleWordSelection(wordId, button) {
  if (!gameActive) return;
  clearSelection();
  selectedWordId = wordId;
  button.classList.add('selected');
  setFeedback('Now tap the matching emoji.');
}

function handleEmojiSelection(wordId) {
  if (!gameActive || !selectedWordId) {
    setFeedback('Pick a Sicilian word first.');
    return;
  }

  if (selectedWordId !== wordId) {
    setFeedback('Not a match. Try again!', 'wrong');
    showBaristaBubble("Pruvaci n'autra vota.");
    return;
  }

  const wordCard = matchingGrid.querySelector(`.match-card.word[data-word-id="${wordId}"]`);
  const emojiCard = matchingGrid.querySelector(`.match-card.emoji[data-word-id="${wordId}"]`);
  if (wordCard) {
    wordCard.classList.remove('selected');
    wordCard.classList.add('matched');
    wordCard.disabled = true;
  }

  if (emojiCard) {
    emojiCard.classList.add('matched');
    emojiCard.disabled = true;
  }

  selectedWordId = null;
  setFeedback('Correct match!', 'correct');
  showBaristaBubble('Bravu!');
  markPromptMatched(wordId);
}

function renderMatchingGame() {
  matchingGrid.textContent = '';
  const words = prompts;
  const emojis = shuffleList(prompts);

  words.forEach((prompt) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'match-card word';
    button.dataset.wordId = prompt.id;
    button.textContent = prompt.sicilian;
    button.addEventListener('click', () => handleWordSelection(prompt.id, button));
    matchingGrid.appendChild(button);
  });

  emojis.forEach((prompt) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'match-card emoji';
    button.dataset.wordId = prompt.id;
    button.textContent = prompt.emoji;
    button.setAttribute('aria-label', `Emoji for ${prompt.english}`);
    button.addEventListener('click', () => handleEmojiSelection(prompt.id));
    matchingGrid.appendChild(button);
  });
}

function updatePromptHud() {
  if (!gameActive) {
    progressEl.textContent = `0/${prompts.length}`;
    promptSicilian.textContent = "Ready?";
    promptEnglish.textContent = "Tap to Start Game to play.";
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
  popupInstruction.textContent = `Match ${prompt.sicilian} with the right emoji`;
  lessonPopup.hidden = false;
}

function startGame() {
  gameActive = true;
  currentIndex = 0;
  selectedWordId = null;
  matchedWordIds = new Set();
  setFeedback("Tap a Sicilian word, then tap its matching emoji.");
  renderMatchingGame();
  matchingPanel.hidden = false;
  updatePromptHud();
  updatePopupInstruction();
  startButton.disabled = true;
}

function finishGame() {
  gameActive = false;
  lessonPopup.hidden = true;
  setFeedback("Great! You matched all emojis and words. Tap to start again.", "correct");
  startButton.disabled = false;
  updatePromptHud();
}

function handleHotspotTap(objectId) {
  if (!gameActive) {
    setFeedback("Tap to start the game, then match the words and emojis below.");
    return;
  }

  const prompt = prompts.find((item) => item.id === objectId);
  if (!prompt) return;

  setFeedback(`You tapped ${prompt.sicilian}. Match it with ${prompt.emoji} below.`);
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


window.addEventListener("beforeunload", () => {
  if (greetingTimer) clearTimeout(greetingTimer);
  if (baristaBubbleTimer) clearTimeout(baristaBubbleTimer);
  stopAmbienceOneShots();

  if (ambienceContext) {
    ambienceContext.close().catch(() => {});
  }
});

renderHotspots();
updatePromptHud();
setFeedback("Take in the scene, then tap to start the game when you are ready.");
updatePopupInstruction();
updateAmbienceToggleLabel();
if (ambienceEnabled) {
  ensureAmbience();
  attachAmbienceUnlock();
}
bootCaffeScene();
