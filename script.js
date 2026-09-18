// ==========================================
// ADAPTIVE PATH PLANNING SIMULATION
// ==========================================

const car = document.getElementById("car");
const animal = document.querySelector(".animal");

const speedDisplay = document.getElementById("speed");
const objectsDisplay = document.getElementById("objects");
const riskDisplay = document.getElementById("risk");
const planningDisplay = document.getElementById("planning");
const replanningDisplay = document.getElementById("replanning");

const safePath = document.getElementById("safePath");
const road = document.getElementById("road");

const buttons = document.querySelectorAll(".controls button");

// ==========================================
// VARIABLES
// ==========================================

let currentScenario = "Village Road";

let carLane = 25;
let targetLane = 25;

let carTravel = 0;
const carSpeed = 0.15;

let replanningCount = 0;

let avoiding = false;
let waiting = false;
let obstacleHandled = false;

let lastTime = performance.now();


// ==========================================
// SCENARIOS
// ==========================================

const scenarios = {

    "Village Road": {
        objects: 2,
        speed: "25 km/h",
        animalTop: 280,
        animalLeft: 42,
        animalSpeed: 0
    },

    "Urban Intersection": {
        objects: 5,
        speed: "20 km/h",
        animalTop: 200,
        animalLeft: 10,
        animalSpeed: 0.05
    },

    "Highway Merge": {
        objects: 4,
        speed: "60 km/h",
        animalTop: 300,
        animalLeft: 60,
        animalSpeed: -0.04
    },

    "Market Area": {
        objects: 8,
        speed: "15 km/h",
        animalTop: 250,
        animalLeft: 5,
        animalSpeed: 0.06
    },

    "Sudden Cattle Crossing": {
        objects: 3,
        speed: "30 km/h",
        animalTop: 300,
        animalLeft: 5,
        animalSpeed: 0.08
    }
};


// ==========================================
// SELECT SCENARIO
// ==========================================

function selectScenario(name) {

    currentScenario = name;

    const scenario = scenarios[name];

    speedDisplay.textContent = scenario.speed;
    objectsDisplay.textContent = scenario.objects;

    replanningCount = 0;

    carLane = 25;
    targetLane = 25;
    carTravel = 0;

    avoiding = false;
    waiting = false;
    obstacleHandled = false;

    car.style.left = "25%";
    car.style.bottom = "40px";
    car.style.transform = "translateY(0)";

    safePath.style.left = "25%";

    animal.style.top = scenario.animalTop + "px";
    animal.style.left = scenario.animalLeft + "%";

    riskDisplay.textContent = "LOW";
    riskDisplay.style.color = "green";

    planningDisplay.textContent = "ACTIVE";

    replanningDisplay.textContent = "0";
}


// ==========================================
// BUTTONS
// ==========================================

buttons.forEach(function(button) {

    button.addEventListener("click", function() {

        selectScenario(button.textContent.trim());

    });

});


// ==========================================
// GET OBSTACLE POSITION
// ==========================================

function getObstacleInfo(obstacle) {

    const carRect = car.getBoundingClientRect();
    const obstacleRect = obstacle.getBoundingClientRect();

    const carCenterX =
        carRect.left + carRect.width / 2;

    const obstacleCenterX =
        obstacleRect.left + obstacleRect.width / 2;

    // Positive means obstacle is ahead
    const distanceAhead =
        carRect.top - obstacleRect.bottom;

    const horizontalDistance =
        Math.abs(carCenterX - obstacleCenterX);

    return {
        distance: distanceAhead,
        horizontal: horizontalDistance
    };
}


// ==========================================
// CHECK OBSTACLE AHEAD
// ==========================================

function obstacleAhead() {

    const obstacles =
        document.querySelectorAll(".obstacle");

    let closest = null;
    let closestDistance = Infinity;

    obstacles.forEach(function(obstacle) {

        const info = getObstacleInfo(obstacle);

        if (
            info.distance > -20 &&
            info.distance < 220 &&
            info.horizontal < 70
        ) {

            if (info.distance < closestDistance) {

                closestDistance = info.distance;
                closest = obstacle;
            }
        }
    });

    return {
        obstacle: closest,
        distance: closestDistance
    };
}


// ==========================================
// CHECK SAFE LANE
// ==========================================

function laneIsSafe(lane) {

    const roadRect =
        road.getBoundingClientRect();

    const laneX =
        roadRect.left +
        roadRect.width * (lane / 100);

    const obstacles =
        document.querySelectorAll(".obstacle");

    for (const obstacle of obstacles) {

        const rect =
            obstacle.getBoundingClientRect();

        const obstacleX =
            rect.left + rect.width / 2;

        const verticalDistance =
            car.getBoundingClientRect().top -
            rect.bottom;

        if (
            verticalDistance > -30 &&
            verticalDistance < 230 &&
            Math.abs(laneX - obstacleX) < 65
        ) {

            return false;
        }
    }

    return true;
}


// ==========================================
// FIND SAFE LANE
// ==========================================

function findSafeLane() {

    if (laneIsSafe(15)) {
        return 15;
    }

    if (laneIsSafe(55)) {
        return 55;
    }

    return null;
}


// ==========================================
// REPLAN ONCE
// ==========================================

function replan() {

    // Don't repeatedly replan the same obstacle
    if (obstacleHandled) {
        return;
    }

    const safeLane = findSafeLane();

    if (safeLane === null) {

        waiting = true;

        planningDisplay.textContent = "WAITING";

        return;
    }

    obstacleHandled = true;
    avoiding = true;
    waiting = false;

    targetLane = safeLane;

    replanningCount++;

    replanningDisplay.textContent =
        replanningCount;

    safePath.style.left =
        targetLane + "%";

    car.style.left =
        targetLane + "%";

    carLane = targetLane;

    planningDisplay.textContent =
        "REPLANNING";
}


// ==========================================
// UPDATE RISK
// ==========================================

function updateRisk() {

    const result = obstacleAhead();

    if (result.obstacle === null) {

        riskDisplay.textContent = "LOW";
        riskDisplay.style.color = "green";

        if (!avoiding && !waiting) {

            planningDisplay.textContent =
                "ACTIVE";
        }

        return;
    }

    const distance = result.distance;

    if (distance < 65) {

        riskDisplay.textContent = "HIGH";
        riskDisplay.style.color = "red";

        replan();

    }

    else if (distance < 160) {

        riskDisplay.textContent = "MEDIUM";
        riskDisplay.style.color = "orange";

        if (!avoiding && !waiting) {

            planningDisplay.textContent =
                "CAUTION";
        }

    }

    else {

        riskDisplay.textContent = "LOW";
        riskDisplay.style.color = "green";
    }
}


// ==========================================
// MOVE CATTLE
// ==========================================

function moveAnimal() {

    const scenario =
        scenarios[currentScenario];

    if (scenario.animalSpeed === 0) {
        return;
    }

    let left =
        parseFloat(animal.style.left);

    left += scenario.animalSpeed;

    if (left >= 85) {
        left = 5;
    }

    if (left <= 5) {
        left = 5;
    }

    animal.style.left =
        left + "%";
}


// ==========================================
// RETURN TO ORIGINAL LANE
// ==========================================

function checkReturnToLane() {

    if (!avoiding) {
        return;
    }

    const result = obstacleAhead();

    // Once obstacle is behind us
    if (
        result.obstacle === null ||
        result.distance < -80
    ) {

        avoiding = false;
        obstacleHandled = false;

        targetLane = 25;
        carLane = 25;

        car.style.left = "25%";
        safePath.style.left = "25%";

        planningDisplay.textContent =
            "ACTIVE";
    }
}


// ==========================================
// MAIN ANIMATION
// ==========================================

function animate(time) {

    const delta =
        Math.min(time - lastTime, 40);

    lastTime = time;

    // Move animal only when required
    moveAnimal();

    // Move car using TRANSFORM
    // This prevents the entire road from repainting
    if (!waiting) {

        carTravel +=
            carSpeed * (delta / 16.67);

        const roadHeight =
            road.clientHeight;

        if (carTravel > roadHeight - 80) {

            carTravel = 0;

            avoiding = false;
            waiting = false;
            obstacleHandled = false;

            carLane = 25;
            targetLane = 25;

            car.style.left = "25%";
            safePath.style.left = "25%";

            planningDisplay.textContent =
                "ACTIVE";

            riskDisplay.textContent =
                "LOW";

            riskDisplay.style.color =
                "green";
        }

        car.style.transform =
            "translateY(-" +
            carTravel +
            "px)";
    }

    updateRisk();

    checkReturnToLane();

    requestAnimationFrame(animate);
}


// ==========================================
// INITIALIZE
// ==========================================

selectScenario("Village Road");

console.log(
    "Adaptive Path Planning Simulation Started"
);

requestAnimationFrame(animate);
