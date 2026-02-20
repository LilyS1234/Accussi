const prompts = [
  { id: "coffee", sicilian: "U cafè", english: "The coffee" },
  { id: "brioche", sicilian: "A brioscia", english: "The brioche" },
  { id: "barista", sicilian: "U barista", english: "The barista" },
  { id: "machine", sicilian: "A machina dû cafè", english: "The espresso machine" },
];

const objectLabels = {
  coffee: "U cafè / The coffee",
  brioche: "A brioscia / The brioche",
  barista: "U barista / The barista",
  machine: "A machina dû cafè / The espresso machine",
};

let currentIndex = 0;
let tapSolved = false;

const promptSicilian = document.getElementById("prompt-sicilian");
const promptEnglish = document.getElementById("prompt-english");
const progressEl = document.getElementById("progress");
const feedbackEl = document.getElementById("feedback");

const modal = document.getElementById("lesson-modal");
const modalProgress = document.getElementById("modal-progress");
const modalTitle = document.getElementById("modal-title");
const modalTranslation = document.getElementById("modal-translation");
const modalFeedback = document.getElementById("modal-feedback");
const choicesEl = document.getElementById("choices");
const nextButton = document.getElementById("next-button");

modal.hidden = true;

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function setFeedback(message, type = "") {
  feedbackEl.textContent = message;
  modalFeedback.textContent = message;
  [feedbackEl, modalFeedback].forEach((el) => {
    el.classList.remove("correct", "wrong");
    if (type) el.classList.add(type);
  });
}

function renderPrompt() {
  const prompt = prompts[currentIndex];
  const progress = `${currentIndex + 1}/${prompts.length}`;

  promptSicilian.textContent = prompt.sicilian;
  promptEnglish.textContent = prompt.english;
  progressEl.textContent = progress;

  modalProgress.textContent = progress;
  modalTitle.textContent = prompt.sicilian;
  modalTranslation.textContent = prompt.english;

  tapSolved = false;
  setFeedback("Tap the object that matches the prompt.");
  renderChoices();
  modal.hidden = true;
}

function renderChoices() {
  choicesEl.innerHTML = "";
  const options = shuffle(Object.keys(objectLabels));

  options.forEach((id) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice";
    button.textContent = objectLabels[id];
    button.addEventListener("click", () => {
      if (id === prompts[currentIndex].id) {
        setFeedback("Correct!", "correct");
      } else {
        setFeedback("Try again.", "wrong");
      }
    });
    choicesEl.appendChild(button);
  });
}

function handleHotspotTap(objectId) {
  modal.hidden = false;
  if (objectId === prompts[currentIndex].id) {
    tapSolved = true;
    setFeedback("Correct!", "correct");
  } else {
    setFeedback("Try again.", "wrong");
  }
}

document.querySelectorAll(".hotspot").forEach((hotspot) => {
  hotspot.addEventListener("click", () => handleHotspotTap(hotspot.dataset.object));
});

nextButton.addEventListener("click", () => {
  if (!tapSolved) {
    setFeedback("Tap the correct object before moving on.", "wrong");
    return;
  }

  currentIndex = (currentIndex + 1) % prompts.length;
  renderPrompt();
});

renderPrompt();
