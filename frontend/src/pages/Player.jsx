import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Play, Pause, Volume2, VolumeX, 
  Maximize, Minimize, Settings, FastForward, Rewind,
  Headphones
} from 'lucide-react';

const formatTime = (timeInSeconds) => {
  if (isNaN(timeInSeconds)) return "00:00";
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const encodePath = (p) => p.split('/').map(encodeURIComponent).join('/');

const Player = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const filename = searchParams.get('v');
  
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const playerContainerRef = useRef(null);
  const hideControlsTimeoutRef = useRef(null);
  const syncAnimationFrame = useRef(null);
  const clickTimeoutRef = useRef(null);

  const [audioTracks, setAudioTracks] = useState([]);
  const [selectedTrack, setSelectedTrack] = useState(0); // 0 is default
  const [isExtractingAudio, setIsExtractingAudio] = useState(false);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);

  useEffect(() => {
    if (!filename) return;
    const fetchTracks = async () => {
      try {
        const res = await axios.get(`/api/public/media/${encodeURIComponent(filename)}/tracks`);
        setAudioTracks(res.data);
      } catch (err) {
        console.error("Failed to fetch audio tracks");
      }
    };
    fetchTracks();
  }, [filename]);

  // Strict Audio/Video Synchronization Loop
  useEffect(() => {
    const syncLoop = () => {
      if (videoRef.current && audioRef.current && selectedTrack !== 0) {
        const vTime = videoRef.current.currentTime;
        const aTime = audioRef.current.currentTime;
        
        // If drift is more than 0.1s, force audio to snap to video time
        if (Math.abs(vTime - aTime) > 0.1) {
          audioRef.current.currentTime = vTime;
        }

        // Sync playback state
        if (videoRef.current.paused !== audioRef.current.paused) {
          if (videoRef.current.paused) audioRef.current.pause();
          else {
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch(() => {});
            }
          }
        }
      }
      syncAnimationFrame.current = requestAnimationFrame(syncLoop);
    };

    syncAnimationFrame.current = requestAnimationFrame(syncLoop);
    return () => cancelAnimationFrame(syncAnimationFrame.current);
  }, [selectedTrack]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent default scrolling for space and arrows
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      if (!videoRef.current) return;

      switch (e.code) {
        case 'Space':
          togglePlay();
          break;
        case 'KeyF':
          toggleFullscreen();
          break;
        case 'KeyM':
          toggleMute();
          break;
        case 'ArrowRight':
          videoRef.current.currentTime += 10;
          break;
        case 'ArrowLeft':
          videoRef.current.currentTime -= 10;
          break;
        case 'ArrowUp':
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
        default:
          break;
      }
      
      // Show controls on any key press
      handleMouseMove();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [volume, isFullscreen]); // re-bind when state changes to avoid stale closures for volume

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    // Auto hide after 3 seconds of inactivity
    hideControlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowSettings(false);
        setShowAudioMenu(false);
      }
    }, 3000);
  };

  const togglePlay = () => {
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      setShowControls(true); // Keep controls visible when paused
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
      if (volume === 0 && !isMuted) handleVolumeChange(1); // Restore volume if unmuting from 0
    }
  };

  const handleVolumeChange = (newVolume) => {
    const val = parseFloat(newVolume);
    setVolume(val);
    if (videoRef.current) {
      // If we are using an external audio track, mute the video
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0 || selectedTrack !== 0;
    }
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = val === 0;
    }
    setIsMuted(val === 0);
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().then(() => {
        if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
          window.screen.orientation.lock('landscape').catch(err => console.log("Orientation lock failed:", err));
        }
      }).catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen().then(() => {
        if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
          window.screen.orientation.unlock();
        }
      });
    }
  };

  const togglePiP = async () => {
    try {
      if (videoRef.current !== document.pictureInPictureElement) {
        await videoRef.current.requestPictureInPicture();
      } else {
        await document.exitPictureInPicture();
      }
    } catch (error) {
      console.error("PiP failed", error);
    }
  };

  const changeSpeed = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) videoRef.current.playbackRate = speed;
    if (audioRef.current) audioRef.current.playbackRate = speed;
    setShowSettings(false);
  };

  const handleTrackChange = async (track) => {
    if (track.index === selectedTrack) return;
    
    if (track.index === 0 || track.isExtracted) {
      setSelectedTrack(track.index);
      setShowSettings(false);
      // Ensure video is muted if using alternate track
      if (videoRef.current) videoRef.current.muted = track.index !== 0 || isMuted;
    } else {
      // Need to extract
      setIsExtractingAudio(true);
      setShowSettings(false);
      try {
        await axios.post(`/api/public/media/${encodePath(filename)}/extract-audio`, {
          trackId: track.id
        });
        
        // Start polling every 3 seconds
        const pollInterval = setInterval(async () => {
          try {
            const tracksRes = await axios.get(`/api/public/media/${encodePath(filename)}/tracks`);
            const updatedTrack = tracksRes.data.find(t => t.id === track.id);
            if (updatedTrack && updatedTrack.isExtracted) {
              clearInterval(pollInterval);
              setAudioTracks(tracksRes.data);
              setSelectedTrack(track.index);
              setIsExtractingAudio(false);
              if (videoRef.current) videoRef.current.muted = true;
            }
          } catch (e) {
            console.error("Polling failed", e);
          }
        }, 3000);
      } catch (err) {
        console.error(err);
        alert('Failed to start audio track extraction: ' + (err.response?.data?.details || err.message));
        setIsExtractingAudio(false);
      }
    }
  };

  if (!filename) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-white">
        <p className="text-xl">Video not found</p>
        <button onClick={() => navigate('/')} className="mt-4 text-accent hover:underline">Go Back</button>
      </div>
    );
  }

  const videoUrl = `/api/public/media/${encodeURIComponent(filename)}`;
  const title = filename.split('/').pop().replace(/\.[^/.]+$/, "");

  return (
    <div 
      ref={playerContainerRef}
      className="relative w-full h-screen bg-black overflow-hidden select-none font-sans group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Hidden Audio Element for alternative tracks */}
      {selectedTrack !== 0 && audioTracks[selectedTrack]?.url && (
        <audio 
          ref={audioRef} 
          src={audioTracks[selectedTrack].url} 
          onWaiting={() => setIsBuffering(true)}
          onCanPlay={() => setIsBuffering(false)}
        />
      )}

      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain cursor-pointer"
        onClick={handleMouseMove}
        onDoubleClick={togglePlay}
        onTimeUpdate={() => {
          if (!videoRef.current) return;
          const time = videoRef.current.currentTime;
          setCurrentTime(time);
          
          // Save progress to localStorage every ~5 seconds
          if (Math.floor(time) % 5 === 0 && time > 0) {
            const dur = videoRef.current.duration;
            const progressMap = JSON.parse(localStorage.getItem('watch_progress') || '{}');
            progressMap[filename] = {
              time,
              duration: dur,
              lastWatched: Date.now()
            };
            localStorage.setItem('watch_progress', JSON.stringify(progressMap));
          }
        }}
        onLoadedMetadata={() => {
          if (!videoRef.current) return;
          const dur = videoRef.current.duration || 0;
          setDuration(dur);
          
          // Restore playback position
          const progressMap = JSON.parse(localStorage.getItem('watch_progress') || '{}');
          if (progressMap[filename] && progressMap[filename].time) {
            const savedTime = progressMap[filename].time;
            // Only resume if between 5 seconds and 95% complete
            if (savedTime > 5 && savedTime < dur * 0.95) {
              videoRef.current.currentTime = savedTime;
            }
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          // Clear progress when finished
          const progressMap = JSON.parse(localStorage.getItem('watch_progress') || '{}');
          if (progressMap[filename]) {
            delete progressMap[filename];
            localStorage.setItem('watch_progress', JSON.stringify(progressMap));
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadStart={() => setIsBuffering(true)}
        onWaiting={() => setIsBuffering(true)}
        onSeeking={() => setIsBuffering(true)}
        onPlaying={() => { setIsPlaying(true); setIsBuffering(false); }}
        onCanPlay={() => setIsBuffering(false)}
        onCanPlayThrough={() => setIsBuffering(false)}
        onSeeked={() => setIsBuffering(false)}
        onStalled={() => setIsBuffering(true)}
        autoPlay
        playsInline
      />

      {/* Buffering or Extracting Spinner */}
      {(isBuffering || isExtractingAudio) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20 bg-black/40 backdrop-blur-sm">
          <div className="w-14 h-14 border-[3px] border-accent/20 border-t-accent rounded-full animate-spin mb-4"></div>
          {isExtractingAudio && (
            <p className="text-white font-medium tracking-wide drop-shadow-md">
              Extracting High-Quality Audio... (This takes a minute)
            </p>
          )}
        </div>
      )}

      {/* Top Bar (Title & Back Button) */}
      <div className={`absolute top-0 left-0 w-full p-4 sm:p-6 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-center gap-3 sm:gap-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <button 
          onClick={() => navigate('/')}
          className="p-2 sm:p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-colors text-white flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <h1 className="text-lg sm:text-2xl font-medium tracking-wide drop-shadow-md text-white truncate">{title}</h1>
      </div>

      {/* Center Big Play/Pause Animation (Optional Netflix style feature) */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/50 rounded-full p-6 backdrop-blur-sm">
            <Play className="w-16 h-16 text-white fill-current opacity-80" />
          </div>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div className={`absolute bottom-0 left-0 w-full px-6 pt-16 pb-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-10 transition-transform duration-300 ${showControls ? 'translate-y-0' : 'translate-y-full'}`}>
        
        {/* Progress Bar */}
        <div className="flex items-center gap-4 w-full mb-4 group/progress cursor-pointer">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            style={{
              background: `linear-gradient(to right, #E50914 ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.3) ${(currentTime / (duration || 1)) * 100}%)`
            }}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer hover:h-2 transition-all accent-accent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 hover:[&::-webkit-slider-thumb]:w-4 hover:[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:rounded-full"
          />
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between text-white">
          
          {/* Left Controls */}
          <div className="flex items-center gap-4 sm:gap-6">
            <button onClick={togglePlay} className="hover:text-accent transition-colors">
              {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current" />}
            </button>
            
            <button onClick={() => { if(videoRef.current) videoRef.current.currentTime -= 10; }} className="hover:text-accent transition-colors hidden sm:block">
              <Rewind className="w-6 h-6 fill-current" />
            </button>
            <button onClick={() => { if(videoRef.current) videoRef.current.currentTime += 10; }} className="hover:text-accent transition-colors hidden sm:block">
              <FastForward className="w-6 h-6 fill-current" />
            </button>

            {/* Volume Control */}
            <div className="hidden sm:flex items-center gap-2 group/volume">
              <button onClick={toggleMute} className="hover:text-accent transition-colors">
                {isMuted || volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(e.target.value)}
                style={{
                  background: `linear-gradient(to right, #E50914 ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.3) ${(isMuted ? 0 : volume) * 100}%)`
                }}
                className="w-0 overflow-hidden group-hover/volume:w-24 h-1.5 rounded-full appearance-none transition-all duration-300 accent-accent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:rounded-full"
              />
            </div>

            {/* Time Display */}
            <div className="text-sm font-medium tracking-wide">
              {formatTime(currentTime)} <span className="text-white/50 mx-1">/</span> {formatTime(duration)}
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-4 sm:gap-6 relative">
            
            {/* Settings Menu (Speed/Quality) */}
            <div className="relative">
              <button onClick={() => { setShowSettings(!showSettings); setShowAudioMenu(false); }} className={`hover:text-accent transition-colors ${showSettings ? 'text-accent' : ''} ${playbackSpeed !== 1 ? 'animate-pulse' : ''}`}>
                <Settings className="w-6 h-6" />
              </button>
              
              {/* Settings Dropdown */}
              {showSettings && (
                <div className="absolute bottom-full right-0 mb-4 bg-black/90 border border-white/10 rounded-xl p-2 min-w-[200px] backdrop-blur-xl shadow-2xl origin-bottom-right animate-in zoom-in-95 fade-in">
                  <div className="px-3 py-2 text-xs font-semibold text-white/50 uppercase tracking-wider mb-1">Video Quality</div>
                  <button className="w-full text-left px-3 py-2 text-sm text-accent bg-accent/10 rounded-md font-medium cursor-default">
                    Auto (Original)
                  </button>
                  
                  <div className="h-px bg-white/10 my-2"></div>
                  
                  <div className="px-3 py-2 text-xs font-semibold text-white/50 uppercase tracking-wider mb-1">Playback Speed</div>
                  {[0.5, 1, 1.25, 1.5, 2].map(speed => (
                    <button 
                      key={speed}
                      onClick={() => changeSpeed(speed)}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-white/10 transition-colors flex justify-between ${playbackSpeed === speed ? 'text-accent font-medium' : ''}`}
                    >
                      <span>{speed === 1 ? 'Normal' : `${speed}x`}</span>
                      {playbackSpeed === speed && <span>✓</span>}
                    </button>
                  ))}
                  
                  {/* Audio tracks have been moved to a dedicated button */}
                </div>
              )}
            </div>

            {/* Audio Track Menu */}
            {audioTracks.length > 1 && (
              <div className="relative">
                <button onClick={() => { setShowAudioMenu(!showAudioMenu); setShowSettings(false); }} className={`hover:text-accent transition-colors ${showAudioMenu ? 'text-accent' : ''}`} title="Audio Tracks">
                  <Headphones className="w-6 h-6" />
                </button>
                
                {/* Audio Dropdown */}
                {showAudioMenu && (
                  <div className="absolute bottom-full right-0 mb-4 bg-black/90 border border-white/10 rounded-xl p-2 min-w-[150px] backdrop-blur-xl shadow-2xl origin-bottom-right animate-in zoom-in-95 fade-in">
                    <div className="px-3 py-2 text-xs font-semibold text-white/50 uppercase tracking-wider mb-1">Audio Track</div>
                    {audioTracks.map(track => (
                      <button 
                        key={track.id}
                        onClick={() => {
                          handleTrackChange(track);
                          setShowAudioMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-white/10 transition-colors flex justify-between ${selectedTrack === track.index ? 'text-accent font-medium' : ''}`}
                      >
                        <span>{track.language}</span>
                        {selectedTrack === track.index && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button onClick={toggleFullscreen} className="hover:text-accent transition-colors">
              {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Player;
