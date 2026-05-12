# Generate icon PNGs using System.Drawing
Add-Type -AssemblyName System.Drawing

function Draw-Icon($size, $path) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Background
    $r = [int]($size * 0.15)
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size - 1, $size - 1)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(100, 149, 237)) # CornflowerBlue
    $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
    $gp.AddArc(0, 0, $r * 2, $r * 2, 180, 90)
    $gp.AddArc($size - $r * 2, 0, $r * 2, $r * 2, 270, 90)
    $gp.AddArc($size - $r * 2, $size - $r * 2, $r * 2, $r * 2, 0, 90)
    $gp.AddArc(0, $size - $r * 2, $r * 2, $r * 2, 90, 90)
    $gp.CloseFigure()
    $g.FillPath($brush, $gp)

    # Text
    $fontSize = [int]($size * 0.6)
    $font = New-Object System.Drawing.Font("Arial", $fontSize, [System.Drawing.FontStyle]::Bold)
    $text = "T"
    $sizeF = $g.MeasureString($text, $font)
    $x = ($size - $sizeF.Width) / 2
    $y = ($size - $sizeF.Height) / 2 + ($size * 0.03)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.DrawString($text, $font, $textBrush, $x, $y)

    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated $path"
}

$base = "$PSScriptRoot\icons"
if (-not (Test-Path $base)) { New-Item -ItemType Directory -Path $base | Out-Null }

Draw-Icon 16 "$base\icon16.png"
Draw-Icon 48 "$base\icon48.png"
Draw-Icon 128 "$base\icon128.png"
