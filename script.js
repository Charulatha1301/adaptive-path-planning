// ==========================================
// ADAPTIVE PATH PLANNING SIMULATION
// ==========================================

const car = document.getElementById("car");

const pedestrian = document.querySelector(".pedestrian");
const auto = document.querySelector(".auto");
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
// SIMULATION VARIABLES
// ==========================================

let carPosition = 25;
let carSpeed = 0.15;

let replanningCount = 0;

let currentScenario = "Village Road";

let targetLane = 25;

let isAvoiding = false;
let obstaclePassed = false;
let lastObstacle = null;


// ==========================================
// SCENARIO DATA
// ==========================================

const scenarios = {

    "Village Road": {
        objects: 2,
        speed: "25 km/h"
    },

    "Urban Intersection": {
        objects: 5,
        speed: "20 km/h"
    },

    "Highway Merge": {
        objects: 4,
        speed: "60 km/h"
    },

    "Market Area": {
        objects: 8,
        speed: "15 km/h"
    },

    "Sudden Cattle Crossing": {
        objects: 3,
        speed: "30 km/h"
    }
};


// ==========================================
// RESET OBSTACLES
// ==========================================

function resetObstacles() {

    pedestrian.style.left = "15%";
    pedestrian.style.top = "120px";

    auto.style.left = "70%";
    auto.style.right = "auto";
    auto.style.top = "250px";

    animal.style.left = "42%";
    animal.style.top = "390px";
}


// ==========================================
// SELECT SCENARIO
// ==========================================

function selectScenario(scenarioName) {

    currentScenario = scenarioName;

    const scenario = scenarios[scenarioName];

    speedDisplay.textContent = scenario.speed;
    objectsDisplay.textContent = scenario.objects;

    replanningCount = 0;
    replanningDisplay.textContent = "0";

    riskDisplay.textContent = "LOW";
    riskDisplay.style.color = "green";

    planningDisplay.textContent = "ACTIVE";

    carPosition = 25;
    targetLane = 25;

    car.style.left = "25%";
    car.style.bottom = "40px";

    safePath.style.left = "25%";

    isAvoiding = false;
    obstaclePassed = false;
    lastObstacle = null;

    resetObstacles();

    console.log("Scenario selected:", scenarioName);
}


// ==========================================
// BUTTON EVENTS
// ==========================================

buttons.forEach(function(button) {

    button.addEventListener("click", function() {

        selectScenario(button.textContent.trim());

    });

});


// ==========================================
// GET OBSTACLE POSITION
// ==========================================

function getObstacleData(element) {

    const carRect = car.getBoundingClientRect();
    const obstacleRect = element.getBoundingClientRect();

    const carCenterX =
        carRect.left + carRect.width / 2;

    const carCenterY =
        carRect.top + carRect.height / 2;

    const obstacleCenterX =
        obstacleRect.left + obstacleRect.width / 2;

    const obstacleCenterY =
        obstacleRect.top + obstacleRect.height / 2;

    return {

        horizontalDistance:
            Math.abs(obstacleCenterX - carCenterX),

        verticalDistance:
            obstacleCenterY - carCenterY,

        obstacleCenterX:
            obstacleCenterX,

        carCenterX:
            carCenterX
    };
}


// ==========================================
// CHECK IF OBJECT IS IN CAR PATH
// ==========================================

function isInCarPath(data) {

    const laneWidth = 85;

    return (
        data.horizontalDistance < laneWidth &&
        data.verticalDistance < 250 &&
        data.verticalDistance > -60
    );
}


// ==========================================
// FIND CLOSEST OBSTACLE
// ==========================================

function findDangerousObstacle() {

    const obstacles = [
        pedestrian,
        auto,
        animal
    ];

    let closestObstacle = null;
    let closestDistance = Infinity;

    obstacles.forEach(function(obstacle) {

        const data = getObstacleData(obstacle);

        if (isInCarPath(data)) {

            if (
                data.verticalDistance >= 0 &&
                data.verticalDistance < closestDistance
            ) {

                closestDistance =
                    data.verticalDistance;

                closestObstacle = {
                    element: obstacle,
                    data: data
                };
            }
        }
    });

    return closestObstacle;
}


// ==========================================
// COLLISION RISK
// ==========================================

function calculateRisk() {

    const danger = findDangerousObstacle();

    if (!danger) {
        return "LOW";
    }

    const distance =
        danger.data.verticalDistance;

    if (distance < 70) {

        return "HIGH";

    } else if (distance < 170) {

        return "MEDIUM";

    } else {

        return "LOW";
    }
}


// ==========================================
// CHECK SAFE SIDE
// ==========================================

function isSideSafe(side) {

    const obstacles = [
        pedestrian,
        auto,
        animal
    ];

    const roadRect =
        road.getBoundingClientRect();

    let proposedLane;

    if (side === "LEFT") {
        proposedLane = 15;
    } else {
        proposedLane = 55;
    }

    const proposedX =
        roadRect.left +
        (proposedLane / 100) *
        roadRect.width;

    for (let i = 0; i < obstacles.length; i++) {

        const obstacleRect =
            obstacles[i].getBoundingClientRect();

        const obstacleCenterX =
            obstacleRect.left +
            obstacleRect.width / 2;

        const obstacleCenterY =
            obstacleRect.top +
            obstacleRect.height / 2;

        const carRect =
            car.getBoundingClientRect();

        const carCenterY =
            carRect.top +
            carRect.height / 2;

        const distanceY =
            obstacleCenterY - carCenterY;

        const distanceX =
            Math.abs(obstacleCenterX - proposedX);

        if (
            distanceY > -80 &&
            distanceY < 220 &&
            distanceX < 70
        ) {

            return false;
        }
    }

    return true;
}


// ==========================================
// CHOOSE SAFE LANE
// ==========================================

function chooseSafeLane() {

    const leftSafe =
        isSideSafe("LEFT");

    const rightSafe =
        isSideSafe("RIGHT");

    if (leftSafe && !rightSafe) {

        return 15;

    }

    if (rightSafe && !leftSafe) {

        return 55;

    }

    if (leftSafe && rightSafe) {

        if (carPosition <= 25) {
            return 15;
        } else {
            return 55;
        }
    }

    return null;
}


// ==========================================
// ADAPTIVE REPLANNING
// ==========================================

function triggerReplanning() {

    if (isAvoiding) {
        return;
    }

    const danger =
        findDangerousObstacle();

    if (!danger) {
        return;
    }

    const newLane =
        chooseSafeLane();

    if (newLane === null) {

        planningDisplay.textContent =
            "WAITING";

        return;
    }

    isAvoiding = true;

    lastObstacle =
        danger.element;

    targetLane =
        newLane;

    replanningCount++;

    replanningDisplay.textContent =
        replanningCount;

    safePath.style.left =
        targetLane + "%";

    planningDisplay.textContent =
        "REPLANNING";

    console.log("Obstacle detected");

    console.log(
        "New safe lane:",
        targetLane + "%"
    );
}


// ==========================================
// UPDATE RISK
// ==========================================

function updateRisk() {

    const risk =
        calculateRisk();

    riskDisplay.textContent =
        risk;

    if (risk === "HIGH") {

        riskDisplay.style.color =
            "red";

        if (!isAvoiding) {
            triggerReplanning();
        }

        if (isAvoiding) {
            planningDisplay.textContent =
                "REPLANNING";
        }

    } else if (risk === "MEDIUM") {

        riskDisplay.style.color =
            "orange";

        if (isAvoiding) {

            planningDisplay.textContent =
                "REPLANNING";

        } else {

            planningDisplay.textContent =
                "CAUTION";
        }

    } else {

        riskDisplay.style.color =
            "green";

        if (!isAvoiding) {

            planningDisplay.textContent =
                "ACTIVE";
        }
    }
}


// ==========================================
// MOVE SURROUNDING OBJECTS
// ==========================================

function moveObstacles() {

    // Pedestrian crossing the road
    let pedestrianLeft =
        parseFloat(
            window.getComputedStyle(
                pedestrian
            ).left
        );

    pedestrianLeft += 0.05;

    if (pedestrianLeft > 75) {
        pedestrianLeft = 5;
    }

    pedestrian.style.left =
        pedestrianLeft + "%";


    // Auto moving forward
    let autoTop =
        parseFloat(
            window.getComputedStyle(auto).top
        );

    autoTop += 0.08;

    if (autoTop > 520) {
        autoTop = 100;
    }

    auto.style.top =
        autoTop + "px";


    // Cattle crossing
    let animalLeft =
        parseFloat(
            window.getComputedStyle(
                animal
            ).left
        );

    animalLeft += 0.10;

    if (animalLeft > 75) {
        animalLeft = 25;
    }

    animal.style.left =
        animalLeft + "%";
}


// ==========================================
// SMOOTH STEERING
// ==========================================

function steerVehicle() {

    const difference =
        targetLane - carPosition;

    if (Math.abs(difference) < 0.15) {

        carPosition =
            targetLane;

    } else {

        carPosition +=
            difference * 0.035;
    }

    car.style.left =
        carPosition + "%";

    safePath.style.left =
        carPosition + "%";
}


// ==========================================
// CHECK IF OBSTACLE PASSED
// ==========================================

function checkObstaclePassed() {

    if (!isAvoiding || !lastObstacle) {
        return;
    }

    const carRect =
        car.getBoundingClientRect();

    const obstacleRect =
        lastObstacle.getBoundingClientRect();

    const distance =
        obstacleRect.top -
        carRect.bottom;

    if (distance < -40) {

        targetLane = 25;

        obstaclePassed = true;

        planningDisplay.textContent =
            "RETURNING TO LANE";

        lastObstacle = null;
    }
}


// ==========================================
// RETURN TO ORIGINAL LANE
// ==========================================

function checkReturnToLane() {

    if (
        obstaclePassed &&
        Math.abs(carPosition - 25) < 0.5
    ) {

        carPosition = 25;
        targetLane = 25;

        isAvoiding = false;
        obstaclePassed = false;

        planningDisplay.textContent =
            "ACTIVE";

        safePath.style.left =
            "25%";
    }
}


// ==========================================
// MOVE VEHICLE
// ==========================================

function moveVehicle() {

    let newBottom =
        parseFloat(
            window.getComputedStyle(car).bottom
        );

    // Original movement speed
    newBottom += carSpeed;

    if (newBottom > road.clientHeight) {

        newBottom = 40;

        carPosition = 25;
        targetLane = 25;

        isAvoiding = false;
        obstaclePassed = false;
        lastObstacle = null;

        safePath.style.left =
            "25%";

        planningDisplay.textContent =
            "ACTIVE";

        riskDisplay.textContent =
            "LOW";

        riskDisplay.style.color =
            "green";
    }

    car.style.bottom =
        newBottom + "px";

    moveObstacles();

    updateRisk();

    steerVehicle();

    checkObstaclePassed();

    checkReturnToLane();

    requestAnimationFrame(
        moveVehicle
    );
}


// ==========================================
// INITIAL VALUES
// ==========================================

speedDisplay.textContent =
    "30 km/h";

objectsDisplay.textContent =
    "3";

riskDisplay.textContent =
    "LOW";

planningDisplay.textContent =
    "ACTIVE";

replanningDisplay.textContent =
    "0";


// ==========================================
// START
// ==========================================

console.log(
    "Adaptive Autonomous Vehicle Simulation Started"
);

moveVehicle();
