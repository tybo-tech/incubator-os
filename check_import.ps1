$lines = Get-Content "docs/00track/02-itemized-list.data.md"
Write-Host ("Total lines: " + $lines.Length)
$first = $lines[0]
$tabs = $first.Split("`t")
Write-Host ("Header columns: " + $tabs.Length)
$second = $lines[1]
$cols = $second.Split("`t")
Write-Host ("Row 1 columns: " + $cols.Length)
for($i=0; $i -lt $cols.Length; $i++) {
  Write-Host ("  Col " + $i + ": [" + $cols[$i] + "]")
}
