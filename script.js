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

// KEEP ORIGINAL MOVEMENT SPEED
let carSpeed = 0.15;

let targetLane = 25;

let replanningCount = 0;

let isAvoiding = false;

let returningToLane = false;

let stoppedForDanger = false;

let currentScenario = "Village Road";

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
    animal.style.top = "300px";
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
    returningToLane = false;
    stoppedForDanger = false;
    lastObstacle = null;

    resetObstacles();

    console.log("Scenario selected:", scenarioName);
}


// ==========================================
// SCENARIO BUTTONS
// ==========================================

buttons.forEach(function(button) {

    button.addEventListener("click", function() {

        selectScenario(
            button.textContent.trim()
        );

    });

});


// ==========================================
// GET OBJECT INFORMATION
// ==========================================

function getObstacleData(obstacle) {

    const carRect =
        car.getBoundingClientRect();

    const obstacleRect =
        obstacle.getBoundingClientRect();

    const carCenterX =
        carRect.left +
        carRect.width / 2;

    const obstacleCenterX =
        obstacleRect.left +
        obstacleRect.width / 2;

    // Positive means obstacle is ahead of car
    const verticalGap =
        carRect.top -
        obstacleRect.bottom;

    const horizontalGap =
        Math.abs(
            carCenterX -
            obstacleCenterX
        );

    return {

        verticalGap: verticalGap,

        horizontalGap: horizontalGap,

        carCenterX: carCenterX,

        obstacleCenterX: obstacleCenterX,

        obstacleRect: obstacleRect,

        carRect: carRect
    };
}


// ==========================================
// IS OBSTACLE AHEAD?
// ==========================================

function isObstacleAhead(data) {

    // Obstacle must be ahead of the car
    if (data.verticalGap < -60) {
        return false;
    }

    // Only detect objects within useful
    // planning distance
    if (data.verticalGap > 240) {
        return false;
    }

    // Check whether obstacle is near
    // the vehicle's current path
    if (data.horizontalGap > 105) {
        return false;
    }

    return true;
}


// ==========================================
// FIND NEAREST OBSTACLE
// ==========================================

function findNearestObstacle() {

    const obstacles = [
        pedestrian,
        auto,
        animal
    ];

    let nearest = null;

    let smallestGap = Infinity;

    obstacles.forEach(function(obstacle) {

        const data =
            getObstacleData(obstacle);

        if (isObstacleAhead(data)) {

            if (
                data.verticalGap <
                smallestGap
            ) {

                smallestGap =
                    data.verticalGap;

                nearest = {

                    element: obstacle,

                    data: data
                };
            }
        }
    });

    return nearest;
}


// ==========================================
// CHECK WHETHER A LANE IS SAFE
// ==========================================

function laneIsSafe(lane) {

    const obstacles = [
        pedestrian,
        auto,
        animal
    ];

    const roadRect =
        road.getBoundingClientRect();

    const proposedX =
        roadRect.left +
        (lane / 100) *
        roadRect.width;

    for (
        let i = 0;
        i < obstacles.length;
        i++
    ) {

        const data =
            getObstacleData(
                obstacles[i]
            );

        const distanceFromLane =
            Math.abs(
                data.obstacleCenterX -
                proposedX
            );

        // Object is near the proposed lane
        if (
            data.verticalGap > -80 &&
            data.verticalGap < 250 &&
            distanceFromLane < 80
        ) {

            return false;
        }
    }

    return true;
}


// ==========================================
// CHOOSE SAFE SIDE
// ==========================================

function chooseSafeLane() {

    const leftSafe =
        laneIsSafe(15);

    const rightSafe =
        laneIsSafe(55);

    // Only left is safe
    if (
        leftSafe &&
        !rightSafe
    ) {

        return 15;
    }

    // Only right is safe
    if (
        rightSafe &&
        !leftSafe
    ) {

        return 55;
    }

    // Both are safe
    if (
        leftSafe &&
        rightSafe
    ) {

        // Choose nearest side
        if (carPosition <= 25) {
            return 15;
        }

        return 55;
    }

    // Both sides blocked
    return null;
}


// ==========================================
// START REPLANNING
// ==========================================

function triggerReplanning(obstacle) {

    if (
        isAvoiding ||
        returningToLane
    ) {
        return;
    }

    const safeLane =
        chooseSafeLane();

    // Both sides blocked
    if (safeLane === null) {

        stoppedForDanger = true;

        planningDisplay.textContent =
            "WAITING";

        return;
    }

    stoppedForDanger = false;

    isAvoiding = true;

    lastObstacle =
        obstacle.element;

    targetLane =
        safeLane;

    replanningCount++;

    replanningDisplay.textContent =
        replanningCount;

    safePath.style.left =
        targetLane + "%";

    planningDisplay.textContent =
        "REPLANNING";

    console.log(
        "Obstacle detected."
    );

    console.log(
        "Safe path selected:",
        targetLane + "%"
    );
}


// ==========================================
// CALCULATE COLLISION RISK
// ==========================================

function calculateRisk() {

    const obstacle =
        findNearestObstacle();

    if (!obstacle) {

        return "LOW";
    }

    const gap =
        obstacle.data.verticalGap;

    // Very close
    if (gap < 65) {

        return "HIGH";
    }

    // Planning distance
    if (gap < 160) {

        return "MEDIUM";
    }

    return "LOW";
}


// ==========================================
// UPDATE RISK
// ==========================================

function updateRisk() {

    const obstacle =
        findNearestObstacle();

    const risk =
        calculateRisk();

    riskDisplay.textContent =
        risk;


    if (risk === "HIGH") {

        riskDisplay.style.color =
            "red";

        if (obstacle) {

            triggerReplanning(
                obstacle
            );
        }

        if (stoppedForDanger) {

            planningDisplay.textContent =
                "WAITING";
        }

    } else if (risk === "MEDIUM") {

        riskDisplay.style.color =
            "orange";

        if (obstacle) {

            triggerReplanning(
                obstacle
            );
        }

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

        if (
            !isAvoiding &&
            !returningToLane
        ) {

            planningDisplay.textContent =
                "ACTIVE";
        }
    }
}


// ==========================================
// MOVE OBSTACLES
// ==========================================

function moveObstacles() {

    // ------------------------------
    // PEDESTRIAN
    // ------------------------------

    let pedestrianLeft =
        parseFloat(
            window.getComputedStyle(
                pedestrian
            ).left
        );

    pedestrianLeft += 0.05;

    if (
        pedestrianLeft > 78
    ) {

        pedestrianLeft = 5;
    }

    pedestrian.style.left =
        pedestrianLeft + "%";


    // ------------------------------
    // AUTO
    // ------------------------------

    let autoTop =
        parseFloat(
            window.getComputedStyle(
                auto
            ).top
        );

    autoTop += 0.08;

    if (
        autoTop > 520
    ) {

        autoTop = 100;
    }

    auto.style.top =
        autoTop + "px";


    // ------------------------------
    // CATTLE CROSSING
    // ------------------------------

    let animalLeft =
        parseFloat(
            window.getComputedStyle(
                animal
            ).left
        );

    animalLeft += 0.08;

    if (
        animalLeft > 78
    ) {

        animalLeft = 8;
    }

    animal.style.left =
        animalLeft + "%";
}


// ==========================================
// SMOOTH CAR STEERING
// ==========================================

function steerVehicle() {

    const difference =
        targetLane -
        carPosition;

    if (
        Math.abs(difference) < 0.12
    ) {

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
// CHECK IF OBSTACLE IS PASSED
// ==========================================

function checkObstaclePassed() {

    if (
        !isAvoiding ||
        !lastObstacle
    ) {
        return;
    }

    const carRect =
        car.getBoundingClientRect();

    const obstacleRect =
        lastObstacle.getBoundingClientRect();

    // Car has moved above the obstacle
    if (
        obstacleRect.top >
        carRect.bottom + 20
    ) {

        returningToLane = true;

        isAvoiding = false;

        targetLane = 25;

        planningDisplay.textContent =
            "RETURNING TO LANE";

        lastObstacle = null;
    }
}


// ==========================================
// CHECK RETURN TO ORIGINAL LANE
// ==========================================

function checkReturnToLane() {

    if (!returningToLane) {
        return;
    }

    if (
        Math.abs(
            carPosition - 25
        ) < 0.5
    ) {

        carPosition = 25;

        targetLane = 25;

        returningToLane = false;

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
            window.getComputedStyle(
                car
            ).bottom
        );

    // ----------------------------------
    // NORMAL MOVEMENT
    // ----------------------------------

    let currentSpeed =
        carSpeed;


    // ----------------------------------
    // STOP ONLY WHEN BOTH SIDES BLOCKED
    // ----------------------------------

    if (stoppedForDanger) {

        currentSpeed = 0;

        // Check again whether a safe
        // side has become available
        const safeLane =
            chooseSafeLane();

        if (
            safeLane !== null
        ) {

            stoppedForDanger = false;

            targetLane =
                safeLane;

            isAvoiding = true;

            replanningCount++;

            replanningDisplay.textContent =
                replanningCount;

            planningDisplay.textContent =
                "REPLANNING";

            safePath.style.left =
                targetLane + "%";
        }
    }


    newBottom +=
        currentSpeed;


    // ----------------------------------
    // RESET AFTER REACHING TOP
    // ----------------------------------

    if (
        newBottom >
        road.clientHeight
    ) {

        newBottom = 40;

        carPosition = 25;

        targetLane = 25;

        isAvoiding = false;

        returningToLane = false;

        stoppedForDanger = false;

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


    // ----------------------------------
    // ENVIRONMENT
    // ----------------------------------

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
