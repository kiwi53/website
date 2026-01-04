// Canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 1200;
canvas.height = 800;

// Game state
const game = {
    running: false,
    wave: 1,
    score: 0,
    spawnTimer: 0,
    zombiesPerWave: 5,
    waveActive: false,
    zombiesRemaining: 0
};

// Player
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 15,
    speed: 4,
    health: 100,
    maxHealth: 100,
    ammo: 30,
    maxAmmo: 30,
    reserveAmmo: 90,
    reloading: false,
    reloadTime: 1500,
    angle: 0
};

// Input
const keys = {};
const mouse = { x: 0, y: 0, clicking: false };

// Arrays
const zombies = [];
const bullets = [];
const particles = [];

// UI Elements
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const healthFill = document.getElementById('healthFill');
const healthText = document.getElementById('healthText');
const ammoText = document.getElementById('ammoText');
const waveText = document.getElementById('waveText');
const scoreText = document.getElementById('scoreText');
const finalWave = document.getElementById('finalWave');
const finalScore = document.getElementById('finalScore');

// Event Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    startGame();
});

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    if (e.key.toLowerCase() === 'r' && !player.reloading && player.ammo < player.maxAmmo && player.reserveAmmo > 0) {
        reload();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

canvas.addEventListener('mousedown', () => {
    mouse.clicking = true;
});

canvas.addEventListener('mouseup', () => {
    mouse.clicking = false;
});

canvas.addEventListener('click', () => {
    if (game.running && !player.reloading && player.ammo > 0) {
        shoot();
    }
});

// Start Game
function startGame() {
    startScreen.classList.add('hidden');
    game.running = true;
    game.wave = 1;
    game.score = 0;
    game.spawnTimer = 0;
    game.waveActive = false;
    game.zombiesRemaining = 0;
    
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    player.health = player.maxHealth;
    player.ammo = player.maxAmmo;
    player.reserveAmmo = 90;
    player.reloading = false;
    
    zombies.length = 0;
    bullets.length = 0;
    particles.length = 0;
    
    updateUI();
    startWave();
    gameLoop();
}

// Start Wave
function startWave() {
    game.waveActive = true;
    game.zombiesRemaining = game.zombiesPerWave + (game.wave - 1) * 3;
    game.spawnTimer = 0;
}

// Spawn Zombie
function spawnZombie() {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    switch(side) {
        case 0: // Top
            x = Math.random() * canvas.width;
            y = -30;
            break;
        case 1: // Right
            x = canvas.width + 30;
            y = Math.random() * canvas.height;
            break;
        case 2: // Bottom
            x = Math.random() * canvas.width;
            y = canvas.height + 30;
            break;
        case 3: // Left
            x = -30;
            y = Math.random() * canvas.height;
            break;
    }
    
    zombies.push({
        x: x,
        y: y,
        radius: 15,
        speed: 1 + (game.wave * 0.1),
        health: 2 + Math.floor(game.wave / 3),
        maxHealth: 2 + Math.floor(game.wave / 3)
    });
}

// Shoot
function shoot() {
    player.ammo--;
    updateUI();
    
    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    bullets.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(angle) * 10,
        vy: Math.sin(angle) * 10,
        radius: 4
    });
    
    // Recoil particles
    for (let i = 0; i < 5; i++) {
        createParticle(player.x, player.y, '#ff9800', 2);
    }
    
    if (player.ammo === 0) {
        reload();
    }
}

// Reload
function reload() {
    if (player.reserveAmmo > 0) {
        player.reloading = true;
        setTimeout(() => {
            const ammoNeeded = player.maxAmmo - player.ammo;
            const ammoToLoad = Math.min(ammoNeeded, player.reserveAmmo);
            player.ammo += ammoToLoad;
            player.reserveAmmo -= ammoToLoad;
            player.reloading = false;
            updateUI();
        }, player.reloadTime);
    }
}

// Create Particle
function createParticle(x, y, color, count = 1) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: Math.random() * 3 + 1,
            color: color,
            life: 30
        });
    }
}

// Update
function update() {
    if (!game.running) return;
    
    // Update player angle
    player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    
    // Move player
    if (keys['w'] || keys['arrowup']) player.y -= player.speed;
    if (keys['s'] || keys['arrowdown']) player.y += player.speed;
    if (keys['a'] || keys['arrowleft']) player.x -= player.speed;
    if (keys['d'] || keys['arrowright']) player.x += player.speed;
    
    // Keep player in bounds
    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));
    
    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        
        // Remove if out of bounds
        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
            bullets.splice(i, 1);
        }
    }
    
    // Spawn zombies
    if (game.waveActive && game.zombiesRemaining > 0) {
        game.spawnTimer++;
        if (game.spawnTimer >= 60) {
            spawnZombie();
            game.zombiesRemaining--;
            game.spawnTimer = 0;
        }
    }
    
    // Update zombies
    for (let i = zombies.length - 1; i >= 0; i--) {
        const zombie = zombies[i];
        
        // Move toward player
        const dx = player.x - zombie.x;
        const dy = player.y - zombie.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            zombie.x += (dx / dist) * zombie.speed;
            zombie.y += (dy / dist) * zombie.speed;
        }
        
        // Check collision with player
        const playerDist = Math.sqrt(
            Math.pow(zombie.x - player.x, 2) + Math.pow(zombie.y - player.y, 2)
        );
        
        if (playerDist < zombie.radius + player.radius) {
            player.health -= 0.5;
            updateUI();
            
            if (player.health <= 0) {
                gameOver();
            }
        }
        
        // Check collision with bullets
        for (let j = bullets.length - 1; j >= 0; j--) {
            const bullet = bullets[j];
            const bulletDist = Math.sqrt(
                Math.pow(zombie.x - bullet.x, 2) + Math.pow(zombie.y - bullet.y, 2)
            );
            
            if (bulletDist < zombie.radius + bullet.radius) {
                zombie.health--;
                bullets.splice(j, 1);
                createParticle(zombie.x, zombie.y, '#4CAF50', 3);
                
                if (zombie.health <= 0) {
                    zombies.splice(i, 1);
                    game.score += 10 * game.wave;
                    createParticle(zombie.x, zombie.y, '#ff4444', 8);
                    updateUI();
                }
                break;
            }
        }
    }
    
    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;
        
        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
    
    // Check wave completion
    if (game.waveActive && game.zombiesRemaining === 0 && zombies.length === 0) {
        game.waveActive = false;
        game.wave++;
        updateUI();
        
        // Give player ammo reward
        player.reserveAmmo += 30;
        
        setTimeout(() => {
            startWave();
        }, 2000);
    }
}

// Draw
function draw() {
    // Clear canvas
    ctx.fillStyle = '#2d2d2d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = '#3d3d3d';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }
    
    // Draw bullets
    ctx.fillStyle = '#ffeb3b';
    bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw zombies
    zombies.forEach(zombie => {
        // Body
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.arc(zombie.x, zombie.y, zombie.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Health bar
        const healthWidth = zombie.radius * 2;
        const healthHeight = 4;
        const healthPercent = zombie.health / zombie.maxHealth;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(zombie.x - healthWidth / 2, zombie.y - zombie.radius - 10, healthWidth, healthHeight);
        
        ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : '#ff4444';
        ctx.fillRect(zombie.x - healthWidth / 2, zombie.y - zombie.radius - 10, healthWidth * healthPercent, healthHeight);
    });
    
    // Draw player
    ctx.fillStyle = '#2196F3';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw player direction indicator
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(
        player.x + Math.cos(player.angle) * (player.radius + 10),
        player.y + Math.sin(player.angle) * (player.radius + 10)
    );
    ctx.stroke();
    
    // Draw particles
    particles.forEach(particle => {
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.life / 30;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
    
    // Draw wave message
    if (!game.waveActive && zombies.length === 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height / 2 - 50, canvas.width, 100);
        
        ctx.fillStyle = '#4CAF50';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Wave ${game.wave} Starting...`, canvas.width / 2, canvas.height / 2 + 15);
    }
    
    // Draw reloading message
    if (player.reloading) {
        ctx.fillStyle = '#ffeb3b';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('RELOADING...', canvas.width / 2, 100);
    }
}

// Update UI
function updateUI() {
    const healthPercent = (player.health / player.maxHealth) * 100;
    healthFill.style.width = healthPercent + '%';
    
    if (healthPercent < 30) {
        healthFill.classList.add('low');
    } else {
        healthFill.classList.remove('low');
    }
    
    healthText.textContent = `${Math.max(0, Math.floor(player.health))}/${player.maxHealth}`;
    ammoText.textContent = `${player.ammo}/${player.reserveAmmo}`;
    waveText.textContent = game.wave;
    scoreText.textContent = game.score;
}

// Game Over
function gameOver() {
    game.running = false;
    finalWave.textContent = game.wave;
    finalScore.textContent = game.score;
    gameOverScreen.classList.remove('hidden');
}

// Game Loop
function gameLoop() {
    update();
    draw();
    
    if (game.running) {
        requestAnimationFrame(gameLoop);
    }
}

// Initial UI update
updateUI();