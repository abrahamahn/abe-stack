// main/server/system/src/security/upload-scanner.ts
/**
 * File Upload Scanning Hooks
 *
 * Extensible middleware for detecting malicious file uploads.
 * Provides built-in checks for:
 * - File signature (magic bytes) validation
 * - Dangerous file extension blocking
 * - Content-type consistency checking
 * - Executable/script detection
 *
 * Supports pluggable external scanners (ClamAV, VirusTotal, etc.)
 * via the ScannerPlugin interface.
 *
 * @module @bslt/server-system/security/upload-scanner
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Represents a file to be scanned.
 * Abstracted to work with both Buffer-based and stream-based uploads.
 */
export interface ScannableFile {
  /** Original filename from the upload */
  filename: string;
  /** MIME type from the Content-Type header */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /**
   * File content as Buffer.
   * For large files, at minimum the first 8192 bytes should be provided
   * for magic byte detection. The full buffer is passed to external scanners.
   */
  buffer: Buffer;
}

/**
 * Result of a file scan.
 */
export interface ScanResult {
  /** Whether the file passed all checks */
  safe: boolean;
  /** Human-readable reason if the file was rejected */
  reason?: string;
  /** Which scanner/check identified the issue */
  source?: string;
  /** Additional metadata from the scanner */
  metadata?: Record<string, unknown>;
}

/**
 * Pluggable scanner interface for external malware scanning services.
 *
 * @example
 * ```typescript
 * const clamavPlugin: ScannerPlugin = {
 *   name: 'ClamAV',
 *   async scan(file) {
 *     const result = await clamav.scanBuffer(file.buffer);
 *     return {
 *       safe: !result.isInfected,
 *       reason: result.isInfected ? `Malware detected: ${result.viruses.join(', ')}` : undefined,
 *     };
 *   },
 * };
 * ```
 */
export interface ScannerPlugin {
  /** Plugin name for logging and result attribution */
  name: string;
  /**
   * Scan a file and return the result.
   * Should not throw. Return { safe: true } on internal errors to avoid
   * blocking legitimate uploads due to scanner failures.
   */
  scan(file: ScannableFile): Promise<ScanResult>;
}

/**
 * Configuration for the upload scanner.
 */
export interface UploadScannerConfig {
  /**
   * Maximum allowed file size in bytes.
   * Files exceeding this are rejected before scanning.
   * Defaults to 50MB.
   */
  maxFileSize?: number;

  /**
   * Blocked file extensions (without leading dot).
   * Defaults to a comprehensive list of dangerous extensions.
   */
  blockedExtensions?: string[];

  /**
   * Allowed MIME types. If set, only these types are permitted.
   * When undefined, all MIME types are allowed (except those blocked by other checks).
   */
  allowedMimeTypes?: string[];

  /**
   * Whether to validate that file magic bytes match the declared MIME type.
   * Defaults to true.
   */
  validateMagicBytes?: boolean;

  /**
   * Whether to scan file content for embedded scripts/executables.
   * Defaults to true.
   */
  scanForScripts?: boolean;

  /**
   * External scanner plugins to run after built-in checks.
   */
  plugins?: ScannerPlugin[];

  /**
   * Called when a file is rejected by any check.
   * Useful for logging/alerting.
   */
  onRejected?: (file: ScannableFile, result: ScanResult) => void;

  /**
   * Called when a file passes all checks.
   */
  onAccepted?: (file: ScannableFile) => void;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default maximum file size: 50MB
 */
const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Default list of blocked file extensions.
 * Covers executables, scripts, and other potentially dangerous file types.
 */
export const DEFAULT_BLOCKED_EXTENSIONS: readonly string[] = [
  // Executables
  'exe',
  'dll',
  'scr',
  'com',
  'bat',
  'cmd',
  'msi',
  'msp',
  'mst',
  // Scripts
  'js',
  'jsx',
  'ts',
  'tsx',
  'vbs',
  'vbe',
  'wsf',
  'wsh',
  'ps1',
  'psm1',
  'psd1',
  // Shell scripts
  'sh',
  'bash',
  'csh',
  'ksh',
  'zsh',
  // Java
  'jar',
  'class',
  'jnlp',
  // Python
  'py',
  'pyc',
  'pyw',
  // PHP
  'php',
  'phtml',
  'php3',
  'php4',
  'php5',
  'php7',
  'phps',
  // Ruby/Perl
  'rb',
  'pl',
  'pm',
  'cgi',
  // Office macros
  'docm',
  'xlsm',
  'pptm',
  'dotm',
  'xltm',
  'potm',
  // Archives (can contain executables)
  'iso',
  'img',
  // Registry
  'reg',
  // Shortcuts
  'lnk',
  'url',
  'scf',
  'inf',
  // Certificates (can be used for attacks)
  'cer',
  'crt',
  // HTML (XSS risk in uploads)
  'html',
  'htm',
  'xhtml',
  'svg',
  // HTA
  'hta',
  // Application references
  'appref-ms',
] as const;

/**
 * Known magic byte signatures for file type detection.
 * Maps MIME type prefixes to their expected magic bytes.
 */
interface MagicSignature {
  /** Expected bytes at the start of the file */
  bytes: number[];
  /** Offset from the start of the file */
  offset: number;
  /** MIME type this signature indicates */
  mimeType: string;
}

const MAGIC_SIGNATURES: MagicSignature[] = [
  // Images
  { bytes: [0xff, 0xd8, 0xff], offset: 0, mimeType: 'image/jpeg' },
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], offset: 0, mimeType: 'image/png' },
  { bytes: [0x47, 0x49, 0x46, 0x38], offset: 0, mimeType: 'image/gif' },
  { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, mimeType: 'image/webp' }, // RIFF header (WebP)
  // PDF
  { bytes: [0x25, 0x50, 0x44, 0x46], offset: 0, mimeType: 'application/pdf' },
  // ZIP (used by docx, xlsx, pptx, etc.)
  { bytes: [0x50, 0x4b, 0x03, 0x04], offset: 0, mimeType: 'application/zip' },
  // Executables (PE)
  { bytes: [0x4d, 0x5a], offset: 0, mimeType: 'application/x-executable' },
  // ELF (Linux executables)
  { bytes: [0x7f, 0x45, 0x4c, 0x46], offset: 0, mimeType: 'application/x-elf' },
  // Mach-O (macOS executables)
  { bytes: [0xcf, 0xfa, 0xed, 0xfe], offset: 0, mimeType: 'application/x-mach-binary' },
  { bytes: [0xfe, 0xed, 0xfa, 0xcf], offset: 0, mimeType: 'application/x-mach-binary' },
];

/**
 * Patterns indicating embedded scripts or executables in text content.
 * These are checked in the first portion of the file content.
 */
const SCRIPT_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  { pattern: /<script[\s>]/i, description: 'HTML script tag' },
  { pattern: /<%[\s@]/i, description: 'Server-side script tag (ASP/JSP)' },
  { pattern: /<\?php/i, description: 'PHP opening tag' },
  { pattern: /javascript:/i, description: 'JavaScript protocol handler' },
  { pattern: /vbscript:/i, description: 'VBScript protocol handler' },
  { pattern: /on\w+\s*=\s*["']/i, description: 'Inline event handler' },
  // eslint-disable-next-line no-control-regex
  { pattern: /\x00/, description: 'Null byte (binary in text content)' },
];

/**
 * MIME types considered executable or dangerous regardless of extension.
 */
const EXECUTABLE_MIME_TYPES = new Set([
  'application/x-executable',
  'application/x-elf',
  'application/x-mach-binary',
  'application/x-msdownload',
  'application/x-dosexec',
  'application/x-sharedlib',
  'application/x-object',
]);

// ============================================================================
// Scanner Utilities
// ============================================================================

/**
 * Extract the file extension from a filename (lowercase, without dot).
 *
 * @param filename - File name to extract extension from
 * @returns Lowercase extension or empty string if none
 * @complexity O(1)
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === filename.length - 1) return '';
  return filename.substring(lastDot + 1).toLowerCase();
}

/**
 * Detect the MIME type from file magic bytes.
 * Returns undefined if no known signature matches.
 *
 * @param buffer - File content (at least first 8 bytes)
 * @returns Detected MIME type or undefined
 * @complexity O(s) where s = number of known signatures
 */
export function detectMimeFromMagicBytes(buffer: Buffer): string | undefined {
  for (const sig of MAGIC_SIGNATURES) {
    if (buffer.length < sig.offset + sig.bytes.length) continue;

    let matches = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buffer[sig.offset + i] !== sig.bytes[i]) {
        matches = false;
        break;
      }
    }

    if (matches) return sig.mimeType;
  }

  return undefined;
}

/**
 * Check if a file buffer contains suspicious script patterns.
 * Only scans the first 8KB of text-like content.
 *
 * @param buffer - File content buffer
 * @returns Description of found pattern, or null if clean
 * @complexity O(p * n) where p = patterns, n = scan length
 */
export function detectScriptContent(buffer: Buffer): string | null {
  // Only scan text-like content (first 8KB)
  const scanLength = Math.min(buffer.length, 8192);
  const content = buffer.subarray(0, scanLength).toString('utf-8');

  for (const { pattern, description } of SCRIPT_PATTERNS) {
    if (pattern.test(content)) {
      return description;
    }
  }

  return null;
}

// ============================================================================
// UploadScanner Class
// ============================================================================

/**
 * File upload scanner with built-in checks and pluggable scanner support.
 *
 * Built-in checks (in order):
 * 1. File size validation
 * 2. File extension blocklist
 * 3. MIME type allowlist (if configured)
 * 4. Magic byte validation (detects executables masquerading as images)
 * 5. Script/embedded content detection
 * 6. External scanner plugins
 *
 * @example
 * ```typescript
 * const scanner = createUploadScanner({
 *   maxFileSize: 10 * 1024 * 1024, // 10MB
 *   allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
 *   plugins: [clamavPlugin],
 *   onRejected: (file, result) => {
 *     logger.warn('Upload rejected', { filename: file.filename, reason: result.reason });
 *   },
 * });
 *
 * const result = await scanner.scan({ filename, mimeType, size, buffer });
 * if (!result.safe) {
 *   return reply.status(400).send({ error: result.reason });
 * }
 * ```
 */
export class UploadScanner {
  private readonly maxFileSize: number;
  private readonly blockedExtensions: Set<string>;
  private readonly allowedMimeTypes: Set<string> | null;
  private readonly validateMagicBytes: boolean;
  private readonly scanForScripts: boolean;
  private readonly plugins: ScannerPlugin[];
  private readonly config: UploadScannerConfig;

  constructor(config: UploadScannerConfig = {}) {
    this.config = config;
    this.maxFileSize = config.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
    this.blockedExtensions = new Set(
      (config.blockedExtensions ?? DEFAULT_BLOCKED_EXTENSIONS).map((e) => e.toLowerCase()),
    );
    this.allowedMimeTypes =
      config.allowedMimeTypes !== undefined
        ? new Set(config.allowedMimeTypes.map((m) => m.toLowerCase()))
        : null;
    this.validateMagicBytes = config.validateMagicBytes ?? true;
    this.scanForScripts = config.scanForScripts ?? true;
    this.plugins = config.plugins ?? [];
  }

  /**
   * Scan a file through all configured checks and plugins.
   *
   * @param file - File to scan
   * @returns Scan result indicating whether the file is safe
   * @complexity O(p + e) where p = plugin count, e = extension/pattern checks
   */
  async scan(file: ScannableFile): Promise<ScanResult> {
    // 1. File size check
    if (file.size > this.maxFileSize) {
      const result: ScanResult = {
        safe: false,
        reason: `File size ${String(file.size)} bytes exceeds maximum ${String(this.maxFileSize)} bytes`,
        source: 'size-check',
      };
      this.config.onRejected?.(file, result);
      return result;
    }

    // 2. Extension check
    const extension = getFileExtension(file.filename);
    if (extension !== '' && this.blockedExtensions.has(extension)) {
      const result: ScanResult = {
        safe: false,
        reason: `File extension '.${extension}' is not allowed`,
        source: 'extension-check',
      };
      this.config.onRejected?.(file, result);
      return result;
    }

    // 3. MIME type allowlist check
    if (this.allowedMimeTypes !== null) {
      const normalizedMime = file.mimeType.toLowerCase().split(';')[0]?.trim() ?? '';
      if (!this.allowedMimeTypes.has(normalizedMime)) {
        const result: ScanResult = {
          safe: false,
          reason: `MIME type '${file.mimeType}' is not in the allowed list`,
          source: 'mime-check',
        };
        this.config.onRejected?.(file, result);
        return result;
      }
    }

    // 4. Magic byte validation
    if (this.validateMagicBytes && file.buffer.length > 0) {
      const detectedMime = detectMimeFromMagicBytes(file.buffer);

      // Block executables regardless of declared MIME type
      if (detectedMime !== undefined && EXECUTABLE_MIME_TYPES.has(detectedMime)) {
        const result: ScanResult = {
          safe: false,
          reason: `File content detected as executable (${detectedMime})`,
          source: 'magic-bytes-check',
          metadata: { detectedMime, declaredMime: file.mimeType },
        };
        this.config.onRejected?.(file, result);
        return result;
      }

      // Check for MIME type mismatch (image declared but not an image, etc.)
      if (detectedMime !== undefined) {
        const declaredCategory = file.mimeType.split('/')[0];
        const detectedCategory = detectedMime.split('/')[0];
        if (
          declaredCategory !== undefined &&
          detectedCategory !== undefined &&
          declaredCategory !== detectedCategory &&
          declaredCategory !== 'application'
        ) {
          const result: ScanResult = {
            safe: false,
            reason: `MIME type mismatch: declared '${file.mimeType}' but content is '${detectedMime}'`,
            source: 'magic-bytes-check',
            metadata: { detectedMime, declaredMime: file.mimeType },
          };
          this.config.onRejected?.(file, result);
          return result;
        }
      }
    }

    // 5. Script/embedded content detection
    if (this.scanForScripts && file.buffer.length > 0) {
      const scriptFound = detectScriptContent(file.buffer);
      if (scriptFound !== null) {
        // Only flag for non-text MIME types (text files can legitimately contain scripts)
        const isTextType =
          file.mimeType.startsWith('text/') ||
          file.mimeType === 'application/json' ||
          file.mimeType === 'application/xml';

        if (!isTextType) {
          const result: ScanResult = {
            safe: false,
            reason: `Suspicious content detected: ${scriptFound}`,
            source: 'script-check',
          };
          this.config.onRejected?.(file, result);
          return result;
        }
      }
    }

    // 6. External scanner plugins
    for (const plugin of this.plugins) {
      try {
        const pluginResult = await plugin.scan(file);
        if (!pluginResult.safe) {
          const result: ScanResult = {
            safe: false,
            reason: pluginResult.reason ?? `Rejected by ${plugin.name}`,
            source: plugin.name,
            ...(pluginResult.metadata !== undefined ? { metadata: pluginResult.metadata } : {}),
          };
          this.config.onRejected?.(file, result);
          return result;
        }
      } catch {
        // Plugin errors should not block uploads
        // Production systems should log this
      }
    }

    // All checks passed
    const result: ScanResult = { safe: true };
    this.config.onAccepted?.(file);
    return result;
  }

  /**
   * Add a scanner plugin at runtime.
   *
   * @param plugin - Scanner plugin to add
   */
  addPlugin(plugin: ScannerPlugin): void {
    this.plugins.push(plugin);
  }

  /**
   * Check if an extension is blocked.
   *
   * @param extension - File extension (without dot)
   * @returns Whether the extension is blocked
   */
  isExtensionBlocked(extension: string): boolean {
    return this.blockedExtensions.has(extension.toLowerCase());
  }

  /**
   * Get scanner configuration summary (for debugging / health checks).
   */
  getConfig(): {
    maxFileSize: number;
    blockedExtensionCount: number;
    allowedMimeTypeCount: number | null;
    validateMagicBytes: boolean;
    scanForScripts: boolean;
    pluginCount: number;
    pluginNames: string[];
  } {
    return {
      maxFileSize: this.maxFileSize,
      blockedExtensionCount: this.blockedExtensions.size,
      allowedMimeTypeCount: this.allowedMimeTypes?.size ?? null,
      validateMagicBytes: this.validateMagicBytes,
      scanForScripts: this.scanForScripts,
      pluginCount: this.plugins.length,
      pluginNames: this.plugins.map((p) => p.name),
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create an UploadScanner instance.
 *
 * @param config - Scanner configuration
 * @returns UploadScanner instance
 */
export function createUploadScanner(config: UploadScannerConfig = {}): UploadScanner {
  return new UploadScanner(config);
}
