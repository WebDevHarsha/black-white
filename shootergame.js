// Game state
let gameActive = false;
let score = 0;
let health = 100;
let ammo = 30;
let targets = [];
let lastShot = 0;
let reloading = false;
let videoStream = null;

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('videoElement');
const startButton = document.getElementById('startButton');
const gameOverScreen = document.getElementById('gameOver');
const flash = document.querySelector('.flash');
const restartButton = document.getElementById('restartButton');
const quitButton = document.getElementById('quitButton');

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
        videoStream = stream;
    } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Camera access is required to play this game!");
    }
}

// Stop camera and clear game state
function stopGame() {
    gameActive = false;
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
    video.srcObject = null;
    targets = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    gameOverScreen.style.display = 'none';
    window.close(); // Note: This may not work in all browsers due to security restrictions
}

// Reset game state
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

function checkGameOver() {
    if (health <= 0) {
        gameActive = false;
        document.getElementById('finalScore').textContent = `Final Score: ${score}`;
        gameOverScreen.style.display = 'block';
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

restartButton.addEventListener('click', resetGame);
quitButton.addEventListener('click', stopGame);

// Initialize game
initializeCamera();
updateHUD();
