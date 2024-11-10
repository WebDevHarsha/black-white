var importThree = import('https://cdn.skypack.dev/three@0.132.2');

// Game state variables
var score = 0;
var timeRemaining = 30;
var gameActive = false;  // Changed to false initially for countdown
var highScore = localStorage.getItem('highScore') || 0;
var timerInterval;
var scene, camera, renderer, light;
var targets = [];
var bullets = [];
var THREE;
var streak = 0;
var multiplier = 1;
var lastHitTime = 0;
var countdownActive = true;

// Sound elements
var sounds = {
    shoot: document.getElementById('shootSound'),
    gameOver: document.getElementById('gameOverSound'),
    newHighScore: document.getElementById('highScoreSound'),
    countdown: document.getElementById('countdownSound')
};
function createBlastEffect(position) {
    var blastGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    var blastMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    
    var particles = [];
    for (var i = 0; i < 30; i++) {
        var particle = new THREE.Mesh(blastGeometry, blastMaterial);
        particle.position.copy(position);
        
        // Give random velocity for the blast
        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        );
        
        scene.add(particle);
        particles.push(particle);
    }
    
    // Animate the particles
    function animateParticles() {
        for (var i = particles.length - 1; i >= 0; i--) {
            particles[i].position.add(particles[i].velocity);
            particles[i].velocity.multiplyScalar(0.95); // Gradually slow down

            if (particles[i].velocity.length() < 0.01) {
                scene.remove(particles[i]);
                particles.splice(i, 1);
            }
        }

        if (particles.length > 0) {
            requestAnimationFrame(animateParticles);
        }
    }

    animateParticles();
}

// Initialize game elements
function initGame() {
    importThree.then(function(threeModule) {
        THREE = threeModule;
        // Scene setup
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0);
        document.body.appendChild(renderer.domElement);

        // Lighting
        light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(10, 10, 10).normalize();
        scene.add(light);

        // Start the full game initialization
        startGameElements();
    });
}

// Initialize camera access
function initCamera() {
    var video = document.getElementById('myVideo');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(function(cameraStream) {
            video.srcObject = cameraStream;
        })
        .catch(function(error) {
            console.error('Error accessing camera:', error.message);
        });
}

// Create UI elements
function createUIElements() {
    // Score display
    var scoreDisplay = document.createElement('div');
    scoreDisplay.id = 'scoreDisplay';
    scoreDisplay.style.position = 'absolute';
    scoreDisplay.style.top = '20px';
    scoreDisplay.style.left = '20px';
    scoreDisplay.style.color = 'white';
    scoreDisplay.style.fontSize = '24px';
    scoreDisplay.style.fontFamily = 'Arial';
    scoreDisplay.style.zIndex = '5';
    document.body.appendChild(scoreDisplay);

    // Timer display
    var timerDisplay = document.createElement('div');
    timerDisplay.id = 'timerDisplay';
    timerDisplay.style.position = 'absolute';
    timerDisplay.style.top = '20px';
    timerDisplay.style.right = '20px';
    timerDisplay.style.color = 'white';
    timerDisplay.style.fontSize = '24px';
    timerDisplay.style.fontFamily = 'Arial';
    timerDisplay.style.zIndex = '5';
    document.body.appendChild(timerDisplay);

    // Multiplier display
    var multiplierDisplay = document.createElement('div');
    multiplierDisplay.id = 'multiplierDisplay';
    multiplierDisplay.style.position = 'absolute';
    multiplierDisplay.style.top = '60px';
    multiplierDisplay.style.left = '20px';
    multiplierDisplay.style.color = '#ffff00';
    multiplierDisplay.style.fontSize = '20px';
    multiplierDisplay.style.fontFamily = 'Arial';
    multiplierDisplay.style.zIndex = '5';
    document.body.appendChild(multiplierDisplay);

    // Countdown display
    var countdownDisplay = document.createElement('div');
    countdownDisplay.id = 'countdownDisplay';
    countdownDisplay.style.position = 'absolute';
    countdownDisplay.style.top = '50%';
    countdownDisplay.style.left = '50%';
    countdownDisplay.style.transform = 'translate(-50%, -50%)';
    countdownDisplay.style.color = 'white';
    countdownDisplay.style.fontSize = '72px';
    countdownDisplay.style.fontFamily = 'Arial';
    countdownDisplay.style.zIndex = '6';
    document.body.appendChild(countdownDisplay);
}

// Create target
function createTarget() {
    var targetGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    var targetMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    var target = new THREE.Mesh(targetGeometry, targetMaterial);
    target.position.x = Math.random() * 10 - 5;
    target.position.y = Math.random() * 5 - 2.5;
    target.position.z = -10 - Math.random() * 10;
    scene.add(target);
    targets.push(target);
}

// Initialize targets
function initTargets() {
    for (var i = 0; i < 5; i++) {
        createTarget();
    }
}

// Handle shooting
function initShooting() {
    var bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    var bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });

    window.addEventListener('click', function(event) {
        if (!gameActive) return;
        
        // Play shooting sound
        sounds.shoot.currentTime = 0;
        sounds.shoot.play().catch(e => console.log('Error playing sound:', e));
        
        var bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        bullet.position.set(camera.position.x, camera.position.y, camera.position.z);
        bullet.velocity = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
        scene.add(bullet);
        bullets.push(bullet);
    }, { passive: true });
}

// Initialize gyroscope
function initGyroscope() {
    if ('Gyroscope' in window) {
        var gyroscope = new Gyroscope({ frequency: 60 });

        gyroscope.addEventListener('reading', function() {
            if (!gameActive) return;
            
            var sensitivity = 0.02;
            var maxRotationSpeed = 0.1;

            camera.rotation.x += Math.min(gyroscope.x * sensitivity, maxRotationSpeed);
            camera.rotation.y += Math.min(gyroscope.y * sensitivity, maxRotationSpeed);
            camera.rotation.z += Math.min(gyroscope.z * sensitivity, maxRotationSpeed);
        });

        gyroscope.start();
    } else {
        alert('Gyroscope not supported on this device/browser.');
    }
}

// Start countdown
function startCountdown() {
    let count = 3;
  sounds.countdown.currentTime = 0;
            sounds.countdown.play().catch(e => console.log('Error playing countdown:', e));
    const countdownDisplay = document.getElementById('countdownDisplay');
    countdownDisplay.style.display = 'block';
    
    function updateCountdown() {
        if (count > 0) {
            countdownDisplay.textContent = count;
            
            count--;
            setTimeout(updateCountdown, 1000);
        } else {
            countdownDisplay.textContent = 'GO!';
            setTimeout(() => {
                countdownDisplay.style.display = 'none';
                gameActive = true;
                countdownActive = false;
                timerInterval = setInterval(updateTimer, 1000);
            }, 1000);
        }
    }
    
    updateCountdown();
}

// Update multiplier
function updateMultiplier() {
    const currentTime = Date.now();
    if (currentTime - lastHitTime < 1500) { // 1.5 seconds window for streak
        streak++;
        if (streak > 2) {
            multiplier = Math.min(4, Math.floor(streak / 2)); // Cap multiplier at 4x
        }
    } else {
        streak = 1;
        multiplier = 1;
    }
    lastHitTime = currentTime;
    
    // Update multiplier display
    const multiplierDisplay = document.getElementById('multiplierDisplay');
    if (multiplier > 1) {
        multiplierDisplay.textContent = `${multiplier}x Multiplier! (${streak} streak)`;
        multiplierDisplay.style.display = 'block';
    } else {
        multiplierDisplay.style.display = 'none';
    }
}

// Update timer
function updateTimer() {
    if (!gameActive) return;
    
    timeRemaining--;
    document.getElementById('timerDisplay').textContent = 'Time: ' + timeRemaining + 's';
    
    if (timeRemaining <= 0) {
        gameActive = false;
        endGame();
    }
}

// End game
function endGame() {
    clearInterval(timerInterval);

   
    
    // Update high score and play sound if new high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
        // Play new high score sound
        sounds.newHighScore.play().catch(e => console.log('Error playing sound:', e));
    }else{
	   sounds.gameOver.play().catch(e => console.log('Error playing sound:', e));
	}
    
    // Show game over container
    var gameOverContainer = document.getElementById('gameOverContainer');
    gameOverContainer.style.display = 'block';
    
    // Update final score and high score
    document.getElementById('finalScore').textContent = 'Final Score: ' + score;
    document.getElementById('highScore').textContent = 'High Score: ' + highScore;
}

// Restart game
function restartGame() {
    // Reset game state
    score = 0;
    timeRemaining = 30;
    gameActive = false;
    streak = 0;
    multiplier = 1;
    countdownActive = true;
    
    // Clear existing targets and bullets
    for (var i = targets.length - 1; i >= 0; i--) {
        scene.remove(targets[i]);
    }
    for (var i = bullets.length - 1; i >= 0; i--) {
        scene.remove(bullets[i]);
    }
    targets = [];
    bullets = [];
    
    // Reset UI
    document.getElementById('gameOverContainer').style.display = 'none';
    document.getElementById('scoreDisplay').textContent = 'Score: 0';
    document.getElementById('timerDisplay').textContent = 'Time: 10s';
    document.getElementById('multiplierDisplay').style.display = 'none';
    
    // Initialize new targets
    initTargets();
    
    // Start countdown
    startCountdown();
}

// Handle window resize
function handleResize() {
    window.addEventListener('resize', function() {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    }, { passive: true });
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    document.getElementById('scoreDisplay').textContent = 'Score: ' + score;

    if (gameActive) {
        // Update bullets
        for (var i = bullets.length - 1; i >= 0; i--) {
            bullets[i].position.add(bullets[i].velocity);
            if (bullets[i].position.z < -50) {
                scene.remove(bullets[i]);
                bullets.splice(i, 1);
            }
        }

        // Check collisions
        for (var i = bullets.length - 1; i >= 0; i--) {
    for (var j = targets.length - 1; j >= 0; j--) {
        var distance = bullets[i].position.distanceTo(targets[j].position);
        if (distance < 0.5) {
            // Create a blast effect at the target's position
            createBlastEffect(targets[j].position);

            scene.remove(targets[j]);
            targets.splice(j, 1);
            scene.remove(bullets[i]);
            bullets.splice(i, 1);

            updateMultiplier();
            score += 100 * multiplier;
            createTarget();
            break;
        }
    }
}

    }

    renderer.render(scene, camera);
}

// Initialize all game elements
function startGameElements() {
    createUIElements();
    initCamera();
    initTargets();
    initShooting();
    initGyroscope();
    handleResize();
    
    // Start countdown instead of immediately starting the game
    startCountdown();
    
    // Start animation loop
    animate();
    
    // Add restart button listener
    document.getElementById('restartButton').addEventListener('click', restartGame);
}

// Start the game when the page loads
initGame();
