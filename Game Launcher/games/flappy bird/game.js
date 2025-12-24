// Flappy Bird - simple implementation
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const startBtn = document.getElementById('startBtn');
const muteBtn = document.getElementById('muteBtn');

// Responsive: scale canvas to width while preserving aspect
function resizeCanvas() {
  const containerWidth = Math.min(400, document.querySelector('.wrap').clientWidth);
  canvas.style.width = containerWidth + 'px';
  canvas.style.height = (containerWidth * (canvas.height / canvas.width)) + 'px';
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let bird = { x: 80, y: 200, r: 14, vy:0 };
let gravity=0.4;
let jump=-7;
let pipes=[];
let frame=0;
let score=0;
let playing=false;
let muted=false;

// Create an in-page overlay for "You lost" messages
const overlay = document.createElement('div');
overlay.className = 'flappy-overlay hidden';
overlay.innerHTML = '<div class="flappy-msg"><div id="flappyMsgText" class="flappy-text"></div><button id="flappyRetry" class="flappy-retry">Click to try again</button></div>';
document.body.appendChild(overlay);
const flappyMsgText = document.getElementById('flappyMsgText');
const flappyRetry = document.getElementById('flappyRetry');

// clicking the overlay or the retry button prepares the game and waits for user input to start
let readyToStart = false;

function prepareReset(){
  // prepare game state but do not start
  bird = { x:80, y:200, r:14, vy:0 };
  pipes = [];
  frame = 0;
  score = 0;
  scoreEl.textContent = score;
  readyToStart = true;
  hideOverlay();
}

function startGame(){
  playing = true;
  readyToStart = false;
}

// reset convenience: prepare and start immediately
function reset(){
  prepareReset();
  startGame();
}

overlay.addEventListener('click', (e) => {
  if (e.target === overlay || e.target === flappyRetry) {
    // prepare the game, but do not start running until the user clicks/presses Space
    prepareReset();
  }
});
flappyRetry.addEventListener('click', (e) => { e.stopPropagation(); prepareReset(); });

function spawnPipe(){
  const gap = 140;
  const top = 80 + Math.random()*(canvas.height - gap - 160);
  pipes.push({x:canvas.width, top, gap, w:60, passed:false});
}

function update(){
  if(!playing) return;
  frame++;
  bird.vy += gravity;
  bird.y += bird.vy;

  if(frame % 90 === 0) spawnPipe();

  for(let i=pipes.length-1;i>=0;i--){
    pipes[i].x -= 2.6;
    if(!pipes[i].passed && pipes[i].x + pipes[i].w < bird.x){
      pipes[i].passed=true; score++; scoreEl.textContent = score;
    }
    if(pipes[i].x + pipes[i].w < -50) pipes.splice(i,1);

    // collisions
    if(bird.x + bird.r > pipes[i].x && bird.x - bird.r < pipes[i].x + pipes[i].w){
      if(bird.y - bird.r < pipes[i].top || bird.y + bird.r > pipes[i].top + pipes[i].gap){
        gameOver();
      }
    }
  }

  // floor/ceiling
  if(bird.y + bird.r > canvas.height || bird.y - bird.r < 0){
    gameOver();
  }
}

function gameOver(){
  playing=false;
  showMessage('You lost!\nScore: '+score+'\nClick or press Space to try again');
}

function showMessage(msg){
  // display the in-page overlay with the provided message
  if (flappyMsgText) flappyMsgText.textContent = msg;
  overlay.classList.remove('hidden');
}

function hideOverlay(){
  overlay.classList.add('hidden');
}
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // background sky gradient handled by CSS; draw ground
  ctx.fillStyle = '#6dbb3b';
  ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

  // draw pipes
  ctx.fillStyle = '#2ecc71';
  pipes.forEach(p=>{
    ctx.fillRect(p.x, 0, p.w, p.top);
    ctx.fillRect(p.x, p.top + p.gap, p.w, canvas.height - (p.top + p.gap));
  });

  // draw bird
  ctx.fillStyle = '#ffd700';
  ctx.beginPath(); ctx.arc(bird.x, bird.y, bird.r,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(bird.x+5,bird.y-3,3,0,Math.PI*2); ctx.fill();

  requestAnimationFrame(loop);
}

function loop(){ update(); draw(); }

function flap(){
  // If we're not playing yet:
  //  - if the player prepared the game (readyToStart), start the game on this input
  //  - otherwise do nothing (prevents immediate auto-start from flap)
  if(!playing){
    if (readyToStart) {
      startGame();
    }
    return;
  }
  bird.vy = jump;
}

// input
// Space should flap during play; handle 'readyToStart' to wait for the user's next input to actually start
document.addEventListener('keydown', e => {
  if (e.code === 'Space') {
    e.preventDefault();

    // If overlay is visible and not ready, prepare reset (do not start yet)
    if (!playing && !overlay.classList.contains('hidden') && !readyToStart) {
      prepareReset();
      return;
    }

    // If we're waiting for user to start, start now and immediately flap
    if (!playing && readyToStart) {
      startGame();
      flap();
      return;
    }

    // If we've not started yet (initial start), prepare, start, and flap immediately
    if (!playing && overlay.classList.contains('hidden') && !readyToStart) {
      prepareReset();
      startGame();
      flap();
      return;
    }

    // Otherwise, during play, flap
    flap();
  }
});

canvas.addEventListener('click', () => {
  // If overlay visible -> prepare and wait
  if (!playing && !overlay.classList.contains('hidden') && !readyToStart) {
    prepareReset();
    return;
  }

  // If waiting for the user to start -> start and immediately flap
  if (!playing && readyToStart) {
    startGame();
    flap();
    return;
  }

  // If the game isn't started yet (initial), clicking starts immediately and flaps
  if (!playing && overlay.classList.contains('hidden') && !readyToStart) {
    prepareReset();
    startGame();
    flap();
    return;
  }

  // Otherwise flap
  flap();
});

if (startBtn) {
  startBtn.addEventListener('click', () => { if (!playing) { prepareReset(); startGame(); } });
}
muteBtn.addEventListener('click', () => { muted = !muted; muteBtn.textContent = muted ? '🔇' : '🔊'; });

// ensure canvas logical size matches css aspect
(function init(){
  canvas.width = 400; canvas.height = 600; resizeCanvas(); draw();
})();
