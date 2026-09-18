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
// BASIC SETTINGS
// ==========================================

const CAR_SPEED = 0.15;

const ORIGINAL_LANE = 25;

const LEFT_LANE = 15;

const RIGHT_LANE = 55;


// ==========================================
// VARIABLES
// ==========================================

let carPosition = ORIGINAL_LANE;

let targetLane = ORIGINAL_LANE;

let replanningCount = 0;

let activeObstacle = null;

let handledObstacle = null;

let state = "NORMAL";

let currentScenario = "Village Road";


// ==========================================
// SCENARIOS
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
// SCENARIO BUTTONS
// ==========================================

buttons.forEach(function(button) {

    button.addEventListener("click", function() {

        currentScenario =
            button.textContent.trim();

        resetSimulation();

        speedDisplay.textContent =
            scenarios[currentScenario].speed;

        objectsDisplay.textContent =
            scenarios[currentScenario].objects;

    });

});


// ==========================================
// GET CAR / OBJECT POSITION
// ==========================================

function getPosition(element) {

    const carRect =
        car.getBoundingClientRect();

    const objectRect =
        element.getBoundingClientRect();

    const carCenterX =
        carRect.left +
        carRect.width / 2;

    const objectCenterX =
        objectRect.left +
        objectRect.width / 2;

    const horizontalDistance =
        Math.abs(
            carCenterX -
            objectCenterX
        );

    const verticalDistance =
        carRect.top -
        objectRect.bottom;

    return {

        horizontal: horizontalDistance,

        vertical: verticalDistance,

        objectX: objectCenterX,

        carX: carCenterX

    };
}


// ==========================================
// DETECT OBJECT AHEAD
// ==========================================

function detectObstacle() {

    const obstacles = [

        pedestrian,
        auto,
        animal

    ];

    let closest = null;

    let closestDistance =
        Infinity;


    obstacles.forEach(function(object) {

        const position =
            getPosition(object);


        /*
         * SENSOR RANGE
         *
         * The vehicle detects objects
         * before they reach the car.
         */

        if (

            position.vertical > -70 &&

            position.vertical < 300 &&

            position.horizontal < 110

        ) {

            if (
                position.vertical <
                closestDistance
            ) {

                closestDistance =
                    position.vertical;

                closest = {

                    element: object,

                    data: position

                };

            }

        }

    });


    return closest;
}


// ==========================================
// CHECK WHETHER LANE IS SAFE
// ==========================================

function isLaneSafe(lane) {

    const roadRect =
        road.getBoundingClientRect();


    const laneX =
        roadRect.left +
        (lane / 100) *
        roadRect.width;


    const obstacles = [

        pedestrian,
        auto,
        animal

    ];


    for (
        let i = 0;
        i < obstacles.length;
        i++
    ) {

        const object =
            obstacles[i];

        const data =
            getPosition(object);


        /*
         * Look ahead before selecting
         * the lane.
         */

        if (

            data.vertical > -80 &&

            data.vertical < 300

        ) {

            const distanceFromLane =
                Math.abs(
                    data.objectX -
                    laneX
                );


            if (
                distanceFromLane < 80
            ) {

                return false;

            }

        }

    }


    return true;
}


// ==========================================
// SELECT SAFE SIDE
// ==========================================

function chooseSafeLane() {

    const leftSafe =
        isLaneSafe(LEFT_LANE);

    const rightSafe =
        isLaneSafe(RIGHT_LANE);


    if (
        leftSafe &&
        rightSafe
    ) {

        return LEFT_LANE;

    }


    if (leftSafe) {

        return LEFT_LANE;

    }


    if (rightSafe) {

        return RIGHT_LANE;

    }


    return null;
}


// ==========================================
// START REPLANNING
// ==========================================

function startReplanning(obstacle) {

    /*
     * IMPORTANT:
     * One obstacle can create only
     * ONE replanning event.
     */

    if (
        state !== "NORMAL"
    ) {

        return;

    }


    if (
        handledObstacle ===
        obstacle.element
    ) {

        return;

    }


    const safeLane =
        chooseSafeLane();


    // Both sides blocked
    if (
        safeLane === null
    ) {

        state = "WAITING";

        activeObstacle =
            obstacle.element;

        planningDisplay.textContent =
            "WAITING";

        return;

    }


    activeObstacle =
        obstacle.element;

    handledObstacle =
        obstacle.element;

    targetLane =
        safeLane;

    state =
        "AVOIDING";


    replanningCount++;

    replanningDisplay.textContent =
        replanningCount;


    safePath.style.left =
        targetLane + "%";


    planningDisplay.textContent =
        "REPLANNING";

}


// ==========================================
// COLLISION RISK
// ==========================================

function calculateRisk() {

    const obstacle =
        detectObstacle();


    if (!obstacle) {

        return "LOW";

    }


    const distance =
        obstacle.data.vertical;


    /*
     * EARLY WARNING
     */

    if (
        distance < 60
    ) {

        return "HIGH";

    }


    if (
        distance < 190
    ) {

        return "MEDIUM";

    }


    return "LOW";
}


// ==========================================
// UPDATE RISK
// ==========================================

function updateRisk() {

    const obstacle =
        detectObstacle();

    const risk =
        calculateRisk();


    riskDisplay.textContent =
        risk;


    if (
        risk === "HIGH"
    ) {

        riskDisplay.style.color =
            "red";


    } else if (
        risk === "MEDIUM"
    ) {

        riskDisplay.style.color =
            "orange";


    } else {

        riskDisplay.style.color =
            "green";

    }


    /*
     * Start avoidance at MEDIUM,
     * NOT after HIGH.
     */

    if (

        obstacle &&

        (
            risk === "MEDIUM" ||
            risk === "HIGH"
        ) &&

        state === "NORMAL"

    ) {

        startReplanning(
            obstacle
        );

    }


    if (
        state === "NORMAL"
    ) {

        if (
            risk === "LOW"
        ) {

            planningDisplay.textContent =
                "ACTIVE";

        } else {

            planningDisplay.textContent =
                "CAUTION";

        }

    }

}


// ==========================================
// MOVE OBSTACLES
// ==========================================

function moveObstacles() {

    /*
     * Pedestrian crosses the road.
     */

    let pedestrianLeft =
        parseFloat(
            getComputedStyle(
                pedestrian
            ).left
        );


    pedestrianLeft +=
        0.05;


    if (
        pedestrianLeft > 78
    ) {

        pedestrianLeft = 5;

    }


    pedestrian.style.left =
        pedestrianLeft + "%";


    /*
     * Auto moves forward.
     */

    let autoTop =
        parseFloat(
            getComputedStyle(
                auto
            ).top
        );


    autoTop +=
        0.08;


    if (
        autoTop > 520
    ) {

        autoTop = 100;

    }


    auto.style.top =
        autoTop + "px";


    /*
     * Cattle crosses the road.
     */

    let animalLeft =
        parseFloat(
            getComputedStyle(
                animal
            ).left
        );


    animalLeft +=
        0.08;


    if (
        animalLeft > 78
    ) {

        animalLeft = 8;

    }


    animal.style.left =
        animalLeft + "%";

}


// ==========================================
// MOVE CAR TOWARDS SAFE LANE
// ==========================================

function moveCarSideways() {

    const difference =
        targetLane -
        carPosition;


    if (
        Math.abs(difference) <
        0.1
    ) {

        carPosition =
            targetLane;

    } else {

        carPosition +=
            difference * 0.04;

    }


    car.style.left =
        carPosition + "%";


    safePath.style.left =
        carPosition + "%";

}


// ==========================================
// CHECK IF OBJECT IS PASSED
// ==========================================

function checkObstaclePassed() {

    if (
        state !== "AVOIDING"
    ) {

        return;

    }


    if (
        !activeObstacle
    ) {

        return;

    }


    const carRect =
        car.getBoundingClientRect();

    const objectRect =
        activeObstacle.getBoundingClientRect();


    /*
     * Object is now behind the car.
     */

    if (
        objectRect.bottom <
        carRect.top - 30
    ) {

        state =
            "RETURNING";


        targetLane =
            ORIGINAL_LANE;


        activeObstacle =
            null;


        planningDisplay.textContent =
            "RETURNING TO LANE";

    }

}


// ==========================================
// RETURN TO ORIGINAL LANE
// ==========================================

function returnToOriginalLane() {

    if (
        state !== "RETURNING"
    ) {

        return;

    }


    if (
        Math.abs(
            carPosition -
            ORIGINAL_LANE
        ) < 0.5
    ) {

        carPosition =
            ORIGINAL_LANE;

        targetLane =
            ORIGINAL_LANE;

        state =
            "NORMAL";


        planningDisplay.textContent =
            "ACTIVE";


        safePath.style.left =
            ORIGINAL_LANE + "%";

    }

}


// ==========================================
// WAIT IF BOTH SIDES BLOCKED
// ==========================================

function checkWaiting() {

    if (
        state !== "WAITING"
    ) {

        return;

    }


    const safeLane =
        chooseSafeLane();


    /*
     * Start moving when a safe
     * side becomes available.
     */

    if (
        safeLane !== null
    ) {

        targetLane =
            safeLane;

        state =
            "AVOIDING";


        replanningCount++;

        replanningDisplay.textContent =
            replanningCount;


        safePath.style.left =
            targetLane + "%";


        planningDisplay.textContent =
            "REPLANNING";

    }

}


// ==========================================
// RELEASE OLD OBSTACLE
// ==========================================

function releaseObstacle() {

    if (
        !handledObstacle
    ) {

        return;

    }


    const distance =
        getPosition(
            handledObstacle
        ).vertical;


    /*
     * Only after the old obstacle
     * has moved far behind the car
     * can it be detected again.
     */

    if (
        distance < -200
    ) {

        handledObstacle =
            null;

    }

}


// ==========================================
// RESET SIMULATION
// ==========================================

function resetSimulation() {

    carPosition =
        ORIGINAL_LANE;

    targetLane =
        ORIGINAL_LANE;

    replanningCount =
        0;

    activeObstacle =
        null;

    handledObstacle =
        null;

    state =
        "NORMAL";


    car.style.left =
        ORIGINAL_LANE + "%";

    car.style.bottom =
        "40px";


    safePath.style.left =
        ORIGINAL_LANE + "%";


    pedestrian.style.left =
        "15%";

    pedestrian.style.top =
        "120px";


    auto.style.left =
        "70%";

    auto.style.right =
        "auto";

    auto.style.top =
        "250px";


    animal.style.left =
        "42%";

    animal.style.top =
        "390px";


    replanningDisplay.textContent =
        "0";

    riskDisplay.textContent =
        "LOW";

    riskDisplay.style.color =
        "green";

    planningDisplay.textContent =
        "ACTIVE";

}


// ==========================================
// MAIN ANIMATION
// ==========================================

function moveVehicle() {

    let bottom =
        parseFloat(
            getComputedStyle(
                car
            ).bottom
        );


    /*
     * Car continues at original speed.
     * It only stops if both sides are
     * blocked.
     */

    if (
        state !== "WAITING"
    ) {

        bottom +=
            CAR_SPEED;

    }


    /*
     * Restart simulation when car
     * reaches the top.
     */

    if (
        bottom >
        road.clientHeight
    ) {

        resetSimulation();

        bottom =
            40;

    }


    car.style.bottom =
        bottom + "px";


    // Environment movement
    moveObstacles();


    // Detect and assess
    updateRisk();


    // Waiting logic
    checkWaiting();


    // Steering
    moveCarSideways();


    // Passing obstacle
    checkObstaclePassed();


    // Return to lane
    returnToOriginalLane();


    // Release old obstacle
    releaseObstacle();


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
