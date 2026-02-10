// src/server/media/src/security.ts
/**
 * Basic Media Security Scanner
 *
 * Lightweight security scanning without external dependencies.
 * Performs basic validation and threat detection.
 */

import { promises as fs } from 'fs';

import type { SecurityScanResult } from './types';

/**
 * Basic Security Scanner
 */
export class BasicSecurityScanner {
  constructor(
    private readonly options: {
      maxFileSize: number;
      allowedMimeTypes: string[];
    } = {
      maxFileSize: 100 * 1024 * 1024, // 100MB
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'audio/mpeg',
        'audio/wav',
        'audio/aac',
        'audio/ogg',
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'application/pdf',
      ],
    },
  ) {}

  /**
   * Basic security scan
   */
  async scanFile(filePath: string): Promise<SecurityScanResult> {
    const result: SecurityScanResult = {
      safe: true,
      threats: [],
      warnings: [],
      metadata: {
        fileSize: 0,
      },
    };

    try {
      const stats = await fs.stat(filePath);
      result.metadata.fileSize = stats.size;

      // Size check
      if (stats.size > this.options.maxFileSize) {
        result.safe = false;
        result.threats.push(
          `File size ${String(stats.size)} exceeds limit ${String(this.options.maxFileSize)}`,
        );
        return result;
      }

      if (stats.size === 0) {
        result.safe = false;
        result.threats.push('File is empty');
        return result;
      }

      // Read first 1KB for basic content analysis
      const fd = await fs.open(filePath, 'r');
      const buffer: Buffer = Buffer.alloc(1024);
      try {
        await fd.read(buffer, 0, 1024, 0);
      } finally {
        await fd.close();
      }

      const content = buffer.toString('binary');
      const detectedMime = this.detectMimeType(filePath);
      const isTextBased = this.isTextBasedMimeType(detectedMime);

      // Check for extremely high entropy (might indicate encryption/obfuscation)
      const entropy = this.calculateEntropy(buffer);
      if (entropy > 7.5) {
        result.warnings.push('File has high entropy (might be encrypted or compressed)');
      }

      // Text-file specific checks: null bytes and embedded scripts
      // Binary media files (images, audio, video) naturally contain null bytes,
      // so these heuristics only apply to text-based MIME types.
      if (isTextBased) {
        if (content.includes('\0')) {
          result.warnings.push('Text file contains null bytes (potentially suspicious)');
        }

        if (
          content.includes('<script') ||
          content.includes('javascript:') ||
          content.includes('eval(') ||
          content.includes('Function(')
        ) {
          result.threats.push('Potential XSS content detected');
        }

        if (content.includes('<?php') || content.includes('<%') || content.includes('<%=')) {
          result.threats.push('Server-side code detected in file');
        }
      }

      if (result.threats.length > 0) {
        result.safe = false;
      }
    } catch (error) {
      result.safe = false;
      result.threats.push(`Scan failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Calculate Shannon entropy
   */
  private calculateEntropy(buffer: Buffer): number {
    const frequencies = new Array(256).fill(0);
    const length = buffer.length;

    // Count byte frequencies
    for (let i = 0; i < length; i++) {
      const byte = buffer[i];
      if (byte !== undefined) {
        frequencies[byte]++;
      }
    }

    // Calculate entropy
    let entropy = 0;
    for (const frequency of frequencies) {
      if (frequency > 0) {
        const probability = frequency / length;
        entropy -= probability * Math.log2(probability);
      }
    }

    return entropy;
  }

  /**
   * Check if MIME type is text-based
   */
  private isTextBasedMimeType(mimeType: string | null): boolean {
    if (mimeType === null || mimeType.length === 0) return false;
    return (
      mimeType.startsWith('text/') ||
      mimeType.includes('javascript') ||
      mimeType.includes('json') ||
      mimeType.includes('xml')
    );
  }

  /**
   * Basic MIME type detection from extension
   */
  private detectMimeType(filePath: string): string | null {
    const ext = filePath.split('.').pop()?.toLowerCase();

    if (ext === undefined || ext.length === 0) return null;

    const extToMime: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      mp4: 'video/mp4',
      pdf: 'application/pdf',
      txt: 'text/plain',
      json: 'application/json',
    };

    return extToMime[ext] ?? null;
  }
}
