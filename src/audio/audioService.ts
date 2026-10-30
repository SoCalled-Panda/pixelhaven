import { assetUrl } from '../data/catalog';

export interface TrackInfo {
  id: string;
  title: string;
  file: string;
  description?: string;
  license: string;
}

export interface TrackList {
  schemaVersion: number;
  defaultTrackId: string;
  defaultVolume: number;
  attribution?: string;
  attributionShort?: string;
  tracks: TrackInfo[];
}

export type AudioEvent =
  | { kind: 'playing' }
  | { kind: 'paused' }
  | { kind: 'track-changed'; trackId: string }
  | { kind: 'error'; message: string };

type AudioEventListener = (event: AudioEvent) => void;

const FADE_STEP_MS = 50;

/**
 * Owns the single <audio> element lifecycle (architecture §2): mounted above
 * the router, so route changes never restart playback. Playback starts only
 * from an explicit user gesture; autoplay rejection and load errors keep the
 * controls usable. Volume ramps in/out to avoid sudden changes (checklist §H).
 */
class AudioService {
  private audio: HTMLAudioElement | null = null;
  private listeners = new Set<AudioEventListener>();
  private tracks: TrackInfo[] = [];
  private defaultTrackId: string | null = null;
  private currentTrackId: string | null = null;
  private volume = 0.6;
  private muted = false;
  private fadeTimer: number | null = null;

  setTracks(tracks: TrackInfo[], defaultTrackId: string): void {
    this.tracks = tracks;
    this.defaultTrackId = defaultTrackId;
  }

  hasTracks(): boolean {
    return this.tracks.length > 0;
  }

  getTrackList(): TrackInfo[] {
    return this.tracks;
  }

  getCurrentTrackId(): string | null {
    return this.currentTrackId;
  }

  isPlaying(): boolean {
    return this.audio !== null && !this.audio.paused;
  }

  getVolume(): number {
    return this.volume;
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** Restore persisted preferences before any user interaction. */
  initialize(volume: number, trackId: string | null, muted: boolean): void {
    if (Number.isFinite(volume)) this.volume = Math.min(1, Math.max(0, volume));
    this.muted = muted;
    this.currentTrackId =
      trackId && this.tracks.some((track) => track.id === trackId)
        ? trackId
        : (this.defaultTrackId ?? this.tracks[0]?.id ?? null);
  }

  subscribe(listener: AudioEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setVolume(value: number): void {
    if (!Number.isFinite(value)) return;
    this.volume = Math.min(1, Math.max(0, value));
    if (this.audio && !this.audio.paused) {
      this.fadeTo(this.muted ? 0 : this.volume);
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.audio && !this.audio.paused) {
      this.fadeTo(muted ? 0 : this.volume);
    }
  }

  /** Must be called from a user gesture (browser autoplay policy). */
  async play(): Promise<void> {
    if (!this.hasTracks()) {
      this.emit({ kind: 'error', message: 'No audio tracks are available right now.' });
      return;
    }
    const element = this.ensureAudio();
    const track = this.tracks.find((item) => item.id === this.currentTrackId) ?? this.tracks[0];
    this.currentTrackId = track.id;

    if (element.getAttribute('data-track') !== track.id) {
      element.src = assetUrl(track.file);
      element.setAttribute('data-track', track.id);
      element.loop = true;
    }

    const target = this.muted ? 0 : this.volume;
    try {
      element.volume = 0;
      await element.play();
      this.fadeTo(target);
      this.emit({ kind: 'playing' });
    } catch {
      // Autoplay rejection or decode failure — controls stay usable.
      this.emit({
        kind: 'error',
        message: 'Playback could not start. Press play again in a moment.',
      });
    }
  }

  pause(): void {
    const element = this.audio;
    if (!element || element.paused) {
      this.emit({ kind: 'paused' });
      return;
    }
    this.fadeTo(0, () => {
      element.pause();
      this.emit({ kind: 'paused' });
    });
  }

  /** Switch tracks; keeps playing (with a quick fade) if audio is active. */
  async selectTrack(trackId: string): Promise<void> {
    if (!this.tracks.some((track) => track.id === trackId)) return;
    const wasPlaying = this.isPlaying();
    this.currentTrackId = trackId;
    this.emit({ kind: 'track-changed', trackId });
    if (wasPlaying) {
      const element = this.ensureAudio();
      this.fadeTo(0, () => {
        element.src = assetUrl(this.tracks.find((t) => t.id === trackId)!.file);
        element.setAttribute('data-track', trackId);
        element.loop = true;
        element
          .play()
          .then(() => {
            this.fadeTo(this.muted ? 0 : this.volume);
            this.emit({ kind: 'playing' });
          })
          .catch(() => {
            this.emit({ kind: 'paused' });
            this.emit({
              kind: 'error',
              message: 'That track could not be played. Try another one.',
            });
          });
      });
    }
  }

  private ensureAudio(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = 'auto';
      this.audio.addEventListener('error', () => {
        // Load errors keep controls usable; the UI explains what happened.
        this.emit({ kind: 'error', message: 'Audio could not be loaded from storage.' });
      });
    }
    return this.audio;
  }

  private fadeTo(target: number, onDone?: () => void): void {
    const element = this.ensureAudio();
    if (this.fadeTimer !== null) {
      window.clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
    element.volume = Math.min(1, Math.max(0, element.volume));
    this.fadeTimer = window.setInterval(() => {
      const diff = target - element.volume;
      const step = Math.sign(diff) * Math.max(0.02, Math.abs(diff) * 0.3);
      if (Math.abs(diff) <= 0.02) {
        element.volume = target;
        if (this.fadeTimer !== null) {
          window.clearInterval(this.fadeTimer);
          this.fadeTimer = null;
        }
        onDone?.();
      } else {
        element.volume = Math.min(1, Math.max(0, element.volume + step));
      }
    }, FADE_STEP_MS);
  }

  private emit(event: AudioEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}

export const audioService = new AudioService();
