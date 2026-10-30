import { useEffect, useRef, useState } from 'react';
import { assetUrl } from '../data/catalog';
import { audioService, type TrackInfo, type TrackList } from './audioService';
import { usePersistentPreference } from '../hooks/usePersistentPreference';
import { IconButton } from '../components/ui/IconButton';
import { useToast } from '../components/ui/Toast';
import { IconMusic, IconMute, IconPause, IconPlay, IconVolume } from '../components/icons';

/**
 * Persistent ambience player (checklist §H): mounted above the router so
 * navigation never restarts playback. Volume/track/mute preferences live in
 * localStorage; playback only ever starts from the play button click.
 */
export function AudioDock() {
  const { showToast } = useToast();
  const [volumePref, setVolumePref] = usePersistentPreference('volume', '0.6');
  const [trackPref, setTrackPref] = usePersistentPreference('track', '');
  const [mutedPref, setMutedPref] = usePersistentPreference('muted', 'false');

  const [tracks, setTracks] = useState<TrackInfo[]>([]);
  const [attribution, setAttribution] = useState('Music for winding down');
  const [noTracks, setNoTracks] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [volume, setVolume] = useState(Math.min(1, Math.max(0, Number(volumePref) || 0.6)));
  const [muted, setMuted] = useState(mutedPref === 'true');
  const errorShownAtRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(assetUrl('audio/tracks.json'));
        if (!response.ok) throw new Error(`tracks request failed (${response.status})`);
        const list = (await response.json()) as TrackList;
        if (!Array.isArray(list.tracks)) throw new Error('tracks.json has an unexpected shape');
        if (cancelled) return;
        audioService.setTracks(list.tracks, list.defaultTrackId);
        setAttribution(list.attributionShort ?? list.attribution ?? 'Music for winding down');
        audioService.initialize(
          Number(volumePref) || list.defaultVolume,
          trackPref || list.defaultTrackId,
          mutedPref === 'true',
        );
        setTracks(list.tracks);
        setCurrentId(trackPref || list.defaultTrackId);
      } catch {
        if (!cancelled) setNoTracks(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unsubscribe = audioService.subscribe((event) => {
      if (event.kind === 'playing') setPlaying(true);
      if (event.kind === 'paused') setPlaying(false);
      if (event.kind === 'track-changed') setCurrentId(event.trackId);
      if (event.kind === 'error') {
        // Throttle identical failure toasts so a broken file doesn't spam.
        const now = Date.now();
        if (now - errorShownAtRef.current > 4000) {
          errorShownAtRef.current = now;
          showToast({ message: event.message, tone: 'warning' });
        }
      }
    });
    return unsubscribe;
  }, [showToast]);

  const togglePlay = () => {
    if (noTracks) {
      showToast({ message: 'Audio tracks could not be loaded.', tone: 'warning' });
      return;
    }
    if (playing) {
      audioService.pause();
    } else {
      void audioService.play();
    }
  };

  const changeTrack = (trackId: string) => {
    setTrackPref(trackId);
    void audioService.selectTrack(trackId);
  };

  const changeVolume = (value: number) => {
    setVolume(value);
    setVolumePref(String(value));
    audioService.setVolume(value);
    if (muted && value > 0) {
      setMuted(false);
      setMutedPref('false');
      audioService.setMuted(false);
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedPref(next ? 'true' : 'false');
    audioService.setMuted(next);
  };

  return (
    <div className="audio-dock">
      {expanded && (
        <div className="audio-dock__panel" role="group" aria-label="Ambience player">
          {noTracks ? (
            <p className="audio-dock__unavailable">Ambience is unavailable right now.</p>
          ) : (
            <>
              <label className="audio-dock__track">
                <span className="sr-only">Choose ambience track</span>
                <select
                  value={currentId ?? ''}
                  onChange={(event) => changeTrack(event.target.value)}
                >
                  {tracks.map((track) => (
                    <option key={track.id} value={track.id}>
                      {track.title}
                    </option>
                  ))}
                </select>
              </label>
              <div className="audio-dock__volume">
                <IconButton
                  icon={muted ? <IconMute /> : <IconVolume />}
                  label={muted ? 'Unmute' : 'Mute'}
                  onClick={toggleMute}
                />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={(event) => changeVolume(Number(event.target.value))}
                  aria-label="Volume"
                />
              </div>
              <a
                className="audio-dock__credit"
                href="https://www.free-stock-music.com/artist.purrple-cat.html"
                target="_blank"
                rel="noreferrer"
                title="Licensed lofi — see assets-licenses.md for full credits"
              >
                ♫ {attribution}
              </a>
            </>
          )}
        </div>
      )}
      <button
        type="button"
        className={playing ? 'audio-dock__toggle audio-dock__toggle--playing' : 'audio-dock__toggle'}
        aria-expanded={expanded}
        aria-label={expanded ? 'Hide ambience player' : 'Show ambience player'}
        title={expanded ? 'Hide ambience player' : 'Show ambience player'}
        onClick={() => setExpanded((value) => !value)}
      >
        <IconMusic />
      </button>
      {expanded && (
        <IconButton
          icon={playing ? <IconPause /> : <IconPlay />}
          label={playing ? 'Pause ambience' : 'Play ambience'}
          active={playing}
          className="audio-dock__play"
          onClick={togglePlay}
        />
      )}
    </div>
  );
}
