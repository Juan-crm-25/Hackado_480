# Crea en GitHub las etiquetas y los issues del backlog definidos en scripts/backlog.json.
# Requisitos: GitHub CLI instalado (winget install GitHub.cli) y sesión iniciada (gh auth login).
# Uso, desde la raíz del repositorio:  powershell -File scripts\crear-issues.ps1
# Los issues se crean sin persona asignada: cada miembro se asigna los suyos.

$ErrorActionPreference = 'Stop'
$repo = 'Juan-crm-25/Hackado_480'
$utf8 = New-Object System.Text.UTF8Encoding($false)

$labels = @{
    'historia'          = '1d76db'
    ('t' + [char]0x00E9 + 'cnica') = '5319e7'  # "técnica" escrito sin tildes literales: PowerShell 5.1 lee los .ps1 sin BOM como ANSI
    'imprescindible'    = 'd93f0b'
    'deseable'          = 'fbca04'
    'semana-intermedia' = '0e8a16'
    '30/11'             = 'c5def5'
}
foreach ($name in $labels.Keys) {
    gh label create $name --color $labels[$name] --repo $repo --force | Out-Null
}

$json = [System.IO.File]::ReadAllText((Join-Path $PSScriptRoot 'backlog.json'), $utf8)
$items = $json | ConvertFrom-Json
$tmp = [System.IO.Path]::GetTempFileName()

foreach ($item in $items) {
    # Sin tildes literales: PowerShell 5.1 lee los .ps1 sin BOM como ANSI ("Estimación" saldría como "EstimaciÃ³n").
    $body = $item.body + "`n`n**Estimaci" + [char]0x00F3 + "n:** " + $item.estimate + "`n`n_Sin asignar: quien la coja, que se la asigne._"
    [System.IO.File]::WriteAllText($tmp, $body, $utf8)
    $ghArgs = @('issue', 'create', '--repo', $repo, '--title', $item.title, '--body-file', $tmp)
    foreach ($l in $item.labels) { $ghArgs += @('--label', $l) }
    gh @ghArgs
}

Remove-Item $tmp
