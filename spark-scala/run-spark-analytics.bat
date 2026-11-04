@echo off
setlocal enabledelayedexpansion

echo ===============================================================================
echo   URBANDRAINX 2.0 - APACHE SPARK ^& SCALA HISTORICAL SENSOR ANALYTICS
echo ===============================================================================

rem Set Spark Home and Paths
if "%SPARK_HOME%"=="" (
  if exist "D:\spark-4.2.0-bin-hadoop3" (
    set "SPARK_HOME=D:\spark-4.2.0-bin-hadoop3"
  ) else (
    echo [ERROR] SPARK_HOME is not set and default D:\spark-4.2.0-bin-hadoop3 was not found.
    pause
    exit /b 1
  )
)

set "HADOOP_HOME=C:\hadoop"
set "PATH=C:\hadoop\bin;%PATH%"

echo [CONFIG] SPARK_HOME is: %SPARK_HOME%
echo [CONFIG] HADOOP_HOME is: %HADOOP_HOME%

rem Create target build directories
if not exist "target\classes" mkdir target\classes

echo [1/3] Compiling Scala source files...
java -cp "%SPARK_HOME%\jars\*;lib\*" scala.tools.nsc.Main -d target\classes -cp "%SPARK_HOME%\jars\*;lib\*" SparkSessionConfig.scala MongoDBConnector.scala SensorDataProcessor.scala WaterLevelAnalysis.scala GasSensorAnalysis.scala DrainageAnalytics.scala Main.scala

if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Scala compilation failed.
  pause
  exit /b %ERRORLEVEL%
)

echo [2/3] Packaging compiled bytecode into JAR...
jar -cf target\urbandrainx-spark-analytics.jar -C target\classes .

if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Failed to create JAR package.
  pause
  exit /b %ERRORLEVEL%
)

echo [3/3] Submitting Spark job to Apache Spark engine...
set "JARS_ARG=lib\mongo-spark-connector_2.13-10.4.0.jar,lib\mongodb-driver-sync-4.11.1.jar,lib\mongodb-driver-core-4.11.1.jar,lib\bson-4.11.1.jar,lib\bson-record-codec-4.11.1.jar"

call "%SPARK_HOME%\bin\spark-submit.cmd" --class org.urbandrainx.analytics.Main --master local[*] --conf "spark.driver.extraJavaOptions=-Dhadoop.home.dir=C:/hadoop" --conf "spark.executor.extraJavaOptions=-Dhadoop.home.dir=C:/hadoop" --jars "%JARS_ARG%" target\urbandrainx-spark-analytics.jar

echo ===============================================================================
echo   SPARK ^& SCALA ANALYTICS PIPELINE COMPLETED SUCCESSFULLY
echo ===============================================================================
