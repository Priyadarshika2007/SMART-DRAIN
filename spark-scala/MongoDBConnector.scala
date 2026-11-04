package org.urbandrainx.analytics

import org.apache.spark.sql.{DataFrame, SaveMode, SparkSession}
import org.apache.spark.sql.functions._
import com.mongodb.client.{MongoClients, MongoCollection, MongoDatabase}
import org.bson.Document
import java.util.ArrayList
import scala.jdk.CollectionConverters._

/**
 * ============================================================================
 * URBANDRAINX 2.0 - MongoDBConnector
 * ============================================================================
 * Connects Apache Spark with the active MongoDB database ("urbandrainx").
 *
 * Provides bidirectional data access:
 *  1. Reads historical raw sensor readings from collection: `sensor_readings`
 *  2. Reads master drainage metadata from collection: `drains`
 *  3. Reads telemetry hardware metadata from collection: `devices`
 *  4. Reads prior alerts from collection: `alerts`
 *  5. Writes generated analytical summaries into collection: `analytics_results`
 *
 * Implements dual data access modes:
 *  - Native Spark MongoDB Connector (spark.read.format("mongodb"))
 *  - High-reliability JVM Driver fallback for isolated local executions.
 *
 * SAFETY GUARANTEE: Never modifies or drops original `sensor_readings`.
 */
class MongoDBConnector(
    val mongoUri: String = "mongodb://127.0.0.1:27017/urbandrainx",
    val databaseName: String = "urbandrainx"
) extends Serializable {

  /**
   * Reads historical sensor measurements from the `sensor_readings` collection.
   */
  def readSensorReadings(spark: SparkSession): DataFrame = {
    readCollection(spark, "sensor_readings")
  }

  /**
   * Reads drainage chamber master records from the `drains` collection.
   */
  def readDrains(spark: SparkSession): DataFrame = {
    readCollection(spark, "drains")
  }

  /**
   * Reads IoT sensor device records from the `devices` collection.
   */
  def readDevices(spark: SparkSession): DataFrame = {
    readCollection(spark, "devices")
  }

  /**
   * Reads alert history from the `alerts` collection.
   */
  def readAlerts(spark: SparkSession): DataFrame = {
    readCollection(spark, "alerts")
  }

  /**
   * Generic collection reader with automated connector detection and fallback.
   */
  def readCollection(spark: SparkSession, collectionName: String): DataFrame = {
    println(s"[MONGO-CONNECTOR] Reading collection '$collectionName' from MongoDB ($databaseName)...")

    try {
      // Attempt 1: Native MongoDB Spark Connector format
      val df = spark.read
        .format("mongodb")
        .option("connection.uri", mongoUri)
        .option("database", databaseName)
        .option("collection", collectionName)
        .load()

      val count = df.count()
      println(s"[MONGO-CONNECTOR] Successfully read $count records from '$collectionName' via Spark MongoDB Connector.")
      df
    } catch {
      case ex: Throwable =>
        println(s"[MONGO-CONNECTOR] Notice: Falling back to Direct MongoDB Driver reader for '$collectionName': ${ex.getMessage}")
        readCollectionDirect(spark, collectionName)
    }
  }

  /**
   * Direct JVM MongoDB Driver reader fallback.
   * Reads raw BSON documents, serializes to JSON RDD, and parses into Spark DataFrame.
   */
  private def readCollectionDirect(spark: SparkSession, collectionName: String): DataFrame = {
    val client = MongoClients.create(mongoUri)
    try {
      val db = client.getDatabase(databaseName)
      val col = db.getCollection(collectionName)

      val docs = new ArrayList[String]()
      val cursor = col.find().iterator()
      try {
        while (cursor.hasNext) {
          docs.add(cursor.next().toJson())
        }
      } finally {
        cursor.close()
      }

      val count = docs.size()
      println(s"[MONGO-CONNECTOR-DIRECT] Fetched $count raw JSON documents from '$collectionName'.")

      import spark.implicits._
      if (docs.isEmpty) {
        spark.emptyDataFrame
      } else {
        val rdd = spark.sparkContext.parallelize(docs.asScala.toSeq)
        spark.read.json(rdd)
      }
    } finally {
      client.close()
    }
  }

  /**
   * Writes processed Spark analytics DataFrame into `analytics_results`.
   * Preserves historical integrity by appending without modifying source tables.
   */
  def writeAnalyticsResults(df: DataFrame, spark: SparkSession): Unit = {
    val collectionName = "analytics_results"
    val recordCount = df.count()
    println(s"[MONGO-CONNECTOR] Writing $recordCount analytics records to '$collectionName'...")

    try {
      // Attempt 1: Spark MongoDB Connector write
      df.write
        .format("mongodb")
        .mode(SaveMode.Append)
        .option("connection.uri", mongoUri)
        .option("database", databaseName)
        .option("collection", collectionName)
        .save()

      println(s"[MONGO-CONNECTOR] Successfully wrote $recordCount records to '$collectionName' via Spark Connector.")
    } catch {
      case ex: Throwable =>
        println(s"[MONGO-CONNECTOR] Notice: Falling back to Direct MongoDB Driver writer: ${ex.getMessage}")
        writeAnalyticsResultsDirect(df)
    }
  }

  /**
   * Direct JVM MongoDB Driver writer fallback.
   * Serializes Spark rows to JSON and executes batch insert into MongoDB.
   */
  private def writeAnalyticsResultsDirect(df: DataFrame): Unit = {
    val client = MongoClients.create(mongoUri)
    try {
      val db = client.getDatabase(databaseName)
      val col = db.getCollection("analytics_results")

      // Collect JSON strings from DataFrame partitions
      val jsonList = df.toJSON.collect()
      if (jsonList.nonEmpty) {
        val bsonDocs = jsonList.map(json => Document.parse(json)).toList.asJava
        col.insertMany(bsonDocs)
        println(s"[MONGO-CONNECTOR-DIRECT] Inserted ${jsonList.length} documents into 'analytics_results'.")
      }
    } finally {
      client.close()
    }
  }
}

object MongoDBConnector {
  def apply(
      mongoUri: String = "mongodb://127.0.0.1:27017/urbandrainx",
      databaseName: String = "urbandrainx"
  ): MongoDBConnector = new MongoDBConnector(mongoUri, databaseName)
}
