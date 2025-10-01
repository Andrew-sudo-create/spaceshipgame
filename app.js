// Core game setup
const gameCanvas = document.getElementById('gameCanvas');
const ctx = gameCanvas.getContext('2d');

// UI elements
const homePanel = document.getElementById('home-panel');
const startButton = document.getElementById('startButton');
const gameOverPanel = document.getElementById('gameOver-panel');
const replayButton = document.getElementById('replayButton');
const pausePanel = document.getElementById('pause-panel');
const resumeButton = document.getElementById('resumeButton');
const pauseButton = document.getElementById('pauseButton');
const currentScoreDisplay = document.getElementById('currentScore');
const finalScoreDisplay = document.getElementById('finalScore');
const highScoreDisplay = document.getElementById('highScoreDisplay');
const gameOverHighScoreDisplay = document.getElementById('gameOverHighScore');

// Game state variables
let gameState = 'home'; // 'home', 'playing', 'paused', 'gameOver'
let score = 0;
let highscore = 0;
let frameCount = 0;
let animationFrameId;

// Physics and game constants
const SpaceThrustPower = 0.2;
const GravityPull = 0.1;
const MaxVerticalVelocity = 8;

// Spaceship object
const Spaceship = {
    x: 100,
    y: gameCanvas.height / 2,
    width: 60,
    height: 40,
    SpaceshipFloatSpeed: 0,
    verticalVelocity: 0,
    isThrusting: false,

    draw() {

        const tailX = this.x - this.width / 2;
        const bodyCenterY = this.y;
        const halfHeight = this.height / 2;


        ctx.fillStyle = '#00cccc';
        ctx.beginPath();

        ctx.moveTo(this.x, bodyCenterY);

        ctx.lineTo(tailX + 15, bodyCenterY - halfHeight);

        ctx.lineTo(tailX, bodyCenterY - halfHeight + 10);
        ctx.lineTo(tailX, bodyCenterY + halfHeight - 10);

        ctx.lineTo(tailX + 15, bodyCenterY + halfHeight);
        ctx.closePath();
        ctx.fill();


        ctx.fillStyle = 'rgba(0, 255, 255, 0.8)'; // Semi-transparent bright cyan
        ctx.beginPath();
        ctx.moveTo(this.x, bodyCenterY);
        ctx.lineTo(this.x - 10, bodyCenterY - 10);
        ctx.lineTo(this.x - 10, bodyCenterY + 10);
        ctx.closePath();
        ctx.fill();


        ctx.fillStyle = '#ff00ff';

        ctx.fillRect(tailX + 25, bodyCenterY - halfHeight + 2, 5, 4);

        ctx.fillRect(tailX + 25, bodyCenterY + halfHeight - 6, 5, 4);


        if (this.isThrusting) {
            const flameLength = Math.random() * 15 + 10;

            ctx.fillStyle = `rgba(255, 165, 0, ${Math.random() * 0.8 + 0.2})`; // Orange/Yellow flame
            ctx.beginPath();
            ctx.moveTo(tailX, bodyCenterY - 8);
            ctx.lineTo(tailX - 5 - flameLength, bodyCenterY); // Tip of the flame
            ctx.lineTo(tailX, bodyCenterY + 8);
            ctx.closePath();
            ctx.fill();
        }
    },

    update() {
        // Apply physics: gravity and thrust
        this.verticalVelocity += GravityPull;
        if (this.isThrusting) {
            this.verticalVelocity -= SpaceThrustPower;
        }

        // Clamp velocity to prevent excessive speed
        this.verticalVelocity = Math.min(Math.max(this.verticalVelocity, -MaxVerticalVelocity), MaxVerticalVelocity);

        // Update position
        this.y += this.verticalVelocity;

        // Boundary checks
        if (this.y < this.height / 2) {
            this.y = this.height / 2;
            this.verticalVelocity = 0;
        }
        if (this.y > gameCanvas.height - this.height / 2) {
            this.y = gameCanvas.height - this.height / 2;
            this.verticalVelocity = 0;
        }
    },

    startThrust() {
        this.isThrusting = true;
    },

    stopThrust() {
        this.isThrusting = false;
    },

    reset() {
        this.y = gameCanvas.height / 2;
        this.verticalVelocity = 0;
        this.isThrusting = false;
    }
};

// Obstacle management
let obstacles = [];
const obstacleSpawnInterval = 120;
const obstacleSpeed = 2;
const minObstacleGap = 150;
const maxObstacleGap = 300;

class Obstacle {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.isPassed = false;
    }

    draw() {
        const neonColor = '#ff00ff';
        const structureColor = '#800080';
        const tipHeight = 15;
        const tipWidthInset = 10;
        const width = this.width;
        const height = this.height;

        ctx.fillStyle = structureColor;
        ctx.fillRect(this.x, this.y, width, height);


        ctx.fillStyle = neonColor;

        ctx.fillRect(this.x + width / 4, this.y, width / 2, height);



        if (this.y === 0) {
            const pointY = this.y + height;
            ctx.fillStyle = neonColor;
            ctx.beginPath();

            ctx.moveTo(this.x, pointY);
            ctx.lineTo(this.x + width, pointY);

            ctx.lineTo(this.x + width - tipWidthInset, pointY - tipHeight);
            ctx.lineTo(this.x + tipWidthInset, pointY - tipHeight);
            ctx.closePath();
            ctx.fill();

        } else {
            const pointY = this.y;
            ctx.fillStyle = neonColor;
            ctx.beginPath();

            ctx.moveTo(this.x, pointY);
            ctx.lineTo(this.x + width, pointY);

            ctx.lineTo(this.x + width - tipWidthInset, pointY + tipHeight);
            ctx.lineTo(this.x + tipWidthInset, pointY + tipHeight);
            ctx.closePath();
            ctx.fill();
        }
    }

    update() {
        this.x -= obstacleSpeed;
    }
}

function generateNewObstaclePair() {
    const gapSize = Math.random() * (maxObstacleGap - minObstacleGap) + minObstacleGap;
    const topHeight = Math.random() * (gameCanvas.height - gapSize - 50) + 25;
    const obstacleWidth = 40;

    const topObstacle = new Obstacle(gameCanvas.width, 0, obstacleWidth, topHeight);
    const bottomObstacle = new Obstacle(gameCanvas.width, topHeight + gapSize, obstacleWidth, gameCanvas.height - (topHeight + gapSize));

    obstacles.push(topObstacle, bottomObstacle);
}

// Collision Detection (AABB)
function checkCollision(ship, obstacle) {

    const shipLeft = ship.x - ship.width / 2;
    const shipRight = ship.x;
    const shipTop = ship.y - ship.height / 2;
    const shipBottom = ship.y + ship.height / 2;

    // Obstacle's bounding box
    const obsLeft = obstacle.x;
    const obsRight = obstacle.x + obstacle.width;
    const obsTop = obstacle.y;
    const obsBottom = obstacle.y + obstacle.height;

    // Check for overlap on all four sides
    if (
        shipRight > obsLeft &&
        shipLeft < obsRight &&
        shipBottom > obsTop &&
        shipTop < obsBottom
    ) {
        return true;
    }
    return false;
}

// Sound Effects
const obstaclePassedSynth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.05, decay: 0.2, sustain: 0.05, release: 0.5 }
}).toDestination();

const collisionSoundSynth = new Tone.Synth({
    oscillator: { type: 'square' },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.2 }
}).toDestination();

function playHornSound() {
    obstaclePassedSynth.triggerAttackRelease('C4', '8n');
}

function playCollisionSound() {
    collisionSoundSynth.triggerAttackRelease('C2', '8n');
}

// Parallax Background "AI-Blind" Feature
// This feature was coded manually from scratch to meet the "AI-Blind" requirement.
// It uses multiple layers of stars with different speeds to create a sense of depth.
let starLayers = [];

function initParallax() {
    starLayers = [];
    const layerSpeeds = [0.5, 1, 1.5, 2];
    const layerDensities = [50, 40, 30, 20];

    layerSpeeds.forEach((speed, index) => {
        const stars = [];
        for (let i = 0; i < layerDensities[index]; i++) {
            stars.push({
                x: Math.random() * gameCanvas.width,
                y: Math.random() * gameCanvas.height,
                radius: Math.random() * 1.5 + 0.5,
                opacity: Math.random() * 0.8 + 0.2
            });
        }
        starLayers.push({ stars, speed });
    });
}

function updateParallax() {
    starLayers.forEach(layer => {
        layer.stars.forEach(star => {
            star.x -= layer.speed;
            if (star.x < 0) {
                star.x = gameCanvas.width;
                star.y = Math.random() * gameCanvas.height;
            }
        });
    });
}

function drawParallax() {
    starLayers.forEach(layer => {
        layer.stars.forEach(star => {
            ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fill();
        });
    });
}

// Game state management
function setGameState(state) {
    gameState = state;
    homePanel.classList.add('hidden');
    gameOverPanel.classList.add('hidden');
    pausePanel.classList.add('hidden');
    pauseButton.classList.add('hidden');
    currentScoreDisplay.parentNode.classList.add('hidden');

    if (state === 'home') {
        homePanel.classList.remove('hidden');
        highScoreDisplay.textContent = highscore;
    } else if (state === 'playing') {
        pauseButton.classList.remove('hidden');
        currentScoreDisplay.parentNode.classList.remove('hidden');
        // Start the game loop
        animationFrameId = requestAnimationFrame(gameLoop);
    } else if (state === 'paused') {
        pausePanel.classList.remove('hidden');
        cancelAnimationFrame(animationFrameId);
    } else if (state === 'gameOver') {
        gameOverPanel.classList.remove('hidden');
        gameOverHighScoreDisplay.textContent = highscore;
    }
}

// Main game loop
function gameLoop() {
    if (gameState !== 'playing') {
        return;
    }

    ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

    updateParallax();
    drawParallax();

    Spaceship.update();
    Spaceship.draw();

    // Obstacle logic
    if (frameCount % obstacleSpawnInterval === 0) {
        generateNewObstaclePair();
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        obstacle.update();
        obstacle.draw();

        // Check if spaceship has passed the obstacle
        if (obstacle.x + obstacle.width < Spaceship.x && !obstacle.isPassed) {
            obstacle.isPassed = true;
            if (i % 2 === 0) { // Only count for the top obstacle of a pair
                score++;
                playHornSound();
                currentScoreDisplay.textContent = score;
            }
        }

        // Check for collision
        if (checkCollision(Spaceship, obstacle)) {
            endGame();
            return;
        }

        // Remove off-screen obstacles to save memory
        if (obstacle.x + obstacle.width < 0) {
            obstacles.splice(i, 1);
        }
    }

    frameCount++;
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Game state functions
function startGame() {
    score = 0;
    frameCount = 0;
    obstacles = [];
    Spaceship.reset();
    currentScoreDisplay.textContent = score;
    setGameState('playing');
}

function endGame() {
    if (score > highscore) {
        highscore = score;
        localStorage.setItem('spaceshipHighscore', highscore);
    }
    finalScoreDisplay.textContent = score;
    setGameState('gameOver');
    playCollisionSound();
}

function togglePause() {
    if (gameState === 'playing') {
        setGameState('paused');
    } else if (gameState === 'paused') {
        setGameState('playing');
    }
}

// Event Listeners
function setupEventListeners() {
    // Spaceship movement controls
    document.addEventListener('keydown', (e) => {
        if (gameState === 'playing') {
            if (e.key === ' ' || e.key === 'ArrowUp') {
                Spaceship.startThrust();
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        if (gameState === 'playing') {
            if (e.key === ' ' || e.key === 'ArrowUp') {
                Spaceship.stopThrust();
            }
        }
        if (e.key === 'p' || e.key === 'P') {
            togglePause();
        }
    });

    // Touch controls
    gameCanvas.addEventListener('touchstart', (e) => {
        if (gameState === 'playing') {
            e.preventDefault();
            Spaceship.startThrust();
        }
    });

    gameCanvas.addEventListener('touchend', (e) => {
        if (gameState === 'playing') {
            e.preventDefault();
            Spaceship.stopThrust();
        }
    });

    // UI button listeners
    startButton.addEventListener('click', startGame);
    replayButton.addEventListener('click', startGame);
    pauseButton.addEventListener('click', togglePause);
    resumeButton.addEventListener('click', togglePause);

    // Initial setup
    window.addEventListener('load', () => {
        // Adjust canvas size
        function resizeCanvas() {
            const container = document.getElementById('game-container');
            gameCanvas.width = container.clientWidth;
            gameCanvas.height = container.clientHeight;
            Spaceship.y = gameCanvas.height / 2; // Reset position on resize
            initParallax();
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        // Load highscore
        const savedHighscore = localStorage.getItem('spaceshipHighscore');
        if (savedHighscore !== null) {
            highscore = parseInt(savedHighscore, 10);
        }
        highScoreDisplay.textContent = highscore;

        // Display the home screen
        setGameState('home');
    });
}

// Initialize the game
setupEventListeners();