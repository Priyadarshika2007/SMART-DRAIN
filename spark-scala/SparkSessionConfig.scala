package org.urbandrainx.analytics

import org.apache.spark.sql.SparkSession
import org.apache.spark.SparkConf

/**
 * ============================================================================
 * URBANDRAINX 2.0 - SparkSessionConfig
 * ============================================================================
 * Configures and initializes the Apache Spark session for large-scale
 * processing of historical sensor readings from urban drainage chambers.
 *
 * Configured for Apache Spark 4.x / 3.x, Scala 2.13, and MongoDB integration.
 */
object SparkSessionConfig {

  private val DEFAULT_APP_NAME = "URBANDRAINX-2.0-SensorAnalytics"
  private val DEFAULT_MASTER = "local[*]"
  private val DEFAULT_MONGO_URI = "mongodb://127.0.0.1:27017/urbandrainx"

  /**
   * Initializes and returns an active Apache Spark session configured
   * with MongoDB connectors and optimized for local multi-core telemetry analysis.
   *
   * @param appName  Descriptive name of the Spark analytics application
   * @param master   Spark master execution target (default: local[*])
   * @param mongoUri MongoDB connection string
   * @return Active SparkSession
   */
  def getOrCreate(
      appName: String = DEFAULT_APP_NAME,
      master: String = DEFAULT_MASTER,
      mongoUri: String = DEFAULT_MONGO_URI
  ): SparkSession = {

    // Ensure hadoop.home.dir is configured for Windows Spark runtime
    if (System.getProperty("hadoop.home.dir") == null || System.getProperty("hadoop.home.dir").contains("\\")) {
      System.setProperty("hadoop.home.dir", "C:/hadoop")
    }

    val conf = new SparkConf()
      .setAppName(appName)
      .setMaster(master)
      // MongoDB Spark Connector v10.x Configuration
      .set("spark.mongodb.read.connection.uri", mongoUri)
      .set("spark.mongodb.write.connection.uri", mongoUri)
      .set("spark.mongodb.read.database", "urbandrainx")
      .set("spark.mongodb.write.database", "urbandrainx")
      // Performance optimization for local drainage telemetry batches
      .set("spark.sql.shuffle.partitions", "4")
      .set("spark.sql.adaptive.enabled", "true")
      .set("spark.driver.memory", "2g")
      // Logging and UI controls
      .set("spark.ui.enabled", "false")
      .set("spark.sql.legacy.timeParserPolicy", "LEGACY")

    println(s"[SPARK-CONFIG] Initializing SparkSession: app='$appName', master='$master'")
    println(s"[SPARK-CONFIG] Target MongoDB URI: $mongoUri")

    val spark = SparkSession.builder()
      .config(conf)
      .getOrCreate()

    // Reduce Spark verbosity to keep console clear for analytics summaries
    spark.sparkContext.setLogLevel("WARN")

    println(s"[SPARK-CONFIG] SparkSession initialized successfully. Spark version: ${spark.version}")
    spark
  }

  /**
   * Gracefully shuts down the active SparkSession.
   */
  def stop(spark: SparkSession): Unit = {
    if (spark != null && !spark.sparkContext.isStopped) {
      println("[SPARK-CONFIG] Stopping SparkSession...")
      spark.stop()
      println("[SPARK-CONFIG] SparkSession stopped successfully.")
    }
  }
}
