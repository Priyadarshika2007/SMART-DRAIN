package org.urbandrainx.analytics

import org.apache.spark.sql.functions._

/**
 * ============================================================================
 * URBANDRAINX 2.0 - Main Execution Driver
 * ============================================================================
 * Entry point for executing the complete Apache Spark & Scala analytics workflow
 * on historical drainage sensor telemetry.
 *
 * Workflow:
 *  1. Initialize Apache Spark session with MongoDB connectivity
 *  2. Ingest raw historical sensor measurements from `sensor_readings`
 *  3. Ingest drainage chamber metadata from `drains`
 *  4. Execute data cleaning, validation, and schema coercion
 *  5. Perform hydraulic and water-level variation analysis
 *  6. Perform multi-gas (MQ-7, MQ-6, MQ-136) toxicity and environmental analysis
 *  7. Synthesize chamber-wise statistical summaries and operational risk indicators
 *  8. Display structured monitoring insights on console
 *  9. Store analytical results in MongoDB collection `analytics_results`
 * 10. Cleanly terminate Spark session
 */
object Main {

  def main(args: Array[String]): Unit = {
    val banner =
      """
        |================================================================================
        |  _   _ ____  ____     _    _   _ ____  ____     _    ___ _   _  __  __   ____   ___  
        | | | | |  _ \| __ )   / \  | \ | |  _ \|  _ \   / \  |_ _| \ | | \ \/ /  |___ \ / _ \ 
        | | | | | |_) |  _ \  / _ \ |  \| | | | | |_) | / _ \  | ||  \| |  \  /____ __) | | | |
        | | |_| |  _ <| |_) |/ ___ \| |\  | |_| |  _ < / ___ \ | || |\  |  /  \_____/ __/| |_| |
        |  \___/|_| \_\____//_/   \_\_| \_|____/|_| \_\_/   \_\___|_| \_| /_/\_\   |_____|\___/ 
        |
        |  APACHE SPARK & SCALA HISTORICAL SENSOR ANALYTICS ENGINE
        |  Greater Chennai Corporation Municipal Drainage Telemetry Platform
        |================================================================================
        |""".stripMargin

    println(banner)

    // Configuration overrides from arguments or environment
    val mongoUri = sys.env.getOrElse(
      "MONGODB_URI",
      if (args.length > 0) args(0) else "mongodb://127.0.0.1:27017/urbandrainx"
    )

    val master = sys.env.getOrElse("SPARK_MASTER", "local[*]")

    println(s"[MAIN] Launching UrbanDrainX 2.0 Analytics Engine...")
    println(s"[MAIN] Execution Master : $master")
    println(s"[MAIN] Target MongoDB   : $mongoUri")

    val startTime = System.currentTimeMillis()

    // 1. Initialize Apache Spark Session
    val spark = SparkSessionConfig.getOrCreate(
      appName = "UrbanDrainX-2.0-SparkAnalytics",
      master = master,
      mongoUri = mongoUri
    )

    try {
      // 2. Connect to MongoDB
      val connector = MongoDBConnector(mongoUri = mongoUri, databaseName = "urbandrainx")

      // 3. Read Collections
      println("\n--- STEP 1: READING HISTORICAL DATA FROM MONGODB ---")
      val rawReadingsDf = connector.readSensorReadings(spark)
      val drainsDf = connector.readDrains(spark)

      val totalRawReadings = rawReadingsDf.count()
      val totalDrains = drainsDf.count()
      println(s"[MAIN] Ingested $totalRawReadings historical sensor records across $totalDrains drainage chambers.")

      if (totalRawReadings == 0) {
        println("[MAIN] Warning: No sensor readings found in collection 'sensor_readings'. Terminating early.")
        return
      }

      // 4. Clean, Validate, and Preprocess
      println("\n--- STEP 2: DATA CLEANING & PREPROCESSING ---")
      val cleanedDf = SensorDataProcessor.cleanAndEnrich(rawReadingsDf, drainsDf)
      cleanedDf.cache()
      val cleanedCount = cleanedDf.count()
      println(s"[MAIN] Preprocessed $cleanedCount valid sensor readings ready for distributed analytics.")

      // 5. Water Level & Hydraulic Analysis
      println("\n--- STEP 3: WATER-LEVEL & HYDRAULIC TREND ANALYSIS ---")
      val waterAnalysisDf = WaterLevelAnalysis.analyze(cleanedDf)
      waterAnalysisDf.cache()

      // 6. Atmospheric Gas Sensor Analysis
      println("\n--- STEP 4: MULTI-GAS (MQ-7, MQ-6, MQ-136) SAFETY ANALYSIS ---")
      val gasAnalysisDf = GasSensorAnalysis.analyze(cleanedDf)
      gasAnalysisDf.cache()

      // 7. Synthesize Chamber-Wise Analytics & Risk Indicators
      println("\n--- STEP 5: PRODUCING CHAMBER-WISE STATISTICAL SUMMARIES ---")
      val analyticsResultsDf = DrainageAnalytics.generate(cleanedDf, waterAnalysisDf, gasAnalysisDf)
      analyticsResultsDf.cache()

      val chamberCount = analyticsResultsDf.count()

      // 8. Display Results Summary on Console
      println("\n================================================================================")
      println("                       SPARK ANALYTICS EXECUTION SUMMARY                        ")
      println("================================================================================")

      // Chamber Overview Table
      println("\n[TOP CHAMBERS BY DETECTED SENSOR ANOMALIES & RISK]")
      analyticsResultsDf
        .select(
          col("drain_id"),
          col("area_name"),
          col("avg_water_level_cm").as("avg_wtr_cm"),
          col("max_water_level_cm").as("max_wtr_cm"),
          col("avg_mq7_value").as("avg_co"),
          col("avg_h2s_value").as("avg_h2s"),
          col("abnormal_reading_count").as("anomalies"),
          col("overall_risk_level").as("risk"),
          col("drain_condition").as("condition")
        )
        .orderBy(col("anomalies").desc, col("max_wtr_cm").desc)
        .show(15, truncate = false)

      // Overall Risk Breakdown
      println("[OVERALL RISK LEVEL DISTRIBUTION]")
      analyticsResultsDf
        .groupBy("overall_risk_level")
        .count()
        .orderBy(col("count").desc)
        .show(false)

      // 9. Persist Analytics Results in MongoDB
      println("--- STEP 6: STORING RESULTS IN MONGODB (analytics_results) ---")
      connector.writeAnalyticsResults(analyticsResultsDf, spark)

      val durationSec = (System.currentTimeMillis() - startTime) / 1000.0
      println("\n================================================================================")
      println(s"  SUCCESS: Analyzed $cleanedCount readings across $chamberCount chambers in ${durationSec}s")
      println("  Original sensor_readings collection preserved without modification.")
      println("  New analytical insights saved to MongoDB collection: 'analytics_results'.")
      println("================================================================================\n")

    } catch {
      case ex: Throwable =>
        println(s"\n[MAIN] FATAL ERROR during Spark analytics processing: ${ex.getMessage}")
        ex.printStackTrace()
        System.exit(1)
    } finally {
      // 10. Terminate Spark Session
      SparkSessionConfig.stop(spark)
    }
  }
}
