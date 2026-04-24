export function normalizePath(raw: string): string {
  return raw
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

export function isUnderFolder(childPath: string, folderPath: string): boolean {
  return folderPath === "" || childPath.startsWith(folderPath + "/");
}
