package org.urbandrainx.analytics

import org.apache.spark.sql.DataFrame
import org.apache.spark.sql.functions._

/**
 * ============================================================================
 * URBANDRAINX 2.0 - WaterLevelAnalysis
 * ============================================================================
 * Specialized Apache Spark analytics module for hydraulic and water-level trends.
 *
 * Capabilities:
 *  - Computes chamber-wise water-level metrics (Average, Min, Max, Variance, StdDev)
 *  - Detects threshold violations:
 *      * Warning Threshold:  Water Level > 25.0 cm
 *      * Critical Surcharge: Water Level > 50.0 cm
 *  - Calculates repeated violation occurrences per chamber
 *  - Computes rate of water fluctuation (Max - Min amplitude)
 *  - Evaluates hydraulic blockage probability (High water level accompanied by restricted discharge)
 *  - Categorizes hydraulic risk level (Normal, Warning, Critical)
 */
object WaterLevelAnalysis {

  val WATER_LEVEL_WARNING_CM = 25.0
  val WATER_LEVEL_CRITICAL_CM = 50.0
  val LOW_FLOW_BLOCKAGE_THRESHOLD_LMIN = 50.0

  /**
   * Executes water-level aggregation and anomaly violation analysis by drainage chamber.
   *
   * @param cleanedDf Preprocessed DataFrame from SensorDataProcessor
   * @return Aggregated DataFrame containing chamber hydraulic metrics
   */
  def analyze(cleanedDf: DataFrame): DataFrame = {
    println("[WATER-LEVEL-ANALYSIS] Analyzing water-level variations and threshold violations...")

    // Add row-level violation flags
    val withFlags = cleanedDf
      .withColumn(
        "is_water_warning",
        when(col("water_level_cm") >= lit(WATER_LEVEL_WARNING_CM) && col("water_level_cm") < lit(WATER_LEVEL_CRITICAL_CM), 1).otherwise(0)
      )
      .withColumn(
        "is_water_critical",
        when(col("water_level_cm") >= lit(WATER_LEVEL_CRITICAL_CM), 1).otherwise(0)
      )
      .withColumn(
        "is_hydraulic_blockage_suspect",
        when(col("water_level_cm") >= lit(20.0) && col("flow_rate_l_min") < lit(LOW_FLOW_BLOCKAGE_THRESHOLD_LMIN), 1).otherwise(0)
      )

    // Aggregate by drain_id
    val aggregated = withFlags
      .groupBy("drain_id")
      .agg(
        count("reading_id").as("reading_count"),
        round(avg("water_level_cm"), 2).as("avg_water_level_cm"),
        round(min("water_level_cm"), 2).as("min_water_level_cm"),
        round(max("water_level_cm"), 2).as("max_water_level_cm"),
        round(coalesce(stddev("water_level_cm"), lit(0.0)), 2).as("water_level_stddev"),
        round(avg("flow_rate_l_min"), 2).as("avg_flow_rate_l_min"),
        round(max("flow_rate_l_min"), 2).as("max_flow_rate_l_min"),
        sum("is_water_warning").as("water_warning_count"),
        sum("is_water_critical").as("water_critical_count"),
        sum("is_hydraulic_blockage_suspect").as("blockage_suspect_count"),
        min("cleaned_timestamp").as("analysis_start"),
        max("cleaned_timestamp").as("analysis_end")
      )
      .withColumn(
        "water_amplitude_cm",
        round(col("max_water_level_cm") - col("min_water_level_cm"), 2)
      )
      .withColumn(
        "water_violation_count",
        col("water_warning_count") + (col("water_critical_count") * 2)
      )
      // Categorize Water Risk Level
      .withColumn(
        "water_risk_level",
        when(col("water_critical_count") > 0 || col("avg_water_level_cm") >= lit(WATER_LEVEL_CRITICAL_CM), "Critical")
          .when(col("water_warning_count") > 2 || col("avg_water_level_cm") >= lit(WATER_LEVEL_WARNING_CM), "Warning")
          .otherwise("Normal")
      )
      // Estimate Blockage Probability Score [0.0 - 100.0]
      .withColumn(
        "blockage_probability_pct",
        round(
          least(
            lit(100.0),
            (col("blockage_suspect_count") / greatest(col("reading_count"), lit(1))) * 100.0 * 1.5 +
              when(col("water_amplitude_cm") > 30.0, 20.0).otherwise(0.0)
          ),
          1
        )
      )

    println(s"[WATER-LEVEL-ANALYSIS] Completed water-level trend analysis across ${aggregated.count()} chambers.")
    aggregated
  }
}
