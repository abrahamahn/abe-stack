// main/server/system/src/mailer/smtp-client.ts
/**
 * Minimal SMTP Client
 *
 * Basic SMTP implementation for sending emails. Replaces nodemailer.
 * Supports PLAIN and LOGIN authentication over TLS.
 */

import { createConnection, type Socket } from 'node:net';
import { connect as tlsConnect, type TLSSocket } from 'node:tls';

import { delay, generateSecureId, MS_PER_MINUTE, MS_PER_SECOND } from '@bslt/shared';

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
  private readonly config: SmtpConfig;
  private socket: Socket | TLSSocket | null = null;
  private buffer = '';

  constructor(config: SmtpConfig) {
    this.config = {
      connectionTimeout: 30 * MS_PER_SECOND,
      socketTimeout: MS_PER_MINUTE,
      ...config,
    };
  }

  async send(message: SmtpMessage): Promise<SmtpResult> {
    const maxRetries = 3;
    const baseDelayMs = MS_PER_SECOND;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.connect();
        await this.authenticate();
        const messageId = await this.sendMessage(message);
        await this.quit();
        return { success: true, messageId };
      } catch (error) {
        this.cleanup();

        const isLastAttempt = attempt === maxRetries;
        const errorMessage = error instanceof Error ? error.message : 'Unknown SMTP error';

        // Check if this is a transient error worth retrying
        const isTransientError =
          errorMessage.includes('timeout') ||
          errorMessage.includes('ECONNRESET') ||
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('ETIMEDOUT') ||
          errorMessage.includes('ENOTFOUND') ||
          errorMessage.includes('socket hang up') ||
          errorMessage.includes('Connection') ||
          errorMessage.startsWith('4'); // SMTP 4xx temporary errors

        if (isLastAttempt || !isTransientError) {
          return {
            success: false,
            error: errorMessage,
          };
        }

        // Exponential backoff: 1s, 2s, 4s
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        await delay(delayMs);
      }
    }

    // Should not reach here, but TypeScript needs a return
    return {
      success: false,
      error: 'Max retries exceeded',
    };
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

      const onConnected = (): void => {
        clearTimeout(timeout);
        if (this.socket !== null) {
          this.socket.removeListener('error', onError);
        }
        this.readResponse()
          .then((response) => {
            if (!response.startsWith('220')) {
              reject(new Error(`Unexpected greeting: ${response}`));
            } else {
              resolve();
            }
          })
          .catch(reject);
      };

      if (this.config.secure) {
        // Implicit TLS (port 465)
        this.socket = tlsConnect(
          {
            host: this.config.host,
            port: this.config.port,
            rejectUnauthorized: true,
          },
          onConnected,
        );
      } else {
        // Plain connection (may upgrade with STARTTLS)
        this.socket = createConnection(
          {
            host: this.config.host,
            port: this.config.port,
          },
          onConnected,
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
    let ehloResponse = await this.command(`EHLO ${this.config.host}`);
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
      ehloResponse = await this.command(`EHLO ${this.config.host}`);
      if (!ehloResponse.startsWith('250')) {
        throw new Error(`EHLO after STARTTLS failed: ${ehloResponse}`);
      }
    }

    // Authenticate if credentials provided
    if (this.config.auth != null) {
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
    const randomPart = generateSecureId(12);
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
    const boundaryRandom = generateSecureId(12);
    const boundary = `----=_Part_${boundaryTimestamp}_${boundaryRandom}`;

    let content = '';
    content += `Message-ID: ${messageId}\r\n`;
    content += `Date: ${new Date().toUTCString()}\r\n`;
    content += `From: ${message.from}\r\n`;
    content += `To: ${recipients.join(', ')}\r\n`;
    content += `Subject: ${this.encodeHeader(message.subject)}\r\n`;
    content += 'MIME-Version: 1.0\r\n';

    if (
      message.html != null &&
      message.html !== '' &&
      message.text != null &&
      message.text !== ''
    ) {
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
    } else if (message.html != null && message.html !== '') {
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
    const encoded = text
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
      .join('');

    // Insert soft line breaks every 75 characters
    let wrapped = '';
    for (let i = 0; i < encoded.length; i += 75) {
      if (i > 0) wrapped += '=\r\n';
      wrapped += encoded.slice(i, i + 75);
    }
    return wrapped;
  }

  private extractEmail(address: string): string {
    const start = address.indexOf('<');
    if (start < 0) return address;
    const end = address.indexOf('>', start + 1);
    if (end < 0 || end <= start + 1) return address;
    return address.slice(start + 1, end);
  }

  private async quit(): Promise<void> {
    try {
      await this.command('QUIT');
    } finally {
      this.cleanup();
    }
  }

  private async command(cmd: string): Promise<string> {
    if (this.socket == null) {
      throw new Error('Not connected');
    }

    const socket = this.socket;

    return new Promise((resolve, reject) => {
      socket.write(`${cmd}\r\n`, (err) => {
        if (err != null) {
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
      if (socket == null) {
        reject(new Error('Not connected'));
        return;
      }

      let settled = false;

      const cleanup = (): void => {
        socket.removeListener('data', onData);
        socket.removeListener('error', onError);
        socket.removeListener('close', onClose);
      };

      const onError = (err: Error): void => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(err);
      };

      const onClose = (): void => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('Connection closed while reading response'));
      };

      const onData = (data: Buffer): void => {
        this.buffer += data.toString();

        // SMTP responses end with \r\n and continuation lines have - after code
        const lines = this.buffer.split('\r\n');
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          if (line === undefined) continue;
          // Check if this is the last line (no continuation)
          if (line.length >= 4 && line[3] === ' ') {
            if (settled) return;
            settled = true;
            cleanup();
            this.buffer = lines.slice(i + 1).join('\r\n');
            // Return all lines up to this point
            const fullResponse = lines.slice(0, i + 1).join('\r\n');
            resolve(fullResponse);
            return;
          }
        }
      };

      socket.on('data', onData);
      socket.once('error', onError);
      socket.once('close', onClose);
    });
  }

  private async upgradeToTls(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket == null) {
        reject(new Error('Not connected'));
        return;
      }

      // Remove all listeners from old socket before TLS upgrade
      // to prevent leaked handlers on the underlying plain socket
      const oldSocket = this.socket;
      oldSocket.removeAllListeners();

      const tlsSocket = tlsConnect(
        {
          socket: oldSocket as Socket,
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
    if (this.socket != null) {
      this.socket.removeAllListeners();
      this.socket.destroy();
      this.socket = null;
    }
    this.buffer = '';
  }
}
