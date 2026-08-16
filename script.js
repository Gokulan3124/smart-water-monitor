// =====================================================
// SMART WATER MONITORING DASHBOARD
// Arduino UNO + Web Serial
// =====================================================

let port = null;
let reader = null;
let keepReading = false;

let sampleCount = 0;

let distanceData = [];
let phData = [];
let turbidityData = [];
let labels = [];


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
const phElement = document.getElementById("phValue");
const turbidityElement = document.getElementById("turbidityValue");

const waterLevelElement = document.getElementById("waterLevel");
const tankPercentElement = document.getElementById("tankPercent");
const tankPercentLarge = document.getElementById("tankPercentLarge");

const tankStatus = document.getElementById("tankStatus");
const tankFill = document.getElementById("tankFill");

const phStatus = document.getElementById("phStatus");
const turbidityStatus = document.getElementById("turbidityStatus");

const tankAlertText = document.getElementById("tankAlertText");
const qualityAlertText = document.getElementById("qualityAlertText");


// =====================================================
// CHECK WEB SERIAL SUPPORT
// =====================================================

if (!("serial" in navigator)) {

    alert(
        "Web Serial is not supported in this browser.\n\n" +
        "Please use Google Chrome or Microsoft Edge."
    );

    connectBtn.disabled = true;
}


// =====================================================
// CHART SETUP
// =====================================================

const waterCtx =
    document.getElementById("waterChart").getContext("2d");

const phCtx =
    document.getElementById("phChart").getContext("2d");

const turbidityCtx =
    document.getElementById("turbidityChart").getContext("2d");


const waterChart = new Chart(waterCtx, {

    type: "line",

    data: {

        labels: labels,

        datasets: [{

            label: "Water Distance (cm)",

            data: distanceData,

            borderWidth: 3,

            tension: 0.3,

            pointRadius: 2,

            fill: false

        }]

    },

    options: {

        responsive: true,

        maintainAspectRatio: false,

        animation: false,

        scales: {

            y: {
                beginAtZero: true
            }

        }

    }

});


const phChart = new Chart(phCtx, {

    type: "line",

    data: {

        labels: labels,

        datasets: [{

            label: "pH Raw",

            data: phData,

            borderWidth: 3,

            tension: 0.3,

            pointRadius: 2,

            fill: false

        }]

    },

    options: {

        responsive: true,

        maintainAspectRatio: false,

        animation: false

    }

});


const turbidityChart = new Chart(turbidityCtx, {

    type: "line",

    data: {

        labels: labels,

        datasets: [{

            label: "Turbidity",

            data: turbidityData,

            borderWidth: 3,

            tension: 0.3,

            pointRadius: 2,

            fill: false

        }]

    },

    options: {

        responsive: true,

        maintainAspectRatio: false,

        animation: false

    }

});


// =====================================================
// CONNECT BUTTON
// =====================================================

connectBtn.addEventListener("click", connectArduino);


// =====================================================
// CONNECT ARDUINO
// =====================================================

async function connectArduino() {

    try {

        if (!("serial" in navigator)) {

            alert(
                "Web Serial is not supported.\n" +
                "Use Google Chrome or Microsoft Edge."
            );

            return;
        }


        console.log("Requesting Arduino serial port...");


        // Open Chrome port selection window

        port = await navigator.serial.requestPort();


        console.log("Port selected.");


        // IMPORTANT:
        // Arduino Serial.begin(9600)

        await port.open({

            baudRate: 9600

        });


        console.log("Arduino serial port opened.");


        // Update dashboard status

        connectionDot.classList.remove("offline");

        connectionDot.classList.add("online");

        connectionText.textContent =
            "Arduino Connected";

        systemStatus.textContent =
            "SYSTEM ONLINE";

        connectBtn.textContent =
            "ARDUINO CONNECTED";


        connectBtn.disabled = true;


        keepReading = true;


        // Start reading Arduino data

        readSerial();


    }

    catch (error) {

        console.error("Arduino connection error:", error);

        connectionDot.classList.remove("online");

        connectionDot.classList.add("offline");

        connectionText.textContent =
            "Arduino Disconnected";

        systemStatus.textContent =
            "CONNECTION ERROR";


        alert(
            "Could not connect to Arduino.\n\n" +
            "Check:\n" +
            "1. Arduino USB cable is connected\n" +
            "2. Arduino Serial Monitor is CLOSED\n" +
            "3. Correct COM port is selected\n" +
            "4. Arduino code uses Serial.begin(9600)\n" +
            "5. Use Google Chrome or Edge"
        );

    }

}


// =====================================================
// READ SERIAL DATA
// =====================================================

async function readSerial() {

    const decoder =
        new TextDecoderStream();

    const inputDone =
        port.readable.pipeTo(decoder.writable);

    reader =
        decoder.readable.getReader();


    let buffer = "";


    try {

        while (keepReading) {

            const { value, done } =
                await reader.read();


            if (done) {

                console.log("Serial reader stopped.");

                break;
            }


            if (value) {

                console.log("Arduino:", value);

                buffer += value;


                // Arduino uses Serial.println()
                // so split data using newline

                let lines =
                    buffer.split(/\r?\n/);


                // Keep incomplete line

                buffer =
                    lines.pop();


                for (let line of lines) {

                    processArduinoLine(line.trim());

                }

            }

        }

    }

    catch (error) {

        console.error(
            "Serial reading error:",
            error
        );

    }

    finally {

        try {

            reader.releaseLock();

        }

        catch (e) {}

    }

}


// =====================================================
// PROCESS ARDUINO LINE
// =====================================================

function processArduinoLine(line) {

    if (!line) {
        return;
    }


    console.log("Received:", line);


    // -----------------------------------------
    // DISTANCE
    // Example:
    // Distance: 15.23 cm
    // -----------------------------------------

    if (line.startsWith("Distance:")) {

        let match =
            line.match(
                /Distance:\s*(-?\d+(?:\.\d+)?)/i
            );


        if (match) {

            const distance =
                parseFloat(match[1]);


            updateDistance(distance);

        }

    }


    // -----------------------------------------
    // PH
    // Example:
    // pH: 512
    // -----------------------------------------

    else if (
        line.toLowerCase().startsWith("ph:")
    ) {

        let match =
            line.match(
                /pH:\s*(-?\d+(?:\.\d+)?)/i
            );


        if (match) {

            const ph =
                parseFloat(match[1]);


            updatePH(ph);

        }

    }


    // -----------------------------------------
    // TURBIDITY
    // Example:
    // Turbidity: 430
    // -----------------------------------------

    else if (
        line.toLowerCase().startsWith("turbidity:")
    ) {

        let match =
            line.match(
                /Turbidity:\s*(-?\d+(?:\.\d+)?)/i
            );


        if (match) {

            const turbidity =
                parseFloat(match[1]);


            updateTurbidity(turbidity);

            // One complete sample received

            completeSample();

        }

    }

}


// =====================================================
// UPDATE DISTANCE
// =====================================================

function updateDistance(distance) {

    if (distance < 0) {

        distanceElement.textContent =
            "No Echo";

        return;

    }


    distanceElement.textContent =
        distance.toFixed(1);


    // -------------------------------------------------
    // TANK LEVEL CALCULATION
    //
    // Assumption:
    // 0 cm = full
    // 30 cm = empty
    //
    // Change MAX_DISTANCE if your tank is different.
    // -------------------------------------------------

    const MAX_DISTANCE = 30;


    let percent =
        ((MAX_DISTANCE - distance) /
            MAX_DISTANCE) * 100;


    percent =
        Math.max(
            0,
            Math.min(100, percent)
        );


    percent =
        Math.round(percent);


    tankPercentElement.textContent =
        percent + "%";


    tankPercentLarge.textContent =
        percent + "%";


    tankFill.style.width =
        percent + "%";


    // Water level status

    if (percent >= 70) {

        waterLevelElement.textContent =
            "HIGH";

        tankStatus.textContent =
            "GOOD WATER LEVEL";

        tankAlertText.textContent =
            "Normal";

    }

    else if (percent >= 40) {

        waterLevelElement.textContent =
            "MEDIUM";

        tankStatus.textContent =
            "MEDIUM LEVEL";

        tankAlertText.textContent =
            "Monitor Level";

    }

    else {

        waterLevelElement.textContent =
            "LOW";

        tankStatus.textContent =
            "LOW WATER LEVEL";

        tankAlertText.textContent =
            "LOW WATER ALERT";

    }

}


// =====================================================
// UPDATE PH
// =====================================================

function updatePH(ph) {

    phElement.textContent =
        Math.round(ph);


    // Your Arduino currently sends RAW pH value,
    // not actual calibrated pH.

    if (ph >= 300 && ph <= 700) {

        phStatus.textContent =
            "NORMAL";

    }

    else {

        phStatus.textContent =
            "QUALITY ALERT";

    }

}


// =====================================================
// UPDATE TURBIDITY
// =====================================================

function updateTurbidity(turbidity) {

    turbidityElement.textContent =
        Math.round(turbidity);


    if (turbidity <= 600) {

        turbidityStatus.textContent =
            "NORMAL";

    }

    else {

        turbidityStatus.textContent =
            "HIGH TURBIDITY";

    }

}


// =====================================================
// COMPLETE SAMPLE
// =====================================================

function completeSample() {

    sampleCount++;


    sampleCountElement.textContent =
        sampleCount;


    const now =
        new Date();


    const time =
        now.toLocaleTimeString();


    lastUpdate.textContent =
        time;


    labels.push(time);


    // Add current values

    const distance =
        parseFloat(
            distanceElement.textContent
        );

    const ph =
        parseFloat(
            phElement.textContent
        );

    const turbidity =
        parseFloat(
            turbidityElement.textContent
        );


    if (!isNaN(distance)) {

        distanceData.push(distance);

    }

    else {

        distanceData.push(null);

    }


    if (!isNaN(ph)) {

        phData.push(ph);

    }

    else {

        phData.push(null);

    }


    if (!isNaN(turbidity)) {

        turbidityData.push(turbidity);

    }

    else {

        turbidityData.push(null);

    }


    // Keep last 50 samples

    if (labels.length > 50) {

        labels.shift();

        distanceData.shift();

        phData.shift();

        turbidityData.shift();

    }


    waterChart.update("none");

    phChart.update("none");

    turbidityChart.update("none");


    updateStatistics();

}


// =====================================================
// STATISTICS
// =====================================================

function updateStatistics() {

    updateArrayStatistics(
        distanceData,
        "maxWater",
        "minWater"
    );


    updateArrayStatistics(
        phData,
        "maxPh",
        "minPh"
    );


    updateArrayStatistics(
        turbidityData,
        "maxTurbidity",
        "minTurbidity"
    );


    updateAverage(
        distanceData,
        "waterAverage"
    );


    updateAverage(
        phData,
        "phAverage"
    );


    updateAverage(
        turbidityData,
        "turbidityAverage"
    );

}


// =====================================================
// MAX / MIN
// =====================================================

function updateArrayStatistics(
    data,
    maxId,
    minId
) {

    const valid =
        data.filter(
            x => typeof x === "number" && !isNaN(x)
        );


    if (valid.length === 0) {

        return;

    }


    const max =
        Math.max(...valid);


    const min =
        Math.min(...valid);


    document.getElementById(maxId)
        .textContent =
        max.toFixed(1);


    document.getElementById(minId)
        .textContent =
        min.toFixed(1);

}


// =====================================================
// AVERAGE
// =====================================================

function updateAverage(data, id) {

    const valid =
        data.filter(
            x => typeof x === "number" && !isNaN(x)
        );


    if (valid.length === 0) {

        return;

    }


    const sum =
        valid.reduce(
            (a, b) => a + b,
            0
        );


    const average =
        sum / valid.length;


    document.getElementById(id)
        .textContent =
        "Avg: " + average.toFixed(1);

}


// =====================================================
// CLEAR GRAPHS
// =====================================================

document
    .getElementById("clearBtn")
    .addEventListener(
        "click",
        clearGraphs
    );


function clearGraphs() {

    labels.length = 0;

    distanceData.length = 0;

    phData.length = 0;

    turbidityData.length = 0;


    sampleCount = 0;


    sampleCountElement.textContent =
        "0";


    lastUpdate.textContent =
        "--";


    waterChart.update();

    phChart.update();

    turbidityChart.update();


    [
        "maxWater",
        "minWater",
        "maxPh",
        "minPh",
        "maxTurbidity",
        "minTurbidity"
    ].forEach(id => {

        document.getElementById(id)
            .textContent = "--";

    });


    [
        "waterAverage",
        "phAverage",
        "turbidityAverage"
    ].forEach(id => {

        document.getElementById(id)
            .textContent = "Avg: --";

    });

}


// =====================================================
// DOWNLOAD CSV
// =====================================================

document
    .getElementById("downloadBtn")
    .addEventListener(
        "click",
        downloadCSV
    );


function downloadCSV() {

    let csv =
        "Time,Distance_cm,pH_Raw,Turbidity\n";


    for (
        let i = 0;
        i < labels.length;
        i++
    ) {

        csv +=
            labels[i] + "," +
            distanceData[i] + "," +
            phData[i] + "," +
            turbidityData[i] +
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

}
