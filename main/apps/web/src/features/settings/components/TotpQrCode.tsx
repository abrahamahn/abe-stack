// main/apps/web/src/features/settings/components/TotpQrCode.tsx
/**
 * TOTP QR Code Component
 *
 * Renders an otpauth URL as a scannable QR code using canvas.
 * Uses a minimal QR code encoding approach via an SVG data URI.
 *
 * Fallback: if canvas rendering fails, shows copy-link instructions.
 *
 * @module settings/components
 */

import { Text } from '@bslt/ui';
import { useEffect, useRef, useState, type ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

interface TotpQrCodeProps {
  /** The otpauth:// URL to encode */
  url: string;
  /** Size in pixels (default: 200) */
  size?: number;
}

// ============================================================================
// QR Code Matrix Generator (Minimal Version 2 Byte Mode)
// ============================================================================

// Reed-Solomon GF(256) primitive polynomial: x^8 + x^4 + x^3 + x^2 + 1
const GF_EXP: number[] = new Array<number>(512);
const GF_LOG: number[] = new Array<number>(256);

function initGaloisField(): void {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x = x << 1;
    if (x >= 256) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255]!;
  }
}

initGaloisField();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[(GF_LOG[a]! + GF_LOG[b]!) % 255]!;
}

function rsGeneratorPoly(nsym: number): number[] {
  let g = [1];
  for (let i = 0; i < nsym; i++) {
    const next: number[] = new Array<number>(g.length + 1).fill(0);
    const factor = GF_EXP[i]!;
    for (let j = 0; j < g.length; j++) {
      next[j] = (next[j]! ^ g[j]!) >>> 0;
      next[j + 1] = (next[j + 1]! ^ gfMul(g[j]!, factor)) >>> 0;
    }
    g = next;
  }
  return g;
}

function rsEncode(data: number[], nsym: number): number[] {
  const gen = rsGeneratorPoly(nsym);
  const out = new Array<number>(data.length + nsym).fill(0);
  for (let i = 0; i < data.length; i++) out[i] = data[i]!;
  for (let i = 0; i < data.length; i++) {
    const coef = out[i]!;
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        out[i + j] = (out[i + j]! ^ gfMul(gen[j]!, coef)) >>> 0;
      }
    }
  }
  return out.slice(data.length);
}

// Version parameters: [totalCodewords, dataCodewords, ecCodewords]
// Using EC level L for maximum data capacity
const VERSION_PARAMS: Record<number, [number, number, number]> = {
  1: [26, 19, 7],
  2: [44, 34, 10],
  3: [70, 55, 15],
  4: [100, 80, 20],
  5: [134, 108, 26],
  6: [172, 136, 36],
  7: [196, 156, 40],
  8: [242, 194, 48],
  9: [292, 232, 60],
  10: [346, 274, 72],
};

function selectVersion(dataLen: number): number {
  for (let v = 1; v <= 10; v++) {
    const params = VERSION_PARAMS[v]!;
    // Byte mode: 4 bits mode + 8/16 bits length + data + 4 bits terminator
    const lengthBits = v <= 9 ? 8 : 16;
    const available = params[1] * 8 - 4 - lengthBits;
    if (dataLen * 8 <= available) return v;
  }
  return 10; // Fallback to largest supported
}

function createQrMatrix(data: string): boolean[][] | null {
  try {
    const bytes = new TextEncoder().encode(data);
    const version = selectVersion(bytes.length);
    const params = VERSION_PARAMS[version];
    if (params === undefined) return null;

    const [, dataCw, ecCw] = params;
    const size = 17 + version * 4;

    // Encode data: Mode(4 bits) + Length(8/16 bits) + Data + Terminator + Padding
    const bits: number[] = [];
    const pushBits = (val: number, count: number): void => {
      for (let i = count - 1; i >= 0; i--) {
        bits.push((val >> i) & 1);
      }
    };

    pushBits(0b0100, 4); // Byte mode
    pushBits(bytes.length, version <= 9 ? 8 : 16);
    for (const b of bytes) pushBits(b, 8);
    pushBits(0, Math.min(4, dataCw * 8 - bits.length)); // Terminator

    while (bits.length % 8 !== 0) bits.push(0);

    const codewords: number[] = [];
    for (let i = 0; i < bits.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8; j++) byte = (byte << 1) | (bits[i + j] ?? 0);
      codewords.push(byte);
    }

    // Pad to fill data codewords
    const padBytes = [0xec, 0x11];
    let padIdx = 0;
    while (codewords.length < dataCw) {
      codewords.push(padBytes[padIdx % 2]!);
      padIdx++;
    }

    // Generate EC codewords
    const ecBytes = rsEncode(codewords, ecCw);
    const allCodewords = [...codewords, ...ecBytes];

    // Build matrix
    const matrix: (boolean | null)[][] = Array.from({ length: size }, () =>
      new Array<boolean | null>(size).fill(null),
    );

    // Place finder patterns
    const placeFinderPattern = (row: number, col: number): void => {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const mr = row + r;
          const mc = col + c;
          if (mr < 0 || mr >= size || mc < 0 || mc >= size) continue;
          const isBlack =
            (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
            (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          matrix[mr]![mc] = isBlack;
        }
      }
    };

    placeFinderPattern(0, 0);
    placeFinderPattern(0, size - 7);
    placeFinderPattern(size - 7, 0);

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
      matrix[6]![i] = i % 2 === 0;
      matrix[i]![6] = i % 2 === 0;
    }

    // Dark module
    matrix[size - 8]![8] = true;

    // Alignment patterns (version >= 2)
    if (version >= 2) {
      const alignPos = [6, size - 7];
      if (version >= 7) alignPos.splice(1, 0, Math.floor((size - 13) / 2) + 6);

      for (const ar of alignPos) {
        for (const ac of alignPos) {
          if (matrix[ar]?.[ac] !== null && matrix[ar]?.[ac] !== undefined) continue;
          for (let r = -2; r <= 2; r++) {
            for (let c = -2; c <= 2; c++) {
              const isBlack = Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
              if (ar + r >= 0 && ar + r < size && ac + c >= 0 && ac + c < size) {
                matrix[ar + r]![ac + c] = isBlack;
              }
            }
          }
        }
      }
    }

    // Reserve format info areas
    for (let i = 0; i < 8; i++) {
      if (matrix[8]![i] === null) matrix[8]![i] = false;
      if (matrix[i]![8] === null) matrix[i]![8] = false;
      if (matrix[8]![size - 1 - i] === null) matrix[8]![size - 1 - i] = false;
      if (matrix[size - 1 - i]![8] === null) matrix[size - 1 - i]![8] = false;
    }
    if (matrix[8]![8] === null) matrix[8]![8] = false;

    // Place data bits (upward/downward columns, right to left)
    let bitIdx = 0;
    const allBits: number[] = [];
    for (const cw of allCodewords) {
      for (let b = 7; b >= 0; b--) allBits.push((cw >> b) & 1);
    }

    let col = size - 1;
    let upward = true;
    while (col >= 0) {
      if (col === 6) col--; // Skip timing column
      const rows = upward
        ? Array.from({ length: size }, (_, i) => size - 1 - i)
        : Array.from({ length: size }, (_, i) => i);

      for (const row of rows) {
        for (const dc of [0, -1]) {
          const c = col + dc;
          if (c < 0 || c >= size) continue;
          if (matrix[row]![c] !== null) continue;
          matrix[row]![c] = bitIdx < allBits.length ? allBits[bitIdx]! === 1 : false;
          bitIdx++;
        }
      }

      col -= 2;
      upward = !upward;
    }

    // Apply mask pattern 0 (checkerboard) and format info
    const FORMAT_INFO_MASK0 = 0b111011111000100; // L level, mask 0
    const result: boolean[][] = Array.from({ length: size }, () =>
      new Array<boolean>(size).fill(false),
    );

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const val = matrix[r]![c] ?? false;
        const isMask = (r + c) % 2 === 0;
        // Only mask data/ec modules (not function patterns)
        const isFunction =
          (r < 9 && c < 9) ||
          (r < 9 && c >= size - 8) ||
          (r >= size - 8 && c < 9) ||
          r === 6 ||
          c === 6;
        result[r]![c] = isFunction ? val : val !== isMask;
      }
    }

    // Place format info
    const formatBits: boolean[] = [];
    for (let i = 14; i >= 0; i--) {
      formatBits.push(((FORMAT_INFO_MASK0 >> i) & 1) === 1);
    }

    // Horizontal format info
    let fIdx = 0;
    for (let c = 0; c <= 7; c++) {
      if (c === 6) continue;
      result[8]![c] = formatBits[fIdx]!;
      fIdx++;
    }
    result[8]![7] = formatBits[fIdx]!;
    fIdx++;
    result[8]![8] = formatBits[fIdx]!;
    fIdx++;
    for (let c = size - 7; c < size; c++) {
      result[8]![c] = formatBits[fIdx]!;
      fIdx++;
    }

    // Vertical format info
    fIdx = 0;
    for (let r = 0; r <= 7; r++) {
      if (r === 6) continue;
      result[r]![8] = formatBits[fIdx]!;
      fIdx++;
    }
    result[7]![8] = formatBits[fIdx]!;
    fIdx++;
    result[8]![8] = formatBits[fIdx]!;
    fIdx++;
    for (let r = size - 7; r < size; r++) {
      result[r]![8] = formatBits[fIdx]!;
      fIdx++;
    }

    return result;
  } catch {
    return null;
  }
}

// ============================================================================
// Component
// ============================================================================

/**
 * Renders a TOTP otpauth URL as a scannable QR code on a canvas element.
 * Falls back to showing the URL as a copyable link if rendering fails.
 */
export function TotpQrCode({ url, size = 200 }: TotpQrCodeProps): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderError, setRenderError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;

    const ctx = canvas.getContext('2d');
    if (ctx === null) {
      setRenderError(true);
      return;
    }

    const matrix = createQrMatrix(url);
    if (matrix === null) {
      setRenderError(true);
      return;
    }

    const moduleCount = matrix.length;
    const moduleSize = Math.floor(size / (moduleCount + 2)); // +2 for quiet zone
    const actualSize = moduleSize * (moduleCount + 2);

    canvas.width = actualSize;
    canvas.height = actualSize;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, actualSize, actualSize);

    // Draw modules
    ctx.fillStyle = '#000000';
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (matrix[row]?.[col] === true) {
          ctx.fillRect((col + 1) * moduleSize, (row + 1) * moduleSize, moduleSize, moduleSize);
        }
      }
    }

    setRenderError(false);
  }, [url, size]);

  if (renderError) {
    return (
      <Text size="sm" tone="muted">
        Unable to generate QR code. Please copy the secret key manually.
      </Text>
    );
  }

  return <canvas ref={canvasRef} style={{ width: size, height: size }} />;
}
