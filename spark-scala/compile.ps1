$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$sparkHome = if ($env:SPARK_HOME) { $env:SPARK_HOME } elseif (Test-Path "D:\spark-4.2.0-bin-hadoop3") { "D:\spark-4.2.0-bin-hadoop3" } else { "C:\spark" }
$sparkJars = "$sparkHome\jars\*"
$libJars = "$scriptDir\lib\*"
$cp = "$sparkJars;$libJars"

$targetClasses = "$scriptDir\target\classes"
$targetJar = "$scriptDir\target\urbandrainx-spark-analytics.jar"

if (!(Test-Path $targetClasses)) {
    New-Item -ItemType Directory -Path $targetClasses -Force | Out-Null
}

Write-Host "Compiling Scala source files in $scriptDir..."
Push-Location $scriptDir
try {
    java -cp $cp scala.tools.nsc.Main -d $targetClasses -cp $cp SparkSessionConfig.scala MongoDBConnector.scala SensorDataProcessor.scala WaterLevelAnalysis.scala GasSensorAnalysis.scala DrainageAnalytics.scala Main.scala

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Compilation SUCCESSFUL!"
        Write-Host "Packaging into $targetJar..."
        jar -cf $targetJar -C $targetClasses .
        Write-Host "Packaging SUCCESSFUL!"
    } else {
        Write-Host "Compilation failed with exit code $LASTEXITCODE"
    }
} finally {
    Pop-Location
}
