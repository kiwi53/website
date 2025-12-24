// Canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 1000;
canvas.height = 700;

// Grid settings
const GRID_SIZE = 50;

// Game state
const game = {
    running: false,
    wave: 0,
    gold: 100,
    lives: 20,
    waveActive: false,
    enemiesInWave: 0,
    enemiesSpawned: 0,
    spawnTimer: 0,
    selectedTower: null,
    selectedPlacedTower: null,
    totalGoldEarned: 0
};

// Path waypoints
const path = [
    { x: 0, y: 200 },
    { x: 250, y: 200 },
    { x: 250, y: 450 },
    { x: 500, y: 450 },
    { x: 500, y: 100 },
    { x: 750, y: 100 },
    { x: 750, y: 550 },
    { x: 1000, y: 550 }
];

// Tower types
const towerTypes = {
    basic: {
        cost: 50,
        damage: 10,
        range: 100,
        fireRate: 60,
        color: '#2196F3',
        projectileSpeed: 5,
        upgradeCost: 40,
        sellValue: 35
    },
    rapid: {
        cost: 75,
        damage: 5,
        range: 90,
        fireRate: 20,
        color: '#ff9800',
        projectileSpeed: 7,
        upgradeCost: 50,
        sellValue: 50
    },
    sniper: {
        cost: 100,
        damage: 50,
        range: 200,
        fireRate: 120,
        color: '#9C27B0',
        projectileSpeed: 10,
        upgradeCost: 70,
        sellValue: 70
    },
    splash: {
        cost: 125,
        damage: 15,
        range: 80,
        fireRate: 80,
        color: '#f44336',
        projectileSpeed: 4,
        splashRadius: 50,
        upgradeCost: 90,
        sellValue: 90
    }
};

// Arrays
const towers = [];
const enemies = [];
const projectiles = [];
const particles = [];

// UI Elements
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const startWaveBtn = document.getElementById('startWaveBtn');
const goldText = document.getElementById('goldText');
const livesText = document.getElementById('livesText');
const waveText = document.getElementById('waveText');
const enemiesText = document.getElementById('enemiesText');
const finalWave = document.getElementById('finalWave');
const finalGold = document.getElementById('finalGold');
const towerButtons = document.querySelectorAll('.tower-btn');

// Event Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    startGame();
});

startWaveBtn.addEventListener('click', () => {
    if (!game.waveActive && game.running) {
        startWave();
    }
});

towerButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        const cost = parseInt(btn.dataset.cost);
        
        if (game.gold >= cost) {
            // Toggle selection
            if (game.selectedTower === type) {
                game.selectedTower = null;
                btn.classList.remove('selected');
            } else {
                game.selectedTower = type;
                towerButtons.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            }
            game.selectedPlacedTower = null;
        }
    });
});

canvas.addEventListener('click', (e) => {
    if (!game.running) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicking on upgrade/sell buttons
    if (game.selectedPlacedTower) {
        const tower = game.selectedPlacedTower;
        const menuX = tower.x + 40;
        const menuY = tower.y - 60;
        
        // Check upgrade button (if tower is not max level)
        if (tower.level < 3) {
            const upgradeY = menuY + 45;
            if (x >= menuX + 5 && x <= menuX + 55 && y >= upgradeY && y <= upgradeY + 25) {
                upgradeTower(tower);
                return;
            }
            
            // Sell button
            if (x >= menuX + 65 && x <= menuX + 115 && y >= upgradeY && y <= upgradeY + 25) {
                sellTower(tower);
                return;
            }
        } else {
            // Sell button (max level position)
            const sellY = menuY + 15;
            if (x >= menuX + 65 && x <= menuX + 115 && y >= sellY && y <= sellY + 25) {
                sellTower(tower);
                return;
            }
        }
    }
    
    // Check if clicking on an existing tower
    const clickedTower = towers.find(tower => {
        const dist = Math.sqrt(Math.pow(x - tower.x, 2) + Math.pow(y - tower.y, 2));
        return dist < 20;
    });
    
    if (clickedTower) {
        game.selectedPlacedTower = clickedTower;
        game.selectedTower = null;
        towerButtons.forEach(b => b.classList.remove('selected'));
    } else if (game.selectedTower) {
        placeTower(x, y);
    } else {
        game.selectedPlacedTower = null;
    }
});

// Start Game
function startGame() {
    startScreen.classList.add('hidden');
    startWaveBtn.classList.remove('hidden');
    game.running = true;
    game.wave = 0;
    game.gold = 100;
    game.lives = 20;
    game.waveActive = false;
    game.totalGoldEarned = 0;
    game.selectedTower = null;
    
    towers.length = 0;
    enemies.length = 0;
    projectiles.length = 0;
    particles.length = 0;
    
    towerButtons.forEach(b => b.classList.remove('selected'));
    
    updateUI();
    gameLoop();
}

// Start Wave
function startWave() {
    game.wave++;
    game.waveActive = true;
    game.enemiesInWave = 5 + (game.wave * 3);
    game.enemiesSpawned = 0;
    game.spawnTimer = 0;
    startWaveBtn.classList.add('hidden');
    updateUI();
}

// Place Tower
function placeTower(x, y) {
    const type = towerTypes[game.selectedTower];
    const cost = type.cost;
    
    if (game.gold < cost) return;
    
    // Snap to grid
    const gridX = Math.floor(x / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
    const gridY = Math.floor(y / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
    
    // Check if too close to path
    let tooClose = false;
    for (let i = 0; i < path.length - 1; i++) {
        const dist = distanceToLineSegment(gridX, gridY, path[i], path[i + 1]);
        if (dist < 40) {
            tooClose = true;
            break;
        }
    }
    
    // Check if spot is occupied
    for (const tower of towers) {
        if (tower.x === gridX && tower.y === gridY) {
            tooClose = true;
            break;
        }
    }
    
    if (!tooClose) {
        towers.push({
            x: gridX,
            y: gridY,
            type: game.selectedTower,
            ...type,
            cooldown: 0,
            target: null,
            level: 1
        });
        
        game.gold -= cost;
        updateUI();
    }
}

// Distance to line segment
function distanceToLineSegment(px, py, p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lenSq = dx * dx + dy * dy;
    
    if (lenSq === 0) {
        return Math.sqrt((px - p1.x) ** 2 + (py - p1.y) ** 2);
    }
    
    let t = ((px - p1.x) * dx + (py - p1.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    
    const projX = p1.x + t * dx;
    const projY = p1.y + t * dy;
    
    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

// Upgrade Tower
function upgradeTower(tower) {
    if (!tower || tower.level >= 3) return;
    
    const upgradeCost = tower.upgradeCost * tower.level;
    if (game.gold < upgradeCost) return;
    
    game.gold -= upgradeCost;
    tower.level++;
    tower.damage = Math.floor(tower.damage * 1.5);
    tower.range = Math.floor(tower.range * 1.1);
    
    updateUI();
}

// Sell Tower
function sellTower(tower) {
    if (!tower) return;
    
    const sellValue = Math.floor(tower.sellValue * tower.level * 0.7);
    game.gold += sellValue;
    
    const index = towers.indexOf(tower);
    if (index > -1) {
        towers.splice(index, 1);
    }
    
    game.selectedPlacedTower = null;
    updateUI();
}

// Spawn Enemy
function spawnEnemy() {
    const health = 20 + (game.wave * 5);
    const speed = 1 + (game.wave * 0.05);
    const reward = 5 + Math.floor(game.wave / 2);
    
    enemies.push({
        x: path[0].x,
        y: path[0].y,
        health: health,
        maxHealth: health,
        speed: speed,
        pathIndex: 0,
        reward: reward,
        radius: 8
    });
}

// Create Particle
function createParticle(x, y, color, count = 5) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2 + 1;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: Math.random() * 2 + 1,
            color: color,
            life: 30
        });
    }
}

// Update
function update() {
    if (!game.running) return;
    
    // Spawn enemies
    if (game.waveActive && game.enemiesSpawned < game.enemiesInWave) {
        game.spawnTimer++;
        if (game.spawnTimer >= 45) {
            spawnEnemy();
            game.enemiesSpawned++;
            game.spawnTimer = 0;
        }
    }
    
    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        if (enemy.pathIndex < path.length - 1) {
            const target = path[enemy.pathIndex + 1];
            const dx = target.x - enemy.x;
            const dy = target.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 5) {
                enemy.pathIndex++;
            } else {
                enemy.x += (dx / dist) * enemy.speed;
                enemy.y += (dy / dist) * enemy.speed;
            }
        } else {
            // Enemy reached the end
            game.lives--;
            enemies.splice(i, 1);
            updateUI();
            
            if (game.lives <= 0) {
                gameOver();
            }
        }
    }
    
    // Update towers
    for (const tower of towers) {
        tower.cooldown--;
        
        // Find target
        if (!tower.target || tower.target.health <= 0) {
            tower.target = null;
            let closestDist = tower.range;
            
            for (const enemy of enemies) {
                const dist = Math.sqrt(
                    Math.pow(enemy.x - tower.x, 2) + Math.pow(enemy.y - tower.y, 2)
                );
                
                if (dist <= tower.range && dist < closestDist) {
                    tower.target = enemy;
                    closestDist = dist;
                }
            }
        }
        
        // Shoot at target
        if (tower.target && tower.cooldown <= 0) {
            const dx = tower.target.x - tower.x;
            const dy = tower.target.y - tower.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist <= tower.range && tower.target.health > 0) {
                projectiles.push({
                    x: tower.x,
                    y: tower.y,
                    vx: (dx / dist) * tower.projectileSpeed,
                    vy: (dy / dist) * tower.projectileSpeed,
                    damage: tower.damage,
                    radius: 4,
                    color: tower.color,
                    target: tower.target,
                    splash: tower.splashRadius || 0
                });
                
                tower.cooldown = tower.fireRate;
            }
        }
    }
    
    // Update projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        proj.x += proj.vx;
        proj.y += proj.vy;
        
        // Check collision with target
        if (proj.target && proj.target.health > 0) {
            const dist = Math.sqrt(
                Math.pow(proj.x - proj.target.x, 2) + Math.pow(proj.y - proj.target.y, 2)
            );
            
            if (dist < proj.radius + proj.target.radius) {
                // Hit target
                proj.target.health -= proj.damage;
                createParticle(proj.target.x, proj.target.y, proj.color, 3);
                
                // Splash damage
                if (proj.splash > 0) {
                    for (const enemy of enemies) {
                        if (enemy === proj.target) continue;
                        const splashDist = Math.sqrt(
                            Math.pow(proj.target.x - enemy.x, 2) + 
                            Math.pow(proj.target.y - enemy.y, 2)
                        );
                        if (splashDist <= proj.splash) {
                            enemy.health -= proj.damage * 0.5;
                            createParticle(enemy.x, enemy.y, proj.color, 2);
                        }
                    }
                }
                
                if (proj.target.health <= 0) {
                    game.gold += proj.target.reward;
                    game.totalGoldEarned += proj.target.reward;
                    createParticle(proj.target.x, proj.target.y, '#FFD700', 8);
                    updateUI();
                }
                
                projectiles.splice(i, 1);
            }
        }
        
        // Remove if out of bounds
        if (proj.x < 0 || proj.x > canvas.width || proj.y < 0 || proj.y > canvas.height) {
            projectiles.splice(i, 1);
        }
    }
    
    // Remove dead enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].health <= 0) {
            enemies.splice(i, 1);
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
    if (game.waveActive && game.enemiesSpawned >= game.enemiesInWave && enemies.length === 0) {
        game.waveActive = false;
        game.gold += 50;
        game.totalGoldEarned += 50;
        updateUI();
        startWaveBtn.classList.remove('hidden');
    }
    
    updateUI();
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
    
    // Draw path
    ctx.strokeStyle = '#5d4e37';
    ctx.lineWidth = 80;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();
    
    // Draw path border
    ctx.strokeStyle = '#4a3f2f';
    ctx.lineWidth = 85;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();
    
    // Draw towers
    for (const tower of towers) {
        // Highlight selected tower
        if (tower === game.selectedPlacedTower) {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(tower.x, tower.y, 25, 0, Math.PI * 2);
            ctx.fill();
            
            // Range indicator for selected placed tower
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.beginPath();
            ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Range indicator (only for selected tower type)
        if (tower.type === game.selectedTower) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Tower body
        ctx.fillStyle = tower.color;
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, 15, 0, Math.PI * 2);
        ctx.fill();
        
        // Tower border
        ctx.strokeStyle = tower === game.selectedPlacedTower ? '#FFD700' : '#fff';
        ctx.lineWidth = tower === game.selectedPlacedTower ? 3 : 2;
        ctx.stroke();
        
        // Level indicator
        if (tower.level > 1) {
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`L${tower.level}`, tower.x, tower.y - 20);
        }
        
        // Tower gun
        if (tower.target) {
            const angle = Math.atan2(tower.target.y - tower.y, tower.target.x - tower.x);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(tower.x, tower.y);
            ctx.lineTo(
                tower.x + Math.cos(angle) * 20,
                tower.y + Math.sin(angle) * 20
            );
            ctx.stroke();
        }
    }
    
    // Draw projectiles
    for (const proj of projectiles) {
        ctx.fillStyle = proj.color;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = proj.color;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    
    // Draw enemies
    for (const enemy of enemies) {
        // Body
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = '#2E7D32';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Health bar
        const healthWidth = enemy.radius * 2;
        const healthHeight = 3;
        const healthPercent = enemy.health / enemy.maxHealth;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(enemy.x - healthWidth / 2, enemy.y - enemy.radius - 8, healthWidth, healthHeight);
        
        ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : '#ff4444';
        ctx.fillRect(enemy.x - healthWidth / 2, enemy.y - enemy.radius - 8, healthWidth * healthPercent, healthHeight);
    }
    
    // Draw particles
    for (const particle of particles) {
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.life / 30;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    
    // Draw placement preview
    if (game.selectedTower && game.running) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = lastMouseX - rect.left;
        const mouseY = lastMouseY - rect.top;
        
        if (mouseX >= 0 && mouseX <= canvas.width && mouseY >= 0 && mouseY <= canvas.height) {
            const type = towerTypes[game.selectedTower];
            
            // Snap to grid
            const gridX = Math.floor(mouseX / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
            const gridY = Math.floor(mouseY / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
            
            // Check if valid placement
            let valid = true;
            for (let i = 0; i < path.length - 1; i++) {
                const dist = distanceToLineSegment(gridX, gridY, path[i], path[i + 1]);
                if (dist < 40) {
                    valid = false;
                    break;
                }
            }
            for (const tower of towers) {
                if (tower.x === gridX && tower.y === gridY) {
                    valid = false;
                    break;
                }
            }
            
            // Range preview
            ctx.fillStyle = valid ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 68, 68, 0.2)';
            ctx.beginPath();
            ctx.arc(gridX, gridY, type.range, 0, Math.PI * 2);
            ctx.fill();
            
            // Tower preview
            ctx.fillStyle = valid ? type.color : '#ff4444';
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.arc(gridX, gridY, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
    
    // Draw tower upgrade/sell menu
    if (game.selectedPlacedTower) {
        const tower = game.selectedPlacedTower;
        const menuX = tower.x + 40;
        const menuY = tower.y - 60;
        const menuWidth = 120;
        const menuHeight = tower.level < 3 ? 80 : 50;
        
        // Menu background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(menuX, menuY, menuWidth, menuHeight);
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.strokeRect(menuX, menuY, menuWidth, menuHeight);
        
        // Tower info
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Level ${tower.level}`, menuX + 10, menuY + 18);
        ctx.fillText(`Dmg: ${tower.damage}`, menuX + 10, menuY + 33);
        
        // Upgrade button
        if (tower.level < 3) {
            const upgradeCost = tower.upgradeCost * tower.level;
            const upgradeY = menuY + 45;
            
            ctx.fillStyle = game.gold >= upgradeCost ? '#4CAF50' : '#666';
            ctx.fillRect(menuX + 5, upgradeY, 50, 25);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(menuX + 5, upgradeY, 50, 25);
            
            ctx.fillStyle = '#fff';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Upgrade', menuX + 30, upgradeY + 12);
            ctx.fillText(`💰${upgradeCost}`, menuX + 30, upgradeY + 22);
        }
        
        // Sell button
        const sellY = tower.level < 3 ? menuY + 45 : menuY + 15;
        const sellValue = Math.floor(tower.sellValue * tower.level * 0.7);
        
        ctx.fillStyle = '#f44336';
        ctx.fillRect(menuX + 65, sellY, 50, 25);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(menuX + 65, sellY, 50, 25);
        
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Sell', menuX + 90, sellY + 12);
        ctx.fillText(`💰${sellValue}`, menuX + 90, sellY + 22);
    }
}

// Track mouse position for preview
let lastMouseX = 0;
let lastMouseY = 0;
canvas.addEventListener('mousemove', (e) => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});

// Update UI
function updateUI() {
    goldText.textContent = game.gold;
    livesText.textContent = game.lives;
    waveText.textContent = game.wave;
    enemiesText.textContent = enemies.length;
    
    // Update tower buttons
    towerButtons.forEach(btn => {
        const cost = parseInt(btn.dataset.cost);
        if (game.gold < cost) {
            btn.classList.add('disabled');
        } else {
            btn.classList.remove('disabled');
        }
    });
}

// Game Over
function gameOver() {
    game.running = false;
    finalWave.textContent = game.wave;
    finalGold.textContent = game.totalGoldEarned;
    gameOverScreen.classList.remove('hidden');
    startWaveBtn.classList.add('hidden');
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
