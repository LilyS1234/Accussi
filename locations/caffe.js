const prompts = [
  { id: "coffee", sicilian: "U cafè", english: "The coffee" },
  { id: "brioche", sicilian: "A brioscia", english: "The brioche" },
  { id: "barista", sicilian: "U barista", english: "The barista" },
  { id: "machine", sicilian: "A machina dû cafè", english: "The espresso machine" },
];

let currentIndex = 0;
let gameActive = false;

const promptSicilian = document.getElementById("prompt-sicilian");
const promptEnglish = document.getElementById("prompt-english");
const progressEl = document.getElementById("progress");
const feedbackEl = document.getElementById("feedback");
const orderButton = document.getElementById("order-button");

const lessonPopup = document.getElementById("lesson-popup");
const popupInstruction = document.getElementById("popup-instruction");

function setFeedback(message, type = "") {
  feedbackEl.textContent = message;
  feedbackEl.classList.remove("correct", "wrong");
  if (type) feedbackEl.classList.add(type);
}

function updatePromptHud() {
  if (!gameActive) {
    progressEl.textContent = `0/${prompts.length}`;
    promptSicilian.textContent = "Ready?";
    promptEnglish.textContent = "Press Order Coffee to begin.";
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
}

function finishGame() {
  gameActive = false;
  lessonPopup.hidden = true;
  setFeedback("Great! You matched all the words. Press Order Coffee to play again.", "correct");
  updatePromptHud();
}

function handleHotspotTap(objectId) {
  if (!gameActive) {
    setFeedback("Press Order Coffee first.", "wrong");
    return;
  }

  const prompt = prompts[currentIndex];
  if (objectId !== prompt.id) {
    setFeedback(`Not quite — click on ${prompt.sicilian}.`, "wrong");
    return;
  }

  setFeedback("Correct!", "correct");

  if (currentIndex === prompts.length - 1) {
    finishGame();
    return;
  }

  currentIndex += 1;
  updatePromptHud();
  updatePopupInstruction();
}

orderButton.addEventListener("click", startGame);

document.querySelectorAll(".hotspot").forEach((hotspot) => {
  hotspot.addEventListener("click", () => handleHotspotTap(hotspot.dataset.object));
});

updatePromptHud();
setFeedback("Press Order Coffee to start the popup quiz.");
updatePopupInstruction();
