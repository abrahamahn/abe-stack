declare module 'otpauth' {
  export interface TotpOptions {
    issuer?: string | undefined;
    label?: string | undefined;
    algorithm: string;
    digits: number;
    period: number;
    secret: Secret;
  }

  export interface TotpValidationOptions {
    token: string;
    window: number;
  }

  export class Secret {
    readonly base32: string;
    constructor(options: { size: number });
    static fromBase32(secret: string): Secret;
  }

  export class TOTP {
    constructor(options: TotpOptions);
    toString(): string;
    validate(options: TotpValidationOptions): number | null;
  }
}
