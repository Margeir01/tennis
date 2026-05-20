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
    apiKey: "AIzaSyCervUQ0fsx0rS4_gF1U9ekHzwuHAtC1h8",
    authDomain: "tennis-a6ae6.firebaseapp.com",
    projectId: "tennis-a6ae6",
    storageBucket: "tennis-a6ae6.firebasestorage.app",
    messagingSenderId: "967276803199",
    appId: "1:967276803199:web:1f1f7783965c4b4d293b4a",
    measurementId: "G-LH3HPD3MGZ"
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
const winScore = document.getElementById("winScore");
const statusMessage = document.getElementById("statusMessage");
const leaderboardList = document.getElementById("leaderboardList");
const victoryScreen = document.getElementById("victoryScreen");
const victoryTitle = document.getElementById("victoryTitle");
const victoryScore = document.getElementById("victoryScore");
const victorySaveStatus = document.getElementById("victorySaveStatus");
const confettiCanvas = document.getElementById("confettiCanvas");
const confettiCtx = confettiCanvas.getContext("2d");
const playAgainBtn = document.getElementById("playAgainBtn");
const saveVictoryBtn = document.getElementById("saveVictoryBtn");

const db = getFirestore(initializeApp(firebaseConfig));
const localScoresKey = "tennisForTwoScores";
const keys = new Set();

const court = {
    width: canvas.width,
    height: canvas.height
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
let gameOver = false;
let lastTime = 0;
let serveDelayUntil = 0;
let scores = { left: 0, right: 0 };
let scoreSaved = false;
let localFallbackSaved = false;
let confettiPieces = [];
let confettiAnimation = null;

function playerName(input, fallback) {
    return input.value.trim() || fallback;
}

function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? "var(--danger)" : "var(--accent-dark)";
}

function showVictorySaveStatus(message, isError = false) {
    victorySaveStatus.textContent = message;
    victorySaveStatus.style.color = isError ? "var(--danger)" : "var(--accent-dark)";
}

function getWinScore() {
    return parseInt(winScore.value, 10) || 5;
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

function resizeConfettiCanvas() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
}

function createConfetti() {
    const colors = ["#1f6f5b", "#f2cf63", "#b74433", "#3d5a80", "#fffdfa"];
    confettiPieces = Array.from({ length: 140 }, () => ({
        x: Math.random() * confettiCanvas.width,
        y: -20 - Math.random() * confettiCanvas.height * 0.45,
        size: 6 + Math.random() * 9,
        speedY: 2.2 + Math.random() * 4.2,
        speedX: -2.2 + Math.random() * 4.4,
        rotation: Math.random() * Math.PI,
        rotationSpeed: -0.12 + Math.random() * 0.24,
        color: colors[Math.floor(Math.random() * colors.length)]
    }));
}

function animateConfetti() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    confettiPieces.forEach((piece) => {
        piece.x += piece.speedX;
        piece.y += piece.speedY;
        piece.rotation += piece.rotationSpeed;

        if (piece.y > confettiCanvas.height + 20) {
            piece.y = -20;
            piece.x = Math.random() * confettiCanvas.width;
        }

        confettiCtx.save();
        confettiCtx.translate(piece.x, piece.y);
        confettiCtx.rotate(piece.rotation);
        confettiCtx.fillStyle = piece.color;
        confettiCtx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.58);
        confettiCtx.restore();
    });

    confettiAnimation = requestAnimationFrame(animateConfetti);
}

function startConfetti() {
    resizeConfettiCanvas();
    createConfetti();
    cancelAnimationFrame(confettiAnimation);
    animateConfetti();
}

function stopConfetti() {
    cancelAnimationFrame(confettiAnimation);
    confettiAnimation = null;
    confettiPieces = [];
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
}

function showVictoryScreen(winner) {
    victoryTitle.textContent = `${winner} vant!`;
    victoryScore.textContent = `${playerName(leftName, "Spiller 1")} ${scores.left} - ${scores.right} ${playerName(rightName, "Spiller 2")}`;
    showVictorySaveStatus("Lagrer resultat...");
    victoryScreen.hidden = false;
    startConfetti();
}

function hideVictoryScreen() {
    victoryScreen.hidden = true;
    stopConfetti();
}

function resetBall(direction = Math.random() > 0.5 ? 1 : -1, speed = 4.4) {
    ball.x = court.width / 2;
    ball.y = court.height / 2;
    ball.vx = direction * speed;
    ball.vy = Math.random() > 0.5 ? -speed * 0.72 : speed * 0.72;
}

function prepareServe(direction) {
    resetBall(direction, 4.2);
    serveDelayUntil = performance.now() + 900;
    showStatus("Poeng! Ny serve om et øyeblikk.");
}

function resetGame() {
    hideVictoryScreen();
    scores = { left: 0, right: 0 };
    leftPaddle.y = court.height / 2 - leftPaddle.height / 2;
    rightPaddle.y = court.height / 2 - rightPaddle.height / 2;
    resetBall();
    serveDelayUntil = 0;
    running = false;
    gameOver = false;
    scoreSaved = false;
    localFallbackSaved = false;
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
    const verticalDirection = hitPosition === 0 ? (Math.random() > 0.5 ? 1 : -1) : Math.sign(hitPosition);
    ball.vx = direction * Math.min(Math.abs(ball.vx) + 0.35, 11);
    ball.vy = verticalDirection * Math.max(Math.abs(hitPosition * 6), 3.2);
    ball.x = direction > 0 ? paddle.x + paddle.width + ball.radius : paddle.x - ball.radius;
}

function finishGame(winner) {
    running = false;
    gameOver = true;
    serveDelayUntil = 0;
    showStatus(`${winner} vant! Trykk Nullstill for ny runde.`);
    showVictoryScreen(winner);
    saveScore();
}

function handlePoint(side) {
    scores[side] += 1;
    updateScoreboard();

    if (scores[side] >= getWinScore()) {
        finishGame(side === "left" ? playerName(leftName, "Spiller 1") : playerName(rightName, "Spiller 2"));
        return;
    }

    prepareServe(side === "left" ? -1 : 1);
}

function update(time) {
    movePaddles();

    if (time < serveDelayUntil) return;

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.y - ball.radius <= 0) {
        ball.y = ball.radius;
        ball.vy *= -1;
    }

    if (ball.y + ball.radius >= court.height) {
        ball.y = court.height - ball.radius;
        ball.vy *= -1;
    }

    if (paddleHit(leftPaddle) && ball.vx < 0) bounceFromPaddle(leftPaddle, 1);
    if (paddleHit(rightPaddle) && ball.vx > 0) bounceFromPaddle(rightPaddle, -1);

    if (ball.x + ball.radius < 0) {
        handlePoint("right");
    }

    if (ball.x - ball.radius > court.width) {
        handlePoint("left");
    }
}

function drawNet() {
    const netX = court.width / 2;
    const netWidth = 6;
    const segmentHeight = 14;
    const gap = 10;

    ctx.fillStyle = "rgba(233, 223, 207, 0.78)";
    for (let y = 14; y < court.height - 14; y += segmentHeight + gap) {
        ctx.fillRect(netX - netWidth / 2, y, netWidth, Math.min(segmentHeight, court.height - 14 - y));
    }
}

function drawCourt() {
    ctx.fillStyle = "#18382f";
    ctx.fillRect(0, 0, court.width, court.height);

    drawNet();

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
        update(time);
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
    if (scoreSaved) {
        showStatus("Resultatet er allerede lagret.");
        if (!victoryScreen.hidden) showVictorySaveStatus("Resultatet er allerede lagret i Firebase.");
        return;
    }

    if (!victoryScreen.hidden) showVictorySaveStatus("Lagrer resultat...");
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
        scoreSaved = true;
        showStatus("Resultatet er lagret i Firebase.");
        if (!victoryScreen.hidden) showVictorySaveStatus("Resultatet er lagret i Firebase.");
        await loadScores();
    } catch (error) {
        if (!localFallbackSaved) {
            saveLocalScore({ ...result, createdAt: new Date().toISOString() });
            localFallbackSaved = true;
        }
        renderScores(getLocalScores());
        const errorText = error.code || error.message || "ukjent feil";
        showStatus(`Firebase-lagring feilet: ${errorText}`, true);
        if (!victoryScreen.hidden) {
            showVictorySaveStatus(`Ikke lagret i Firebase (${errorText}). Prøv Lagre resultat igjen.`, true);
        }
    }
}

startBtn.addEventListener("click", () => {
    if (running || gameOver) return;
    running = true;
    lastTime = performance.now();
    showStatus("Spillet kjører.");
    requestAnimationFrame(gameLoop);
});

function togglePause() {
    if (gameOver) return;

    if (running) {
        running = false;
        showStatus("Pause.");
        return;
    }

    running = true;
    lastTime = performance.now();
    showStatus("Spillet kjører.");
    requestAnimationFrame(gameLoop);
}

pauseBtn.addEventListener("click", togglePause);

resetBtn.addEventListener("click", resetGame);
saveBtn.addEventListener("click", saveScore);
playAgainBtn.addEventListener("click", resetGame);
saveVictoryBtn.addEventListener("click", saveScore);
leftName.addEventListener("input", updateLabels);
rightName.addEventListener("input", updateLabels);
window.addEventListener("resize", () => {
    if (!victoryScreen.hidden) resizeConfettiCanvas();
});

window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    const isTyping = ["input", "select", "textarea"].includes(event.target.tagName.toLowerCase());

    if (key === " " && !isTyping) {
        event.preventDefault();
        if (!running && !gameOver) {
            running = true;
            lastTime = performance.now();
            showStatus("Spillet kjører.");
            requestAnimationFrame(gameLoop);
        }
        return;
    }

    if (key === "escape") {
        event.preventDefault();
        togglePause();
        return;
    }

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
