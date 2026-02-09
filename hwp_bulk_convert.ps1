$dir = "D:\App\gatongpass\public\documents"
$originalsDir = Join-Path $dir "hwp_originals"
if (!(Test-Path $originalsDir)) { New-Item -ItemType Directory -Path $originalsDir -Force }

$files = Get-ChildItem -Path (Join-Path $dir "*") -Include *.hwp, *.hwpx -File | Where-Object { $_.Name -notlike "__temp_conv__.*" -and $_.Name -ne "test.hwp" }

$total = $files.Count
Write-Host "Found $total files to process."

if ($total -eq 0) {
    Write-Host "No files found. Exiting."
    exit 0
}

$wshell = New-Object -ComObject WScript.Shell
$hwp = New-Object -ComObject HWPFrame.HwpObject

$count = 0
foreach ($file in $files) {
    $count++
    Write-Host "[$count/$total] Processing: $($file.Name)"
    
    $tempFile = Join-Path $dir "__temp_conv__$($file.Extension)"
    $pdfFile = [System.IO.Path]::ChangeExtension($file.FullName, ".pdf")
    
    Copy-Item $file.FullName $tempFile -Force
    
    try {
        # Ensure HWP object is alive
        if (!$hwp) { $hwp = New-Object -ComObject HWPFrame.HwpObject }
        
        $hwp.Open($tempFile, "HWP", "forceopen:true")
        Start-Sleep -Seconds 1
        $wshell.SendKeys("y")
        Start-Sleep -Seconds 1
        
        if (Test-Path $pdfFile) { Remove-Item $pdfFile -Force }
        $hwp.SaveAs($pdfFile, "PDF", "")
        
        $success = $false
        for ($i = 0; $i -lt 10; $i++) {
            if (Test-Path $pdfFile) { $success = $true; break }
            Start-Sleep -Seconds 1
        }
        
        if ($success) {
            Write-Host "  Success: Created PDF"
            $hwp.Clear($null)
            Move-Item $file.FullName $originalsDir -Force
        } else {
            Write-Error "  Failed: PDF not created"
        }
    } catch {
        Write-Error "  Error: $($_.Exception.Message)"
        # Try to restart HWP on error
        try { $hwp.Quit() } catch {}
        $hwp = New-Object -ComObject HWPFrame.HwpObject
    } finally {
        if (Test-Path $tempFile) { Remove-Item $tempFile -Force }
    }
}

try { $hwp.Quit() } catch {}
Write-Host "Bulk conversion completed."
