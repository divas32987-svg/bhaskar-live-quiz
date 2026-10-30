
const firebaseConfig = {
  apiKey: "AIzaSyBSKZawXjeYqLaFDY8RFk8rSC4PM-5Tq18",
  authDomain: "bhaskar-knowledge-game.firebaseapp.com",
  databaseURL: "https://bhaskar-knowledge-game-default-rtdb.firebaseio.com",
  projectId: "bhaskar-knowledge-game",
  storageBucket: "bhaskar-knowledge-game.firebasestorage.app",
  messagingSenderId: "675570612742",
  appId: "1:675570612742:web:6651d09ed1a455ee592187"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

const $ = id => document.getElementById(id);

const questions = [
  {c:"Chemistry",q:"What is the chemical formula of baking soda?",o:["NaCl","NaHCO₃","CaCO₃","HCl"],a:1},
  {c:"Physics",q:"What is the SI unit of electric current?",o:["Volt","Ohm","Ampere","Watt"],a:2},
  {c:"Biology",q:"Which organ pumps blood throughout the human body?",o:["Lungs","Heart","Kidney","Brain"],a:1},
  {c:"Mathematics",q:"What is the value of sin 30°?",o:["0","1","1/2","√3/2"],a:2},
  {c:"Commerce",q:"What is the basic accounting equation?",o:["Assets = Liabilities + Capital","Profit = Assets","Capital = Sales","Assets = Expenses"],a:0},
  {c:"Logic",q:"What comes next: 2, 4, 8, 16, ?",o:["18","24","30","32"],a:3},
  {c:"Science",q:"Which gas do plants absorb during photosynthesis?",o:["Oxygen","Carbon dioxide","Nitrogen","Hydrogen"],a:1},
  {c:"Computer",q:"What does CPU stand for?",o:["Central Processing Unit","Computer Power Utility","Control Program Unit","Central Print Unit"],a:0},
  {c:"Mathematics",q:"What is the square root of 144?",o:["10","11","12","14"],a:2},
  {c:"Geography",q:"Which is the largest ocean on Earth?",o:["Atlantic","Indian","Arctic","Pacific"],a:3}
];

let uid = null;
let nickname = "";
let roomId = "";
let isHost = false;
let currentGame = null;
let timerHandle = null;
let roomRef = null;
let processedAnswers = new Set();

function message(id, text) {
  $(id).textContent = text;
}

function show(id) {
  $(id).classList.remove("hidden");
}

function hide(id) {
  $(id).classList.add("hidden");
}

function safeName(value) {
  return value.trim().replace(/[.#$/[\]]/g, "").slice(0,18);
}

auth.signInAnonymously().then(cred => {
  uid = cred.user.uid;
  $("createBtn").disabled = false;
  $("joinBtn").disabled = false;
  message("entryMessage","Connected. Enter your nickname to play!");
}).catch(err => {
  message("entryMessage","Login error: " + err.message);
});

$("createBtn").disabled = true;
$("joinBtn").disabled = true;

function makeCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function createRoom() {
  nickname = safeName($("nickname").value);
  if (!nickname) return message("entryMessage","Please enter a nickname.");
  if (!uid) return message("entryMessage","Connecting to Firebase. Try again.");

  isHost = true;
  roomId = makeCode();
  roomRef = db.ref("rooms/" + roomId);

  try {
    await roomRef.set({
      hostUid: uid,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      game: {
        status:"waiting",
        questionIndex:-1,
        endsAt:0
      },
      players: {
        [uid]: {
          name:nickname,
          score:0,
          online:true,
          joinedAt:firebase.database.ServerValue.TIMESTAMP
        }
      }
    });
    enterRoom();
  } catch (err) {
    message("entryMessage","Room error: " + err.message);
  }
}

async function joinRoom() {
  nickname = safeName($("nickname").value);
  const code = $("roomCode").value.trim();

  if (!nickname) return message("entryMessage","Please enter a nickname.");
  if (!/^\d{6}$/.test(code)) return message("entryMessage","Enter a valid 6-digit room code.");
  if (!uid) return message("entryMessage","Connecting to Firebase. Try again.");

  roomId = code;
  isHost = false;
  roomRef = db.ref("rooms/" + roomId);

  try {
    const snap = await roomRef.once("value");
    if (!snap.exists()) return message("entryMessage","Room not found.");

    const data = snap.val();
    if (data.game && data.game.status === "finished") {
      return message("entryMessage","This quiz has already finished.");
    }

    await roomRef.child("players/" + uid).set({
      name:nickname,
      score:0,
      online:true,
      joinedAt:firebase.database.ServerValue.TIMESTAMP
    });
    enterRoom();
  } catch (err) {
    message("entryMessage","Join error: " + err.message);
  }
}

function enterRoom() {
  hide("entryPanel");
  show("gamePanel");
  $("roomLabel").textContent = roomId;

  const myPlayerRef = roomRef.child("players/" + uid);
  myPlayerRef.onDisconnect().update({online:false});

  roomRef.child("players").on("value", snap => {
    const players = snap.val() || {};
    const list = Object.entries(players)
      .filter(([id,p]) => p.online)
      .sort((a,b) => (b[1].score || 0) - (a[1].score || 0));

    $("onlineCount").textContent = list.length;
    $("playersList").innerHTML = list.map(([id,p]) =>
      `<div><span>${escapeHTML(p.name || "Player")}${id===uid?" (You)":""}</span><span>🟢</span></div>`
    ).join("") || "<p>No players online</p>";

    $("leaderboard").innerHTML = list.slice(0,10).map(([id,p],i) =>
      `<div><span>${["🥇","🥈","🥉"][i] || "#"+(i+1)} ${escapeHTML(p.name || "Player")}</span><strong>${p.score || 0}</strong></div>`
    ).join("") || "<p>Waiting for players...</p>";
  });

  roomRef.child("game").on("value", snap => {
    currentGame = snap.val() || {};
    renderGame();
  });

  roomRef.child("answers").on("value", snap => {
    if (isHost) processAnswers(snap.val() || {});
  });
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[ch]));
}

function renderGame() {
  if (!currentGame) return;

  const status = currentGame.status;
  hide("resultPanel");
  hide("startBtn");
  hide("nextBtn");

  if (status === "waiting") {
    $("questionText").textContent = "Waiting for the host to start the quiz...";
    $("category").textContent = "LOBBY";
    $("questionNumber").textContent = "10 QUESTIONS";
    $("timer").textContent = "—";
    $("options").innerHTML = "";
    if (isHost) show("startBtn");
    return;
  }

  if (status === "finished") {
    $("questionText").textContent = "Quiz completed!";
    $("options").innerHTML = "";
    $("timer").textContent = "✓";
    showResults();
    return;
  }

  const index = currentGame.questionIndex;
  const q = questions[index];
  if (!q) return;

  $("category").textContent = q.c.toUpperCase();
  $("questionNumber").textContent = `QUESTION ${index+1}/${questions.length}`;
  $("questionText").textContent = q.q;

  const answerRef = roomRef.child(`answers/${index}/${uid}`);
  answerRef.once("value").then(snap => {
    const alreadyAnswered = snap.exists();
    $("options").innerHTML = q.o.map((option,i) =>
      `<button class="option" data-choice="${i}" ${alreadyAnswered?"disabled":""}>${String.fromCharCode(65+i)}. ${escapeHTML(option)}</button>`
    ).join("");

    document.querySelectorAll(".option").forEach(btn => {
      btn.addEventListener("click", () => submitAnswer(Number(btn.dataset.choice)));
    });
    message("answerMessage",alreadyAnswered?"Answer submitted. Waiting for the next question.":"Choose your answer.");
  });

  startTimer(currentGame.endsAt || 0);

  if (isHost && Date.now() >= currentGame.endsAt) show("nextBtn");
}

function startTimer(endsAt) {
  if (timerHandle) clearInterval(timerHandle);

  function tick() {
    const left = Math.max(0,Math.ceil((endsAt - Date.now()) / 1000));
    $("timer").textContent = left;
    if (left <= 0) {
      clearInterval(timerHandle);
      if (isHost) show("nextBtn");
      document.querySelectorAll(".option").forEach(b => b.disabled = true);
    }
  }
  tick();
  timerHandle = setInterval(tick,250);
}

async function submitAnswer(choice) {
  if (!currentGame || currentGame.status !== "playing") return;
  const index = currentGame.questionIndex;
  if (Date.now() > currentGame.endsAt) return message("answerMessage","Time is over!");

  const buttons = document.querySelectorAll(".option");
  buttons.forEach(b => b.disabled = true);
  buttons[choice].classList.add("selected");

  try {
    await roomRef.child(`answers/${index}/${uid}`).set({
      choice,
      at:firebase.database.ServerValue.TIMESTAMP
    });
    message("answerMessage","Answer submitted! Waiting for results...");
  } catch (err) {
    message("answerMessage","Could not submit: " + err.message);
    buttons.forEach(b => b.disabled = false);
  }
}

async function processAnswers(allAnswers) {
  if (!currentGame || currentGame.status !== "playing") return;
  const index = currentGame.questionIndex;
  const answers = allAnswers[index] || {};
  const q = questions[index];
  if (!q) return;

  for (const [playerId, answer] of Object.entries(answers)) {
    const key = index + "_" + playerId;
    if (processedAnswers.has(key)) continue;
    processedAnswers.add(key);

    if (answer && answer.choice === q.a) {
      const playerRef = roomRef.child("players/" + playerId);
      await playerRef.transaction(player => {
        if (player) player.score = (player.score || 0) + 10;
        return player;
      });
    }
  }
}

async function startQuiz() {
  if (!isHost) return;
  if (questions.length === 0) return;

  processedAnswers.clear();
  await roomRef.child("game").update({
    status:"playing",
    questionIndex:0,
    endsAt:Date.now()+15000
  });
}

async function nextQuestion() {
  if (!isHost || !currentGame) return;
  const next = currentGame.questionIndex + 1;

  if (next >= questions.length) {
    await roomRef.child("game").update({status:"finished",endsAt:0});
    return;
  }

  await roomRef.child("game").update({
    questionIndex:next,
    endsAt:Date.now()+15000
  });
}

function showResults() {
  show("resultPanel");
  const players = $("leaderboard").innerHTML;
  $("finalResults").innerHTML = players || "No results available.";
}

$("createBtn").addEventListener("click",createRoom);
$("joinBtn").addEventListener("click",joinRoom);
$("startBtn").addEventListener("click",startQuiz);
$("nextBtn").addEventListener("click",nextQuestion);
$("playAgainBtn").addEventListener("click",() => location.reload());
                                                        
