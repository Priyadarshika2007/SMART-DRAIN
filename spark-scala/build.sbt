name := "urbandrainx-spark-analytics"

version := "2.0.0"

scalaVersion := "2.13.18"

val sparkVersion = "4.2.0"

libraryDependencies ++= Seq(
  "org.apache.spark" %% "spark-core" % sparkVersion % "provided",
  "org.apache.spark" %% "spark-sql" % sparkVersion % "provided",
  "org.mongodb.spark" %% "mongo-spark-connector" % "10.4.0",
  "org.mongodb" % "mongodb-driver-sync" % "4.11.1",
  "org.mongodb" % "bson" % "4.11.1"
)

// Assembly and packaging configuration
assembly / assemblyMergeStrategy := {
  case PathList("META-INF", xs @ _*) => MergeStrategy.discard
  case x => MergeStrategy.first
}
