// Game Configuration
const CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    PADDLE_WIDTH: 15,
    PADDLE_HEIGHT: 100,
    PADDLE_SPEED: 6,
    BALL_SIZE: 15,
    BALL_SPEED_INITIAL: 5,
    BALL_SPEED_INCREMENT: 0.3,
    WINNING_SCORE: Infinity,
    COUNTDOWN_DURATION: 3,
    AI_SPEED: 4.5,
    AI_REACTION_DELAY: 0.1,
    AI_PREDICTION_ERROR: 15
};

// Game State
const gameState = {
    running: false,
    paused: false,
    countdown: 0,
    player1Score: 0,
    player2Score: 0
};

// Canvas Setup
const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');

// Game Objects
const paddle1 = {
    x: 20,
    y: CONFIG.CANVAS_HEIGHT / 2 - CONFIG.PADDLE_HEIGHT / 2,
    width: CONFIG.PADDLE_WIDTH,
    height: CONFIG.PADDLE_HEIGHT,
    dy: 0
};

const paddle2 = {
    x: CONFIG.CANVAS_WIDTH - 20 - CONFIG.PADDLE_WIDTH,
    y: CONFIG.CANVAS_HEIGHT / 2 - CONFIG.PADDLE_HEIGHT / 2,
    width: CONFIG.PADDLE_WIDTH,
    height: CONFIG.PADDLE_HEIGHT,
    dy: 0
};

const ball = {
    x: CONFIG.CANVAS_WIDTH / 2,
    y: CONFIG.CANVAS_HEIGHT / 2,
    size: CONFIG.BALL_SIZE,
    dx: CONFIG.BALL_SPEED_INITIAL,
    dy: CONFIG.BALL_SPEED_INITIAL,
    speed: CONFIG.BALL_SPEED_INITIAL
};

// Input Handling
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    // Handle pause
    if (e.key === 'Escape' && gameState.running && gameState.countdown === 0) {
        togglePause();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// UI Elements
const menu = document.getElementById('menu');
const gameOverMenu = document.getElementById('gameOver');
const pauseMenu = document.getElementById('pauseMenu');
const hud = document.getElementById('hud');
const pauseHint = document.getElementById('pauseHint');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const menuBtn = document.getElementById('menuBtn');
const resumeBtn = document.getElementById('resumeBtn');
const quitBtn = document.getElementById('quitBtn');
const score1El = document.getElementById('score1');
const score2El = document.getElementById('score2');
const winnerEl = document.getElementById('winner');
const countdownText = document.getElementById('countdownText');

// Event Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', restartGame);
menuBtn.addEventListener('click', returnToMenu);
resumeBtn.addEventListener('click', togglePause);
quitBtn.addEventListener('click', returnToMenu);

// Game Functions
function startGame() {
    menu.classList.add('hidden');
    hud.classList.remove('hidden');
    pauseHint.classList.remove('hidden');
    resetGame();
    startCountdown();
}

function resetGame() {
    gameState.player1Score = 0;
    gameState.player2Score = 0;
    updateScores();
    resetBall();
    paddle1.y = CONFIG.CANVAS_HEIGHT / 2 - CONFIG.PADDLE_HEIGHT / 2;
    paddle2.y = CONFIG.CANVAS_HEIGHT / 2 - CONFIG.PADDLE_HEIGHT / 2;
}

function resetBall() {
    ball.x = CONFIG.CANVAS_WIDTH / 2;
    ball.y = CONFIG.CANVAS_HEIGHT / 2;
    ball.speed = CONFIG.BALL_SPEED_INITIAL;
    
    // Random direction
    const angle = (Math.random() * Math.PI / 2) - Math.PI / 4;
    const direction = Math.random() < 0.5 ? 1 : -1;
    ball.dx = Math.cos(angle) * ball.speed * direction;
    ball.dy = Math.sin(angle) * ball.speed;
}

function startCountdown() {
    gameState.countdown = CONFIG.COUNTDOWN_DURATION;
    countdownText.textContent = gameState.countdown;
    countdownText.parentElement.classList.remove('hidden');
    
    const countdownInterval = setInterval(() => {
        gameState.countdown--;
        if (gameState.countdown > 0) {
            countdownText.textContent = gameState.countdown;
        } else {
            countdownText.textContent = 'GO!';
            setTimeout(() => {
                countdownText.parentElement.classList.add('hidden');
                gameState.running = true;
                gameLoop();
            }, 500);
            clearInterval(countdownInterval);
        }
    }, 1000);
}

function togglePause() {
    if (!gameState.running) return;
    
    gameState.paused = !gameState.paused;
    pauseMenu.classList.toggle('hidden');
    
    if (!gameState.paused) {
        gameLoop();
    }
}

function restartGame() {
    gameOverMenu.classList.add('hidden');
    resetGame();
    startCountdown();
}

function returnToMenu() {
    gameState.running = false;
    gameState.paused = false;
    gameOverMenu.classList.add('hidden');
    pauseMenu.classList.add('hidden');
    hud.classList.add('hidden');
    pauseHint.classList.add('hidden');
    menu.classList.remove('hidden');
}

function updateScores() {
    score1El.textContent = gameState.player1Score;
    score2El.textContent = gameState.player2Score;
}

function checkWin() {
    if (gameState.player1Score >= CONFIG.WINNING_SCORE) {
        endGame('You Win!');
        return true;
    } else if (gameState.player2Score >= CONFIG.WINNING_SCORE) {
        endGame('AI Wins!');
        return true;
    }
    return false;
}

function endGame(winner) {
    gameState.running = false;
    hud.classList.add('hidden');
    pauseHint.classList.add('hidden');
    winnerEl.textContent = winner;
    gameOverMenu.classList.remove('hidden');
}

// Mouse control for player paddle
let mouseY = CONFIG.CANVAS_HEIGHT / 2;
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseY = e.clientY - rect.top;
});

// Game Logic
function update() {
    // Player 1 controls (W/S/Arrow Keys)
    if (keys['w'] || keys['W'] || keys['ArrowUp']) {
        paddle1.dy = -CONFIG.PADDLE_SPEED;
    } else if (keys['s'] || keys['S'] || keys['ArrowDown']) {
        paddle1.dy = CONFIG.PADDLE_SPEED;
    } else {
        paddle1.dy = 0;
    }

    // AI controls for paddle 2
    const aiTarget = ball.y - paddle2.height / 2 + (Math.random() * CONFIG.AI_PREDICTION_ERROR - CONFIG.AI_PREDICTION_ERROR / 2);
    const aiDiff = aiTarget - paddle2.y;
    
    if (Math.abs(aiDiff) > 5) {
        paddle2.dy = Math.sign(aiDiff) * CONFIG.AI_SPEED;
    } else {
        paddle2.dy = 0;
    }

    // Update paddle positions
    paddle1.y += paddle1.dy;
    paddle2.y += paddle2.dy;

    // Keep paddles in bounds
    paddle1.y = Math.max(0, Math.min(CONFIG.CANVAS_HEIGHT - paddle1.height, paddle1.y));
    paddle2.y = Math.max(0, Math.min(CONFIG.CANVAS_HEIGHT - paddle2.height, paddle2.y));

    // Update ball position
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Ball collision with top/bottom walls
    if (ball.y <= 0 || ball.y + ball.size >= CONFIG.CANVAS_HEIGHT) {
        ball.dy = -ball.dy;
        playSound('wall');
    }

    // Ball collision with paddles
    if (
        ball.x <= paddle1.x + paddle1.width &&
        ball.y + ball.size >= paddle1.y &&
        ball.y <= paddle1.y + paddle1.height
    ) {
        ball.dx = Math.abs(ball.dx) + CONFIG.BALL_SPEED_INCREMENT;
        // Add angle based on where ball hits paddle
        const relativeIntersectY = (paddle1.y + paddle1.height / 2) - (ball.y + ball.size / 2);
        const normalizedIntersectY = relativeIntersectY / (paddle1.height / 2);
        ball.dy = -normalizedIntersectY * ball.dx * 0.5;
        playSound('paddle');
    }

    if (
        ball.x + ball.size >= paddle2.x &&
        ball.y + ball.size >= paddle2.y &&
        ball.y <= paddle2.y + paddle2.height
    ) {
        ball.dx = -(Math.abs(ball.dx) + CONFIG.BALL_SPEED_INCREMENT);
        // Add angle based on where ball hits paddle
        const relativeIntersectY = (paddle2.y + paddle2.height / 2) - (ball.y + ball.size / 2);
        const normalizedIntersectY = relativeIntersectY / (paddle2.height / 2);
        ball.dy = -normalizedIntersectY * Math.abs(ball.dx) * 0.5;
        playSound('paddle');
    }

    // Ball out of bounds (scoring)
    if (ball.x < 0) {
        gameState.player2Score++;
        updateScores();
        playSound('score');
        if (!checkWin()) {
            resetBall();
        }
    } else if (ball.x > CONFIG.CANVAS_WIDTH) {
        gameState.player1Score++;
        updateScores();
        playSound('score');
        if (!checkWin()) {
            resetBall();
        }
    }
}

// Rendering
function draw() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // Draw center line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(CONFIG.CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw paddles
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(paddle1.x, paddle1.y, paddle1.width, paddle1.height);
    ctx.fillRect(paddle2.x, paddle2.y, paddle2.width, paddle2.height);

    // Draw ball
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ball.x, ball.y, ball.size, ball.size);
}

// Game Loop
function gameLoop() {
    if (!gameState.running || gameState.paused) return;

    update();
    draw();

    requestAnimationFrame(gameLoop);
}

// Simple sound effects (using Web Audio API)
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    switch (type) {
        case 'paddle':
            oscillator.frequency.value = 300;
            gainNode.gain.value = 0.1;
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.05);
            break;
        case 'wall':
            oscillator.frequency.value = 200;
            gainNode.gain.value = 0.05;
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.05);
            break;
        case 'score':
            oscillator.frequency.value = 150;
            gainNode.gain.value = 0.1;
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
            break;
    }
}

// Initial draw
draw();
