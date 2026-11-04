package org.urbandrainx.analytics

import org.apache.spark.sql.{DataFrame, SparkSession}
import org.apache.spark.sql.functions._
import org.apache.spark.sql.types._

/**
 * ============================================================================
 * URBANDRAINX 2.0 - SensorDataProcessor
 * ============================================================================
 * Reads, cleans, validates, and preprocesses historical drainage sensor records.
 *
 * Operations performed:
 *  - Schema enforcement and type coercion (water level, gas readings, flow rate)
 *  - Filtering corrupted, negative, or physically impossible sensor telemetry
 *  - Standardizing ISO-8601 timestamps
 *  - Joining sensor telemetry with chamber master records (`drains`)
 *  - Deriving baseline environmental status and telemetry quality metrics
 */
object SensorDataProcessor {

  /**
   * Cleans and validates raw historical sensor readings DataFrame.
   *
   * @param rawReadingsDf Raw DataFrame from `sensor_readings` collection
   * @param drainsDf      Chamber master DataFrame from `drains` collection
   * @return Cleaned, validated, and enriched DataFrame
   */
  def cleanAndEnrich(rawReadingsDf: DataFrame, drainsDf: DataFrame): DataFrame = {
    println(s"[SENSOR-PROCESSOR] Starting sensor data cleaning and validation pipeline...")

    // 1. Column standardization and casting
    var df = rawReadingsDf

    // Ensure all critical columns exist with proper casting
    df = df
      .withColumn("reading_id", coalesce(col("reading_id").cast(LongType), lit(0L)))
      .withColumn("drain_id", trim(upper(coalesce(col("drain_id").cast(StringType), lit("UNKNOWN")))))
      .withColumn("device_id", trim(upper(coalesce(col("device_id").cast(StringType), lit("DEV000")))))
      .withColumn("water_level_cm", coalesce(col("water_level_cm").cast(DoubleType), lit(0.0)))
      .withColumn("flow_rate_l_min", coalesce(col("flow_rate_l_min").cast(DoubleType), lit(0.0)))
      .withColumn("temperature_c", coalesce(col("temperature_c").cast(DoubleType), lit(25.0)))
      .withColumn("humidity_percent", coalesce(col("humidity_percent").cast(DoubleType), lit(50.0)))
      .withColumn("mq7_raw_value", coalesce(col("mq7_raw_value").cast(DoubleType), lit(0.0)))
      .withColumn("methane_raw_value", coalesce(col("methane_raw_value").cast(DoubleType), lit(0.0)))
      .withColumn("h2s_raw_value", coalesce(col("h2s_raw_value").cast(DoubleType), lit(0.0)))
      .withColumn("dhi_score", coalesce(col("dhi_score").cast(DoubleType), lit(100.0)))

    // 2. Parse timestamps to standard Spark timestamp
    val tsExpr = when(col("timestamp").isNotNull,
      coalesce(
        to_timestamp(col("timestamp")),
        to_timestamp(col("timestamp"), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
        to_timestamp(col("timestamp"), "yyyy-MM-dd HH:mm:ss")
      )
    ).when(col("recorded_at").isNotNull,
      to_timestamp(col("recorded_at"))
    ).otherwise(current_timestamp())

    df = df.withColumn("cleaned_timestamp", tsExpr)

    // 3. Filter out invalid/corrupt rows (telemetry sanity checks)
    // - Valid chamber ID
    // - Non-negative water level (water level must be >= 0.0 and <= 500.0 cm)
    // - Temperature between -10.0 C and 80.0 C
    // - Humidity between 0.0% and 100.0%
    val validCondition = col("drain_id").isNotNull &&
      col("drain_id") =!= "UNKNOWN" &&
      col("water_level_cm") >= 0.0 &&
      col("water_level_cm") <= 500.0 &&
      col("temperature_c") >= -10.0 &&
      col("temperature_c") <= 80.0 &&
      col("humidity_percent") >= 0.0 &&
      col("humidity_percent") <= 100.0

    val initialCount = df.count()
    val cleanedDf = df.filter(validCondition)
    val validCount = cleanedDf.count()

    println(s"[SENSOR-PROCESSOR] Initial records: $initialCount | Valid records: $validCount | Discarded: ${initialCount - validCount}")

    // 4. Enrich with Chamber metadata from `drains` (area_name, location_name, drain_status)
    val enrichedDf = if (drainsDf != null && !drainsDf.isEmpty) {
      val cleanDrains = drainsDf
        .select(
          trim(upper(col("drain_id"))).as("d_drain_id"),
          coalesce(col("area_name"), lit("Chennai")).as("chamber_area"),
          coalesce(col("location_name"), lit("Chamber Inspection Point")).as("chamber_location"),
          coalesce(col("drain_status"), lit("Normal")).as("chamber_master_status")
        )

      cleanedDf.join(cleanDrains, col("drain_id") === col("d_drain_id"), "left_outer")
        .withColumn("area_name", coalesce(col("chamber_area"), lit("Chennai")))
        .withColumn("location_name", coalesce(col("chamber_location"), lit("Chamber Point")))
        .drop("d_drain_id", "chamber_area", "chamber_location")
    } else {
      cleanedDf
        .withColumn("area_name", lit("Chennai"))
        .withColumn("location_name", lit("Chamber Point"))
    }

    println(s"[SENSOR-PROCESSOR] Dataset cleaned and enriched successfully.")
    enrichedDf
  }
}
