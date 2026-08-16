// =====================================================
// SMART WATER MONITORING DASHBOARD
// Arduino UNO + USB Serial
// =====================================================

let port = null;
let reader = null;
let keepReading = false;

let sampleCount = 0;

let distanceData = [];
let waterLevelData = [];
let phData = [];
let turbidityData = [];

let timeLabels = [];

const MAX_POINTS = 30;
const TANK_HEIGHT = 50;

// =====================================================
// GET HTML ELEMENTS
// =====================================================

const connectBtn = document.getElementById("connectBtn");
const connectionDot = document.getElementById("connectionDot");
const connectionText = document.getElementById("connectionText");

const systemStatus = document.getElementById("systemStatus");
const sampleCountElement = document.getElementById("sampleCount");
const lastUpdate = document.getElementById("lastUpdate");

const distanceElement = document.getElementById("distance");
const waterLevelElement = document.getElementById("waterLevel");
const tankPercentElement = document.getElementById("tankPercent");

const phElement = document.getElementById("phValue");
const turbidityElement = document.getElementById("turbidityValue");

const tankStatus = document.getElementById("tankStatus");
const tankPercentLarge = document.getElementById("tankPercentLarge");
const tankFill = document.getElementById("tankFill");

const phStatus = document.getElementById("phStatus");
const turbidityStatus = document.getElementById("turbidityStatus");

const tankAlertText = document.getElementById("tankAlertText");
const qualityAlertText = document.getElementById("qualityAlertText");


// =====================================================
// CHECK WEB SERIAL SUPPORT
// =====================================================

if (!("serial" in navigator)) {

    connectionText.textContent = "Web Serial Not Supported";

    systemStatus.textContent = "USE CHROME / EDGE";

    connectBtn.disabled = true;

    alert(
        "Web Serial is not supported in this browser.\n\n" +
        "Please use Google Chrome or Microsoft Edge."
    );
}


// =====================================================
// CONNECT BUTTON
// =====================================================

connectBtn.addEventListener("click", connectArduino);


// =====================================================
// CONNECT ARDUINO
// =====================================================

async function connectArduino() {

    try {

        // Request Arduino serial port
        port = await navigator.serial.requestPort();

        // Open at same baud rate as Arduino
        await port.open({
            baudRate: 9600
        });

        keepReading = true;

        connectionDot.classList.remove("offline");
        connectionDot.classList.add("online");

        connectionText.textContent = "Arduino Connected";

        connectBtn.textContent = "CONNECTED";

        systemStatus.textContent = "SYSTEM ONLINE";

        console.log("Arduino connected");

        readSerial();

    } catch (error) {

        console.error(error);

        connectionText.textContent = "Arduino Disconnected";

        systemStatus.textContent = "CONNECTION FAILED";

        alert(
            "Could not connect to Arduino.\n\n" +
            "Make sure:\n" +
            "1. Arduino is connected by USB\n" +
            "2. Arduino Serial Monitor is closed\n" +
            "3. You selected the correct COM port"
        );
    }
}


// =====================================================
// READ SERIAL DATA
// =====================================================

async function readSerial() {

    const decoder = new TextDecoderStream();

    const inputDone = port.readable.pipeTo(decoder.writable);

    reader = decoder.readable.getReader();

    let buffer = "";

    try {

        while (keepReading) {

            const { value, done } = await reader.read();

            if (done) {
                break;
            }

            if (value) {

                buffer += value;

                let lines = buffer.split("\n");

                buffer = lines.pop();

                for (let line of lines) {

                    line = line.trim();

                    if (line.length > 0) {

                        console.log("Arduino:", line);

                        processSerialLine(line);
                    }
                }
            }
        }

    } catch (error) {

        console.error("Serial read error:", error);

    } finally {

        reader.releaseLock();
    }
}


// =====================================================
// PROCESS ARDUINO SERIAL LINE
// =====================================================

function processSerialLine(line) {

    // -------------------------------------------------
    // DISTANCE
    // Example:
    // Distance: 18.52 cm
    // -------------------------------------------------

    if (line.startsWith("Distance:")) {

        let value = line
            .replace("Distance:", "")
            .replace("cm", "")
            .trim();

        let distance = parseFloat(value);

        if (!isNaN(distance)) {

            updateDistance(distance);
        }

        return;
    }


    // -------------------------------------------------
    // PH
    // Example:
    // pH: 512
    // -------------------------------------------------

    if (line.startsWith("pH:")) {

        let value = line
            .replace("pH:", "")
            .trim();

        let ph = parseFloat(value);

        if (!isNaN(ph)) {

            updatePH(ph);
        }

        return;
    }


    // -------------------------------------------------
    // TURBIDITY
    // Example:
    // Turbidity: 245
    // -------------------------------------------------

    if (line.startsWith("Turbidity:")) {

        let value = line
            .replace("Turbidity:", "")
            .trim();

        let turbidity = parseFloat(value);

        if (!isNaN(turbidity)) {

            updateTurbidity(turbidity);
        }

        return;
    }


    // -------------------------------------------------
    // SMS STATUS
    // -------------------------------------------------

    if (line.includes("Tank SMS Sent")) {

        console.log("Tank SMS sent");

    }

    if (line.includes("Quality SMS Sent")) {

        console.log("Quality SMS sent");
    }
}


// =====================================================
// DISTANCE UPDATE
// =====================================================

function updateDistance(distance) {

    distanceElement.textContent = distance.toFixed(1);

    // Calculate water level
    let waterLevel = TANK_HEIGHT - distance;

    if (waterLevel < 0) {
        waterLevel = 0;
    }

    if (waterLevel > TANK_HEIGHT) {
        waterLevel = TANK_HEIGHT;
    }

    // Calculate percentage
    let percent = (waterLevel / TANK_HEIGHT) * 100;

    percent = Math.round(percent);

    waterLevelElement.textContent =
        waterLevel.toFixed(1) + " cm";

    tankPercentElement.textContent =
        percent + "%";

    tankPercentLarge.textContent =
        percent + "%";

    tankFill.style.width =
        percent + "%";


    // Tank status
    if (distance <= 10) {

        tankStatus.textContent = "GOOD";

        tankAlertText.textContent =
            "Tank Level Normal";

    }

    else if (distance <= 25) {

        tankStatus.textContent = "WARNING";

        tankAlertText.textContent =
            "Tank Level Moderate";

    }

    else {

        tankStatus.textContent = "CRITICAL";

        tankAlertText.textContent =
            "LOW WATER LEVEL";
    }


    // Add graph data
    distanceData.push(distance);

    waterLevelData.push(waterLevel);

    addTimeLabel();

    limitGraphData();

    updateStatistics();

    updateCharts();

    updateSystemStatus();
}


// =====================================================
// PH UPDATE
// =====================================================

function updatePH(ph) {

    phElement.textContent =
        Math.round(ph);

    phData.push(ph);

    limitGraphData();

    updateStatistics();

    updateCharts();

    // Your current Arduino gives RAW pH value.
    // These limits match your Arduino code.

    if (ph >= 300 && ph <= 700) {

        phStatus.textContent =
            "NORMAL";

        phStatus.style.color =
            "#00ff9d";

        qualityAlertText.textContent =
            "Water Quality Normal";

    }

    else {

        phStatus.textContent =
            "ALERT";

        phStatus.style.color =
            "#ff3d55";

        qualityAlertText.textContent =
            "Water Quality Alert";
    }


    updateSystemStatus();
}


// =====================================================
// TURBIDITY UPDATE
// =====================================================

function updateTurbidity(turbidity) {

    turbidityElement.textContent =
        Math.round(turbidity);

    turbidityData.push(turbidity);

    limitGraphData();

    updateStatistics();

    updateCharts();


    if (turbidity <= 600) {

        turbidityStatus.textContent =
            "NORMAL";

        turbidityStatus.style.color =
            "#00ff9d";

    }

    else {

        turbidityStatus.textContent =
            "HIGH";

        turbidityStatus.style.color =
            "#ff3d55";
    }


    updateSystemStatus();
}


// =====================================================
// TIME LABEL
// =====================================================

function addTimeLabel() {

    const now = new Date();

    const time =
        now.getHours().toString().padStart(2, "0")
        + ":" +
        now.getMinutes().toString().padStart(2, "0")
        + ":" +
        now.getSeconds().toString().padStart(2, "0");

    timeLabels.push(time);

    if (timeLabels.length > MAX_POINTS) {

        timeLabels.shift();
    }
}


// =====================================================
// LIMIT GRAPH DATA
// =====================================================

function limitGraphData() {

    while (distanceData.length > MAX_POINTS) {
        distanceData.shift();
    }

    while (waterLevelData.length > MAX_POINTS) {
        waterLevelData.shift();
    }

    while (phData.length > MAX_POINTS) {
        phData.shift();
    }

    while (turbidityData.length > MAX_POINTS) {
        turbidityData.shift();
    }
}


// =====================================================
// SYSTEM STATUS
// =====================================================

function updateSystemStatus() {

    sampleCount++;

    sampleCountElement.textContent =
        sampleCount;

    const now = new Date();

    lastUpdate.textContent =
        now.toLocaleTimeString();

    systemStatus.textContent =
        "LIVE MONITORING";
}


// =====================================================
// CHART SETUP
// =====================================================

const waterChart =
    new Chart(
        document.getElementById("waterChart"),
        {

            type: "line",

            data: {

                labels: timeLabels,

                datasets: [

                    {
                        label: "Water Level (cm)",

                        data: waterLevelData,

                        borderWidth: 2,

                        tension: 0.3,

                        fill: true
                    }

                ]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                animation: false,

                scales: {

                    y: {

                        beginAtZero: true,

                        max: TANK_HEIGHT

                    }

                }
            }
        }
    );


// =====================================================
// PH CHART
// =====================================================

const phChart =
    new Chart(
        document.getElementById("phChart"),
        {

            type: "line",

            data: {

                labels: timeLabels,

                datasets: [

                    {
                        label: "pH Raw Value",

                        data: phData,

                        borderWidth: 2,

                        tension: 0.3,

                        fill: true
                    }

                ]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                animation: false
            }
        }
    );


// =====================================================
// TURBIDITY CHART
// =====================================================

const turbidityChart =
    new Chart(
        document.getElementById("turbidityChart"),
        {

            type: "line",

            data: {

                labels: timeLabels,

                datasets: [

                    {
                        label: "Turbidity",

                        data: turbidityData,

                        borderWidth: 2,

                        tension: 0.3,

                        fill: true
                    }

                ]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                animation: false
            }
        }
    );


// =====================================================
// UPDATE CHARTS
// =====================================================

function updateCharts() {

    waterChart.data.labels =
        [...timeLabels];

    waterChart.data.datasets[0].data =
        [...waterLevelData];

    waterChart.update("none");


    phChart.data.labels =
        [...timeLabels];

    phChart.data.datasets[0].data =
        [...phData];

    phChart.update("none");


    turbidityChart.data.labels =
        [...timeLabels];

    turbidityChart.data.datasets[0].data =
        [...turbidityData];

    turbidityChart.update("none");


    updateAverages();
}


// =====================================================
// AVERAGES
// =====================================================

function calculateAverage(array) {

    if (array.length === 0) {

        return "--";
    }

    let total = 0;

    for (let value of array) {

        total += value;
    }

    return (
        total / array.length
    ).toFixed(1);
}


function updateAverages() {

    document.getElementById("waterAverage").textContent =
        "Avg: " +
        calculateAverage(waterLevelData) +
        " cm";


    document.getElementById("phAverage").textContent =
        "Avg: " +
        calculateAverage(phData);


    document.getElementById("turbidityAverage").textContent =
        "Avg: " +
        calculateAverage(turbidityData);
}


// =====================================================
// STATISTICS
// =====================================================

function updateStatistics() {

    if (waterLevelData.length > 0) {

        document.getElementById("maxWater").textContent =
            Math.max(...waterLevelData).toFixed(1) +
            " cm";

        document.getElementById("minWater").textContent =
            Math.min(...waterLevelData).toFixed(1) +
            " cm";
    }


    if (phData.length > 0) {

        document.getElementById("maxPh").textContent =
            Math.max(...phData).toFixed(0);

        document.getElementById("minPh").textContent =
            Math.min(...phData).toFixed(0);
    }


    if (turbidityData.length > 0) {

        document.getElementById("maxTurbidity").textContent =
            Math.max(...turbidityData).toFixed(0);

        document.getElementById("minTurbidity").textContent =
            Math.min(...turbidityData).toFixed(0);
    }
}


// =====================================================
// CLEAR GRAPHS
// =====================================================

document.getElementById("clearBtn")
    .addEventListener("click", function () {

        distanceData = [];
        waterLevelData = [];
        phData = [];
        turbidityData = [];
        timeLabels = [];

        sampleCount = 0;

        sampleCountElement.textContent = "0";

        waterChart.data.labels = [];
        waterChart.data.datasets[0].data = [];
        waterChart.update();


        phChart.data.labels = [];
        phChart.data.datasets[0].data = [];
        phChart.update();


        turbidityChart.data.labels = [];
        turbidityChart.data.datasets[0].data = [];
        turbidityChart.update();


        document.getElementById("maxWater").textContent = "--";
        document.getElementById("minWater").textContent = "--";

        document.getElementById("maxPh").textContent = "--";
        document.getElementById("minPh").textContent = "--";

        document.getElementById("maxTurbidity").textContent = "--";
        document.getElementById("minTurbidity").textContent = "--";

    });


// =====================================================
// CSV DOWNLOAD
// =====================================================

document.getElementById("downloadBtn")
    .addEventListener("click", function () {

        let csv =
            "Time,Water Level (cm),Distance (cm),pH Raw,Turbidity\n";


        let rows =
            Math.max(
                timeLabels.length,
                waterLevelData.length,
                distanceData.length,
                phData.length,
                turbidityData.length
            );


        for (let i = 0; i < rows; i++) {

            csv +=
                (timeLabels[i] || "") + "," +
                (waterLevelData[i] || "") + "," +
                (distanceData[i] || "") + "," +
                (phData[i] || "") + "," +
                (turbidityData[i] || "") +
                "\n";
        }


        const blob =
            new Blob(
                [csv],
                {
                    type: "text/csv"
                }
            );


        const url =
            URL.createObjectURL(blob);


        const a =
            document.createElement("a");

        a.href = url;

        a.download =
            "smart-water-data.csv";

        a.click();

        URL.revokeObjectURL(url);

    });
