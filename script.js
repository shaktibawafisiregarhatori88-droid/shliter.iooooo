const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

// ======================
// MAP BESAR
// ======================
const mapWidth = 3000;
const mapHeight = 2000;

// ======================
// GAME STATE
// ======================
let gameOver = false;
let score = 0;

// ======================
// PLAYER
// ======================
let snake = [];
let initialSnakeLength = 15; // Panjang awal ular

// Inisialisasi snake dengan ukuran awal
for (let i = 0; i < initialSnakeLength; i++) {
    snake.push({ x: mapWidth/2 - i * 2, y: mapHeight/2 });
}

let baseSpeed = 2.5;
let boostSpeed = 4.5;
let speed = baseSpeed;
let isBoosting = false;
let boostActive = true; // Apakah boost masih bisa digunakan
let growAmount = 0;

let dx = baseSpeed;
let dy = 0;

// ======================
// SWALLOWING ANIMATION
// ======================
let swallowingSegments = []; // Segmen yang sedang ditelan

function addSwallowingSegment(segment) {
    swallowingSegments.push({
        segment: segment,
        startProgress: 0,
        progress: 0
    });
}

function updateSwallowing() {
    for (let i = swallowingSegments.length - 1; i >= 0; i--) {
        const swal = swallowingSegments[i];
        swal.progress += 0.08; // Kecepatan animasi
        
        if (swal.progress >= 1) {
            // Animasi selesai, tambahkan ke snake
            snake.push(swal.segment);
            swallowingSegments.splice(i, 1);
        }
    }
}

// ======================
// CAMERA
// ======================
let camera = { x: 0, y: 0, width: canvas.width, height: canvas.height };

// ======================
// MAKANAN
// ======================
let foods = [];
const foodCount = 200;
function spawnFood() {
    foods = [];
    for (let i = 0; i < foodCount; i++) {
        foods.push({ x: Math.random() * mapWidth, y: Math.random() * mapHeight });
    }
}
spawnFood();

// ======================
// MUSUH AI
// ======================
let enemies = [];
const enemyCount = 10;
const enemyColors = ["#1a1a1a", "#ffffff", "#00ff00", "#ffff00", "#0088ff", "#cc00ff", "#ff8800", "#ff0000", "#ff6633"];

function spawnEnemies() {
    enemies = [];
    for (let i = 0; i < enemyCount; i++) {
        // Random ukuran ular musuh antara 5 hingga 30 segment
        const randomSize = Math.floor(Math.random() * 26) + 5; // 5-30
        const startX = Math.random() * mapWidth;
        const startY = Math.random() * mapHeight;
        
        // Buat body dengan ukuran random
        const body = [];
        for (let j = 0; j < randomSize; j++) {
            body.push({ 
                x: startX + j * 2, 
                y: startY 
            });
        }
        
        enemies.push({
            body: body,
            dx: (Math.random() - 0.5) * 4,
            dy: (Math.random() - 0.5) * 4,
            growAmount: 0,
            color: enemyColors[i % enemyColors.length]
        });
    }
}
spawnEnemies();

// ======================
// MOUSE CONTROL
// ======================
canvas.addEventListener("mousemove", function(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left + camera.x;
    const mouseY = e.clientY - rect.top + camera.y;
    const angle = Math.atan2(mouseY - snake[0].y, mouseX - snake[0].x);
    const newDx = Math.cos(angle) * speed;
    const newDy = Math.sin(angle) * speed;
    // Tambah inertia agar pergerakan lebih halus
    dx = dx * 0.7 + newDx * 0.3;
    dy = dy * 0.7 + newDy * 0.3;
});

// ======================
// BOOST
// ======================
document.addEventListener("keydown", e => {
    if (e.code === "Space" && boostActive && snake.length > initialSnakeLength) { 
        isBoosting = true; 
        speed = boostSpeed; 
    }
});
document.addEventListener("keyup", e => {
    if (e.code === "Space") { 
        isBoosting = false; 
        speed = baseSpeed; 
    }
});

// ======================
// PARTIKEL BOOST
// ======================
let boostParticles = [];
function spawnBoostParticles(x, y) {
    for (let i = 0; i < 5; i++) {
        boostParticles.push({
            x: x,
            y: y,
            dx: (Math.random() - 0.5) * 4,
            dy: (Math.random() - 0.5) * 4,
            life: 20 + Math.random() * 10
        });
    }
}
function updateBoostParticles() {
    boostParticles.forEach((p, i) => {
        p.x += p.dx;
        p.y += p.dy;
        p.life--;
        if (p.life <= 0) boostParticles.splice(i, 1);
    });
}

// ======================
// MAP COLLISION
// ======================
function checkMapCollision(obj) {
    const padding = 8;
    return obj.x < padding || obj.x > mapWidth - padding || obj.y < padding || obj.y > mapHeight - padding;
}

// ======================
// UPDATE PLAYER
// ======================
function updatePlayer() {
    if (gameOver) return;

    let head = { x: snake[0].x + dx, y: snake[0].y + dy };
    
    // clamp posisi ular agar tidak keluar dari map
    const padding = 12;
    head.x = Math.max(padding, Math.min(head.x, mapWidth - padding));
    head.y = Math.max(padding, Math.min(head.y, mapHeight - padding));
    
    // jika kepala mencapai batas, tandai game over
    if (head.x === padding || head.x === mapWidth - padding || head.y === padding || head.y === mapHeight - padding) {
        gameOver = true;
        alert("Game Over! Kamu menyentuh batas map!");
        return;
    }
    
    snake.unshift(head);

    if (isBoosting) spawnBoostParticles(head.x, head.y);

    // Cek self-collision: kepala menabrak tubuh sendiri
    // Mulai dari index 10 untuk memberikan ruang untuk gerakan yang smooth
    for (let i = 10; i < snake.length; i++) {
        const dist = Math.hypot(head.x - snake[i].x, head.y - snake[i].y);
        if (dist < 8) { // Kurangi threshold distance agar tidak terlalu sensitif
            gameOver = true;
            alert("Game Over! Kamu menabrak tubuh sendiri!");
            return;
        }
    }

    // Cek collision dengan musuh
    for (let enemy of enemies) {
        for (let i = 0; i < enemy.body.length; i++) {
            const dist = Math.hypot(head.x - enemy.body[i].x, head.y - enemy.body[i].y);
            if (dist < 10) {
                if (snake.length > enemy.body.length) {
                    // Pemain lebih besar, makan musuh
                    for (let seg of enemy.body) {
                        addSwallowingSegment(JSON.parse(JSON.stringify(seg)));
                    }
                    enemies.splice(enemies.indexOf(enemy), 1);
                    spawnEnemies();
                    return;
                } else {
                    // Musuh lebih besar atau sama, game over
                    gameOver = true;
                    alert("Game Over! Dimakan musuh!");
                    return;
                }
            }
        }
    }

    for (let i = foods.length - 1; i >= 0; i--) {
        const dist = Math.hypot(head.x - foods[i].x, head.y - foods[i].y);
        if (dist < 10) {
            foods.splice(i, 1);
            foods.push({ x: Math.random() * mapWidth, y: Math.random() * mapHeight });
            growAmount += 3;
            score += 1;
            boostActive = true; // Aktivkan kembali boost setiap memakan makanan
        }
    }

    if (growAmount > 0) growAmount--;
    else snake.pop();

    // Jika boost aktif, kurangi ukuran ular
    if (isBoosting && snake.length > initialSnakeLength) {
        snake.pop();
    }
    
    // Jika ular sudah kembali ke ukuran awal, boost tidak bisa dipakai
    if (snake.length <= initialSnakeLength) {
        isBoosting = false;
        boostActive = false;
        speed = baseSpeed;
    }

    // update camera
    camera.x = head.x - canvas.width/2;
    camera.y = head.y - canvas.height/2;
    if (camera.x < 0) camera.x = 0;
    if (camera.y < 0) camera.y = 0;
    if (camera.x + canvas.width > mapWidth) camera.x = mapWidth - canvas.width;
    if (camera.y + canvas.height > mapHeight) camera.y = mapHeight - canvas.height;
}

// ======================
// UPDATE ENEMIES
// ======================
function updateEnemies() {
    if (gameOver) return;

    enemies.forEach((enemy, ei) => {
        const head = { x: enemy.body[0].x + enemy.dx, y: enemy.body[0].y + enemy.dy };
        
        // Clamp posisi ular musuh agar tidak keluar dari map
        const padding = 12;
        head.x = Math.max(padding, Math.min(head.x, mapWidth - padding));
        head.y = Math.max(padding, Math.min(head.y, mapHeight - padding));
        
        enemy.body.unshift(head);

        if (enemy.growAmount > 0) enemy.growAmount--;
        else enemy.body.pop();

        if (Math.random() < 0.02) {
            enemy.dx = (Math.random() - 0.5) * 4;
            enemy.dy = (Math.random() - 0.5) * 4;
        }
    });
}

// ======================
// DRAW SNAKE + REALISTIC EYES
// ======================
function drawSnakeAnimated(body, boosting=false, color="lime", showEyes=false) {
    // Palet warna rainbow
    const rainbowColors = [
        "#FF3333", // Merah
        "#FF6699", // Pink
        "#CC66FF", // Ungu muda
        "#6666FF", // Ungu biru
        "#33CCFF", // Cyan
        "#33FF99", // Hijau muda
        "#FFFF33"  // Kuning
    ];

    // gambar garis penghubung antar segmen terlebih dahulu
    ctx.lineWidth = 16;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    // draw body connection dengan gradient warna
    ctx.beginPath();
    ctx.moveTo(body[0].x - camera.x, body[0].y - camera.y);
    for (let i = 1; i < body.length; i++) {
        ctx.lineTo(body[i].x - camera.x, body[i].y - camera.y);
    }
    
    // Stroke dengan gradient
    let strokeGradient = ctx.createLinearGradient(
        body[0].x - camera.x, body[0].y - camera.y,
        body[body.length-1].x - camera.x, body[body.length-1].y - camera.y
    );
    
    for (let i = 0; i < rainbowColors.length; i++) {
        const position = i / (rainbowColors.length - 1);
        strokeGradient.addColorStop(position, rainbowColors[i]);
    }
    
    if (boosting) {
        ctx.strokeStyle = "#ffaa00";
    } else {
        ctx.strokeStyle = strokeGradient;
    }
    ctx.stroke();
    
    for (let i = 0; i < body.length; i++) {
        const part = body[i];
        const screenX = part.x - camera.x;
        const screenY = part.y - camera.y;

        // animasi gelombang tubuh
        let offset = Math.sin(Date.now()/200 + i/2)*2;
        
        // Tentukan warna berdasarkan posisi dalam rainbow
        const colorIndex = (i % rainbowColors.length);
        const segmentColor = rainbowColors[colorIndex];
        
        // gradasi badan dengan warna rainbow
        let gradient = ctx.createRadialGradient(screenX + offset, screenY, 2, screenX + offset, screenY, 9);
        if (boosting) { 
            gradient.addColorStop(0, "#ffff99"); 
            gradient.addColorStop(0.6, "#ffaa00");
            gradient.addColorStop(1, "#ff6600"); 
        } else { 
            gradient.addColorStop(0, segmentColor);
            gradient.addColorStop(0.5, segmentColor);
            gradient.addColorStop(1, adjustBrightness(segmentColor, -30)); 
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenX + offset, screenY, 8, 0, Math.PI*2);
        ctx.fill();

        // Texture kulit ular - scale/sisik
        if (!boosting) {
            // Gambar sisik ular
            for (let scaleX = -1; scaleX <= 1; scaleX++) {
                for (let scaleY = -1; scaleY <= 1; scaleY++) {
                    const sx = screenX + scaleX * 4;
                    const sy = screenY + scaleY * 4;
                    
                    // Warna sisik lebih gelap
                    ctx.fillStyle = adjustBrightness(segmentColor, -20);
                    ctx.beginPath();
                    ctx.ellipse(sx, sy, 2.5, 1.5, Math.PI/4, 0, Math.PI*2);
                    ctx.fill();
                    
                    // Border sisik untuk dimensi
                    ctx.strokeStyle = adjustBrightness(segmentColor, -50);
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }

        // Shadow untuk kedalaman 3D
        let shadowGradient = ctx.createRadialGradient(screenX - 2, screenY - 2, 0, screenX, screenY, 8);
        shadowGradient.addColorStop(0, "rgba(0, 0, 0, 0.1)");
        shadowGradient.addColorStop(1, "rgba(0, 0, 0, 0.4)");
        ctx.fillStyle = shadowGradient;
        ctx.beginPath();
        ctx.arc(screenX + offset, screenY, 8, 0, Math.PI*2);
        ctx.fill();

        // outline untuk tubuh agar terlihat lebih bagus
        ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Highlight glossy di atas segmen
        if (i % 2 === 0) {
            let glossGradient = ctx.createRadialGradient(screenX - 4, screenY - 4, 0, screenX - 4, screenY - 4, 3);
            glossGradient.addColorStop(0, "rgba(255, 255, 255, 0.5)");
            glossGradient.addColorStop(0.6, "rgba(255, 255, 255, 0.15)");
            glossGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
            ctx.fillStyle = glossGradient;
            ctx.beginPath();
            ctx.arc(screenX - 4, screenY - 4, 3, 0, Math.PI*2);
            ctx.fill();
        }

        // Pola stripe pada beberapa segment
        if (i % 4 === 0 && !boosting) {
            ctx.strokeStyle = `rgba(0, 0, 0, 0.15)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(screenX + offset, screenY, 7, 0, Math.PI*2);
            ctx.stroke();
        }

        // Mata terintegrasi dengan kepala - hanya untuk segment pertama
        if (showEyes && i===0) {
            const head = body[0];
            const headScreenX = head.x - camera.x;
            const headScreenY = head.y - camera.y;
            const angle = Math.atan2(dy, dx);
            
            // Hitung skala berdasarkan panjang ular (adaptif)
            const normalLength = 30;
            const scale = Math.max(0.4, Math.min(1, body.length / normalLength));
            
            const eyeDist = 5 * scale;
            const eyeRadius = 4 * scale;
            const pupilRadius = 2.2 * scale;
            const tongueScale = 2.5 * scale;
            const mouthRadius = 2.5 * scale;
            const tongueX_offset = 10 * scale;
            const mouthX_offset = 5 * scale;

            // posisi mata kiri dan kanan lebih dekat ke badan
            const leftEyeX = headScreenX + Math.cos(angle + Math.PI/2) * eyeDist;
            const leftEyeY = headScreenY + Math.sin(angle + Math.PI/2) * eyeDist;
            const rightEyeX = headScreenX + Math.cos(angle - Math.PI/2) * eyeDist;
            const rightEyeY = headScreenY + Math.sin(angle - Math.PI/2) * eyeDist;

            // Fungsi untuk menggambar mata yang lebih sederhana dan lucu
            const drawCuteEye = (eyeX, eyeY) => {
                // Mata putih lebih besar dan lebih menonjol
                ctx.fillStyle = "rgba(255, 255, 255, 1)";
                ctx.beginPath();
                ctx.arc(eyeX, eyeY, eyeRadius * 1.2, 0, Math.PI*2);
                ctx.fill();
                
                // Border putih untuk kedalaman
                ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
                ctx.lineWidth = Math.max(0.5, 0.8 * scale);
                ctx.stroke();

                // Pupil hitam yang besar dan expressive
                ctx.fillStyle = "#000000";
                ctx.beginPath();
                ctx.arc(eyeX, eyeY, pupilRadius * 1.1, 0, Math.PI*2);
                ctx.fill();

                // Glare besar di pupil untuk mata yang berbinar
                ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
                ctx.beginPath();
                ctx.arc(eyeX - 0.8 * scale, eyeY - 0.8 * scale, 1.2 * scale, 0, Math.PI*2);
                ctx.fill();
            };

            drawCuteEye(leftEyeX, leftEyeY);
            drawCuteEye(rightEyeX, rightEyeY);

            // Lidah lucu kecil di depan kepala
            const tongueX = headScreenX + Math.cos(angle) * tongueX_offset;
            const tongueY = headScreenY + Math.sin(angle) * tongueX_offset;
            ctx.fillStyle = "rgba(255, 100, 150, 0.8)";
            ctx.beginPath();
            ctx.ellipse(tongueX, tongueY, tongueScale, tongueScale * 0.5, angle, 0, Math.PI*2);
            ctx.fill();

            // Mulut sederhana lucu
            ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
            ctx.lineWidth = Math.max(0.5, 0.8 * scale);
            ctx.beginPath();
            const mouthX = headScreenX + Math.cos(angle) * mouthX_offset;
            const mouthY = headScreenY + Math.sin(angle) * mouthX_offset;
            ctx.arc(mouthX, mouthY, mouthRadius, 0, Math.PI);
            ctx.stroke();
        }
    }
}

// Helper function untuk menyesuaikan brightness warna hex
function adjustBrightness(hexColor, percent) {
    const num = parseInt(hexColor.replace("#",""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
    return "#" + (0x1000000 + R*0x10000 + G*0x100 + B).toString(16).substring(1);
}

// ======================
// DRAW SWALLOWING ANIMATION
// ======================
function renderSwallowingSegments() {
    swallowingSegments.forEach(swal => {
        const segment = swal.segment;
        const progress = swal.progress;
        
        // Posisi kepala ular pemain (target)
        const targetX = snake[snake.length - 1].x;
        const targetY = snake[snake.length - 1].y;
        
        // Interpolasi posisi dari segment awal ke posisi target
        const currentX = segment.x + (targetX - segment.x) * progress;
        const currentY = segment.y + (targetY - segment.y) * progress;
        
        // Ukuran mengecil saat ditelan
        const scale = 1 - (progress * 0.3);
        const radius = 8 * scale;
        
        // Alpha transparency meningkat (semakin terang) saat masuk
        const alpha = Math.min(1, 0.3 + progress * 0.7);
        
        // Animasi rotasi
        const rotation = progress * Math.PI * 2;
        
        const screenX = currentX - camera.x;
        const screenY = currentY - camera.y;
        
        // Gambar segmen yang sedang ditelan
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(rotation);
        
        // Gradient untuk efek "menelan"
        let swallowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        swallowGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        swallowGradient.addColorStop(0.5, `rgba(150, 200, 255, ${alpha})`);
        swallowGradient.addColorStop(1, `rgba(100, 150, 255, ${alpha * 0.7})`);
        
        ctx.fillStyle = swallowGradient;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Efek blur/gelap di tengah untuk efek diserap
        ctx.fillStyle = `rgba(0, 0, 0, ${progress * 0.3})`;
        ctx.beginPath();
        ctx.arc(0, 0, radius * progress, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    });
}

// ======================
// DRAW BOOST PARTICLES
// ======================
function drawBoostParticles() {
    ctx.fillStyle = "yellow";
    boostParticles.forEach(p => {
        ctx.globalAlpha = p.life/30;
        ctx.beginPath();
        ctx.arc(p.x - camera.x, p.y - camera.y, 3, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1;
    });
}

// ======================
// DRAW
// ======================
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // background gradient
    let bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGradient.addColorStop(0, "#1a1a2e");
    bgGradient.addColorStop(0.5, "#16213e");
    bgGradient.addColorStop(1, "#0f3460");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // grid pattern untuk map
    ctx.strokeStyle = "rgba(100, 150, 200, 0.1)";
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = -camera.x; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = -camera.y; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // map border dengan gradient
    let borderGradient = ctx.createLinearGradient(-camera.x, -camera.y, -camera.x + mapWidth, -camera.y + mapHeight);
    borderGradient.addColorStop(0, "#00ff88");
    borderGradient.addColorStop(0.5, "#00ccff");
    borderGradient.addColorStop(1, "#0088ff");
    ctx.strokeStyle = borderGradient;
    ctx.lineWidth = 6;
    ctx.shadowColor = "rgba(0, 255, 136, 0.8)";
    ctx.shadowBlur = 15;
    ctx.strokeRect(-camera.x, -camera.y, mapWidth, mapHeight);
    ctx.shadowColor = "transparent";

    // makanan dengan efek glowing
    foods.forEach(food => {
        const fx = food.x - camera.x;
        const fy = food.y - camera.y;
        if (fx > -10 && fx < canvas.width+10 && fy > -10 && fy < canvas.height+10) {
            // glow effect
            ctx.shadowColor = "rgba(255, 150, 0, 0.8)";
            ctx.shadowBlur = 10;
            
            // gradient untuk makanan
            let foodGradient = ctx.createRadialGradient(fx, fy, 0, fx, fy, 5);
            foodGradient.addColorStop(0, "#ffaa00");
            foodGradient.addColorStop(1, "#ff6600");
            ctx.fillStyle = foodGradient;
            ctx.beginPath();
            ctx.arc(fx, fy, 5, 0, Math.PI*2);
            ctx.fill();
            
            ctx.shadowColor = "transparent";
        }
    });

    // player
    drawSnakeAnimated(snake, isBoosting, "lime", true);

    // musuh
    enemies.forEach(enemy => {
        drawSnakeAnimated(enemy.body, false, enemy.color, false);
    });

    // Efek animasi menelan
    renderSwallowingSegments();

    drawBoostParticles();
    updateBoostParticles();

    // score
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Score: "+score, 10, 25);
    
    // tampilkan status boost
    ctx.fillStyle = boostActive ? "#ffaa00" : "#888888";
    ctx.font = "16px Arial";
    const boostStatus = boostActive ? `Boost Available (Length: ${snake.length}/${initialSnakeLength + 30})` : `Boost Unavailable (Length: ${snake.length})`;
    ctx.fillText(boostStatus, 10, 50);
}

// ======================
// GAME LOOP
// ======================
function gameLoop() {
    if (!gameOver) {
        updatePlayer();
        updateEnemies();
        updateSwallowing();
        draw();
        requestAnimationFrame(gameLoop);
    }
}


gameLoop();