
// BHASKAR LIVE QUIZ - BASIC PLAYABLE VERSION

const questions = [
  {c:"Science",q:"Which gas do plants absorb?",o:["Oxygen","Carbon dioxide","Nitrogen","Hydrogen"],a:1},
  {c:"Science",q:"What is the chemical formula of water?",o:["CO2","H2O","O2","NaCl"],a:1},
  {c:"Science",q:"Which organ pumps blood?",o:["Brain","Lungs","Heart","Kidney"],a:2},
  {c:"Science",q:"SI unit of electric current?",o:["Volt","Ampere","Watt","Ohm"],a:1},
  {c:"Science",q:"Which planet is called the Red Planet?",o:["Venus","Mars","Earth","Jupiter"],a:1},
  {c:"Maths",q:"What is 12 × 12?",o:["124","144","132","154"],a:1},
  {c:"Maths",q:"Square root of 169?",o:["11","12","13","14"],a:2},
  {c:"Maths",q:"Value of sin 30°?",o:["1","0","1/2","√3/2"],a:2},
  {c:"Maths",q:"25% of 200?",o:["25","40","50","75"],a:2},
  {c:"Maths",q:"How many sides does a hexagon have?",o:["5","6","7","8"],a:1},
  {c:"GK",q:"Capital of India?",o:["Mumbai","New Delhi","Kolkata","Chennai"],a:1},
  {c:"GK",q:"Largest ocean in the world?",o:["Indian","Atlantic","Pacific","Arctic"],a:2},
  {c:"GK",q:"How many days are in a leap year?",o:["364","365","366","367"],a:2},
  {c:"GK",q:"National animal of India?",o:["Lion","Tiger","Elephant","Leopard"],a:1},
  {c:"GK",q:"Which planet is closest to the Sun?",o:["Earth","Mars","Mercury","Venus"],a:2},
  {c:"English",q:"Plural of Child?",o:["Childs","Children","Childes","Childrens"],a:1},
  {c:"English",q:"Choose the correct spelling.",o:["Beautifull","Beutiful","Beautiful","Beautifal"],a:2},
  {c:"English",q:"Opposite of Ancient?",o:["Old","Modern","Past","Historic"],a:1},
  {c:"English",q:"Past tense of Go?",o:["Goed","Gone","Went","Going"],a:2},
  {c:"English",q:"Which word is a noun?",o:["Quickly","Beautiful","Happiness","Run"],a:2}
];

let player = "Player";
let quiz = [];
let current = 0;
let score = 0;
let correct = 0;
let time = 15;
let timer = null;
let locked = false;
let roomCode = "";

function showScreen(id) {
  ["loginScreen","homeScreen","lobbyScreen","gameScreen","resultScreen"]
    .forEach(x => document.getElementById(x).classList.add("hidden"));

  document.getElementById(id).classList.remove("hidden");
}

function loginPlayer() {
  const name = document.getElementById("playerName").value.trim();

  if (!name) {
    document.getElementById("loginMessage").textContent =
      "Please enter your nickname first.";
    return;
  }

  player = name.slice(0,20);
  document.getElementById("welcomeName").textContent = player;
  showScreen("homeScreen");
}

function createRoom() {
  roomCode = String(Math.floor(100000 + Math.random() * 900000));

  document.getElementById("roomCode").textContent = roomCode;
  document.getElementById("playersList").textContent =
    player + " (You)";

  document.getElementById("lobbyMessage").textContent =
    "Practice mode: this room is only on this device for now.";

  document.getElementById("startGameButton").textContent =
    "START PRACTICE QUIZ";

  showScreen("lobbyScreen");
}

function joinRoom() {
  document.getElementById("homeMessage").textContent =
    "Online multiplayer is not enabled yet. You can play Practice Mode using Create Room.";
}

function copyRoomCode() {
  if (!roomCode) return;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(roomCode)
      .then(() => {
        document.getElementById("lobbyMessage").textContent =
          "Room code copied. Practice room is local only.";
      })
      .catch(() => {
        document.getElementById("lobbyMessage").textContent =
          "Your room code is " + roomCode;
      });
  } else {
    document.getElementById("lobbyMessage").textContent =
      "Your room code is " + roomCode;
  }
}

function startLiveGame() {
  startQuiz();
}

function startQuiz() {
  clearInterval(timer);

  quiz = [...questions]
    .sort(() => Math.random() - 0.5)
    .slice(0,10);

  current = 0;
  score = 0;
  correct = 0;

  showScreen("gameScreen");
  showQuestion();
}

function showQuestion() {
  clearInterval(timer);
  locked = false;
  time = 15;

  const q = quiz[current];

  document.getElementById("questionNumber").textContent =
    (current + 1) + "/" + quiz.length;

  document.getElementById("timer").textContent = time + "s";
  document.getElementById("playerScore").textContent = score;
  document.getElementById("questionCategory").textContent =
    q.c.toUpperCase();

  document.getElementById("questionText").textContent = q.q;
  document.getElementById("answerMessage").textContent = "";

  document.getElementById("progressBar").style.width =
    (current / quiz.length * 100) + "%";

  const area = document.getElementById("answerOptions");
  area.innerHTML = "";

  q.o.forEach((answer,i) => {
    const button = document.createElement("button");
    button.className = "option";
    button.textContent = String.fromCharCode(65+i) + ". " + answer;
    button.onclick = () => chooseAnswer(i);
    area.appendChild(button);
  });

  updateLeaderboard();

  timer = setInterval(() => {
    time--;
    document.getElementById("timer").textContent = time + "s";

    if (time <= 0) {
      clearInterval(timer);
      if (!locked) {
        locked = true;
        showCorrectAnswer();
        document.getElementById("answerMessage").textContent =
          "Time is over!";
        showNextButton();
      }
    }
  },1000);
}

function chooseAnswer(choice) {
  if (locked) return;

  locked = true;
  clearInterval(timer);

  const q = quiz[current];
  const buttons = document.querySelectorAll("#answerOptions button");

  buttons.forEach(b => b.disabled = true);

  if (choice === q.a) {
    score += 10;
    correct++;
    buttons[choice].classList.add("correct");

    document.getElementById("answerMessage").textContent =
      "Correct answer! +10 points";
  } else {
    buttons[choice].classList.add("wrong");
    buttons[q.a].classList.add("correct");

    document.getElementById("answerMessage").textContent =
      "Wrong answer. Correct: " + q.o[q.a];
  }

  document.getElementById("playerScore").textContent = score;
  updateLeaderboard();
  showNextButton();
}

function showCorrectAnswer() {
  const q = quiz[current];
  const buttons = document.querySelectorAll("#answerOptions button");

  buttons.forEach(b => b.disabled = true);

  if (buttons[q.a]) buttons[q.a].classList.add("correct");
}

function showNextButton() {
  const area = document.getElementById("answerOptions");
  const button = document.createElement("button");

  button.className = "primary";
  button.textContent =
    current === quiz.length - 1 ? "SEE RESULT 🏆" : "NEXT QUESTION →";

  button.onclick = nextQuestion;
  area.appendChild(button);
}

function nextQuestion() {
  if (!locked) return;

  current++;

  if (current < quiz.length) {
    showQuestion();
  } else {
    showResult();
  }
}

function updateLeaderboard() {
  const html =
    '<p class="notice">' + escapeText(player) +
    ' — ' + score + ' points</p>';

  document.getElementById("liveLeaderboard").innerHTML = html;
}

function showResult() {
  clearInterval(timer);
  showScreen("resultScreen");

  const accuracy = Math.round(correct / quiz.length * 100);

  document.getElementById("finalScore").textContent = score;
  document.getElementById("resultMessage").textContent =
    "Well played, " + player + "!";

  document.getElementById("finalLeaderboard").innerHTML =
    '<p class="success">1. ' + escapeText(player) +
    ' — ' + score + ' points</p>' +
    '<p>Accuracy: ' + accuracy + '%</p>';

  document.getElementById("progressBar").style.width = "100%";
}

function leaveRoom() {
  clearInterval(timer);
  showScreen("homeScreen");
}

function returnHome() {
  clearInterval(timer);
  showScreen("homeScreen");
}

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  })[char]);
  }
  
