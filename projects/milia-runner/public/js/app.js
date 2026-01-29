const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreElement = document.getElementById('final-score');

canvas.width = 800;
canvas.height = 400;

// Game State
let isGameRunning = false;
let score = 0;
let gameSpeed = 5;
let obstacles = [];
let particles = [];
let frameCount = 0;

// Milia (The Player)
const milia = {
    x: 80,
    y: 300,
    width: 40,
    height: 60,
    color: '#ff2d55',
    velocityY: 0,
    gravity: 0.8,
    jumpStrength: -15,
    isJumping: false,
    draw() {
        // Draw Cyber Body
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Face/Eyes
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x + 25, this.y + 10, 10, 5);
        
        // Glowing lines
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
    },
    jump() {
        if (!this.isJumping) {
            this.velocityY = this.jumpStrength;
            this.isJumping = true;
            createParticles(this.x + this.width/2, this.y + this.height, this.color);
        }
    },
    update() {
        this.velocityY += this.gravity;
        this.y += this.velocityY;

        if (this.y > 300) {
            this.y = 300;
            this.velocityY = 0;
            this.isJumping = false;
        }
    }
};

class Obstacle {
    constructor() {
        this.width = 30 + Math.random() * 30;
        this.height = 40 + Math.random() * 40;
        this.x = canvas.width;
        this.y = 360 - this.height;
        this.color = '#007aff';
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
    }
    update() {
        this.x -= gameSpeed;
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 5 + 2;
        this.speedX = (Math.random() - 0.5) * 10;
        this.speedY = (Math.random() - 0.5) * 10;
        this.life = 1.0;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 0.02;
    }
    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

function createParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function spawnObstacle() {
    if (frameCount % 100 === 0) {
        obstacles.push(new Obstacle());
    }
}

function handleCollisions() {
    obstacles.forEach(obs => {
        if (
            milia.x < obs.x + obs.width &&
            milia.x + milia.width > obs.x &&
            milia.y < obs.y + obs.height &&
            milia.y + milia.height > obs.y
        ) {
            gameOver();
        }
    });
}

function drawBackground() {
    // Floor
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 360);
    ctx.lineTo(canvas.width, 360);
    ctx.stroke();

    // Grid lines
    for (let i = 0; i < canvas.width; i += 50) {
        let x = (i - (frameCount * gameSpeed) % 50);
        ctx.beginPath();
        ctx.moveTo(x, 360);
        ctx.lineTo(x - 100, canvas.height);
        ctx.stroke();
    }
}

function update() {
    if (!isGameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frameCount++;
    
    drawBackground();
    
    milia.update();
    milia.draw();

    spawnObstacle();
    
    obstacles.forEach((obs, index) => {
        obs.update();
        obs.draw();
        if (obs.x + obs.width < 0) {
            obstacles.splice(index, 1);
            score++;
            scoreElement.innerText = score;
            if (score % 10 === 0) gameSpeed += 0.2;
        }
    });

    particles.forEach((p, index) => {
        p.update();
        p.draw();
        if (p.life <= 0) particles.splice(index, 1);
    });

    handleCollisions();
    requestAnimationFrame(update);
}

function startGame() {
    isGameRunning = true;
    score = 0;
    gameSpeed = 5;
    obstacles = [];
    particles = [];
    frameCount = 0;
    scoreElement.innerText = '0';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    update();
}

function gameOver() {
    isGameRunning = false;
    gameOverScreen.classList.remove('hidden');
    finalScoreElement.innerText = score;
}

document.getElementById('start-button').onclick = startGame;
document.getElementById('restart-button').onclick = startGame;

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (isGameRunning) {
            milia.jump();
        } else if (startScreen.classList.contains('hidden')) {
            startGame();
        }
    }
});

canvas.addEventListener('mousedown', () => {
    if (isGameRunning) milia.jump();
});
