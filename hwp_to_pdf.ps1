$hwp = New-Object -ComObject HWPFrame.HwpObject
if (!$hwp) {
    Write-Error "Hancom Office Automation object could not be created."
    exit 1
}

$dir = "D:\App\gatongpass\public\documents"
$files = Get-ChildItem -Path $dir -Include *.hwp, *.hwpx -File

foreach ($file in $files) {
    Write-Host "Converting: $($file.Name)"
    try {
        $hwp.Open($file.FullName, "HWP", "forceopen:true")
        $pdfPath = [System.IO.Path]::ChangeExtension($file.FullName, ".pdf")
        
        # Save as PDF. Format "PDF" is standard for Hancom.
        $hwp.SaveAs($pdfPath, "PDF")
        
        # Clear the current document
        $hwp.Clear($null)
        Write-Host "Success: $($file.Name) -> $($pdfPath)"
    } catch {
        Write-Error "Failed to convert $($file.Name): $($_.Exception.Message)"
    }
}

$hwp.Quit()
Write-Host "Conversion completed."
