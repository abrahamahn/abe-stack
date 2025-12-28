import * as p from "path";
import { join } from "path";

/** This is a utility function for specifying the path of a file based on the
 * root directory of this repo */
function rootPath(...str: string[]): string {
  return p.join(__dirname, "../../..", ...str);
}

export const path: typeof rootPath & typeof p = Object.assign(rootPath, p);

export function getPath(relativePath: string): string {
  // If it's an absolute path, just normalize it
  if (relativePath.startsWith("/")) {
    return relativePath;
  }

  // Join with cwd and normalize
  const result = join(process.cwd(), relativePath);

  // Convert backslashes to forward slashes for test consistency across operating systems
  return result.replace(/\\/g, "/");
}
