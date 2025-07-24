# updateCodebase.ps1
# This script is designed to be run in the root directory of a coding project.

# Function to recursively list directory contents in a tree-like structure,
# excluding specified directories (like node_modules) and hidden items.
function Get-ProjectTree {
    param (
        [string]$Path,
        [int]$Level = 0,
        [string]$Indent = ""
    )

    # Get items in the current path, excluding 'node_modules' and hidden items.
    # Sort them to ensure directories come before files and for consistent ordering.
    $items = Get-ChildItem -Path $Path | Where-Object {
        # Exclude 'node_modules' directory by name.
        ($_.Name -ne "node_modules") -and
        # Exclude hidden files/directories using their attributes.
        (!($_.Attributes -band [System.IO.FileAttributes]::Hidden))
    } | Sort-Object -Property PSIsContainer, Name

    foreach ($item in $items) {
        # Determine the prefix for the current item (tree branch or end).
        # Using simpler ASCII characters to avoid encoding issues.
        $prefix = if ($item -eq $items[-1]) { "\-- " } else { "+-- " } # Changed from └── and ├──
        # Construct the line for the tree output.
        $line = "$Indent$prefix$($item.Name)"
        # Append the line to the projectStructure.txt file.
        # Explicitly setting encoding to UTF8 to prevent issues, though ASCII characters are used.
        Add-Content -Path projectStructure.txt -Value $line -Encoding UTF8

        # If the current item is a directory, recurse into it.
        if ($item.PSIsContainer) {
            # Calculate the new indent for children based on whether it's the last item.
            # Using simpler ASCII characters for vertical lines.
            $newIndent = if ($item -eq $items[-1]) { "$Indent    " } else { "$Indent|   " } # Changed from │
            Get-ProjectTree -Path $item.FullName -Level ($Level + 1) -Indent $newIndent
        }
    }
}

Write-Host "Generating project structure tree (excluding node_modules and hidden items)..."

# 1. Scrape the entire project structure and build a text file with tree-like hierarchy.
#    Save the text file as projectStructure.txt.

# Clear projectStructure.txt before generating new content.
Clear-Content -Path projectStructure.txt -ErrorAction SilentlyContinue

# Call the function to generate the tree starting from the current directory.
Get-ProjectTree -Path $PWD.Path

Write-Host "Project structure saved to projectStructure.txt"

# 2. Perform operations on codebase.ts file.

Write-Host "Processing codebase.ts file..."

# Remove codebase.ts if it exists to ensure a clean slate.
# -ErrorAction SilentlyContinue prevents an error if the file doesn't exist.
Remove-Item codebase.ts -ErrorAction SilentlyContinue

# Create a new, empty codebase.ts file.
New-Item -Path "./codebase.ts" -ItemType File -Force

# Define the output file variable.
$outputFile = "codebase.ts"

# Clear any existing content in the output file (though it should be empty from New-Item).
Clear-Content $outputFile

# Get all .ts and .tsx files recursively from the 'src' directory.
# Exclude 'node_modules' directories and hidden files/directories.
# For each file, add a comment indicating the original file path,
# then add the content of the file, followed by a newline for separation.
Get-ChildItem -Path "src" -Recurse -Include *.ts, *.tsx -Exclude node_modules -Attributes !Hidden | ForEach-Object {
    # Add a comment indicating the original file path.
    # $_.FullName.Replace($PWD.Path + '\', '') removes the current working directory path
    # to make the file path relative to the project root.
    Add-Content $outputFile -Value "// FILE: $($_.FullName.Replace($PWD.Path + '\', ''))`n" -Encoding UTF8
    # Add the raw content of the current file.
    Add-Content $outputFile -Value (Get-Content $_.FullName -Raw) -Encoding UTF8
    # Add an extra newline for separation between file contents in codebase.ts.
    Add-Content $outputFile -Value "`n" -Encoding UTF8
}

Write-Host "codebase.ts has been updated successfully with content from src/*.ts and src/*.tsx files (excluding node_modules and hidden items)."
Write-Host "Script execution complete."
