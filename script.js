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

let carPosition = 25;
let carSpeed = 0.15;

let replanningCount = 0;
let currentScenario = "Village Road";

let avoiding = false;
let waiting = false;
let currentObstacle = null;

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

        // IMPORTANT:
        // cattle starts on left and crosses the car's lane
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

    avoiding = false;
    waiting = false;
    currentObstacle = null;

    carPosition = 25;

    car.style.left = "25%";
    car.style.bottom = "40px";

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

buttons.forEach(button => {

    button.addEventListener("click", () => {

        selectScenario(button.textContent.trim());

    });

});

// ==========================================
// GET POSITION
// ==========================================

function getPosition(element) {

    const carRect = car.getBoundingClientRect();
    const objectRect = element.getBoundingClientRect();

    // Positive = obstacle is ahead of car
    const distanceAhead =
        carRect.top - objectRect.bottom;

    const horizontalDistance =
        Math.abs(
            (carRect.left + carRect.width / 2) -
            (objectRect.left + objectRect.width / 2)
        );

    return {
        vertical: distanceAhead,
        horizontal: horizontalDistance
    };
}

// ==========================================
// IS OBSTACLE IN CAR PATH?
// ==========================================

function isInPath(element) {

    const carRect = car.getBoundingClientRect();
    const objectRect = element.getBoundingClientRect();

    const verticalGap =
        carRect.top - objectRect.bottom;

    const carCenter =
        carRect.left + carRect.width / 2;

    const objectLeft =
        objectRect.left;

    const objectRight =
        objectRect.right;

    const horizontalOverlap =
        carCenter > objectLeft - 25 &&
        carCenter < objectRight + 25;

    return (
        verticalGap > -20 &&
        verticalGap < 220 &&
        horizontalOverlap
    );
}

// ==========================================
// CHECK WHETHER A LANE IS SAFE
// ==========================================

function laneIsSafe(targetPercent) {

    const roadRect = road.getBoundingClientRect();

    const targetX =
        roadRect.left +
        roadRect.width * (targetPercent / 100);

    const obstacles =
        document.querySelectorAll(".obstacle");

    for (const obstacle of obstacles) {

        const rect = obstacle.getBoundingClientRect();

        const obstacleCenter =
            rect.left + rect.width / 2;

        const verticalGap =
            car.getBoundingClientRect().top -
            rect.bottom;

        if (
            verticalGap > -50 &&
            verticalGap < 250 &&
            Math.abs(targetX - obstacleCenter) < 65
        ) {

            return false;
        }
    }

    return true;
}

// ==========================================
// FIND SAFE SIDE
// ==========================================

function findSafeSide() {

    // Try LEFT
    if (laneIsSafe(15)) {
        return 15;
    }

    // Try RIGHT
    if (laneIsSafe(55)) {
        return 55;
    }

    // Nothing safe
    return null;
}

// ==========================================
// START REPLANNING
// ==========================================

function startReplanning() {

    // VERY IMPORTANT:
    // prevents blinking/replanning repeatedly
    if (avoiding || waiting) {
        return;
    }

    const safeSide = findSafeSide();

    if (safeSide === null) {

        waiting = true;

        planningDisplay.textContent = "WAITING";

        return;
    }

    avoiding = true;

    replanningCount++;

    replanningDisplay.textContent =
        replanningCount;

    carPosition = safeSide;

    safePath.style.left =
        safeSide + "%";

    car.style.left =
        safeSide + "%";

    planningDisplay.textContent =
        "REPLANNING";
}

// ==========================================
// UPDATE RISK
// ==========================================

function updateRisk() {

    const obstacles =
        document.querySelectorAll(".obstacle");

    let dangerFound = false;
    let closestDistance = Infinity;
    let closestObstacle = null;

    for (const obstacle of obstacles) {

        const pos = getPosition(obstacle);

        if (
            pos.vertical > -30 &&
            pos.vertical < 220 &&
            pos.horizontal < 70
        ) {

            dangerFound = true;

            if (pos.vertical < closestDistance) {

                closestDistance = pos.vertical;
                closestObstacle = obstacle;
            }
        }
    }

    currentObstacle = closestObstacle;

    if (!dangerFound) {

        riskDisplay.textContent = "LOW";
        riskDisplay.style.color = "green";

        if (!avoiding && !waiting) {
            planningDisplay.textContent = "ACTIVE";
        }

        return;
    }

    // HIGH
    if (closestDistance < 65) {

        riskDisplay.textContent = "HIGH";
        riskDisplay.style.color = "red";

        startReplanning();

        return;
    }

    // MEDIUM
    if (closestDistance < 160) {

        riskDisplay.textContent = "MEDIUM";
        riskDisplay.style.color = "orange";

        if (!avoiding && !waiting) {
            planningDisplay.textContent = "CAUTION";
        }

        return;
    }

    // LOW
    riskDisplay.textContent = "LOW";
    riskDisplay.style.color = "green";
}

// ==========================================
// MOVE CATTLE / OBSTACLE
// ==========================================

function moveObstacles() {

    const scenario =
        scenarios[currentScenario];

    let left =
        parseFloat(
            animal.style.left || scenario.animalLeft
        );

    // Only selected moving scenarios
    if (scenario.animalSpeed !== 0) {

        left += scenario.animalSpeed;

        // Reset after crossing
        if (left > 85) {
            left = 5;
        }

        if (left < 5) {
            left = 85;
        }

        animal.style.left = left + "%";
    }
}

// ==========================================
// RETURN TO ORIGINAL LANE
// ==========================================

function returnToOriginalLane() {

    if (!avoiding) {
        return;
    }

    const obstacles =
        document.querySelectorAll(".obstacle");

    let obstacleStillNear = false;

    for (const obstacle of obstacles) {

        const pos = getPosition(obstacle);

        if (
            pos.vertical > -120 &&
            pos.vertical < 120 &&
            pos.horizontal < 80
        ) {

            obstacleStillNear = true;
            break;
        }
    }

    if (!obstacleStillNear) {

        avoiding = false;

        carPosition = 25;

        car.style.left = "25%";

        safePath.style.left = "25%";

        planningDisplay.textContent =
            "ACTIVE";
    }
}

// ==========================================
// RELEASE WAITING STATE
// ==========================================

function checkWaiting() {

    if (!waiting) {
        return;
    }

    const safeSide = findSafeSide();

    if (safeSide !== null) {

        waiting = false;

        replanningCount++;

        replanningDisplay.textContent =
            replanningCount;

        avoiding = true;

        carPosition = safeSide;

        car.style.left =
            safeSide + "%";

        safePath.style.left =
            safeSide + "%";

        planningDisplay.textContent =
            "REPLANNING";
    }
}

// ==========================================
// MOVE VEHICLE
// ==========================================

function moveVehicle(time) {

    const delta =
        time - lastTime;

    lastTime = time;

    // Move obstacles
    moveObstacles();

    // If both sides blocked, stop
    if (!waiting) {

        let bottom =
            parseFloat(
                window.getComputedStyle(car).bottom
            );

        // ORIGINAL SPEED FEEL
        bottom += carSpeed * (delta / 16.67);

        if (bottom > road.clientHeight) {

            bottom = 40;

            avoiding = false;
            waiting = false;

            carPosition = 25;

            car.style.left = "25%";
            safePath.style.left = "25%";

            planningDisplay.textContent =
                "ACTIVE";

            riskDisplay.textContent =
                "LOW";

            riskDisplay.style.color =
                "green";
        }

        car.style.bottom =
            bottom + "px";
    }

    updateRisk();

    checkWaiting();

    returnToOriginalLane();

    requestAnimationFrame(moveVehicle);
}

// ==========================================
// INITIAL VALUES
// ==========================================

selectScenario("Village Road");

console.log(
    "Adaptive Path Planning Simulation Started"
);

// ==========================================
// START
// ==========================================

requestAnimationFrame(moveVehicle);
