declare module 'sharp' {
  interface SharpOptions {
    failOnError?: boolean;
  }

  interface ResizeOptions {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    position?: string;
    background?: string;
    kernel?: string;
    withoutEnlargement?: boolean;
    withoutReduction?: boolean;
  }

  interface OutputOptions {
    quality?: number;
    progressive?: boolean;
    compressionLevel?: number;
    force?: boolean;
  }

  interface Sharp {
    resize(options?: ResizeOptions): Sharp;
    jpeg(options?: OutputOptions): Sharp;
    png(options?: OutputOptions): Sharp;
    webp(options?: OutputOptions): Sharp;
    toBuffer(): Promise<Buffer>;
    toFile(path: string): Promise<void>;
    metadata(): Promise<{
      width?: number;
      height?: number;
      format?: string;
      size?: number;
      channels?: number;
    }>;
  }

  interface SharpConstructor {
    (input?: string | Buffer, options?: SharpOptions): Sharp;
    (options?: SharpOptions): Sharp;
  }

  const sharp: SharpConstructor;
  export = sharp;
} 