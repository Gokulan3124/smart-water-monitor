let port = null;
let reader = null;

const TANK_HEIGHT = 50;

let sampleCount = 0;

let times = [];
let waterData = [];
let phData = [];
let turbidityData = [];

let csvData = [];


// -----------------------------
// ELEMENTS
// -----------------------------

const connectBtn =
    document.getElementById("connectBtn");

const connectionDot =
    document.getElementById("connectionDot");

const connectionText =
    document.getElementById("connectionText");


// -----------------------------
// CHART CREATION
// -----------------------------

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,

    animation: false,

    plugins: {
        legend: {
            display: true
        }
    },

    scales: {
        x: {
            ticks: {
                color: "#78959e"
            },

            grid: {
                color: "#18313a"
            }
        },

        y: {
            ticks: {
                color: "#78959e"
            },

            grid: {
                color: "#18313a"
            }
        }
    }
};


const waterChart =
    new Chart(
        document.getElementById("waterChart"),
        {
            type: "line",

            data: {
                labels: [],
                datasets: [{
                    label: "Water Level (cm)",
                    data: [],
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 2
                }]
            },

            options: chartOptions
        }
    );


const phChart =
    new Chart(
        document.getElementById("phChart"),
        {
            type: "line",

            data: {
                labels: [],
                datasets: [{
                    label: "pH Raw Value",
                    data: [],
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 2
                }]
            },

            options: chartOptions
        }
    );


const turbidityChart =
    new Chart(
        document.getElementById("turbidityChart"),
        {
            type: "line",

            data: {
                labels: [],
                datasets: [{
                    label: "Turbidity",
                    data: [],
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 2
                }]
            },

            options: chartOptions
        }
    );


// -----------------------------
// CONNECT
// -----------------------------

connectBtn.addEventListener(
    "click",
    connectArduino
);


async function connectArduino()
{
    if (!("serial" in navigator))
    {
        alert(
            "Web Serial is not supported in this browser. Use a supported desktop browser such as Chrome."
        );

        return;
    }

    try
    {
        port = await navigator.serial.requestPort();

        await port.open({
            baudRate: 9600
        });

        setConnected(true);

        readSerial();

    }
    catch(error)
    {
        console.error(error);

        setConnected(false);

        alert(
            "Could not connect to Arduino."
        );
    }
}


// -----------------------------
// SERIAL READER
// -----------------------------

async function readSerial()
{
    const decoder =
        new TextDecoderStream();

    const readableStreamClosed =
        port.readable.pipeTo(
            decoder.writable
        );

    reader =
        decoder.readable.getReader();

    let buffer = "";

    try
    {
        while(true)
        {
            const { value, done } =
                await reader.read();

            if(done)
                break;

            buffer += value;

            let lines =
                buffer.split("\n");

            buffer =
                lines.pop();

            for(const line of lines)
            {
                processSerialLine(
                    line.trim()
                );
            }
        }
    }
    catch(error)
    {
        console.error(error);
    }
    finally
    {
        reader.releaseLock();
    }
}


// -----------------------------
// PROCESS ARDUINO DATA
// -----------------------------

function processSerialLine(line)
{
    console.log(line);

    if(!line.startsWith("DATA,"))
        return;

    const parts =
        line.split(",");

    if(parts.length < 4)
        return;

    const distance =
        parseFloat(parts[1]);

    const ph =
        parseFloat(parts[2]);

    const turbidity =
        parseFloat(parts[3]);

    if(isNaN(distance) ||
       isNaN(ph) ||
       isNaN(turbidity))
    {
        return;
    }

    updateDashboard(
        distance,
        ph,
        turbidity
    );
}


// -----------------------------
// UPDATE DASHBOARD
// -----------------------------

function updateDashboard(
    distance,
    ph,
    turbidity
)
{
    sampleCount++;

    const now =
        new Date();

    const time =
        now.toLocaleTimeString();

    // Water level

    let waterLevel =
        TANK_HEIGHT - distance;

    if(waterLevel < 0)
        waterLevel = 0;

    if(waterLevel > TANK_HEIGHT)
        waterLevel = TANK_HEIGHT;


    let tankPercent =
        (waterLevel /
        TANK_HEIGHT) * 100;

    tankPercent =
        Math.max(
            0,
            Math.min(
                100,
                tankPercent
            )
        );


    // -------------------------
    // SENSOR CARDS
    // -------------------------

    document.getElementById(
        "distance"
    ).textContent =
        distance.toFixed(1);


    document.getElementById(
        "waterLevel"
    ).textContent =
        waterLevel.toFixed(1) + " cm";


    document.getElementById(
        "tankPercent"
    ).textContent =
        tankPercent.toFixed(0) + "%";


    document.getElementById(
        "tankPercentLarge"
    ).textContent =
        tankPercent.toFixed(0) + "%";


    document.getElementById(
        "phValue"
    ).textContent =
        ph.toFixed(0);


    document.getElementById(
        "turbidityValue"
    ).textContent =
        turbidity.toFixed(0);


    document.getElementById(
        "sampleCount"
    ).textContent =
        sampleCount;


    document.getElementById(
        "lastUpdate"
    ).textContent =
        time;


    // -------------------------
    // TANK BAR
    // -------------------------

    document.getElementById(
        "tankFill"
    ).style.width =
        tankPercent + "%";


    // -------------------------
    // TANK STATUS
    // -------------------------

    updateTankStatus(
        tankPercent
    );


    // -------------------------
    // PH STATUS
    // -------------------------

    updatePHStatus(
        ph
    );


    // -------------------------
    // TURBIDITY STATUS
    // -------------------------

    updateTurbidityStatus(
        turbidity
    );


    // -------------------------
    // GRAPHS
    // -------------------------

    times.push(time);

    waterData.push(
        waterLevel
    );

    phData.push(
        ph
    );

    turbidityData.push(
        turbidity
    );


    // Keep latest 60 samples

    if(times.length > 60)
    {
        times.shift();
        waterData.shift();
        phData.shift();
        turbidityData.shift();
    }


    waterChart.data.labels =
        times;

    waterChart.data.datasets[0].data =
        waterData;

    waterChart.update();


    phChart.data.labels =
        times;

    phChart.data.datasets[0].data =
        phData;

    phChart.update();


    turbidityChart.data.labels =
        times;

    turbidityChart.data.datasets[0].data =
        turbidityData;

    turbidityChart.update();


    // -------------------------
    // STATISTICS
    // -------------------------

    updateStatistics();


    // -------------------------
    // CSV
    // -------------------------

    csvData.push([
        new Date().toISOString(),
        distance,
        waterLevel,
        tankPercent,
        ph,
        turbidity
    ]);


    // -------------------------
    // SYSTEM STATUS
    // -------------------------

    document.getElementById(
        "systemStatus"
    ).textContent =
        "SYSTEM ONLINE";
}


// -----------------------------
// TANK STATUS
// -----------------------------

function updateTankStatus(percent)
{
    const status =
        document.getElementById(
            "tankStatus"
        );

    const alert =
        document.getElementById(
            "tankAlertText"
        );


    if(percent < 20)
    {
        status.textContent =
            "LOW LEVEL";

        alert.textContent =
            "LOW WATER LEVEL ALERT";
    }

    else if(percent < 50)
    {
        status.textContent =
            "MEDIUM LEVEL";

        alert.textContent =
            "Tank level moderate";
    }

    else
    {
        status.textContent =
            "NORMAL LEVEL";

        alert.textContent =
            "Tank level normal";
    }
}


// -----------------------------
// PH STATUS
// -----------------------------

function updatePHStatus(ph)
{
    const element =
        document.getElementById(
            "phStatus"
        );


    if(ph < 300 || ph > 700)
    {
        element.textContent =
            "⚠ QUALITY ALERT";
    }
    else
    {
        element.textContent =
            "✓ Within Set Range";
    }
}


// -----------------------------
// TURBIDITY STATUS
// -----------------------------

function updateTurbidityStatus(
    turbidity
)
{
    const element =
        document.getElementById(
            "turbidityStatus"
        );

    const alert =
        document.getElementById(
            "qualityAlertText"
        );


    if(turbidity > 600)
    {
        element.textContent =
            "⚠ HIGH TURBIDITY";

        alert.textContent =
            "WATER QUALITY ALERT";
    }
    else
    {
        element.textContent =
            "✓ Within Set Limit";

        alert.textContent =
            "Water quality normal";
    }
}


// -----------------------------
// STATISTICS
// -----------------------------

function updateStatistics()
{
    if(waterData.length === 0)
        return;


    const maxWater =
        Math.max(...waterData);

    const minWater =
        Math.min(...waterData);

    const maxPh =
        Math.max(...phData);

    const minPh =
        Math.min(...phData);

    const maxTurbidity =
        Math.max(...turbidityData);

    const minTurbidity =
        Math.min(...turbidityData);


    const avgWater =
        average(waterData);

    const avgPh =
        average(phData);

    const avgTurbidity =
        average(turbidityData);


    document.getElementById(
        "maxWater"
    ).textContent =
        maxWater.toFixed(1) + " cm";


    document.getElementById(
        "minWater"
    ).textContent =
        minWater.toFixed(1) + " cm";


    document.getElementById(
        "maxPh"
    ).textContent =
        maxPh.toFixed(0);


    document.getElementById(
        "minPh"
    ).textContent =
        minPh.toFixed(0);


    document.getElementById(
        "maxTurbidity"
    ).textContent =
        maxTurbidity.toFixed(0);


    document.getElementById(
        "minTurbidity"
    ).textContent =
        minTurbidity.toFixed(0);


    document.getElementById(
        "waterAverage"
    ).textContent =
        "Avg: " +
        avgWater.toFixed(1) +
        " cm";


    document.getElementById(
        "phAverage"
    ).textContent =
        "Avg: " +
        avgPh.toFixed(0);


    document.getElementById(
        "turbidityAverage"
    ).textContent =
        "Avg: " +
        avgTurbidity.toFixed(0);
}


function average(array)
{
    return array.reduce(
        (a,b) => a + b,
        0
    ) / array.length;
}


// -----------------------------
// CONNECTION STATUS
// -----------------------------

function setConnected(
    connected
)
{
    if(connected)
    {
        connectionDot.className =
            "dot online";

        connectionText.textContent =
            "Arduino Connected";

        connectBtn.textContent =
            "CONNECTED";

        document.getElementById(
            "systemStatus"
        ).textContent =
            "USB CONNECTED";
    }
    else
    {
        connectionDot.className =
            "dot offline";

        connectionText.textContent =
            "Arduino Disconnected";

        connectBtn.textContent =
            "CONNECT ARDUINO";
    }
}


// -----------------------------
// CLEAR
// -----------------------------

document.getElementById(
    "clearBtn"
).addEventListener(
    "click",
    function()
    {
        times = [];
        waterData = [];
        phData = [];
        turbidityData = [];

        waterChart.data.labels = [];
        waterChart.data.datasets[0].data = [];
        waterChart.update();

        phChart.data.labels = [];
        phChart.data.datasets[0].data = [];
        phChart.update();

        turbidityChart.data.labels = [];
        turbidityChart.data.datasets[0].data = [];
        turbidityChart.update();

        csvData = [];

        sampleCount = 0;

        document.getElementById(
            "sampleCount"
        ).textContent = "0";
    }
);


// -----------------------------
// DOWNLOAD CSV
// -----------------------------

document.getElementById(
    "downloadBtn"
).addEventListener(
    "click",
    function()
    {
        if(csvData.length === 0)
        {
            alert(
                "No monitoring data available."
            );

            return;
        }


        let csv =
            "Time,Distance_cm,WaterLevel_cm,TankPercent,pH,Turbidity\n";


        csvData.forEach(
            row =>
            {
                csv +=
                    row.join(",") +
                    "\n";
            }
        );


        const blob =
            new Blob(
                [csv],
                {
                    type:
                    "text/csv"
                }
            );


        const url =
            URL.createObjectURL(
                blob
            );


        const a =
            document.createElement(
                "a"
            );

        a.href = url;

        a.download =
            "water_monitoring_data.csv";

        a.click();

        URL.revokeObjectURL(
            url
        );
    }
);
