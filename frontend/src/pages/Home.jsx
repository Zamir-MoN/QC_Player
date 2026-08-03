import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Play, Info, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const Home = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchVideos();
    
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchVideos = async () => {
    try {
      const res = await axios.get('/api/public/library');
      const videoFiles = res.data.filter(f => f.filename.match(/\.(mp4|mkv|webm)$/i));
      setVideos(videoFiles);
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollLeft = () => {
    const slider = document.getElementById('slider');
    slider.scrollBy({ left: -window.innerWidth * 0.7, behavior: 'smooth' });
  };

  const scrollRight = () => {
    const slider = document.getElementById('slider');
    slider.scrollBy({ left: window.innerWidth * 0.7, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const heroVideo = videos.length > 0 ? videos[0] : null;

  return (
    <div className="min-h-screen bg-[#141414] text-white font-sans overflow-x-hidden">
      {/* Navbar */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-500 p-4 md:px-12 flex items-center justify-between ${scrolled ? 'bg-[#141414]' : 'bg-gradient-to-b from-black/80 to-transparent'}`}>
        <div className="flex items-center gap-8">
          <h1 className="text-3xl font-extrabold text-accent tracking-tighter cursor-pointer">
            NETFLIX
          </h1>
          <nav className="hidden md:flex gap-4 text-sm font-medium text-white/80">
            <span className="cursor-pointer font-bold text-white">Movies</span>
            <span className="cursor-pointer hover:text-white/60 transition">TV Shows</span>
            <span className="cursor-pointer hover:text-white/60 transition">Anime</span>
          </nav>
        </div>
        <button 
          onClick={() => navigate('/admin')}
          className="text-white hover:text-white/60 transition-colors"
          title="Admin Settings"
        >
          <Settings className="w-6 h-6" />
        </button>
      </header>

      {/* Hero Billboard */}
      {heroVideo ? (
        <div className="relative w-full h-[85vh] flex items-center">
          <div className="absolute inset-0 w-full h-full">
            {heroVideo.thumbnail ? (
              <img src={heroVideo.thumbnail} alt="Hero" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-gray-900 to-gray-800"></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/20 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-transparent to-transparent opacity-80"></div>
          </div>
          
          <div className="relative z-10 w-full px-4 md:px-12 pt-32 max-w-2xl">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold drop-shadow-2xl mb-4 leading-tight">
              {heroVideo.filename.replace(/\\.[^/.]+$/, "")}
            </h1>
            <p className="text-sm md:text-base text-white drop-shadow-lg mb-6 line-clamp-3">
              Watch this incredible new release available right now on your personal streaming platform. 
              Enjoy it in premium high definition, completely ad-free.
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => navigate(`/player?v=${encodeURIComponent(heroVideo.filename)}`)}
                className="flex items-center gap-2 px-5 py-2 bg-white text-black rounded font-bold text-base md:text-lg hover:bg-white/80 transition-colors"
              >
                <Play className="w-5 h-5 fill-current" />
                Play
              </button>
              <button className="flex items-center gap-2 px-5 py-2 bg-gray-500/70 text-white rounded font-bold text-base md:text-lg hover:bg-gray-500/50 transition-colors">
                <Info className="w-5 h-5" />
                More Info
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full h-[60vh] flex items-center justify-center pt-20">
          <p className="text-xl text-white/50">Your library is empty. Go to Admin to add videos.</p>
        </div>
      )}

      {/* Horizontal Carousel */}
      {videos.length > 0 && (
        <div className="relative z-20 pb-20 -mt-20 md:-mt-32 px-4 md:px-12">
          <h2 className="text-lg md:text-xl font-bold mb-2">Trending Now</h2>
          
          <div className="relative group -mx-4 px-4 md:-mx-12 md:px-12">
            {/* Scroll Arrows */}
            <button 
              onClick={scrollLeft}
              className="absolute left-0 top-8 bottom-8 z-40 w-12 bg-black/70 hover:bg-black/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-r"
            >
              <ChevronLeft className="w-8 h-8 text-white" />
            </button>
            
            <div 
              id="slider"
              className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth py-8 px-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {videos.map((video, idx) => (
                <div 
                  key={idx}
                  onClick={() => navigate(`/player?v=${encodeURIComponent(video.filename)}`)}
                  className="w-[180px] sm:w-[220px] md:w-[260px] lg:w-[280px] flex-none aspect-video relative cursor-pointer rounded-md transition-all duration-300 hover:scale-[1.15] hover:z-50 hover:mx-4 origin-center"
                >
                  <div className="w-full h-full rounded-md overflow-hidden bg-card shadow-xl relative group/card border border-transparent hover:border-white/20">
                    {video.thumbnail ? (
                      <img src={video.thumbnail} alt={video.filename} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                        <Play className="w-12 h-12 text-white/20" />
                      </div>
                    )}
                    
                    {/* Hover Info Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity flex flex-col justify-end p-4">
                      <div className="flex gap-2 mb-2">
                        <button className="p-2 bg-white rounded-full hover:bg-white/80 transition text-black">
                          <Play className="w-4 h-4 fill-current" />
                        </button>
                      </div>
                      <h3 className="text-sm font-bold truncate">
                        {video.filename.replace(/\.[^/.]+$/, "")}
                      </h3>
                      <p className="text-[10px] font-semibold text-green-500">98% Match</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={scrollRight}
              className="absolute right-0 top-8 bottom-8 z-40 w-12 bg-black/70 hover:bg-black/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-l"
            >
              <ChevronRight className="w-8 h-8 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
