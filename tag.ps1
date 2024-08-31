# validate-tag.ps1

# Get the latest tag
$latest_tag = $(git describe --tags $(git rev-list --tags --max-count=1) 2>$null)
if (-not $latest_tag) {
    $latest_tag = ""
}
Write-Output "Latest tag: $latest_tag"

# Increment the tag
if (-not $latest_tag) {
    $new_tag = "v1.0.0"
} else {
    $parts = $latest_tag.TrimStart('v').Split('.')
    $major = [int]$parts[0]
    $minor = [int]$parts[1]
    $patch = [int]$parts[2]
    $new_patch = $patch + 1
    $new_tag = "v$major.$minor.$new_patch"
}
Write-Output "New tag: $new_tag"