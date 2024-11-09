// Game state
let gameActive = false;
let score = 0;
let health = 100;
let ammo = 30;
let targets = [];
let lastShot = 0;
let reloading = false;

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('videoElement');
const startButton = document.getElementById('startButton');
const gameOverScreen = document.getElementById('gameOver');
const flash = document.querySelector('.flash');

// Track high score
let highScore = localStorage.getItem('highScore') || 0;

// Resize canvas to match window size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Initialize camera
async function initializeCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream;
    } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Camera access is required to play this game!");
    }
}

// Target class
class Target {
    constructor() {
        this.size = Math.random() * 50 + 50;
        this.x = Math.random() * (canvas.width - this.size);
        this.y = Math.random() * (canvas.height - this.size);
        this.speedX = (Math.random() - 0.5) * 2;
        this.speedY = (Math.random() - 0.5) * 2;
        this.health = 1;
        this.color = `hsl(${Math.random() * 360}, 70%, 50%)`;
        this.lastShot = 0;
        this.points = Math.floor(100 / this.size * 10);
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x <= 0 || this.x + this.size >= canvas.width) this.speedX *= -1;
        if (this.y <= 0 || this.y + this.size >= canvas.height) this.speedY *= -1;

        if (Math.random() < 0.01) {
            this.speedX = (Math.random() - 0.5) * 2;
            this.speedY = (Math.random() - 0.5) * 2;
        }

        if (Date.now() - this.lastShot > 2000 && Math.random() < 0.01) {
            this.shoot();
            this.lastShot = Date.now();
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x + this.size/2, this.y + this.size/2, this.size/2, 0, Math.PI * 2);
        ctx.fill();
    }

    shoot() {
        if (health > 0) {
            health -= 5;
            updateHUD();
            checkGameOver();
        }
    }
}

// Game functions
function spawnTarget() {
    if (targets.length < 8 && Math.random() < 0.05) {
        targets.push(new Target());
    }
}

function updateTargets() {
    for (let i = targets.length - 1; i >= 0; i--) {
        targets[i].update();
        if (targets[i].health <= 0) {
            score += targets[i].points;
            targets.splice(i, 1);
            updateHUD();
        }
    }
}

function drawTargets() {
    targets.forEach(target => target.draw());
}

function shoot(e) {
    if (!gameActive || reloading || ammo <= 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (Date.now() - lastShot < 100) return;
    lastShot = Date.now();

    flash.style.opacity = '1';
    setTimeout(() => flash.style.opacity = '0', 50);

    ammo--;
    updateHUD();

    targets.forEach(target => {
        const dx = x - (target.x + target.size/2);
        const dy = y - (target.y + target.size/2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < target.size/2) {
            target.health = 0;
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    if (ammo <= 0) reload();
}

function reload() {
    if (reloading) return;
    reloading = true;
    setTimeout(() => {
        ammo = 30;
        reloading = false;
        updateHUD();
    }, 2000);
}

function updateHUD() {
    document.getElementById('score').textContent = `Score: ${score}`;
    document.getElementById('health').textContent = `Health: ${health}`;
    document.getElementById('ammo').textContent = reloading ? 'Reloading...' : `Ammo: ${ammo}`;
}

function resetGame() {
    gameActive = true;
    score = 0;
    health = 100;
    ammo = 30;
    targets = [];
    lastShot = 0;
    reloading = false;
    gameOverScreen.style.display = 'none';
    updateHUD();
    gameLoop();
}

function checkGameOver() {
    if (health <= 0) {
        gameActive = false;
        
        // Update high score
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('highScore', highScore);
        }
        
        // Update game over screen
        const finalScoreText = document.getElementById('finalScore');
        finalScoreText.innerHTML = `
            <div style="font-size: 32px; margin-bottom: 20px;">Game Over!</div>
            <div style="font-size: 24px; margin-bottom: 10px">Final Score: ${score}</div>
            <div style="font-size: 20px; margin-bottom: 20px">High Score: ${highScore}</div>
            <button onclick="resetGame()" style="
                padding: 15px 30px;
                font-size: 20px;
                background: #4CAF50;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                margin-top: 20px;
            ">Play Again</button>
        `;
        
        gameOverScreen.style.display = 'flex';
        gameOverScreen.style.flexDirection = 'column';
        gameOverScreen.style.alignItems = 'center';
        gameOverScreen.style.justifyContent = 'center';
    }
}

// Game loop
function gameLoop() {
    if (!gameActive) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    spawnTarget();
    updateTargets();
    drawTargets();

    requestAnimationFrame(gameLoop);
}

// Event listeners
canvas.addEventListener('click', shoot);
document.addEventListener('keypress', (e) => {
    if (e.key === 'r') reload();
});

startButton.addEventListener('click', () => {
    gameActive = true;
    startButton.style.display = 'none';
    gameLoop();
});

// Initialize game
initializeCamera();
updateHUD();
