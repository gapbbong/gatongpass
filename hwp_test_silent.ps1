$hwp = New-Object -ComObject HWPFrame.HwpObject

$dir = "D:\App\gatongpass\public\documents"
$inputFile = Join-Path $dir "test.hwp"
$outputFile = Join-Path $dir "test_silent.pdf"

if (Test-Path $outputFile) { Remove-Item $outputFile }

Write-Host "Opening: $inputFile"
$hwp.Open($inputFile, "HWP", "forceopen:true")

# No SendKeys here!
Start-Sleep -Seconds 2

try {
    Write-Host "Saving to PDF..."
    $hwp.SaveAs($outputFile, "PDF", "")
    
    for ($i = 0; $i -lt 10; $i++) {
        if (Test-Path $outputFile) {
            Write-Host "PDF created silently!"
            break
        }
        Write-Host "Waiting..."
        Start-Sleep -Seconds 1
    }
} catch {
    Write-Error "Save failed: $($_.Exception.Message)"
}

$hwp.Quit()
Write-Host "Verification finished."
