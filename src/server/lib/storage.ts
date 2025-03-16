import crypto from 'crypto';
import fs, { promises as fsPromises } from 'fs';
import path from 'path';

// Define a generic storage interface
export interface StorageProvider {
  uploadFile(file: Express.Multer.File): Promise<string>;
  getFileUrl(filename: string): string;
}

// Local file storage implementation
export class LocalFileStorage implements StorageProvider {
  private uploadDir: string;
  private baseUrl: string;

  constructor(uploadDir = 'uploads', baseUrl = '/uploads') {
    this.uploadDir = path.resolve(process.cwd(), uploadDir);
    this.baseUrl = baseUrl;
    
    // Ensure upload directory exists
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${crypto.randomUUID()}${fileExtension}`;
    const filePath = path.join(this.uploadDir, fileName);
    
    // Write file to disk
    await fsPromises.writeFile(filePath, file.buffer);
    
    // Return the URL to access the file
    return this.getFileUrl(fileName);
  }

  getFileUrl(filename: string): string {
    // Return a URL that can be used to access the file
    return `${this.baseUrl}/${filename}`;
  }
}

// Create and export a default storage provider
// This can be replaced with other implementations as needed
const storageProvider: StorageProvider = new LocalFileStorage();

// Export the uploadToStorage function for backward compatibility
export const uploadToStorage = async (file: Express.Multer.File): Promise<string> => {
  return storageProvider.uploadFile(file);
};

export default storageProvider; 