import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCTmDx5IzB1GeMA9w0GflJvTy2CRx0DaPw",
    authDomain: "database-prosjekt-d7f33.firebaseapp.com",
    projectId: "database-prosjekt-d7f33",
    storageBucket: "database-prosjekt-d7f33.firebasestorage.app",
    messagingSenderId: "211536762103",
    appId: "1:211536762103:web:1da5eac3fbca85df50eff2",
    measurementId: "G-37603ED50B"
};

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const leftScore = document.getElementById("leftScore");
const rightScore = document.getElementById("rightScore");
const leftName = document.getElementById("leftName");
const rightName = document.getElementById("rightName");
const leftNameLabel = document.getElementById("leftNameLabel");
const rightNameLabel = document.getElementById("rightNameLabel");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const saveBtn = document.getElementById("saveBtn");
const statusMessage = document.getElementById("statusMessage");
const leaderboardList = document.getElementById("leaderboardList");

const db = getFirestore(initializeApp(firebaseConfig));
const localScoresKey = "tennisForTwoScores";
const keys = new Set();

const court = {
    width: canvas.width,
    height: canvas.height,
    gravity: 0.18,
    netHeight: 54
};

const leftPaddle = {
    x: 34,
    y: court.height / 2 - 52,
    width: 12,
    height: 104,
    speed: 7
};

const rightPaddle = {
    x: court.width - 46,
    y: court.height / 2 - 52,
    width: 12,
    height: 104,
    speed: 7
};

const ball = {
    x: court.width / 2,
    y: court.height / 2,
    radius: 10,
    vx: 6,
    vy: -3.2
};

let running = false;
let lastTime = 0;
let scores = { left: 0, right: 0 };

function playerName(input, fallback) {
    return input.value.trim() || fallback;
}

function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? "var(--danger)" : "var(--accent-dark)";
}

function updateLabels() {
    leftNameLabel.textContent = playerName(leftName, "Spiller 1");
    rightNameLabel.textContent = playerName(rightName, "Spiller 2");
}

function updateScoreboard() {
    leftScore.textContent = scores.left;
    rightScore.textContent = scores.right;
    updateLabels();
}

function resetBall(direction = Math.random() > 0.5 ? 1 : -1) {
    ball.x = court.width / 2;
    ball.y = court.height / 2;
    ball.vx = direction * 6;
    ball.vy = Math.random() > 0.5 ? -3.2 : 3.2;
}

function resetGame() {
    scores = { left: 0, right: 0 };
    leftPaddle.y = court.height / 2 - leftPaddle.height / 2;
    rightPaddle.y = court.height / 2 - rightPaddle.height / 2;
    resetBall();
    running = false;
    updateScoreboard();
    draw();
    showStatus("Klart til start.");
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function movePaddles() {
    if (keys.has("w")) leftPaddle.y -= leftPaddle.speed;
    if (keys.has("s")) leftPaddle.y += leftPaddle.speed;
    if (keys.has("arrowup")) rightPaddle.y -= rightPaddle.speed;
    if (keys.has("arrowdown")) rightPaddle.y += rightPaddle.speed;

    leftPaddle.y = clamp(leftPaddle.y, 0, court.height - leftPaddle.height);
    rightPaddle.y = clamp(rightPaddle.y, 0, court.height - rightPaddle.height);
}

function paddleHit(paddle) {
    return (
        ball.x + ball.radius > paddle.x &&
        ball.x - ball.radius < paddle.x + paddle.width &&
        ball.y + ball.radius > paddle.y &&
        ball.y - ball.radius < paddle.y + paddle.height
    );
}

function bounceFromPaddle(paddle, direction) {
    const paddleCenter = paddle.y + paddle.height / 2;
    const hitPosition = (ball.y - paddleCenter) / (paddle.height / 2);
    ball.vx = direction * Math.min(Math.abs(ball.vx) + 0.35, 11);
    ball.vy = hitPosition * 6;
    ball.x = direction > 0 ? paddle.x + paddle.width + ball.radius : paddle.x - ball.radius;
}

function update() {
    movePaddles();

    ball.vy += court.gravity;
    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.y - ball.radius <= 0) {
        ball.y = ball.radius;
        ball.vy *= -0.92;
    }

    if (ball.y + ball.radius >= court.height) {
        ball.y = court.height - ball.radius;
        ball.vy *= -0.92;
    }

    if (paddleHit(leftPaddle) && ball.vx < 0) bounceFromPaddle(leftPaddle, 1);
    if (paddleHit(rightPaddle) && ball.vx > 0) bounceFromPaddle(rightPaddle, -1);

    if (ball.x + ball.radius < 0) {
        scores.right += 1;
        updateScoreboard();
        resetBall(1);
    }

    if (ball.x - ball.radius > court.width) {
        scores.left += 1;
        updateScoreboard();
        resetBall(-1);
    }
}

function drawCourt() {
    ctx.fillStyle = "#18382f";
    ctx.fillRect(0, 0, court.width, court.height);

    ctx.strokeStyle = "rgba(233, 223, 207, 0.28)";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 12]);
    ctx.beginPath();
    ctx.moveTo(court.width / 2, 0);
    ctx.lineTo(court.width / 2, court.height);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#e9dfcf";
    ctx.fillRect(court.width / 2 - 3, court.height - court.netHeight, 6, court.netHeight);

    ctx.strokeStyle = "rgba(233, 223, 207, 0.75)";
    ctx.lineWidth = 4;
    ctx.strokeRect(14, 14, court.width - 28, court.height - 28);
}

function drawPaddle(paddle) {
    ctx.fillStyle = "#fffdfa";
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

function drawBall() {
    ctx.fillStyle = "#f2cf63";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
}

function draw() {
    drawCourt();
    drawPaddle(leftPaddle);
    drawPaddle(rightPaddle);
    drawBall();
}

function gameLoop(time) {
    if (!running) return;
    const delta = time - lastTime;
    lastTime = time;

    if (delta < 80) {
        update();
        draw();
    }

    requestAnimationFrame(gameLoop);
}

function getLocalScores() {
    try {
        return JSON.parse(localStorage.getItem(localScoresKey)) || [];
    } catch {
        return [];
    }
}

function saveLocalScore(result) {
    const scoresFromStorage = getLocalScores();
    scoresFromStorage.unshift(result);
    localStorage.setItem(localScoresKey, JSON.stringify(scoresFromStorage.slice(0, 10)));
}

function renderScores(items) {
    leaderboardList.innerHTML = "";

    if (!items.length) {
        const empty = document.createElement("li");
        empty.textContent = "Ingen resultater lagret ennå.";
        leaderboardList.appendChild(empty);
        return;
    }

    items.forEach((item) => {
        const li = document.createElement("li");
        const title = document.createElement("strong");
        const winner = item.leftScore === item.rightScore ? "Uavgjort" : `Vinner: ${item.winner}`;
        title.textContent = `${item.leftName} ${item.leftScore} - ${item.rightScore} ${item.rightName}`;
        li.appendChild(title);
        li.append(winner);
        leaderboardList.appendChild(li);
    });
}

async function loadScores() {
    try {
        const scoresQuery = query(
            collection(db, "tennisForTwoScores"),
            orderBy("createdAt", "desc"),
            limit(10)
        );
        const snapshot = await getDocs(scoresQuery);
        renderScores(snapshot.docs.map((scoreDoc) => scoreDoc.data()));
        showStatus("Resultater lastet fra Firebase.");
    } catch (error) {
        renderScores(getLocalScores());
        showStatus("Firebase kunne ikke lastes, så lokale resultater vises.", true);
    }
}

async function saveScore() {
    updateLabels();
    const result = {
        leftName: playerName(leftName, "Spiller 1"),
        rightName: playerName(rightName, "Spiller 2"),
        leftScore: scores.left,
        rightScore: scores.right,
        winner: scores.left === scores.right
            ? "Uavgjort"
            : scores.left > scores.right
                ? playerName(leftName, "Spiller 1")
                : playerName(rightName, "Spiller 2"),
        createdAt: serverTimestamp()
    };

    try {
        await addDoc(collection(db, "tennisForTwoScores"), result);
        showStatus("Resultatet er lagret i Firebase.");
        await loadScores();
    } catch (error) {
        saveLocalScore({ ...result, createdAt: new Date().toISOString() });
        renderScores(getLocalScores());
        showStatus("Kunne ikke lagre i Firebase. Resultatet ble lagret lokalt.", true);
    }
}

startBtn.addEventListener("click", () => {
    if (running) return;
    running = true;
    lastTime = performance.now();
    showStatus("Spillet kjører.");
    requestAnimationFrame(gameLoop);
});

pauseBtn.addEventListener("click", () => {
    running = false;
    showStatus("Pause.");
});

resetBtn.addEventListener("click", resetGame);
saveBtn.addEventListener("click", saveScore);
leftName.addEventListener("input", updateLabels);
rightName.addEventListener("input", updateLabels);

window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (["w", "s", "arrowup", "arrowdown"].includes(key)) {
        event.preventDefault();
        keys.add(key);
    }
});

window.addEventListener("keyup", (event) => {
    keys.delete(event.key.toLowerCase());
});

resetGame();
loadScores();
