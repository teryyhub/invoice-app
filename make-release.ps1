$ErrorActionPreference = "Stop"

$root    = (Get-Location).Path
$android = Join-Path $root "android"
$app     = Join-Path $android "app"
$gradle  = Join-Path $app "build.gradle"
$jks     = Join-Path $app "cminvoice-release.jks"
$props   = Join-Path $android "keystore.properties"
$alias   = "cminvoice"

if (-not (Test-Path $gradle)) { throw "Run this from the project root (android\app\build.gradle not found)." }

# --- 1. Find keytool ---
$keytool = $null
foreach ($c in @("$env:JAVA_HOME\bin\keytool.exe", "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe")) {
    if ($c -and (Test-Path $c)) { $keytool = $c; break }
}
if (-not $keytool) {
    $cmd = Get-Command keytool -ErrorAction SilentlyContinue
    if ($cmd) { $keytool = $cmd.Source }
}
if (-not $keytool) { throw "keytool not found. Install Android Studio or set JAVA_HOME." }

# --- 2. Create the keystore (skipped if it already exists) ---
if (Test-Path $jks) {
    Write-Host "Keystore already exists, reusing it: $jks" -ForegroundColor Yellow
    $sec = Read-Host "Enter the existing keystore password" -AsSecureString
} else {
    $sec  = Read-Host "Choose a keystore password (min 6 chars, avoid backslashes)" -AsSecureString
    $sec2 = Read-Host "Repeat the password" -AsSecureString
    $p1 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
    $p2 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec2))
    if ($p1 -ne $p2) { throw "Passwords do not match." }
    & $keytool -genkeypair -storetype PKCS12 -keystore $jks -alias $alias `
        -keyalg RSA -keysize 2048 -validity 10000 `
        -storepass $p1 -keypass $p1 -dname "CN=CM Invoice, C=IN"
    if ($LASTEXITCODE -ne 0) { throw "keytool failed." }
}
$pwd = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))

# --- 3. keystore.properties (PKCS12 uses one password for store and key) ---
$esc = $pwd.Replace("\", "\\")
@(
    "storeFile=cminvoice-release.jks",
    "storePassword=$esc",
    "keyAlias=$alias",
    "keyPassword=$esc"
) | Set-Content -Path $props -Encoding ascii
Write-Host "Wrote $props"

# --- 4. .gitignore ---
$gi = Join-Path $android ".gitignore"
if (-not (Test-Path $gi)) { New-Item -ItemType File -Path $gi | Out-Null }
$giText = Get-Content $gi -Raw
if ($null -eq $giText) { $giText = "" }
foreach ($line in @("keystore.properties", "*.jks")) {
    if ($giText -notmatch [regex]::Escape($line)) { Add-Content $gi $line }
}

# --- 5. Patch android/app/build.gradle (backup first, safe to re-run) ---
Copy-Item $gradle "$gradle.bak" -Force
$g = Get-Content $gradle -Raw

if ($g -notmatch "keystoreProperties") {
    $header = @'
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file("keystore.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

'@
    $i = $g.IndexOf("android {")
    if ($i -lt 0) { throw "Could not find 'android {' in build.gradle" }
    $g = $g.Insert($i, $header)
}

if ($g -notmatch "signingConfigs") {
    $block = @'
    signingConfigs {
        release {
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
'@
    $j = $g.IndexOf("buildTypes {")
    if ($j -lt 0) { throw "Could not find 'buildTypes {' in build.gradle" }
    $g = $g.Insert($j, $block + "    ")
}

if ($g -notmatch "signingConfig signingConfigs.release") {
    $g = $g -replace '(buildTypes\s*\{\s*release\s*\{)', ('$1' + "`r`n            signingConfig signingConfigs.release")
}

Set-Content -Path $gradle -Value $g -Encoding utf8
Write-Host "Patched build.gradle (backup: build.gradle.bak)"

# --- 6. Build ---
npm run build
if ($LASTEXITCODE -ne 0) { throw "npm run build failed." }
npx cap sync android
if ($LASTEXITCODE -ne 0) { throw "cap sync failed." }

Push-Location $android
.\gradlew --stop
.\gradlew assembleRelease
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "assembleRelease failed." }
.\gradlew bundleRelease
Pop-Location

# --- 7. Show the release SHA-1 for Google Cloud ---
Write-Host "`n=== Release SHA-1 (add to a new Android OAuth client) ===" -ForegroundColor Cyan
& $keytool -list -v -keystore $jks -alias $alias -storepass $pwd | Select-String "SHA1|SHA-256"

Write-Host "`nAPK: $app\build\outputs\apk\release\app-release.apk" -ForegroundColor Green
Write-Host "AAB: $app\build\outputs\bundle\release\app-release.aab" -ForegroundColor Green
Write-Host "BACK UP cminvoice-release.jks and your password somewhere safe." -ForegroundColor Yellow