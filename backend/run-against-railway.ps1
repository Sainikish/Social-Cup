# Runs the backend locally against Railway's actual Postgres database
# (the same one the deployed production app uses) instead of the local
# Docker Postgres. Reads connection details from .env.local (gitignored,
# never committed) - see that file for where those values come from.
#
# Usage: .\run-against-railway.ps1 [-Port 8080]

param(
    [int]$Port = 8080
)

$envFile = Join-Path $PSScriptRoot ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Error ".env.local not found next to this script - see .env.local's own header for what it must contain (PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD/PGSSLMODE/JWT_SECRET)."
    exit 1
}

Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
    $name, $value = $_ -split '=', 2
    Set-Item -Path "Env:$name" -Value $value
}

Set-Location $PSScriptRoot
& .\mvnw.cmd spring-boot:run `
    -D"spring-boot.run.arguments=--server.port=$Port" `
    -D"spring-boot.run.jvmArguments=-Duser.timezone=UTC"
