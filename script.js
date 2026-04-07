console.log('Game script loaded!');
const FRUITS = [
    { level: 1, radius: 20, color: '#a89bb2' }, // 紫色
    { level: 2, radius: 25, color: '#9cb1c1' }, // 蓝色
    { level: 3, radius: 30, color: '#b5c0a3' }, // 绿色
    { level: 4, radius: 35, color: '#d9cba0' }, // 黄色
    { level: 5, radius: 40, color: '#e0b891' }, // 橙色
    { level: 6, radius: 45, color: '#e0c1c1' }, // 樱花色
    { level: 7, radius: 50, color: '#b59f96' }, // 棕色
    { level: 8, radius: 55, color: '#4f4f4f' }  // 黑色
];

// 物理引擎的模块
const { Engine, Render, World, Bodies, Runner } = Matter;

// 获取DOM元素
const gameContainer = document.getElementById('game-container');
const scoreElement = document.getElementById('score');
const nextFruitPreview = document.getElementById('next-fruit-preview');
const bestScoreElement = document.getElementById('best-score');
const lastScoreElement = document.getElementById('last-score');
const endGameButton = document.getElementById('end-game-button');
const startGameButton = document.getElementById('start-game-button');

let score = 0;
let bestScore = 0;
let lastScore = 0;
let nextFruit = null;

// 从 localStorage 加载分数
function loadScores() {
    bestScore = parseInt(localStorage.getItem('watermelon_best_score') || '0', 10);
    lastScore = parseInt(localStorage.getItem('watermelon_last_score') || '0', 10);
}

// 保存分数到 localStorage
function saveScores(currentScore) {
    lastScore = currentScore;
    if (currentScore > bestScore) {
        bestScore = currentScore;
    }
    localStorage.setItem('watermelon_best_score', bestScore.toString());
    localStorage.setItem('watermelon_last_score', lastScore.toString());
}

// 更新分数显示
function updateScoreDisplay() {
    if (bestScoreElement) {
        bestScoreElement.textContent = bestScore;
    }
    if (lastScoreElement) {
        lastScoreElement.textContent = lastScore;
    }
}

function updateScore(points) {
    score += points;
    scoreElement.textContent = score;
}

// 设置画布尺寸
const worldWidth = 400;
const worldHeight = 600;

// 创建物理引擎实例
const engine = Engine.create();
const world = engine.world;

// 创建渲染器
const render = Render.create({
    element: gameContainer,
    engine: engine,
    options: {
        width: worldWidth,
        height: worldHeight,
        wireframes: false, // 我们想要看到水果的颜色，而不是线框
        background: '#f0f0f0'
    }
});

// 创建边界
const ground = Bodies.rectangle(worldWidth / 2, worldHeight, worldWidth, 20, { isStatic: true });
const leftWall = Bodies.rectangle(0, worldHeight / 2, 20, worldHeight, { isStatic: true });
const rightWall = Bodies.rectangle(worldWidth, worldHeight / 2, 20, worldHeight, { isStatic: true });

// 将边界添加到世界中
World.add(world, [ground, leftWall, rightWall]);

// 运行物理引擎和渲染器
let runner;

// 设置下一个水果
function setNextFruit() {
    const randomLevel = Math.floor(Math.random() * 3);
    nextFruit = FRUITS[randomLevel];

    // 更新预览
    nextFruitPreview.innerHTML = ''; // 清空预览
    const fruitCircle = document.createElement('div');
    fruitCircle.style.width = `${nextFruit.radius * 2}px`;
    fruitCircle.style.height = `${nextFruit.radius * 2}px`;
    fruitCircle.style.backgroundColor = nextFruit.color;
    fruitCircle.style.borderRadius = '50%';
    nextFruitPreview.appendChild(fruitCircle);
}

// 添加水果的函数
function addFruit(x) {
    if (!nextFruit) return;

    const fruit = Bodies.circle(x, 50, nextFruit.radius, {
        render: {
            fillStyle: nextFruit.color
        },
        restitution: 0.5, // 增加一点弹性
        label: 'fruit' // 给水果一个标签，方便后续识别
    });
    World.add(world, fruit);
}

// 监听鼠标点击事件来添加水果
gameContainer.addEventListener('click', function(event) {
    const rect = gameContainer.getBoundingClientRect();
    const x = event.clientX - rect.left;
    addFruit(x);
});

// 监听碰撞事件
Matter.Events.on(engine, 'collisionStart', function(event) {
    const pairs = event.pairs;

    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        // 检查碰撞的是否都是水果
        if (bodyA.label === 'fruit' && bodyB.label === 'fruit') {
            const fruitA = FRUITS.find(f => f.radius === bodyA.circleRadius);
            const fruitB = FRUITS.find(f => f.radius === bodyB.circleRadius);

            // 如果水果等级相同
            if (fruitA && fruitB && fruitA.level === fruitB.level) {
                // 移除原来的水果
                World.remove(world, bodyA);
                World.remove(world, bodyB);

                // 计算新水果的位置
                const newX = (bodyA.position.x + bodyB.position.x) / 2;
                const newY = (bodyA.position.y + bodyB.position.y) / 2;

                // 创建更高级别的水果
                const newLevel = fruitA.level;
                if (newLevel < FRUITS.length) {
                    // 计算得分: 2, 5, 8, 11...
                    const points = 2 + (newLevel - 1) * 3;
                    updateScore(points);

                    const newFruitInfo = FRUITS[newLevel]; // level is 1-based, index is 0-based
                    const newFruit = Bodies.circle(newX, newY, newFruitInfo.radius, {
                        render: {
                            fillStyle: newFruitInfo.color
                        },
                        restitution: 0.5,
                        label: 'fruit'
                    });
                    World.add(world, newFruit);
                }
            }
        }
    }
});

let gameOver = false;
const deathLine = 100; // 死亡线的高度

Matter.Events.on(engine, 'afterUpdate', function() {
    if (gameOver) {
        return;
    }

    const bodies = Matter.Composite.allBodies(world);
    for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        if (body.label === 'fruit' && body.position.y < deathLine) {
            // 检查水果是否在死亡线之上并且几乎没有移动
            if (body.velocity.x < 0.1 && body.velocity.y < 0.1) {
                endGame();
                break;
            }
        }
    }
});

function endGame() {
    if (gameOver) return;
    gameOver = true;
    saveScores(score);
    updateScoreDisplay();
    alert('Game Over!');
    Runner.stop(runner);
    Render.stop(render);
}

if (endGameButton) {
    endGameButton.addEventListener('click', endGame);
}

if (startGameButton) {
    startGameButton.addEventListener('click', startGame);
}

function startGame() {
    // Reset game state
    gameOver = false;
    score = 0;
    scoreElement.textContent = score;

    // Clear existing fruits from the world
    const bodiesToClear = world.bodies.filter(body => body.label === 'fruit');
    World.remove(world, bodiesToClear);

    // Ensure runner is created and running
    if (runner) {
        Runner.stop(runner);
    }
    runner = Runner.create();
    Runner.run(runner, engine);

    // Ensure renderer is running
    Render.run(render);

    // Set the first fruit
    setNextFruit();
}

// 页面加载时调用，加载分数并更新显示
loadScores();
updateScoreDisplay();
startGame();
