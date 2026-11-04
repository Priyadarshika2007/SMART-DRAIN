package org.urbandrainx.analytics

import org.apache.spark.sql.DataFrame
import org.apache.spark.sql.functions._

/**
 * ============================================================================
 * URBANDRAINX 2.0 - GasSensorAnalysis
 * ============================================================================
 * Multi-gas atmospheric analysis module for municipal underground sewers.
 *
 * Sensors Analyzed:
 *  1. MQ-7   : Carbon Monoxide (CO)
 *               - Safe:     < 150.0 raw/PPM
 *               - Warning:  150.0 - 250.0
 *               - Critical: > 250.0
 *  2. MQ-6   : Methane (CH4) & Combustible Hydrocarbons
 *               - Safe:     < 1.0 raw
 *               - Warning:  1.0 - 2.0
 *               - Critical: > 2.0
 *  3. MQ-136 : Hydrogen Sulfide (H2S - Sewer Lethal Toxicity)
 *               - Safe:     < 0.35 raw
 *               - Warning:  0.35 - 0.70
 *               - Critical: > 0.70
 *
 * Correlation:
 *  - Evaluates temperature and humidity influence on gas concentration
 *  - Calculates Atmospheric Toxicity Hazard Index (0 - 100)
 *  - Identifies repetitive confined-space hazard spikes
 */
object GasSensorAnalysis {

  val MQ7_WARNING_THRESHOLD = 150.0
  val MQ7_CRITICAL_THRESHOLD = 250.0

  val METHANE_WARNING_THRESHOLD = 1.0
  val METHANE_CRITICAL_THRESHOLD = 2.0

  val H2S_WARNING_THRESHOLD = 0.35
  val H2S_CRITICAL_THRESHOLD = 0.70

  /**
   * Processes atmospheric gas measurements and computes chamber-wise safety indicators.
   *
   * @param cleanedDf Preprocessed DataFrame from SensorDataProcessor
   * @return Aggregated gas and environmental metrics by drainage chamber
   */
  def analyze(cleanedDf: DataFrame): DataFrame = {
    println("[GAS-SENSOR-ANALYSIS] Analyzing MQ-7, MQ-6 (Methane), and MQ-136 (H2S) atmospheric readings...")

    // Add row-level atmospheric danger flags
    val withGasFlags = cleanedDf
      .withColumn(
        "is_mq7_warning",
        when(col("mq7_raw_value") >= lit(MQ7_WARNING_THRESHOLD) && col("mq7_raw_value") < lit(MQ7_CRITICAL_THRESHOLD), 1).otherwise(0)
      )
      .withColumn(
        "is_mq7_critical",
        when(col("mq7_raw_value") >= lit(MQ7_CRITICAL_THRESHOLD), 1).otherwise(0)
      )
      .withColumn(
        "is_methane_warning",
        when(col("methane_raw_value") >= lit(METHANE_WARNING_THRESHOLD) && col("methane_raw_value") < lit(METHANE_CRITICAL_THRESHOLD), 1).otherwise(0)
      )
      .withColumn(
        "is_methane_critical",
        when(col("methane_raw_value") >= lit(METHANE_CRITICAL_THRESHOLD), 1).otherwise(0)
      )
      .withColumn(
        "is_h2s_warning",
        when(col("h2s_raw_value") >= lit(H2S_WARNING_THRESHOLD) && col("h2s_raw_value") < lit(H2S_CRITICAL_THRESHOLD), 1).otherwise(0)
      )
      .withColumn(
        "is_h2s_critical",
        when(col("h2s_raw_value") >= lit(H2S_CRITICAL_THRESHOLD), 1).otherwise(0)
      )

    // Aggregate by drain_id
    val aggregated = withGasFlags
      .groupBy("drain_id")
      .agg(
        // MQ-7 Carbon Monoxide metrics
        round(avg("mq7_raw_value"), 2).as("avg_mq7_value"),
        round(max("mq7_raw_value"), 2).as("max_mq7_value"),
        sum("is_mq7_warning").as("mq7_warning_count"),
        sum("is_mq7_critical").as("mq7_critical_count"),

        // MQ-6 Methane metrics
        round(avg("methane_raw_value"), 3).as("avg_methane_value"),
        round(max("methane_raw_value"), 3).as("max_methane_value"),
        sum("is_methane_warning").as("methane_warning_count"),
        sum("is_methane_critical").as("methane_critical_count"),

        // MQ-136 H2S metrics
        round(avg("h2s_raw_value"), 3).as("avg_h2s_value"),
        round(max("h2s_raw_value"), 3).as("max_h2s_value"),
        sum("is_h2s_warning").as("h2s_warning_count"),
        sum("is_h2s_critical").as("h2s_critical_count"),

        // Temperature & Humidity correlation
        round(avg("temperature_c"), 2).as("avg_temperature_c"),
        round(min("temperature_c"), 2).as("min_temperature_c"),
        round(max("temperature_c"), 2).as("max_temperature_c"),
        round(avg("humidity_percent"), 2).as("avg_humidity_percent")
      )
      // Total gas violation score
      .withColumn(
        "gas_violation_count",
        col("mq7_warning_count") + (col("mq7_critical_count") * 2) +
          col("methane_warning_count") + (col("methane_critical_count") * 2) +
          col("h2s_warning_count") + (col("h2s_critical_count") * 3)
      )
      // Combined Confined-Space Gas Hazard Index [0.0 - 100.0]
      .withColumn(
        "gas_hazard_index",
        round(
          least(
            lit(100.0),
            (col("avg_mq7_value") / 300.0 * 35.0) +
              (col("avg_methane_value") / 2.5 * 30.0) +
              (col("avg_h2s_value") / 1.0 * 35.0)
          ),
          1
        )
      )
      // Determine Gas Safety Risk Level
      .withColumn(
        "gas_risk_level",
        when(col("mq7_critical_count") > 0 || col("methane_critical_count") > 0 || col("h2s_critical_count") > 0 || col("gas_hazard_index") >= 65.0, "Critical")
          .when(col("mq7_warning_count") > 1 || col("methane_warning_count") > 1 || col("h2s_warning_count") > 1 || col("gas_hazard_index") >= 35.0, "Warning")
          .otherwise("Normal")
      )

    println(s"[GAS-SENSOR-ANALYSIS] Completed atmospheric gas analysis across ${aggregated.count()} chambers.")
    aggregated
  }
}
