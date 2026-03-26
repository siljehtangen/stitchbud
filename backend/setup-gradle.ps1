# Downloads Gradle 8.6, uses it to generate the Gradle wrapper files, then cleans up.
$gradleVersion = "8.6"
$url = "https://services.gradle.org/distributions/gradle-$gradleVersion-bin.zip"
$zipPath = "$env:TEMP\gradle-$gradleVersion-bin.zip"
$extractPath = "$env:TEMP\gradle-extract-$gradleVersion"

# Find Java if JAVA_HOME is not set
if (-not $env:JAVA_HOME) {
    $javaSearchPaths = @(
        "C:\Program Files\Microsoft\jdk-21*",
        "C:\Program Files\Eclipse Adoptium\jdk-21*",
        "C:\Program Files\Java\jdk-21*",
        "C:\Program Files\Java\jdk-17*",
        "C:\Program Files\Microsoft\jdk-17*"
    )
    foreach ($pattern in $javaSearchPaths) {
        $found = Get-Item $pattern -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) {
            $env:JAVA_HOME = $found.FullName
            $env:PATH = "$($found.FullName)\bin;$env:PATH"
            Write-Host "Found Java at: $($found.FullName)" -ForegroundColor Green
            break
        }
    }
}

if (-not $env:JAVA_HOME) {
    Write-Host "ERROR: Could not find Java. Please close and reopen PowerShell after installing Java." -ForegroundColor Red
    exit 1
}

Write-Host "Using JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Cyan
Write-Host "Downloading Gradle $gradleVersion..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing

Write-Host "Extracting..." -ForegroundColor Cyan
Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force

$gradleExe = "$extractPath\gradle-$gradleVersion\bin\gradle.bat"

Write-Host "Generating Gradle wrapper..." -ForegroundColor Cyan
& $gradleExe wrapper --gradle-version $gradleVersion --distribution-type bin

Write-Host "Cleaning up temp files..." -ForegroundColor Cyan
Remove-Item $zipPath -Force
Remove-Item $extractPath -Recurse -Force

if (Test-Path ".\gradlew.bat") {
    Write-Host "Done! Run: .\gradlew.bat bootRun" -ForegroundColor Green
} else {
    Write-Host "ERROR: gradlew.bat was not created. Check output above." -ForegroundColor Red
}
