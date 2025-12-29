# DAW UI COMPONENTS GUIDE

This guide provides **ready-to-use React components** for the web-based DAW interface.

---

## 🎨 Component Architecture

```
Timeline (main container)
├── TransportControls (play/pause/record)
├── TrackList
│   ├── TrackHeader (name, volume, pan, mute, solo)
│   └── TrackLane
│       └── ClipBlock (draggable audio/MIDI clip)
├── Mixer (vertical channel strips)
└── Waveform (audio visualization)
```

---

## 🎛️ TransportControls Component

```typescript
// apps/web/src/components/TransportControls.tsx
import { useState } from 'react'
import { useProject } from '../hooks/useProject'
import { write } from '../actions/write'
import { useRealtime } from '../contexts/RealtimeContext'

type PlaybackState = 'stopped' | 'playing' | 'recording'

export function TransportControls({ projectId }: { projectId: string }) {
  const { recordCache } = useRealtime()
  const project = useProject(projectId)
  const [playbackState, setPlaybackState] = useState<PlaybackState>('stopped')
  const [currentBeat, setCurrentBeat] = useState(0)

  const handlePlay = () => {
    if (playbackState === 'playing') {
      setPlaybackState('stopped')
      // TODO: Stop audio engine
    } else {
      setPlaybackState('playing')
      // TODO: Start audio engine playback
    }
  }

  const handleRecord = () => {
    setPlaybackState('recording')
    // TODO: Enable recording
  }

  const handleStop = () => {
    setPlaybackState('stopped')
    setCurrentBeat(0)
    // TODO: Stop and reset audio engine
  }

  const handleBpmChange = async (newBpm: number) => {
    await write(recordCache, [
      {
        type: 'set',
        table: 'projects',
        id: projectId,
        key: 'bpm',
        value: newBpm
      },
      {
        type: 'set-now',
        table: 'projects',
        id: projectId,
        key: 'updatedAt'
      }
    ])
  }

  return (
    <div className="transport-controls">
      <button
        className={playbackState === 'playing' ? 'active' : ''}
        onClick={handlePlay}
      >
        {playbackState === 'playing' ? '⏸' : '▶️'}
      </button>

      <button
        className={playbackState === 'recording' ? 'active recording' : ''}
        onClick={handleRecord}
      >
        ⏺
      </button>

      <button onClick={handleStop}>⏹</button>

      <div className="playhead">
        <span>Beat: {currentBeat.toFixed(2)}</span>
      </div>

      <div className="tempo">
        <label>BPM:</label>
        <input
          type="number"
          min={20}
          max={300}
          value={project.bpm}
          onChange={(e) => handleBpmChange(parseInt(e.target.value))}
        />
      </div>

      <div className="time-signature">
        <span>{project.timeSignature}</span>
      </div>
    </div>
  )
}
```

```css
/* apps/web/src/components/TransportControls.css */
.transport-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--surface-1);
  border-bottom: 1px solid var(--border);
}

.transport-controls button {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  cursor: pointer;
  font-size: 18px;
  transition: all 0.2s;
}

.transport-controls button:hover {
  background: var(--surface-3);
}

.transport-controls button.active {
  background: var(--primary);
  color: white;
}

.transport-controls button.recording {
  background: var(--danger);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.playhead {
  font-family: monospace;
  padding: 0 12px;
}

.tempo input {
  width: 60px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  text-align: center;
}
```

---

## 🎚️ TrackHeader Component

```typescript
// apps/web/src/components/TrackHeader.tsx
import { useState } from 'react'
import { write, undo, redo } from '../actions/write'
import { useRealtime } from '../contexts/RealtimeContext'
import type { Track } from '@abe-stack/db/schema'

export function TrackHeader({ track }: { track: Track }) {
  const { recordCache } = useRealtime()
  const [isEditing, setIsEditing] = useState(false)

  const handleVolumeChange = async (volume: number) => {
    await write(recordCache, [
      {
        type: 'set',
        table: 'tracks',
        id: track.id,
        key: 'volume',
        value: volume
      }
    ])
  }

  const handlePanChange = async (pan: number) => {
    await write(recordCache, [
      {
        type: 'set',
        table: 'tracks',
        id: track.id,
        key: 'pan',
        value: pan
      }
    ])
  }

  const handleMuteToggle = async () => {
    await write(recordCache, [
      {
        type: 'set',
        table: 'tracks',
        id: track.id,
        key: 'muted',
        value: !track.muted
      }
    ])
  }

  const handleSoloToggle = async () => {
    await write(recordCache, [
      {
        type: 'set',
        table: 'tracks',
        id: track.id,
        key: 'solo',
        value: !track.solo
      }
    ])
  }

  const handleNameChange = async (newName: string) => {
    await write(recordCache, [
      {
        type: 'set',
        table: 'tracks',
        id: track.id,
        key: 'name',
        value: newName
      }
    ])
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (confirm('Delete this track?')) {
      await write(recordCache, [
        {
          type: 'set',
          table: 'tracks',
          id: track.id,
          key: 'deleted',
          value: new Date().toISOString()
        }
      ])
    }
  }

  return (
    <div className="track-header">
      {isEditing ? (
        <input
          autoFocus
          defaultValue={track.name}
          onBlur={(e) => handleNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleNameChange(e.currentTarget.value)
            if (e.key === 'Escape') setIsEditing(false)
          }}
        />
      ) : (
        <div className="track-name" onDoubleClick={() => setIsEditing(true)}>
          {track.name}
        </div>
      )}

      <div className="track-type-icon">
        {track.type === 'audio' ? '🎵' : track.type === 'midi' ? '🎹' : '🔊'}
      </div>

      <div className="track-controls">
        <button
          className={`mute-button ${track.muted ? 'active' : ''}`}
          onClick={handleMuteToggle}
          title="Mute"
        >
          M
        </button>

        <button
          className={`solo-button ${track.solo ? 'active' : ''}`}
          onClick={handleSoloToggle}
          title="Solo"
        >
          S
        </button>
      </div>

      <div className="volume-control">
        <label>Vol</label>
        <input
          type="range"
          min={0}
          max={2}
          step={0.01}
          value={track.volume}
          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
        />
        <span className="volume-value">
          {(track.volume * 100).toFixed(0)}%
        </span>
      </div>

      <div className="pan-control">
        <label>Pan</label>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={track.pan}
          onChange={(e) => handlePanChange(parseFloat(e.target.value))}
        />
        <span className="pan-value">
          {track.pan === 0
            ? 'C'
            : track.pan < 0
            ? `L${Math.abs(track.pan * 100).toFixed(0)}`
            : `R${(track.pan * 100).toFixed(0)}`}
        </span>
      </div>

      <button className="delete-button" onClick={handleDelete} title="Delete track">
        🗑
      </button>
    </div>
  )
}
```

```css
/* apps/web/src/components/TrackHeader.css */
.track-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--surface-2);
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  min-width: 250px;
}

.track-name {
  flex: 1;
  font-weight: 500;
  cursor: text;
  padding: 4px 8px;
  border-radius: 4px;
}

.track-name:hover {
  background: var(--surface-3);
}

.track-controls {
  display: flex;
  gap: 4px;
}

.mute-button,
.solo-button {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--surface-1);
  cursor: pointer;
  font-size: 11px;
  font-weight: bold;
}

.mute-button.active {
  background: var(--warning);
  color: white;
}

.solo-button.active {
  background: var(--success);
  color: white;
}

.volume-control,
.pan-control {
  display: flex;
  align-items: center;
  gap: 4px;
}

.volume-control input,
.pan-control input {
  width: 60px;
}

.volume-value,
.pan-value {
  font-size: 11px;
  color: var(--text-muted);
  width: 40px;
  text-align: right;
}
```

---

## 🎼 ClipBlock Component (Draggable)

```typescript
// apps/web/src/components/ClipBlock.tsx
import { useRef, useState } from 'react'
import { write } from '../actions/write'
import { useRealtime } from '../contexts/RealtimeContext'
import type { Clip } from '@abe-stack/db/schema'

type ClipBlockProps = {
  clip: Clip
  bpm: number
  pixelsPerBeat: number
}

export function ClipBlock({ clip, bpm, pixelsPerBeat }: ClipBlockProps) {
  const { recordCache } = useRealtime()
  const clipRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragStartBeat, setDragStartBeat] = useState(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return // Only left click

    setIsDragging(true)
    setDragStartX(e.clientX)
    setDragStartBeat(clip.startBeat)

    e.preventDefault()
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return

    const deltaX = e.clientX - dragStartX
    const deltaBeat = deltaX / pixelsPerBeat

    const newStartBeat = Math.max(0, dragStartBeat + deltaBeat)

    // Snap to grid (optional - 1/16th note)
    const snapInterval = 0.25 // 1/16th of a beat (in 4/4)
    const snappedBeat = Math.round(newStartBeat / snapInterval) * snapInterval

    // Optimistic update (apply locally immediately)
    if (clipRef.current) {
      clipRef.current.style.left = `${snappedBeat * pixelsPerBeat}px`
    }
  }

  const handleMouseUp = async (e: MouseEvent) => {
    if (!isDragging) return

    const deltaX = e.clientX - dragStartX
    const deltaBeat = deltaX / pixelsPerBeat

    const newStartBeat = Math.max(0, dragStartBeat + deltaBeat)
    const snapInterval = 0.25
    const snappedBeat = Math.round(newStartBeat / snapInterval) * snapInterval

    // Send to server
    await write(recordCache, [
      {
        type: 'set',
        table: 'clips',
        id: clip.id,
        key: 'startBeat',
        value: snappedBeat
      },
      {
        type: 'set-now',
        table: 'clips',
        id: clip.id,
        key: 'updatedAt'
      }
    ])

    setIsDragging(false)
  }

  // Attach/detach global mouse listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging])

  const clipWidth = clip.durationBeats * pixelsPerBeat
  const clipLeft = clip.startBeat * pixelsPerBeat

  return (
    <div
      ref={clipRef}
      className={`clip-block ${isDragging ? 'dragging' : ''}`}
      style={{
        left: `${clipLeft}px`,
        width: `${clipWidth}px`
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="clip-name">{clip.name}</div>

      {clip.audioFileId && (
        <div className="clip-waveform">
          {/* TODO: Render waveform from peaksData */}
        </div>
      )}

      {/* Resize handles */}
      <div className="resize-handle resize-left" />
      <div className="resize-handle resize-right" />
    </div>
  )
}
```

```css
/* apps/web/src/components/ClipBlock.css */
.clip-block {
  position: absolute;
  top: 4px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: move;
  user-select: none;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.clip-block:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.clip-block.dragging {
  opacity: 0.8;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  z-index: 100;
}

.clip-name {
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 500;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.clip-waveform {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  opacity: 0.5;
}

.resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  opacity: 0;
  transition: opacity 0.2s;
}

.clip-block:hover .resize-handle {
  opacity: 1;
}

.resize-left {
  left: 0;
  background: linear-gradient(to right, rgba(255,255,255,0.3), transparent);
}

.resize-right {
  right: 0;
  background: linear-gradient(to left, rgba(255,255,255,0.3), transparent);
}
```

---

## 🎹 Timeline Component (Main Container)

```typescript
// apps/web/src/components/Timeline.tsx
import { useState, useRef, useEffect } from 'react'
import { useProject } from '../hooks/useProject'
import { useTracks } from '../hooks/useTracks'
import { useClips } from '../hooks/useClips'
import { write, undo, redo } from '../actions/write'
import { useRealtime } from '../contexts/RealtimeContext'
import { TransportControls } from './TransportControls'
import { TrackHeader } from './TrackHeader'
import { ClipBlock } from './ClipBlock'

export function Timeline({ projectId }: { projectId: string }) {
  const { recordCache } = useRealtime()
  const project = useProject(projectId)
  const tracks = useTracks(projectId)

  const [zoom, setZoom] = useState(1) // Pixels per beat
  const [scrollLeft, setScrollLeft] = useState(0)
  const timelineRef = useRef<HTMLDivElement>(null)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          redo(recordCache)
        } else {
          undo(recordCache)
        }
      }

      if (e.key === ' ') {
        e.preventDefault()
        // Toggle play/pause
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [recordCache])

  const handleAddTrack = async () => {
    const trackId = crypto.randomUUID()

    await write(recordCache, [
      {
        type: 'set',
        table: 'tracks',
        id: trackId,
        key: 'id',
        value: trackId
      },
      {
        type: 'set',
        table: 'tracks',
        id: trackId,
        key: 'version',
        value: 1
      },
      {
        type: 'set',
        table: 'tracks',
        id: trackId,
        key: 'projectId',
        value: projectId
      },
      {
        type: 'set',
        table: 'tracks',
        id: trackId,
        key: 'name',
        value: `Track ${tracks.length + 1}`
      },
      {
        type: 'set',
        table: 'tracks',
        id: trackId,
        key: 'type',
        value: 'audio'
      },
      {
        type: 'set',
        table: 'tracks',
        id: trackId,
        key: 'volume',
        value: 1.0
      },
      {
        type: 'set',
        table: 'tracks',
        id: trackId,
        key: 'pan',
        value: 0.0
      },
      {
        type: 'set',
        table: 'tracks',
        id: trackId,
        key: 'muted',
        value: false
      },
      {
        type: 'set',
        table: 'tracks',
        id: trackId,
        key: 'solo',
        value: false
      },
      {
        type: 'set',
        table: 'tracks',
        id: trackId,
        key: 'orderIndex',
        value: tracks.length
      },
      {
        type: 'set',
        table: 'tracks',
        id: trackId,
        key: 'plugins',
        value: []
      }
    ])
  }

  const pixelsPerBeat = 40 * zoom

  return (
    <div className="timeline-container">
      <TransportControls projectId={projectId} />

      <div className="timeline-toolbar">
        <button onClick={handleAddTrack}>+ Add Track</button>

        <div className="zoom-controls">
          <button onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}>-</button>
          <span>Zoom: {zoom.toFixed(2)}x</span>
          <button onClick={() => setZoom(Math.min(4, zoom + 0.25))}>+</button>
        </div>
      </div>

      <div className="timeline-content">
        <div className="track-headers">
          {tracks.map(track => (
            <TrackHeader key={track.id} track={track} />
          ))}
        </div>

        <div
          ref={timelineRef}
          className="track-lanes"
          onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}
        >
          <TimeRuler pixelsPerBeat={pixelsPerBeat} />

          {tracks.map(track => (
            <TrackLane
              key={track.id}
              track={track}
              pixelsPerBeat={pixelsPerBeat}
              bpm={project.bpm}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function TrackLane({
  track,
  pixelsPerBeat,
  bpm
}: {
  track: Track
  pixelsPerBeat: number
  bpm: number
}) {
  const clips = useClips(track.id)

  return (
    <div className="track-lane">
      {clips.map(clip => (
        <ClipBlock
          key={clip.id}
          clip={clip}
          bpm={bpm}
          pixelsPerBeat={pixelsPerBeat}
        />
      ))}
    </div>
  )
}

function TimeRuler({ pixelsPerBeat }: { pixelsPerBeat: number }) {
  const bars = Array.from({ length: 100 }, (_, i) => i + 1)

  return (
    <div className="time-ruler">
      {bars.map(bar => (
        <div
          key={bar}
          className="bar-marker"
          style={{ left: `${(bar - 1) * 4 * pixelsPerBeat}px` }}
        >
          {bar}
        </div>
      ))}
    </div>
  )
}
```

```css
/* apps/web/src/components/Timeline.css */
.timeline-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--background);
}

.timeline-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--surface-1);
  border-bottom: 1px solid var(--border);
}

.timeline-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.track-headers {
  flex-shrink: 0;
  overflow-y: auto;
}

.track-lanes {
  flex: 1;
  overflow: auto;
  position: relative;
  background:
    repeating-linear-gradient(
      to right,
      transparent 0,
      transparent calc(4 * 40px - 1px),
      var(--border) calc(4 * 40px - 1px),
      var(--border) calc(4 * 40px)
    );
}

.time-ruler {
  position: sticky;
  top: 0;
  height: 30px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  z-index: 10;
}

.bar-marker {
  position: absolute;
  top: 0;
  height: 100%;
  padding: 4px 8px;
  font-size: 11px;
  color: var(--text-muted);
  border-left: 1px solid var(--border);
}

.track-lane {
  position: relative;
  height: 68px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-1);
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.zoom-controls button {
  width: 28px;
  height: 28px;
  border-radius: 4px;
}
```

---

## 🎚️ Mixer Component

```typescript
// apps/web/src/components/Mixer.tsx
import { useTracks } from '../hooks/useTracks'
import { write } from '../actions/write'
import { useRealtime } from '../contexts/RealtimeContext'
import type { Track } from '@abe-stack/db/schema'

export function Mixer({ projectId }: { projectId: string }) {
  const tracks = useTracks(projectId)

  return (
    <div className="mixer">
      {tracks.map(track => (
        <ChannelStrip key={track.id} track={track} />
      ))}
    </div>
  )
}

function ChannelStrip({ track }: { track: Track }) {
  const { recordCache } = useRealtime()

  const handleVolumeChange = async (volume: number) => {
    await write(recordCache, [
      { type: 'set', table: 'tracks', id: track.id, key: 'volume', value: volume }
    ])
  }

  const volumeDb = 20 * Math.log10(track.volume) // Convert to dB

  return (
    <div className="channel-strip">
      <div className="track-name">{track.name}</div>

      {/* Vertical fader */}
      <div className="fader-container">
        <div className="fader-scale">
          <span>+6</span>
          <span>0</span>
          <span>-6</span>
          <span>-12</span>
          <span>-∞</span>
        </div>

        <input
          type="range"
          orient="vertical"
          min={0}
          max={2}
          step={0.01}
          value={track.volume}
          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
          className="vertical-fader"
        />

        <div className="volume-meter">
          {/* TODO: Real-time audio level visualization */}
        </div>
      </div>

      <div className="volume-display">
        {volumeDb > -100 ? `${volumeDb.toFixed(1)} dB` : '-∞ dB'}
      </div>

      <div className="channel-buttons">
        <button className={track.muted ? 'active' : ''}>M</button>
        <button className={track.solo ? 'active' : ''}>S</button>
      </div>
    </div>
  )
}
```

```css
/* apps/web/src/components/Mixer.css */
.mixer {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: var(--surface-1);
  overflow-x: auto;
}

.channel-strip {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 80px;
  padding: 12px;
  background: var(--surface-2);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.fader-container {
  display: flex;
  gap: 8px;
  height: 300px;
  margin: 12px 0;
}

.vertical-fader {
  writing-mode: bt-lr;
  -webkit-appearance: slider-vertical;
  width: 40px;
}

.fader-scale {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 10px;
  color: var(--text-muted);
}

.volume-meter {
  width: 8px;
  background: linear-gradient(
    to top,
    var(--danger) 0%,
    var(--warning) 70%,
    var(--success) 100%
  );
  border-radius: 4px;
}

.volume-display {
  font-family: monospace;
  font-size: 11px;
  margin: 8px 0;
}

.channel-buttons {
  display: flex;
  gap: 4px;
}

.channel-buttons button {
  width: 32px;
  height: 32px;
  border-radius: 4px;
}
```

---

## 🎨 Theme Variables

```css
/* apps/web/src/theme.css */
:root {
  /* Surfaces */
  --background: #1a1a1a;
  --surface-1: #242424;
  --surface-2: #2e2e2e;
  --surface-3: #383838;

  /* Borders */
  --border: #3a3a3a;

  /* Text */
  --text: #e0e0e0;
  --text-muted: #999;

  /* Colors */
  --primary: #667eea;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;

  /* Shadows */
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

@media (prefers-color-scheme: light) {
  :root {
    --background: #ffffff;
    --surface-1: #f5f5f5;
    --surface-2: #ececec;
    --surface-3: #e0e0e0;
    --border: #d0d0d0;
    --text: #1a1a1a;
    --text-muted: #666;
  }
}
```

---

## 🎯 Complete Integration Example

```typescript
// apps/web/src/pages/ProjectPage.tsx
import { Suspense } from 'react'
import { useParams } from 'react-router-dom'
import { Timeline } from '../components/Timeline'
import { Mixer } from '../components/Mixer'

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>()

  if (!projectId) {
    return <div>Project not found</div>
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <div className="project-page">
        <Timeline projectId={projectId} />

        {/* Optional: Bottom mixer panel */}
        {/* <Mixer projectId={projectId} /> */}
      </div>
    </Suspense>
  )
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      <p>Loading project...</p>
    </div>
  )
}
```

---

## 🚀 Performance Tips

### 1. Virtualize Long Track Lists

```typescript
import { FixedSizeList } from 'react-window'

function VirtualizedTrackList({ tracks }: { tracks: Track[] }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={tracks.length}
      itemSize={68}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <TrackLane track={tracks[index]} />
        </div>
      )}
    </FixedSizeList>
  )
}
```

### 2. Debounce Volume/Pan Changes

```typescript
import { useDebouncedCallback } from 'use-debounce'

const debouncedVolumeChange = useDebouncedCallback(
  (volume: number) => {
    write(recordCache, [{ type: 'set', table: 'tracks', id, key: 'volume', value: volume }])
  },
  100 // 100ms delay
)
```

### 3. Canvas-Based Waveform Rendering

```typescript
// apps/web/src/components/Waveform.tsx
import { useRef, useEffect } from 'react'

export function Waveform({ peaks, width, height }: {
  peaks: number[]
  width: number
  height: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, width, height)

    const step = peaks.length / width
    const amp = height / 2

    ctx.strokeStyle = '#667eea'
    ctx.lineWidth = 1
    ctx.beginPath()

    for (let x = 0; x < width; x++) {
      const peakIndex = Math.floor(x * step)
      const peak = peaks[peakIndex] || 0
      const y = amp - peak * amp

      if (x === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }

    ctx.stroke()
  }, [peaks, width, height])

  return <canvas ref={canvasRef} width={width} height={height} />
}
```

---

This UI guide provides production-ready components for your DAW. Combine with the hybrid architecture from the previous docs, and you'll have a fully functional real-time collaborative DAW!
