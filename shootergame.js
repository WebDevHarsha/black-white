	 let score = 0;
        let timeLeft = 60;
        let gameInterval;
        let timerInterval;

        function createHitEffect(x, y) {
            const effect = document.createElement('div');
            effect.className = 'hit-effect';
            effect.style.left = x + 'px';
            effect.style.top = y + 'px';
            document.getElementById('gameContainer').appendChild(effect);
            setTimeout(() => effect.remove(), 600);
        }

        function moveTarget() {
            const target = document.getElementById('target');
            const container = document.getElementById('gameContainer');
            const maxX = container.clientWidth - 40;
            const maxY = container.clientHeight - 40;
            
            const newX = Math.random() * maxX;
            const newY = Math.random() * maxY;
            
            target.style.left = newX + 'px';
            target.style.top = newY + 'px';
            target.style.transform = 'scale(1)';
            target.style.opacity = '1';
            target.classList.remove('hit');
        }

        function updateScore() {
            document.getElementById('score').textContent = score;
        }

        function updateTimer() {
            document.getElementById('timer').textContent = timeLeft;
        }

        function endGame() {
            clearInterval(gameInterval);
            clearInterval(timerInterval);
            document.getElementById('gameOver').style.display = 'block';
            document.getElementById('finalScore').textContent = score;
            document.getElementById('target').style.display = 'none';
        }

        function restartGame() {
            score = 0;
            timeLeft = 60;
            updateScore();
            updateTimer();
            document.getElementById('gameOver').style.display = 'none';
            document.getElementById('target').style.display = 'block';
            startGame();
        }

        function startGame() {
            moveTarget();
            gameInterval = setInterval(moveTarget, 2000);
            
            timerInterval = setInterval(() => {
                timeLeft--;
                updateTimer();
                if (timeLeft <= 0) {
                    endGame();
                }
            }, 1000);
        }

        document.getElementById('target').addEventListener('click', function(e) {
            createHitEffect(e.clientX, e.clientY);
            this.classList.add('hit');
            score++;
            updateScore();
            setTimeout(moveTarget, 300);
        });

        startGame();
