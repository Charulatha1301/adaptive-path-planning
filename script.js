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
// VEHICLE VARIABLES
// ==========================================

let carPosition = 25;

// KEEPING ORIGINAL VEHICLE MOVEMENT
let carSpeed = 0.15;

let targetLane = 25;

let replanningCount = 0;

let avoiding = false;

let waiting = false;

let returning = false;

let activeObstacle = null;

let handledObstacle = null;


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
// RESET
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

function selectScenario(name) {

    currentScenario = name;

    speedDisplay.textContent =
        scenarios[name].speed;

    objectsDisplay.textContent =
        scenarios[name].objects;

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

    avoiding = false;
    waiting = false;
    returning = false;

    activeObstacle = null;
    handledObstacle = null;

    resetObstacles();
}


// ==========================================
// BUTTONS
// ==========================================

buttons.forEach(function(button) {

    button.addEventListener("click", function() {

        selectScenario(
            button.textContent.trim()
        );

    });

});


// ==========================================
// GET EXACT POSITION
// ==========================================

function getData(obstacle) {

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

    /*
       Positive gap = obstacle is ahead
       Negative gap = obstacle is behind
    */

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

        obstacleCenterX: obstacleCenterX,

        carCenterX: carCenterX
    };
}


// ==========================================
// IS OBJECT IN CURRENT PATH?
// ==========================================

function isInCurrentPath(data) {

    /*
       Detection happens EARLY.
       The vehicle doesn't wait until
       the obstacle is touching it.
    */

    return (

        data.verticalGap >= -30 &&

        data.verticalGap <= 300 &&

        data.horizontalGap <= 95

    );
}


// ==========================================
// FIND THE MOST IMPORTANT OBSTACLE
// ==========================================

function findObstacle() {

    const obstacles = [

        pedestrian,
        auto,
        animal

    ];

    let nearest = null;

    let nearestGap = Infinity;

    obstacles.forEach(function(obstacle) {

        const data =
            getData(obstacle);

        if (
            isInCurrentPath(data)
        ) {

            if (
                data.verticalGap <
                nearestGap
            ) {

                nearestGap =
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
// CHECK WHETHER A SIDE IS SAFE
// ==========================================

function sideIsSafe(lane) {

    const obstacles = [

        pedestrian,
        auto,
        animal

    ];

    const roadRect =
        road.getBoundingClientRect();

    const laneX =
        roadRect.left +
        (lane / 100) *
        roadRect.width;

    for (
        let i = 0;
        i < obstacles.length;
        i++
    ) {

        const data =
            getData(obstacles[i]);

        const distanceFromLane =
            Math.abs(
                data.obstacleCenterX -
                laneX
            );

        /*
           Check a large area around the
           proposed lane before moving.
        */

        if (

            data.verticalGap > -80 &&

            data.verticalGap < 300 &&

            distanceFromLane < 75

        ) {

            return false;
        }
    }

    return true;
}


// ==========================================
// CHOOSE SAFE SIDE
// ==========================================

function chooseSafeSide() {

    const leftSafe =
        sideIsSafe(15);

    const rightSafe =
        sideIsSafe(55);


    // LEFT ONLY
    if (
        leftSafe &&
        !rightSafe
    ) {

        return 15;
    }


    // RIGHT ONLY
    if (
        rightSafe &&
        !leftSafe
    ) {

        return 55;
    }


    // BOTH CLEAR
    if (
        leftSafe &&
        rightSafe
    ) {

        /*
           Current lane is 25%.
           Left lane is closer,
           so choose left when both
           are safe.
        */

        return 15;
    }


    // BOTH BLOCKED
    return null;
}


// ==========================================
// START A NEW PLAN
// ==========================================

function startReplanning(obstacle) {

    /*
       VERY IMPORTANT:
       Don't replan repeatedly for the
       same obstacle.
    */

    if (
        avoiding ||
        returning ||
        handledObstacle === obstacle.element
    ) {

        return;
    }


    const safeLane =
        chooseSafeSide();


    // BOTH SIDES BLOCKED
    if (
        safeLane === null
    ) {

        waiting = true;

        planningDisplay.textContent =
            "WAITING";

        return;
    }


    waiting = false;

    avoiding = true;

    activeObstacle =
        obstacle.element;

    handledObstacle =
        obstacle.element;

    targetLane =
        safeLane;


    // COUNT ONLY ONCE
    replanningCount++;

    replanningDisplay.textContent =
        replanningCount;


    safePath.style.left =
        targetLane + "%";


    planningDisplay.textContent =
        "REPLANNING";


    console.log(
        "Obstacle detected"
    );

    console.log(
        "Safe lane:",
        targetLane + "%"
    );

    console.log(
        "Replanning count:",
        replanningCount
    );
}


// ==========================================
// COLLISION RISK
// ==========================================

function calculateRisk() {

    const obstacle =
        findObstacle();


    if (!obstacle) {

        return "LOW";
    }


    const gap =
        obstacle.data.verticalGap;


    /*
       HIGH = genuinely close
       MEDIUM = approaching
       LOW = detected but far
    */

    if (
        gap < 65
    ) {

        return "HIGH";

    }


    if (
        gap < 180
    ) {

        return "MEDIUM";

    }


    return "LOW";
}


// ==========================================
// UPDATE DASHBOARD
// ==========================================

function updateRisk() {

    const obstacle =
        findObstacle();

    const risk =
        calculateRisk();


    riskDisplay.textContent =
        risk;


    // --------------------------------------
    // HIGH
    // --------------------------------------

    if (
        risk === "HIGH"
    ) {

        riskDisplay.style.color =
            "red";


        if (
            obstacle &&
            !avoiding &&
            !returning
        ) {

            startReplanning(
                obstacle
            );
        }

    }


    // --------------------------------------
    // MEDIUM
    // --------------------------------------

    else if (
        risk === "MEDIUM"
    ) {

        riskDisplay.style.color =
            "orange";


        /*
           START PLANNING ALREADY AT MEDIUM.
           This is the important early reaction.
        */

        if (
            obstacle &&
            !avoiding &&
            !returning
        ) {

            startReplanning(
                obstacle
            );
        }


        if (
            avoiding
        ) {

            planningDisplay.textContent =
                "REPLANNING";

        }

        else if (
            !waiting
        ) {

            planningDisplay.textContent =
                "CAUTION";
        }

    }


    // --------------------------------------
    // LOW
    // --------------------------------------

    else {

        riskDisplay.style.color =
            "green";


        if (
            !avoiding &&
            !returning &&
            !waiting
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


    // --------------------------------------
    // PEDESTRIAN
    // --------------------------------------

    let pedestrianLeft =
        parseFloat(
            window.getComputedStyle(
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


    // --------------------------------------
    // AUTO
    // --------------------------------------

    let autoTop =
        parseFloat(
            window.getComputedStyle(
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


    // --------------------------------------
    // CATTLE
    // --------------------------------------

    let animalLeft =
        parseFloat(
            window.getComputedStyle(
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
// SMOOTH LANE CHANGE
// ==========================================

function steerVehicle() {

    const difference =
        targetLane -
        carPosition;


    /*
       Smooth movement instead of
       teleporting the car.
    */

    if (
        Math.abs(difference) < 0.1
    ) {

        carPosition =
            targetLane;

    }

    else {

        carPosition +=
            difference * 0.04;
    }


    car.style.left =
        carPosition + "%";


    safePath.style.left =
        carPosition + "%";
}


// ==========================================
// CHECK IF OBSTACLE IS PASSED
// ==========================================

function checkPassed() {

    if (
        !avoiding ||
        !activeObstacle
    ) {

        return;
    }


    const carRect =
        car.getBoundingClientRect();

    const obstacleRect =
        activeObstacle.getBoundingClientRect();


    /*
       When the obstacle is clearly
       behind the vehicle, return to
       the original lane.
    */

    if (
        obstacleRect.bottom <
        carRect.top - 30
    ) {

        avoiding = false;

        returning = true;

        targetLane = 25;

        planningDisplay.textContent =
            "RETURNING TO LANE";

        activeObstacle = null;
    }
}


// ==========================================
// RETURN TO ORIGINAL LANE
// ==========================================

function checkReturned() {

    if (
        !returning
    ) {

        return;
    }


    if (
        Math.abs(
            carPosition - 25
        ) < 0.5
    ) {

        carPosition = 25;

        targetLane = 25;

        returning = false;

        /*
           The handled obstacle remains
           locked until it is far away.
           This prevents 113 replans.
        */

        planningDisplay.textContent =
            "ACTIVE";

        safePath.style.left =
            "25%";
    }
}


// ==========================================
// RELEASE OLD OBSTACLE
// ==========================================

function releaseHandledObstacle() {

    if (
        !handledObstacle
    ) {

        return;
    }


    const data =
        getData(
            handledObstacle
        );


    /*
       Only allow the same object to
       trigger another plan after it has
       completely moved away.
    */

    if (
        data.verticalGap < -180 ||
        data.verticalGap > 350
    ) {

        handledObstacle = null;
    }
}


// ==========================================
// WAITING LOGIC
// ==========================================

function checkWaiting() {

    if (
        !waiting
    ) {

        return;
    }


    const safeLane =
        chooseSafeSide();


    /*
       If a side becomes available,
       start moving again.
    */

    if (
        safeLane !== null
    ) {

        waiting = false;

        avoiding = true;

        targetLane =
            safeLane;


        replanningCount++;

        replanningDisplay.textContent =
            replanningCount;


        planningDisplay.textContent =
            "REPLANNING";


        safePath.style.left =
            targetLane + "%";
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


    /*
       NORMAL SPEED ALWAYS.
       Vehicle only stops when BOTH
       sides are blocked.
    */

    if (
        !waiting
    ) {

        newBottom +=
            carSpeed;
    }


    // --------------------------------------
    // RESTART
    // --------------------------------------

    if (
        newBottom >
        road.clientHeight
    ) {

        newBottom = 40;

        carPosition = 25;

        targetLane = 25;

        avoiding = false;

        waiting = false;

        returning = false;

        activeObstacle = null;

        handledObstacle = null;

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


    // --------------------------------------
    // ENVIRONMENT
    // --------------------------------------

    moveObstacles();


    // --------------------------------------
    // DETECT
    // --------------------------------------

    updateRisk();


    // --------------------------------------
    // PLAN
    // --------------------------------------

    checkWaiting();


    // --------------------------------------
    // STEER
    // --------------------------------------

    steerVehicle();


    // --------------------------------------
    // PASS OBSTACLE
    // --------------------------------------

    checkPassed();


    // --------------------------------------
    // RETURN
    // --------------------------------------

    checkReturned();


    // --------------------------------------
    // RELEASE OLD OBSTACLE
    // --------------------------------------

    releaseHandledObstacle();


    requestAnimationFrame(
        moveVehicle
    );
}


// ==========================================
// INITIAL DASHBOARD
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
    "Adaptive Path Planning Simulation Started"
);

moveVehicle();
