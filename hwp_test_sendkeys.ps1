$hwp = New-Object -ComObject HWPFrame.HwpObject
$wshell = New-Object -ComObject WScript.Shell

$dir = "D:\App\gatongpass\public\documents"
$inputFile = Join-Path $dir "test.hwp"
$outputFile = Join-Path $dir "test.pdf"

if (Test-Path $outputFile) { Remove-Item $outputFile }

Write-Host "Opening: $inputFile"
$hwp.Open($inputFile, "HWP", "forceopen:true")

Start-Sleep -Seconds 3
$wshell.SendKeys("y")
Start-Sleep -Seconds 2

try {
    Write-Host "Saving to PDF..."
    # Attempt SaveAs. Note: Some versions need 3rd arg, some don't.
    # Trying with 3 args first.
    $hwp.SaveAs($outputFile, "PDF", "")
    
    # Wait for file to appear and satisfy size
    for ($i = 0; $i -lt 10; $i++) {
        if (Test-Path $outputFile) {
            Write-Host "PDF created!"
            break
        }
        Write-Host "Waiting for PDF... ($i)"
        Start-Sleep -Seconds 2
    }
} catch {
    Write-Error "Save failed: $($_.Exception.Message)"
}

$hwp.Quit()
Write-Host "Script finished."
