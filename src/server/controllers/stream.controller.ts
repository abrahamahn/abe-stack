import { Request, Response } from 'express';
import fs from 'fs';
import rangeParser from 'range-parser';
import { Track } from '../models';

class StreamController {
  /**
   * Stream an audio file with support for range requests (important for seeking)
   */
  async streamAudio(req: Request, res: Response): Promise<void> {
    try {
      const trackId = req.params.trackId;
      
      // Get track from database
      const track = await Track.findByPk(trackId);
      if (!track) {
        res.status(404).json({ error: 'Track not found' });
        return;
      }
      
      // Get file path
      const filePath = track.fileUrl;
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'Audio file not found' });
        return;
      }
      
      // Get file stats
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const mimeType = 'audio/mpeg'; // assuming MP3 format
      
      // Handle range requests (for seeking)
      const rangeHeader = req.headers.range;
      
      if (rangeHeader) {
        // Parse range
        const ranges = rangeParser(fileSize, rangeHeader);
        
        // Handle invalid range
        if (ranges === -1 || ranges === -2) {
          res.status(416).json({ error: 'Range Not Satisfiable' });
          return;
        }
        
        // We'll handle just the first range for simplicity
        const range = ranges[0];
        
        // Create read stream with range
        const stream = fs.createReadStream(filePath, { start: range.start, end: range.end });
        
        // Send partial content
        res.status(206);
        (res as any).set({
          'Content-Range': `bytes ${range.start}-${range.end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': (range.end - range.start + 1).toString(),
          'Content-Type': mimeType,
        });
          
        // Pipe stream to response
        stream.pipe(res as any);
      } else {
        // Send full file
        (res as any).set({
          'Content-Length': fileSize.toString(),
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
        });
        
        // Create read stream
        const stream = fs.createReadStream(filePath);
        
        // Pipe stream to response
        stream.pipe(res as any);
      }
      
      // Update play count
      track.playCount += 1;
      await (track as any).save();
      
    } catch (error) {
      console.error('Error streaming audio:', error);
      res.status(500).json({ error: 'Failed to stream audio' });
    }
  }
  
  /**
   * Generate a waveform representation for a track
   */
  async getWaveform(req: Request, res: Response): Promise<void> {
    try {
      const trackId = req.params.trackId;
      
      // Get track from database
      const track = await Track.findByPk(trackId);
      if (!track) {
        res.status(404).json({ error: 'Track not found' });
        return;
      }
      
      // Return mock waveform data for now
      // In production, you would generate this when the track is uploaded and save to DB
      const waveformData = Array.from({ length: 100 }, () => Math.random());
      
      res.json({ waveform: waveformData });
      
    } catch (error) {
      console.error('Error getting waveform:', error);
      res.status(500).json({ error: 'Failed to get waveform' });
    }
  }
}

export default StreamController; 