# URBANDRAINX 2.0 — Apache Spark & Scala Historical Analytics Layer

This directory (`spark-scala/`) contains the dedicated **Apache Spark and Scala** big data processing engine for **URBANDRAINX 2.0**. It performs distributed analysis of historical municipal drainage chamber sensor readings collected across the Greater Chennai Metropolitan Area.

---

## 1. Architectural Role in URBANDRAINX 2.0

The URBANDRAINX 2.0 architecture integrates Apache Spark and Scala as a high-throughput, non-destructive historical analytics service alongside the existing IoT and web stack:

```
[IoT Sensor Nodes] (ESP32: Water Level, MQ-7, MQ-6, MQ-136, Temp/Humidity)
        │
        ▼ (LoRa Gateway / HTTPS)
[Node.js / Express.js Backend] (Real-Time Ingestion, Routing, Auth, Socket.io)
        │
        ▼ (Stores Raw Telemetry)
[MongoDB Database] (Collection: 'sensor_readings', 'drains', 'devices', 'alerts')
        │
        │ ◄──────────────────────────────┐
        ▼ (Reads Historical Batches)     │ (Writes Structured Summaries)
[Apache Spark & Scala Analytics Engine] ─┘ (Collection: 'analytics_results')
        │
        ▼ (Retrieves Analyzed Aggregations)
[Node.js / Express.js REST API] (/api/analytics/spark-results, /api/analytics/insights)
        │
        ▼ (Interactive Visual Analytics)
[React 18 Dashboard] (Water-level Trends, Gas Safety, Chamber Summaries, Risk Indicators)
```

### Key Principles
1. **Separation of Concerns:** Real-time sensor ingestion remains handled by Node.js/Express. Large-scale historical aggregation is handled by Apache Spark and Scala.
2. **Data Immutability:** Apache Spark **only reads** from `sensor_readings`. It never mutates or drops original sensor readings.
3. **Structured Analytical Persistence:** Spark stores computed statistical summaries, rate-of-rise metrics, gas toxicity indices, and chamber risk levels in `analytics_results`.
4. **Demonstrable Codebase:** All Scala source files are modular, documented, and can be individually reviewed and run.

---

## 2. Directory Structure & Source Files

```text
spark-scala/
├── SparkSessionConfig.scala   # SparkSession configuration, MongoDB URI, memory & partition tuning
├── MongoDBConnector.scala     # Connects Spark to MongoDB, dual-mode reading & safe writes
├── SensorDataProcessor.scala  # Schema coercion, sanity filtering, and metadata enrichment
├── WaterLevelAnalysis.scala   # Water-level fluctuations, surcharge frequency, and blockage detection
├── GasSensorAnalysis.scala    # MQ-7 (CO), MQ-6 (Methane), and MQ-136 (H2S) toxicity hazard index
├── DrainageAnalytics.scala    # Unified chamber summaries, overall risk scores, and status mapping
├── Main.scala                 # End-to-end driver executing the complete Spark analytics workflow
├── build.sbt                  # Standard SBT build configuration
├── run-spark-analytics.bat    # Windows batch runner for automated compilation and execution
├── run-spark-analytics.sh     # Unix/Linux shell runner
├── lib/                       # Bundled MongoDB Spark Connector & Driver JARs
└── README.md                  # Comprehensive architectural and execution guide
```

---

## 3. Implementation of Each Scala Source File

### 1. `SparkSessionConfig.scala`
- Configures and initializes the active Apache Spark session.
- Configures `spark.mongodb.read.connection.uri` and `spark.mongodb.write.connection.uri` for the `urbandrainx` database.
- Tunes shuffle partitions (`4` for local multi-core telemetry) and driver memory (`2g`).
- Provides `getOrCreate()` and `stop()` lifecycle management.

### 2. `MongoDBConnector.scala`
- Connects Spark to the active MongoDB collections:
  - Ingestion: `sensor_readings`, `drains`, `devices`, `alerts`.
  - Persistence: `analytics_results`.
  - Implements dual execution modes:
    - **Native Spark MongoDB Connector** (`spark.read.format("mongodb")`)
    - **Direct JVM MongoDB Driver Fallback** (reads BSON documents and parallelizes to Spark RDD/DataFrame).
- Ensures non-destructive appending to `analytics_results`.

### 3. `SensorDataProcessor.scala`
- Enforces strict data types: `water_level_cm` (Double), `flow_rate_l_min` (Double), `temperature_c` (Double), `humidity_percent` (Double), `mq7_raw_value` (Double), `methane_raw_value` (Double), `h2s_raw_value` (Double).
- Cleans and discards corrupted outlier telemetry (e.g., negative water levels, temperatures outside -10°C to 80°C).
- Standardizes ISO-8601 timestamps.
- Joins sensor telemetry with chamber master records (`drains`) to attach `area_name`, `location_name`, and `drain_status`.

### 4. `WaterLevelAnalysis.scala`
- Computes chamber-wise hydraulic metrics:
  - `avg_water_level_cm`, `min_water_level_cm`, `max_water_level_cm`, `water_level_stddev`.
  - `water_amplitude_cm` (fluctuation spread).
- Identifies threshold violations:
  - Warning Threshold: Water level $\ge$ 25.0 cm.
  - Critical Surcharge: Water level $\ge$ 50.0 cm.
- Estimates **Blockage Probability (%)** by detecting chambers with high water depth paired with restricted outflow.
- Assigns hydraulic risk levels (`Normal`, `Warning`, `Critical`).

### 5. `GasSensorAnalysis.scala`
- Evaluates multi-gas atmospheric readings across underground inspection chambers:
  - **MQ-7 (Carbon Monoxide):** Warning $\ge$ 150.0, Critical $\ge$ 250.0.
  - **MQ-6 (Methane / Combustible):** Warning $\ge$ 1.0, Critical $\ge$ 2.0.
  - **MQ-136 (Hydrogen Sulfide - H2S):** Warning $\ge$ 0.35, Critical $\ge$ 0.70.
- Correlates ambient temperature and humidity with gas volatility.
- Computes the composite **Gas Hazard Index (0 to 100)**.
- Determines atmospheric safety risk level (`Normal`, `Warning`, `Critical`).

### 6. `DrainageAnalytics.scala`
- Combines hydraulic dynamics, gas toxicity measurements, and chamber master records.
- Computes `overall_risk_level`: `Low`, `Moderate`, `High`, or `Critical`.
- Determines physical `drain_condition` and operational `status`.
- Calculates total `abnormal_reading_count` and `repeated_violation_count`.
- Structures the final schema matching MongoDB `analytics_results` collection.

### 7. `Main.scala`
- The main entry point driver.
- Orchestrates the sequential pipeline:
  `SparkSessionConfig` $\rightarrow$ `MongoDBConnector` $\rightarrow$ `SensorDataProcessor` $\rightarrow$ `WaterLevelAnalysis` $\rightarrow$ `GasSensorAnalysis` $\rightarrow$ `DrainageAnalytics` $\rightarrow$ Console Summary $\rightarrow$ `MongoDB Persistence`.
- Displays top chambers with detected anomalies, overall risk distribution, and execution duration.

---

## 4. Database Collections Integration

| MongoDB Collection | Access Mode | Purpose |
|--------------------|-------------|---------|
| `sensor_readings` | **READ ONLY** | Raw telemetry from field chambers (water level, flow, MQ-7, MQ-6, MQ-136, temp, humidity). |
| `drains` | **READ ONLY** | Chamber master records (chamber ID, area name, coordinates, installation status). |
| `devices` | **READ ONLY** | IoT gateway and hardware device mapping. |
| `alerts` | **READ ONLY** | Historical threshold incident alerts. |
| `analytics_results` | **WRITE (Append)** | Target collection for Spark-generated summaries, metrics, and risk classifications. |
| `users` | **N/A** | RBAC authentication handled by Express.js backend. |

---

## 5. How to Compile and Run

### Prerequisites
- **Java:** JDK 17 or JDK 21 (`java -version`)
- **Apache Spark:** Spark 3.x or 4.x with Scala 2.13 (`spark-submit --version`)
- **MongoDB:** Running instance on `127.0.0.1:27017` (database `urbandrainx`)

### Automated One-Click Execution (Windows)
From the project directory, run:
```powershell
cd spark-scala
.\run-spark-analytics.bat
```

### Manual Compilation & Execution via `scalac` / `spark-submit`
1. **Compile Scala sources into bytecode:**
```powershell
mkdir target\classes
java -cp "D:\spark-4.2.0-bin-hadoop3\jars\*;lib\*" scala.tools.nsc.Main -d target\classes -cp "lib\*" SparkSessionConfig.scala MongoDBConnector.scala SensorDataProcessor.scala WaterLevelAnalysis.scala GasSensorAnalysis.scala DrainageAnalytics.scala Main.scala
```

2. **Package into JAR:**
```powershell
jar -cvf target\urbandrainx-spark-analytics.jar -C target\classes .
```

3. **Submit the job with Apache Spark:**
```powershell
D:\spark-4.2.0-bin-hadoop3\bin\spark-submit.cmd --class org.urbandrainx.analytics.Main --jars lib\mongo-spark-connector_2.13-10.4.0.jar,lib\mongodb-driver-sync-4.11.1.jar,lib\mongodb-driver-core-4.11.1.jar,lib\bson-4.11.1.jar,lib\bson-record-codec-4.11.1.jar target\urbandrainx-spark-analytics.jar
```

---

## 6. Verification and Website Connection

1. **Verify Analytics in MongoDB:**
   Query `analytics_results` to confirm generated records:
   ```javascript
   db.analytics_results.find({ analysis_type: "SPARK_SCALA_BATCH_ANALYTICS" }).sort({ created_at: -1 }).limit(5)
   ```

2. **Verify Node.js Express Endpoints:**
   - `GET /api/analytics/spark-results`: Returns the latest Spark analytical records.
   - `GET /api/analytics/insights`: Returns aggregated chamber summaries.

3. **Verify React Dashboard:**
   - Navigate to **Analytics & Anomalies** in the URBANDRAINX 2.0 dashboard to view the interactive water-level trend charts, gas hazard distributions, chamber anomaly frequency tables, and Spark-calculated risk levels.
