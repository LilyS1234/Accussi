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

let currentIndex = 0;
let gameActive = false;
let greetingTimer = null;
let selectedWordId = null;
let matchedWordIds = new Set();
let hasPlayed = false;

const promptSicilian = document.getElementById("prompt-sicilian");
const promptEnglish = document.getElementById("prompt-english");
const progressEl = document.getElementById("progress");
const feedbackEl = document.getElementById("feedback");
const startButton = document.getElementById("start-button");
const hotspotStage = document.getElementById("hotspot-stage");
const matchingPanel = document.getElementById("matching-panel");
const matchingGrid = document.getElementById("matching-grid");
const resultModal = document.getElementById("result-modal");
const resultScore = document.getElementById("result-score");
const resultMessage = document.getElementById("result-message");
const resultCloseButton = document.getElementById("result-close");
const resultDismissButton = document.getElementById("result-dismiss");
const resultStartOverButton = document.getElementById("result-start-over");

const baristaBubble = document.getElementById("barista-bubble");
let baristaBubbleTimer = null;





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
  const emojis = shuffleList(prompts);

  prompts.forEach((prompt, index) => {
    const wordButton = document.createElement('button');
    wordButton.type = 'button';
    wordButton.className = 'match-card word';
    wordButton.dataset.wordId = prompt.id;
    wordButton.textContent = prompt.sicilian;
    wordButton.addEventListener('click', () => handleWordSelection(prompt.id, wordButton));
    matchingGrid.appendChild(wordButton);

    const emojiPrompt = emojis[index];
    const emojiButton = document.createElement('button');
    emojiButton.type = 'button';
    emojiButton.className = 'match-card emoji';
    emojiButton.dataset.wordId = emojiPrompt.id;
    emojiButton.textContent = emojiPrompt.emoji;
    emojiButton.setAttribute('aria-label', `Emoji for ${emojiPrompt.english}`);
    emojiButton.addEventListener('click', () => handleEmojiSelection(emojiPrompt.id));
    matchingGrid.appendChild(emojiButton);
  });
}

function hideResultModal() {
  if (!resultModal) return;
  resultModal.hidden = true;
}

function showResultModal() {
  if (!resultModal || !resultScore || !resultMessage) return;
  const score = matchedWordIds.size;
  resultScore.textContent = `Score: ${score}/${prompts.length}`;
  resultMessage.textContent = score === prompts.length
    ? "Bravissimu! You matched everything."
    : "Good try! Hit Start Over for another round.";
  resultModal.hidden = false;
}

function closeGamePanel() {
  gameActive = false;
  matchingPanel.hidden = true;
  clearSelection();
  updatePromptHud();
}

function updatePromptHud() {
  if (!gameActive) {
    progressEl.textContent = `0/${prompts.length}`;
    promptSicilian.textContent = "Ready?";
    promptEnglish.textContent = hasPlayed ? "Tap Start Over to play again." : "Tap to Start Game to play.";
    return;
  }

  const prompt = prompts[currentIndex];
  progressEl.textContent = `${currentIndex + 1}/${prompts.length}`;
  promptSicilian.textContent = prompt.sicilian;
  promptEnglish.textContent = prompt.english;
}

function startGame() {
  hideResultModal();
  gameActive = true;
  currentIndex = 0;
  selectedWordId = null;
  matchedWordIds = new Set();
  setFeedback("Tap a Sicilian word, then tap its matching emoji.");
  renderMatchingGame();
  matchingPanel.hidden = false;
  updatePromptHud();
  startButton.textContent = "Start Over";
  hasPlayed = true;
}

function finishGame() {
  setFeedback("Great! You matched all emojis and words.", "correct");
  closeGamePanel();
  startButton.textContent = "Start Over";
  showResultModal();
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
  startGame();
});

if (resultCloseButton) {
  resultCloseButton.addEventListener("click", hideResultModal);
}

if (resultDismissButton) {
  resultDismissButton.addEventListener("click", hideResultModal);
}

if (resultStartOverButton) {
  resultStartOverButton.addEventListener("click", startGame);
}

window.addEventListener("beforeunload", () => {
  if (greetingTimer) clearTimeout(greetingTimer);
  if (baristaBubbleTimer) clearTimeout(baristaBubbleTimer);
});

renderHotspots();
updatePromptHud();
setFeedback("Take in the scene, then tap to start the game when you are ready.");
bootCaffeScene();
