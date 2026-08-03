import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play } from 'lucide-react';

const Player = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const filename = searchParams.get('v');
  
  if (!filename) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-white">
        <p className="text-xl">Video not found</p>
        <button onClick={() => navigate('/')} className="mt-4 text-accent hover:underline">Go Back</button>
      </div>
    );
  }

  const videoUrl = `/media/${encodeURIComponent(filename)}`;
  const title = filename.replace(/\.[^/.]+$/, "");

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Overlay Header */}
      <div className="absolute top-0 left-0 w-full p-6 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-center gap-4 transition-opacity duration-300">
        <button 
          onClick={() => navigate('/')}
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-medium tracking-wide drop-shadow-md">{title}</h1>
      </div>

      {/* Video Player */}
      <div className="flex-1 flex items-center justify-center relative">
        <video 
          className="w-full h-full max-h-screen object-contain"
          controls
          autoPlay
          src={videoUrl}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
};

export default Player;
