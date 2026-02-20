# Crea las variables de entorno de usuario en Windows a partir del archivo .env
# Ejecutar una vez (o cuando cambies .env): .\scripts\set-env-windows.ps1
# Requiere: .env en la raíz del proyecto con las mismas claves que Netlify.

$envFile = Join-Path $PSScriptRoot ".." ".env"
if (-not (Test-Path $envFile)) {
  Write-Host "No se encontró .env en la raíz del proyecto." -ForegroundColor Red
  Write-Host "Copia .env.example a .env y rellena los valores, o crea .env con:" -ForegroundColor Yellow
  Write-Host "  FIREBASE_API_KEY=...
  FIREBASE_AUTH_DOMAIN=...
  FIREBASE_PROJECT_ID=...
  FIREBASE_STORAGE_BUCKET=...
  FIREBASE_MESSAGING_SENDER_ID=...
  FIREBASE_APP_ID=...
  FIREBASE_MEASUREMENT_ID=...
  CLOUDINARY_CLOUD_NAME=...
  CLOUDINARY_API_KEY=...
  CLOUDINARY_UPLOAD_PRESET=..."
  exit 1
}

$count = 0
Get-Content $envFile -Encoding UTF8 | ForEach-Object {
  $line = $_.Trim()
  if ($line -match '^\s*#|^\s*$') { return }
  if ($line -match '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
    $name = $Matches[1]
    $value = $Matches[2].Trim()
    if ($value -match '^["''](.*)["'']$') { $value = $Matches[1] }
    [Environment]::SetEnvironmentVariable($name, $value, "User")
    Write-Host "  $name = (oculto)" -ForegroundColor Green
    $count++
  }
}

Write-Host ""
Write-Host "Hecho: $count variables de entorno de usuario creadas/actualizadas." -ForegroundColor Green
Write-Host "Cierra y vuelve a abrir la terminal (o Cursor) para que se apliquen." -ForegroundColor Yellow
