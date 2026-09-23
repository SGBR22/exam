$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$port/")
$listener.Start()
Write-Host "Results viewer started: http://127.0.0.1:$port"
Write-Host 'Press Ctrl+C to stop'

$siteFiles = @('app.py', 'server.ps1', 'index.html', 'style.css', 'script.js', 'README.md', 'start.bat')
$categories = @{
  'glb' = @('3D models', 'model'); 'gif' = @('Animations', 'image'); 'svg' = @('Plots', 'image')
}
function Send-Response($context, [int]$status, [byte[]]$data, [string]$type) {
  $context.Response.StatusCode = $status; $context.Response.ContentType = $type
  $context.Response.ContentLength64 = $data.Length
  $context.Response.OutputStream.Write($data, 0, $data.Length); $context.Response.OutputStream.Close()
}
try {
  while ($true) {
    $context = $listener.GetContext(); $urlPath = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath)
    $relative = $urlPath.TrimStart('/'); if ([string]::IsNullOrWhiteSpace($relative)) { $relative = 'index.html' }
    $path = [IO.Path]::GetFullPath((Join-Path $root $relative))
    if (-not $path.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) { Send-Response $context 403 ([Text.Encoding]::UTF8.GetBytes('Forbidden')) 'text/plain'; continue }
    if ($urlPath -eq '/api/files') {
      $items = @()
      foreach ($file in Get-ChildItem -LiteralPath $root -File -Recurse) {
        $extension = $file.Extension.TrimStart('.').ToLowerInvariant()
        if ($file.Name.StartsWith('.') -or $file.Extension -eq '.lock' -or $siteFiles -contains $file.Name) { continue }
        if (-not $categories.ContainsKey($extension)) { continue }
        $relativePath = $file.FullName.Substring($root.Length).TrimStart('\').Replace('\', '/')
        $encodedPath = (($relativePath -split '/') | ForEach-Object { [Uri]::EscapeDataString($_) }) -join '/'
        $itemCategory = $categories[$extension]
        $items += [PSCustomObject]@{ name=$file.Name; path=$relativePath; url='/' + $encodedPath; type=$extension; category=$itemCategory[0]; kind=$itemCategory[1]; size=$file.Length; modified=$file.LastWriteTime.ToString('yyyy-MM-ddTHH:mm:ss') }
      }
      $json = @{ files=@($items | Sort-Object category, path) } | ConvertTo-Json -Depth 5 -Compress
      Send-Response $context 200 ([Text.Encoding]::UTF8.GetBytes($json)) 'application/json; charset=utf-8'; continue
    }
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { Send-Response $context 404 ([Text.Encoding]::UTF8.GetBytes('Not found')) 'text/plain; charset=utf-8'; continue }
    $mime = switch ([IO.Path]::GetExtension($path).ToLowerInvariant()) {
      '.html' { 'text/html; charset=utf-8' }; '.css' { 'text/css; charset=utf-8' }; '.js' { 'application/javascript; charset=utf-8' }
      '.json' { 'application/json; charset=utf-8' }; '.svg' { 'image/svg+xml' }; '.glb' { 'model/gltf-binary' }
      '.gif' { 'image/gif' }; '.csv' { 'text/csv; charset=utf-8' }; '.png' { 'image/png' }; '.jpg' { 'image/jpeg' }; '.jpeg' { 'image/jpeg' }
      default { 'application/octet-stream' }
    }
    Send-Response $context 200 ([IO.File]::ReadAllBytes($path)) $mime
  }
} finally { if ($listener.IsListening) { $listener.Stop() } }
