package org.urbandrainx.analytics

import org.apache.spark.sql.DataFrame
import org.apache.spark.sql.expressions.Window
import org.apache.spark.sql.functions._
import org.apache.spark.sql.types._

/**
 * ============================================================================
 * URBANDRAINX 2.0 - DrainageAnalytics
 * ============================================================================
 * Synthesizes water-level dynamics and multi-gas atmospheric readings to produce
 * unified chamber-wise statistical summaries, risk scores, and monitoring indicators.
 *
 * Output Schema:
 *  - analysis_id               : Unique identifier for each analytical summary
 *  - drain_id                  : Drainage chamber identifier (e.g., DRN001)
 *  - device_id                 : Associated IoT telemetry device
 *  - area_name                 : Municipal catchment zone (e.g., Velachery, Tambaram)
 *  - avg_water_level_cm        : Mean water level
 *  - min_water_level_cm        : Minimum recorded water level
 *  - max_water_level_cm        : Maximum recorded water level
 *  - avg_temperature_c         : Mean temperature
 *  - avg_humidity_percent      : Mean relative humidity
 *  - avg_mq7_value             : Mean CO gas level
 *  - avg_methane_value         : Mean methane level
 *  - avg_h2s_value             : Mean lethal H2S level
 *  - abnormal_reading_count    : Count of sensor measurements violating thresholds
 *  - repeated_violation_count  : Count of persistent surcharge/toxicity occurrences
 *  - water_risk_level          : Normal | Warning | Critical
 *  - gas_risk_level            : Normal | Warning | Critical
 *  - overall_risk_level        : Low | Moderate | High | Critical
 *  - drain_condition           : Overall physical chamber health indicator
 *  - status                    : Operational state matching platform contracts
 *  - analysis_type             : Engine identifier (SPARK_SCALA_BATCH_ANALYTICS)
 *  - analysis_start            : Earliest sensor timestamp in batch window
 *  - analysis_end              : Latest sensor timestamp in batch window
 *  - analysis_created_at       : Execution timestamp
 *  - created_at                : Database ingestion timestamp
 */
object DrainageAnalytics {

  /**
   * Merges hydraulic and gas analytics into complete, structured chamber monitoring records.
   *
   * @param cleanedDf  Cleaned baseline telemetry
   * @param waterDf    Metrics from WaterLevelAnalysis
   * @param gasDf      Metrics from GasSensorAnalysis
   * @return Unified DataFrame ready for storage in `analytics_results`
   */
  def generate(cleanedDf: DataFrame, waterDf: DataFrame, gasDf: DataFrame): DataFrame = {
    println("[DRAINAGE-ANALYTICS] Synthesizing unified chamber-wise risk and monitoring indicators...")

    // 1. Extract distinct chamber metadata
    val chamberMeta = cleanedDf
      .groupBy("drain_id")
      .agg(
        first("device_id").as("device_id"),
        first("area_name").as("area_name"),
        first("location_name").as("location_name")
      )

    // 2. Join chamber metadata, water analysis, and gas analysis
    val combined = chamberMeta
      .join(waterDf, Seq("drain_id"), "inner")
      .join(gasDf, Seq("drain_id"), "inner")

    // 3. Compute overall risk, condition, and structured indicator fields
    val currentTime = current_timestamp()
    val baseAnalysisId = (System.currentTimeMillis() / 1000L) * 10000L
    val drainWindow = Window.orderBy("drain_id")

    val finalAnalytics = combined
      .withColumn(
        "abnormal_reading_count",
        (col("water_warning_count") + col("water_critical_count") +
          col("mq7_warning_count") + col("mq7_critical_count") +
          col("methane_warning_count") + col("methane_critical_count") +
          col("h2s_warning_count") + col("h2s_critical_count")).cast(IntegerType)
      )
      .withColumn(
        "repeated_violation_count",
        (col("water_critical_count") + col("mq7_critical_count") +
          col("methane_critical_count") + col("h2s_critical_count")).cast(IntegerType)
      )
      // Overall Risk Level Assessment
      .withColumn(
        "overall_risk_level",
        when(col("water_risk_level") === "Critical" || col("gas_risk_level") === "Critical" || col("repeated_violation_count") > 2, "Critical")
          .when(col("water_risk_level") === "Warning" || col("gas_risk_level") === "Warning" || col("abnormal_reading_count") > 3, "High")
          .when(col("blockage_probability_pct") > 35.0 || col("gas_hazard_index") > 25.0, "Moderate")
          .otherwise("Low")
      )
      // Physical Drain Condition Classification
      .withColumn(
        "drain_condition",
        when(col("overall_risk_level") === "Critical", "Critical")
          .when(col("overall_risk_level") === "High", "Warning")
          .when(col("overall_risk_level") === "Moderate", "Warning")
          .otherwise("Normal")
      )
      .withColumn("status", col("drain_condition"))
      .withColumn("analysis_type", lit("SPARK_SCALA_BATCH_ANALYTICS"))
      .withColumn("analysis_created_at", currentTime)
      .withColumn("created_at", currentTime)
      // Deterministic unique analysis_id per batch execution
      .withColumn(
        "analysis_id",
        (lit(baseAnalysisId) + row_number().over(drainWindow)).cast(LongType)
      )

    // Select clean final projection matching MongoDB `analytics_results`
    val result = finalAnalytics.select(
      col("analysis_id"),
      col("drain_id"),
      col("device_id"),
      col("area_name"),
      col("location_name"),
      col("avg_water_level_cm"),
      col("min_water_level_cm"),
      col("max_water_level_cm"),
      col("avg_flow_rate_l_min"),
      col("avg_temperature_c"),
      col("avg_humidity_percent"),
      col("avg_mq7_value"),
      col("avg_methane_value"),
      col("avg_h2s_value"),
      col("abnormal_reading_count"),
      col("repeated_violation_count"),
      col("water_risk_level"),
      col("gas_risk_level"),
      col("overall_risk_level"),
      col("blockage_probability_pct"),
      col("gas_hazard_index"),
      col("drain_condition"),
      col("status"),
      col("analysis_type"),
      col("analysis_start"),
      col("analysis_end"),
      col("analysis_created_at"),
      col("created_at")
    )

    println(s"[DRAINAGE-ANALYTICS] Final structured analytics schema prepared with ${result.columns.length} columns.")
    result
  }
}
