import { authenticator } from "otplib";

export class MFAService {
  private tempSecrets = new Map<string, string>();

  async generateSecret(
    email: string,
  ): Promise<{ secret: string; qrCode: string }> {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(email, "YourApp", secret);
    return { secret, qrCode: otpauth };
  }

  async verifyToken(
    userId: string,
    token: string,
    secret?: string,
  ): Promise<boolean> {
    const mfaSecret = secret || this.tempSecrets.get(userId);
    if (!mfaSecret) return false;
    return authenticator.verify({ token, secret: mfaSecret });
  }

  async storeTemporarySecret(userId: string, secret: string): Promise<void> {
    this.tempSecrets.set(userId, secret);
  }

  async getTemporarySecret(userId: string): Promise<string | undefined> {
    return this.tempSecrets.get(userId);
  }

  async clearTemporarySecret(userId: string): Promise<void> {
    this.tempSecrets.delete(userId);
  }
}
