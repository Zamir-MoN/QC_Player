import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Play, Film, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

const Home = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const res = await axios.get('/api/public/library');
      // Filter out non-video files if any
      const videoFiles = res.data.filter(f => f.filename.match(/\.(mp4|mkv|webm)$/i));
      setVideos(videoFiles);
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-6 bg-card/50 backdrop-blur-md border-b border-white/5 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-accent/20 p-2 rounded-xl">
            <Film className="w-6 h-6 text-accent" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">QC_Player</h1>
        </div>
        <button 
          onClick={() => navigate('/admin')}
          className="p-2 hover:bg-white/5 rounded-full transition-colors group"
          title="Admin Login"
        >
          <Settings className="w-5 h-5 text-white/50 group-hover:text-white transition-colors" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Available Movies</h2>
          <p className="text-white/50">Select a video to start streaming immediately.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-video bg-white/5 rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/40">
            <Film className="w-16 h-16 mb-4 opacity-50" />
            <h3 className="text-xl font-medium">No videos available</h3>
            <p className="mt-2">Check back later or login to upload.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {videos.map((video, index) => (
              <motion.div
                key={video.filename}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(`/player?v=${encodeURIComponent(video.filename)}`)}
                className="group cursor-pointer flex flex-col"
              >
                <div className="aspect-video bg-card rounded-2xl overflow-hidden relative border border-white/5 shadow-lg group-hover:shadow-accent/20 group-hover:border-accent/50 transition-all duration-300">
                  {/* Fake Thumbnail Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-card to-background opacity-80"></div>
                  
                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
                    <div className="bg-accent text-white rounded-full p-4 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                      <Play className="w-8 h-8 fill-current" />
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 px-1">
                  <h3 className="font-medium text-lg leading-tight line-clamp-2 group-hover:text-accent transition-colors">
                    {video.filename.replace(/\.[^/.]+$/, "")}
                  </h3>
                  <div className="flex items-center gap-2 mt-2 text-sm text-white/40">
                    <span>{video.size}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
