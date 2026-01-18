// apps/server/src/infra/email/smtp.ts
/**
 * Minimal SMTP Client
 *
 * Basic SMTP implementation for sending emails. Replaces nodemailer.
 * Supports PLAIN and LOGIN authentication over TLS.
 */

import { createConnection, type Socket } from 'node:net';
import { connect as tlsConnect, type TLSSocket } from 'node:tls';

// ============================================================================
// Types
// ============================================================================

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean; // true = implicit TLS (port 465), false = STARTTLS or plain
  auth?: {
    user: string;
    pass: string;
  };
  connectionTimeout?: number;
  socketTimeout?: number;
}

export interface SmtpMessage {
  from: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

export interface SmtpResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================================================
// SMTP Client
// ============================================================================

export class SmtpClient {
  private config: SmtpConfig;
  private socket: Socket | TLSSocket | null = null;
  private buffer = '';

  constructor(config: SmtpConfig) {
    this.config = {
      connectionTimeout: 30000,
      socketTimeout: 60000,
      ...config,
    };
  }

  async send(message: SmtpMessage): Promise<SmtpResult> {
    try {
      await this.connect();
      await this.authenticate();
      const messageId = await this.sendMessage(message);
      await this.quit();
      return { success: true, messageId };
    } catch (error) {
      this.cleanup();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown SMTP error',
      };
    }
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.cleanup();
        reject(new Error('Connection timeout'));
      }, this.config.connectionTimeout);

      const onError = (err: Error): void => {
        clearTimeout(timeout);
        reject(err);
      };

      if (this.config.secure) {
        // Implicit TLS (port 465)
        this.socket = tlsConnect(
          {
            host: this.config.host,
            port: this.config.port,
            rejectUnauthorized: true,
          },
          () => {
            clearTimeout(timeout);
            this.readResponse()
              .then((response) => {
                if (!response.startsWith('220')) {
                  reject(new Error(`Unexpected greeting: ${response}`));
                } else {
                  resolve();
                }
              })
              .catch(reject);
          },
        );
      } else {
        // Plain connection (may upgrade with STARTTLS)
        this.socket = createConnection(
          {
            host: this.config.host,
            port: this.config.port,
          },
          () => {
            clearTimeout(timeout);
            this.readResponse()
              .then((response) => {
                if (!response.startsWith('220')) {
                  reject(new Error(`Unexpected greeting: ${response}`));
                } else {
                  resolve();
                }
              })
              .catch(reject);
          },
        );
      }

      this.socket.on('error', onError);
      const socketTimeout = this.config.socketTimeout ?? 60000;
      this.socket.setTimeout(socketTimeout);
      this.socket.on('timeout', () => {
        this.cleanup();
        reject(new Error('Socket timeout'));
      });
    });
  }

  private async authenticate(): Promise<void> {
    // Send EHLO
    const ehloResponse = await this.command(`EHLO ${this.config.host}`);
    if (!ehloResponse.startsWith('250')) {
      throw new Error(`EHLO failed: ${ehloResponse}`);
    }

    // Handle STARTTLS if not already secure
    if (!this.config.secure && ehloResponse.includes('STARTTLS')) {
      const starttlsResponse = await this.command('STARTTLS');
      if (!starttlsResponse.startsWith('220')) {
        throw new Error(`STARTTLS failed: ${starttlsResponse}`);
      }
      await this.upgradeToTls();

      // Re-send EHLO after TLS upgrade
      const ehloResponse2 = await this.command(`EHLO ${this.config.host}`);
      if (!ehloResponse2.startsWith('250')) {
        throw new Error(`EHLO after STARTTLS failed: ${ehloResponse2}`);
      }
    }

    // Authenticate if credentials provided
    if (this.config.auth) {
      const authMethods = ehloResponse.includes('AUTH');
      if (!authMethods) {
        throw new Error('Server does not support authentication');
      }

      // Try LOGIN auth (most compatible)
      const authResponse = await this.command('AUTH LOGIN');
      if (!authResponse.startsWith('334')) {
        throw new Error(`AUTH LOGIN failed: ${authResponse}`);
      }

      // Send username (base64)
      const userResponse = await this.command(
        Buffer.from(this.config.auth.user).toString('base64'),
      );
      if (!userResponse.startsWith('334')) {
        throw new Error(`AUTH username failed: ${userResponse}`);
      }

      // Send password (base64)
      const passResponse = await this.command(
        Buffer.from(this.config.auth.pass).toString('base64'),
      );
      if (!passResponse.startsWith('235')) {
        throw new Error(`AUTH password failed: ${passResponse}`);
      }
    }
  }

  private async sendMessage(message: SmtpMessage): Promise<string> {
    const recipients = Array.isArray(message.to) ? message.to : [message.to];
    const timestamp = String(Date.now());
    const randomPart = Math.random().toString(36).slice(2);
    const messageId = `<${timestamp}.${randomPart}@${this.config.host}>`;

    // MAIL FROM
    const fromEmail = this.extractEmail(message.from);
    const mailFromResponse = await this.command(`MAIL FROM:<${fromEmail}>`);
    if (!mailFromResponse.startsWith('250')) {
      throw new Error(`MAIL FROM failed: ${mailFromResponse}`);
    }

    // RCPT TO for each recipient
    for (const recipient of recipients) {
      const toEmail = this.extractEmail(recipient);
      const rcptResponse = await this.command(`RCPT TO:<${toEmail}>`);
      if (!rcptResponse.startsWith('250')) {
        throw new Error(`RCPT TO failed for ${toEmail}: ${rcptResponse}`);
      }
    }

    // DATA
    const dataResponse = await this.command('DATA');
    if (!dataResponse.startsWith('354')) {
      throw new Error(`DATA failed: ${dataResponse}`);
    }

    // Build and send message content
    const content = this.buildMessage(message, messageId);
    const endResponse = await this.command(`${content}\r\n.`);
    if (!endResponse.startsWith('250')) {
      throw new Error(`Message send failed: ${endResponse}`);
    }

    return messageId;
  }

  private buildMessage(message: SmtpMessage, messageId: string): string {
    const recipients = Array.isArray(message.to) ? message.to : [message.to];
    const boundaryTimestamp = String(Date.now());
    const boundaryRandom = Math.random().toString(36).slice(2);
    const boundary = `----=_Part_${boundaryTimestamp}_${boundaryRandom}`;

    let content = '';
    content += `Message-ID: ${messageId}\r\n`;
    content += `Date: ${new Date().toUTCString()}\r\n`;
    content += `From: ${message.from}\r\n`;
    content += `To: ${recipients.join(', ')}\r\n`;
    content += `Subject: ${this.encodeHeader(message.subject)}\r\n`;
    content += 'MIME-Version: 1.0\r\n';

    if (message.html && message.text) {
      // Multipart alternative
      content += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n`;
      content += '\r\n';
      content += `--${boundary}\r\n`;
      content += 'Content-Type: text/plain; charset=utf-8\r\n';
      content += 'Content-Transfer-Encoding: quoted-printable\r\n';
      content += '\r\n';
      content += this.encodeQuotedPrintable(message.text);
      content += '\r\n';
      content += `--${boundary}\r\n`;
      content += 'Content-Type: text/html; charset=utf-8\r\n';
      content += 'Content-Transfer-Encoding: quoted-printable\r\n';
      content += '\r\n';
      content += this.encodeQuotedPrintable(message.html);
      content += '\r\n';
      content += `--${boundary}--`;
    } else if (message.html) {
      content += 'Content-Type: text/html; charset=utf-8\r\n';
      content += 'Content-Transfer-Encoding: quoted-printable\r\n';
      content += '\r\n';
      content += this.encodeQuotedPrintable(message.html);
    } else {
      content += 'Content-Type: text/plain; charset=utf-8\r\n';
      content += 'Content-Transfer-Encoding: quoted-printable\r\n';
      content += '\r\n';
      content += this.encodeQuotedPrintable(message.text ?? '');
    }

    // Escape leading dots (SMTP transparency)
    return content.replace(/^\./gm, '..');
  }

  private encodeHeader(header: string): string {
    // Encode non-ASCII characters in header using RFC 2047
    if (/^[\x20-\x7E]*$/.test(header)) {
      return header;
    }
    return `=?utf-8?B?${Buffer.from(header).toString('base64')}?=`;
  }

  private encodeQuotedPrintable(text: string): string {
    return text
      .split('')
      .map((char) => {
        const code = char.charCodeAt(0);
        if (
          code === 9 ||
          code === 10 ||
          code === 13 ||
          (code >= 32 && code <= 126 && code !== 61)
        ) {
          return char;
        }
        return `=${code.toString(16).toUpperCase().padStart(2, '0')}`;
      })
      .join('')
      .replace(/(.{75})/g, '$1=\r\n'); // Soft line breaks
  }

  private extractEmail(address: string): string {
    const match = address.match(/<([^>]+)>/);
    return match?.[1] ?? address;
  }

  private async quit(): Promise<void> {
    try {
      await this.command('QUIT');
    } finally {
      this.cleanup();
    }
  }

  private async command(cmd: string): Promise<string> {
    if (!this.socket) {
      throw new Error('Not connected');
    }

    const socket = this.socket;

    return new Promise((resolve, reject) => {
      socket.write(`${cmd}\r\n`, (err) => {
        if (err) {
          reject(err);
        } else {
          this.readResponse().then(resolve).catch(reject);
        }
      });
    });
  }

  private async readResponse(): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket = this.socket;
      if (!socket) {
        reject(new Error('Not connected'));
        return;
      }

      const onData = (data: Buffer): void => {
        this.buffer += data.toString();

        // SMTP responses end with \r\n and continuation lines have - after code
        const lines = this.buffer.split('\r\n');
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          if (line === undefined) continue;
          // Check if this is the last line (no continuation)
          if (line.length >= 4 && line[3] === ' ') {
            socket.removeListener('data', onData);
            this.buffer = lines.slice(i + 1).join('\r\n');
            resolve(line);
            return;
          }
        }
      };

      socket.on('data', onData);
    });
  }

  private async upgradeToTls(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      const tlsSocket = tlsConnect(
        {
          socket: this.socket as Socket,
          host: this.config.host,
          rejectUnauthorized: true,
        },
        () => {
          this.socket = tlsSocket;
          this.buffer = '';
          resolve();
        },
      );

      tlsSocket.on('error', reject);
    });
  }

  private cleanup(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.buffer = '';
  }
}
