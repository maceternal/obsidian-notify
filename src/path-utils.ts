/**
 * Check if a file path should be excluded based on folder exclusion list
 */
export function shouldExcludeFile(
  filePath: string,
  excludedFolders: string[],
): boolean {
  for (const folder of excludedFolders) {
    // Normalize folder path (remove trailing slash if present)
    const normalizedFolder = folder.endsWith("/")
      ? folder.slice(0, -1)
      : folder;

    // Check if file is in this folder or subfolder
    if (filePath.startsWith(normalizedFolder + "/")) {
      return true;
    }

    // Also check exact match (for root-level files)
    if (filePath === normalizedFolder) {
      return true;
    }
  }

  return false;
}
