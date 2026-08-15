# 💧 Smart Water Monitoring System

## 📌 Project Overview

The **Smart Water Monitoring System** is an Arduino UNO based system designed to continuously monitor:

- 💧 Water tank level
- 🧪 Water pH
- 🌫️ Water turbidity
- 🚦 Tank-level status using LEDs
- 📱 SMS alerts using SIM800L GSM
- 🖥️ Real-time sensor data through Serial Monitor
- 📺 Real-time information on SH1106 OLED display

The system provides separate alerts for **low water level** and **poor water quality**.

---

## 🎯 Objectives

- Monitor water tank level automatically.
- Monitor pH of the water.
- Monitor water turbidity.
- Provide visual indication using Green, Yellow and Red LEDs.
- Send SMS alerts when the tank level becomes low.
- Send separate SMS alerts when water quality parameters cross the defined limits.
- Display real-time sensor values.
- Provide a foundation for future IoT/cloud dashboard integration.

---

## ⚙️ Hardware Components

| Component | Quantity |
|---|---:|
| Arduino UNO | 1 |
| HC-SR04 Ultrasonic Sensor | 1 |
| pH Sensor | 1 |
| Turbidity Sensor | 1 |
| SH1106 128×64 OLED Display | 1 |
| SIM800L GSM Module | 1 |
| Green LED | 1 |
| Yellow LED | 1 |
| Red LED | 1 |
| Resistors | As required |
| External power supply for SIM800L | 1 |
| Boost Converter | 1 |
| Jumper Wires | As required |

---

# 🔌 Pin Connections

## Arduino UNO → Ultrasonic Sensor

| HC-SR04 | Arduino UNO |
|---|---|
| VCC | 5V |
| GND | GND |
| TRIG | D9 |
| ECHO | D10 |

---

## Arduino UNO → pH Sensor

| pH Sensor | Arduino UNO |
|---|---|
| VCC | 5V |
| GND | GND |
| Analog Output | A0 |

---

## Arduino UNO → Turbidity Sensor

| Turbidity Sensor | Arduino UNO |
|---|---|
| VCC | 5V |
| GND | GND |
| Analog Output | A1 |

---

## Arduino UNO → LEDs

| LED | Arduino UNO |
|---|---|
| Green LED | D4 |
| Yellow LED | D5 |
| Red LED | D6 |

Use a suitable resistor in series with each LED.

---

## Arduino UNO → SH1106 OLED

The OLED uses the Arduino UNO's I2C interface.

| SH1106 OLED | Arduino UNO |
|---|---|
| VCC | 5V* |
| GND | GND |
| SDA | A4 |
| SCL | A5 |

\* Use the voltage specified by your particular OLED module.

---

## Arduino UNO → SIM800L

The GSM module communicates with the Arduino through SoftwareSerial.

| SIM800L | Arduino UNO |
|---|---|
| TXD | D7 |
| RXD | D8 |
| GND | GND |

**Important:** The SIM800L should use a suitable external power supply capable of handling its current peaks.

For the SIM800L RX input, use an appropriate **logic-level/voltage reduction arrangement** if required by your module.

### GSM Power

The SIM800L is powered separately using an external battery/boost-converter power arrangement.

**Important:**

- Do not power the SIM800L directly from the Arduino 5V pin.
- The SIM800L power supply must be suitable for the module.
- Arduino GND and SIM800L GND must have a **common ground** for reliable serial communication.

---

# 📐 Complete Arduino Pin Summary

| Arduino Pin | Function |
|---|---|
| D4 | Green LED |
| D5 | Yellow LED |
| D6 | Red LED |
| D7 | SIM800L RX |
| D8 | SIM800L TX |
| D9 | Ultrasonic TRIG |
| D10 | Ultrasonic ECHO |
| A0 | pH Sensor |
| A1 | Turbidity Sensor |
| A4 | OLED SDA |
| A5 | OLED SCL |

---

# 🚦 LED Indication

The LEDs indicate the **ultrasonic distance/tank condition**.

### 🟢 Green

Distance ≤ 10 cm

Indicates the water level is in the desired/high-level range.

### 🟡 Yellow

Distance > 10 cm and ≤ 25 cm

Indicates a moderate water level.

### 🔴 Red

Distance > 25 cm

Indicates a low water level condition.

> The LED indication is based on the ultrasonic sensor distance.

---

# 🧪 Water Quality Monitoring

The system reads:

### pH Sensor

The Arduino reads the pH sensor through analog pin A0.

The current program uses the following raw-value limits:

```text
pH Raw < 300     → Quality Alert
pH Raw > 700     → Quality Alert
