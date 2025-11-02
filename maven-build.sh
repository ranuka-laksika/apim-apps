#!/bin/bash
# Set JAVA_HOME
JAVA_HOME=/opt/hostedtoolcache/Java_Temurin-Hotspot_jdk/11.0.29-7/x64
export JAVA_HOME
PATH="$JAVA_HOME/bin:$PATH"
export PATH

# Print Java info for verification
echo "JAVA_HOME: $JAVA_HOME"
echo "Java version:"
java -version

# Run Maven build
/usr/share/maven/bin/mvn clean install -DskipTests