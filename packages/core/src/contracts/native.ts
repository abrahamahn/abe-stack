export interface NativeBridge {
  getPlatform: () => Promise<string>;
  sendNotification: (title: string, body: string) => void;
}
