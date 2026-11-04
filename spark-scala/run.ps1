$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$sparkHome = if ($env:SPARK_HOME) { $env:SPARK_HOME } elseif (Test-Path "D:\spark-4.2.0-bin-hadoop3") { "D:\spark-4.2.0-bin-hadoop3" } else { "C:\spark" }
$sparkSubmit = "$sparkHome\bin\spark-submit.cmd"
$jar = "$scriptDir\target\urbandrainx-spark-analytics.jar"
$extraJars = "$scriptDir\lib\mongo-spark-connector_2.13-10.4.0.jar,$scriptDir\lib\mongodb-driver-sync-4.11.1.jar,$scriptDir\lib\mongodb-driver-core-4.11.1.jar,$scriptDir\lib\bson-4.11.1.jar,$scriptDir\lib\bson-record-codec-4.11.1.jar"

$env:HADOOP_HOME = "C:/hadoop"
$env:PATH = "C:\hadoop\bin;$env:PATH"

Write-Host "HADOOP_HOME set to: $env:HADOOP_HOME"
Write-Host "Executing Apache Spark Scala Analytics Job from $scriptDir..."
Push-Location $scriptDir
try {
    & $sparkSubmit --class org.urbandrainx.analytics.Main --master "local[*]" --conf "spark.driver.extraJavaOptions=-Dhadoop.home.dir=C:/hadoop" --conf "spark.executor.extraJavaOptions=-Dhadoop.home.dir=C:/hadoop" --jars $extraJars $jar
} finally {
    Pop-Location
}
