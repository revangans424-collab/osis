import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipForward, Music, Sun, Moon } from 'lucide-react';
import { MusicRequest, MusicTrack } from '../types';

interface MusicPlayerDockProps {
  musicEnabled: boolean;
  tracks: MusicTrack[];
  nowPlayingRequest?: MusicRequest | null;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const MusicPlayerDock: React.FC<MusicPlayerDockProps> = ({
  musicEnabled,
  tracks,
  nowPlayingRequest,
  theme,
  onToggleTheme,
}) => {
  const activeTracks = tracks.filter((t) => t.isActive);
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrack = activeTracks[trackIndex % Math.max(1, activeTracks.length)] || null;

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  useEffect(() => {
    if (!musicEnabled && audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [musicEnabled, isPlaying]);

  const handleTogglePlay = async () => {
    if (!musicEnabled || !currentTrack || !audioRef.current) return;
    setAudioError(null);
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch {
        setAudioError('Audio tidak dapat diputar di browser ini atau URL audio tidak valid.');
        setIsPlaying(false);
      }
    }
  };

  const handleNextTrack = () => {
    if (activeTracks.length <= 1) return;
    const nextIdx = (trackIndex + 1) % activeTracks.length;
    setTrackIndex(nextIdx);
    setAudioError(null);
    if (isPlaying && audioRef.current) {
      setTimeout(() => {
        audioRef.current?.play().catch(() => setIsPlaying(false));
      }, 60);
    }
  };

  const displayTitle = nowPlayingRequest
    ? `${nowPlayingRequest.songTitle} — ${nowPlayingRequest.artist}`
    : currentTrack
    ? `${currentTrack.title} — ${currentTrack.artist}`
    : 'Pemutar Audio Tidak Aktif';

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 max-w-[calc(100vw-2rem)]">
      {currentTrack && (
        <audio
          ref={audioRef}
          src={currentTrack.audioUrl}
          onEnded={handleNextTrack}
          onError={() => {
            setIsPlaying(false);
            setAudioError('Sumber audio gagal dimuat.');
          }}
          preload="none"
        />
      )}

      {/* Compact Music Player */}
      {musicEnabled && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white/95 dark:bg-[#0F1D36]/95 backdrop-blur-md shadow-md text-slate-900 dark:text-slate-100">
          <button
            type="button"
            onClick={handleTogglePlay}
            disabled={!currentTrack}
            aria-label={isPlaying ? 'Jeda Musik' : 'Putar Musik'}
            className="w-8 h-8 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="text-left min-w-0 max-w-[140px] sm:max-w-[200px]"
            title={displayTitle}
          >
            <div className="text-[11px] font-medium text-[#1D4ED8] dark:text-[#38BDF8] truncate flex items-center gap-1">
              <Music className="w-3 h-3 shrink-0" />
              <span>{nowPlayingRequest ? 'Now Playing Request' : 'Audio Organisasi'}</span>
            </div>
            <div className="text-xs font-semibold truncate">{displayTitle}</div>
          </button>

          {expanded && (
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
              {activeTracks.length > 1 && (
                <button
                  type="button"
                  onClick={handleNextTrack}
                  aria-label="Lagu Berikutnya"
                  className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsMuted((m) => !m)}
                aria-label={isMuted ? 'Bunyikan' : 'Bisukan'}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setIsMuted(false);
                  setVolume(parseFloat(e.target.value));
                }}
                aria-label="Volume Musik"
                className="w-16 accent-[#1D4ED8]"
              />
            </div>
          )}

          {audioError && (
            <span className="sr-only" role="alert">
              {audioError}
            </span>
          )}
        </div>
      )}

      {/* Persistent Light/Dark Theme Switch */}
      <button
        type="button"
        onClick={onToggleTheme}
        aria-label={theme === 'dark' ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
        title={theme === 'dark' ? 'Beralih ke Light Mode' : 'Beralih ke Dark Mode'}
        className="w-11 h-11 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white/95 dark:bg-[#0F1D36]/95 backdrop-blur-md shadow-md text-[#0B1F3A] dark:text-[#38BDF8] hover:bg-slate-50 dark:hover:bg-[#152544] flex items-center justify-center transition-colors shrink-0"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
    </div>
  );
};
