import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Play, Info, Settings, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { motion } from 'framer-motion';

const Home = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const navigate = useNavigate();

  const parseVideoInfo = (filename) => {
    let cleanName = filename.replace(/\.[^/.]+$/, "");
    let tag = null;
    const match = cleanName.match(/ \[([^\]]+)\]$/);
    if (match && ['HQ', 'HD', '4K'].includes(match[1])) {
      tag = match[1];
      cleanName = cleanName.replace(` [${tag}]`, '');
    }
    return { cleanName, tag };
  };

  useEffect(() => {
    fetchVideos();
    
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const bannerVideos = videos.filter(v => v.isBanner);
    const activeVideos = bannerVideos.length > 0 ? bannerVideos : videos;

    if (activeVideos.length <= 1) {
      setHeroIndex(0);
      return;
    }
    
    const interval = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % activeVideos.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [videos]);

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

  const getContinueWatching = () => {
    const progressMap = JSON.parse(localStorage.getItem('watch_progress') || '{}');
    return videos
      .filter(v => progressMap[v.filename])
      .map(v => ({
        ...v,
        progressInfo: progressMap[v.filename]
      }))
      .sort((a, b) => b.progressInfo.lastWatched - a.progressInfo.lastWatched); // most recently watched first
  };

  const scrollLeft = (sliderId) => {
    const slider = document.getElementById(sliderId);
    slider.scrollBy({ left: -window.innerWidth * 0.7, behavior: 'smooth' });
  };

  const scrollRight = (sliderId) => {
    const slider = document.getElementById(sliderId);
    slider.scrollBy({ left: window.innerWidth * 0.7, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414] overflow-hidden">
        {/* Skeleton Navbar */}
        <div className="w-full h-20 bg-gradient-to-b from-black/50 to-transparent flex items-center px-4 md:px-12">
          <div className="w-32 h-8 bg-white/10 rounded animate-pulse"></div>
        </div>
        {/* Skeleton Hero */}
        <div className="w-full h-[85vh] bg-white/5 animate-pulse flex flex-col justify-end pb-32 px-4 md:px-12">
           <div className="w-2/3 md:w-1/3 h-12 md:h-16 bg-white/10 rounded mb-4"></div>
           <div className="w-3/4 md:w-1/2 h-4 bg-white/10 rounded mb-2"></div>
           <div className="w-1/2 md:w-1/3 h-4 bg-white/10 rounded mb-8"></div>
           <div className="flex gap-3">
             <div className="w-28 h-10 bg-white/10 rounded"></div>
             <div className="w-32 h-10 bg-white/10 rounded"></div>
           </div>
        </div>
        {/* Skeleton Carousel */}
        <div className="px-4 md:px-12 -mt-20 relative z-20">
           <div className="w-40 h-6 bg-white/10 rounded mb-4 animate-pulse"></div>
           <div className="flex gap-4 overflow-hidden py-8 px-2">
             {[1,2,3,4,5].map(i => (
               <div key={i} className="w-[180px] sm:w-[220px] md:w-[260px] lg:w-[280px] aspect-video flex-none bg-white/10 rounded-md animate-pulse"></div>
             ))}
           </div>
        </div>
      </div>
    );
  }

  const bannerVideos = videos.filter(v => v.isBanner);
  const activeVideos = bannerVideos.length > 0 ? bannerVideos : videos;
  const heroVideo = activeVideos.length > 0 ? activeVideos[heroIndex] : null;

  return (
    <div className="min-h-screen bg-[#141414] text-white font-sans overflow-x-hidden">
      {/* Navbar */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-500 p-4 md:px-12 flex items-center justify-between ${scrolled ? 'bg-black/20 backdrop-blur-md shadow-xl' : 'bg-transparent backdrop-blur-sm'}`}>
        <div className={`flex items-center gap-4 md:gap-8 transition-all duration-300 ${isSearchOpen ? 'w-0 overflow-hidden md:w-auto md:overflow-visible' : 'w-auto'}`}>
          <h1 className="text-3xl font-extrabold text-accent tracking-tighter cursor-pointer" onClick={() => {setSearchQuery(''); setIsSearchOpen(false);}}>
            QCFlex
          </h1>
          <nav className="hidden md:flex gap-4 text-sm font-medium text-white/80">
            <span className="cursor-pointer font-bold text-white">Movies</span>
            <span className="cursor-pointer hover:text-white/60 transition">TV Shows</span>
            <span className="cursor-pointer hover:text-white/60 transition">Anime</span>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div 
            className={`flex items-center border transition-all duration-500 ease-out overflow-hidden ${
              isSearchOpen 
                ? 'bg-black/50 backdrop-blur-xl border-white/20 rounded-full pl-4 pr-3 py-2 shadow-2xl' 
                : 'bg-transparent border-transparent rounded-full p-0 shadow-none'
            }`}
          >
            <Search 
              className={`w-6 h-6 flex-shrink-0 cursor-pointer transition-all duration-300 ${
                isSearchOpen ? 'text-white/50 hover:text-white' : 'text-white hover:text-accent hover:scale-110'
              }`} 
              onClick={() => setIsSearchOpen(true)} 
            />
            <div 
              className={`flex items-center transition-all duration-500 ease-out ${
                isSearchOpen ? 'w-40 sm:w-48 md:w-64 opacity-100 ml-3' : 'w-0 opacity-0 ml-0'
              }`}
            >
              <input 
                id="searchInput"
                type="text" 
                placeholder="Search movies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-white/40 font-medium"
              />
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSearchOpen(false);
                  setSearchQuery('');
                }}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors ml-1"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Search Results OR Normal Layout */}
      {searchQuery ? (
        <div className="pt-32 px-4 md:px-12 min-h-screen">
          <h2 className="text-xl md:text-2xl font-bold mb-6 text-white/80">
            Search results for "{searchQuery}"
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-12 pb-20">
            {videos.filter(v => parseVideoInfo(v.filename).cleanName.toLowerCase().includes(searchQuery.toLowerCase())).map((video, idx) => (
              <div 
                key={`search-${idx}`}
                onClick={() => navigate(`/player?v=${encodeURIComponent(video.filename)}`)}
                className="w-full aspect-video relative cursor-pointer rounded-xl transition-all duration-300 hover:scale-[1.15] hover:z-50 origin-center"
              >
                <div className="w-full h-full rounded-xl overflow-hidden bg-card shadow-xl relative group/card border border-transparent hover:border-white/20">
                  {video.thumbnail ? (
                    <img src={video.thumbnail} alt={video.filename} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                      <Play className="w-8 h-8 text-white/20" />
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity flex flex-col justify-end p-4">
                    {parseVideoInfo(video.filename).tag && (
                      <div className="absolute top-2 right-2">
                        <span className="px-1.5 py-0.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold rounded shadow-xl border border-white/10">
                          {parseVideoInfo(video.filename).tag}
                        </span>
                      </div>
                    )}
                    <h3 className="text-sm font-bold truncate drop-shadow-md">
                      {parseVideoInfo(video.filename).cleanName}
                    </h3>
                  </div>
                </div>
              </div>
            ))}
            {videos.filter(v => parseVideoInfo(v.filename).cleanName.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
              <div className="col-span-full py-20 text-center text-white/50 text-lg">
                No matching titles found.
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Hero Billboard */}
      {heroVideo ? (
        <motion.div 
          key={heroIndex}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="relative w-full h-[70vh] md:h-[85vh] flex flex-col justify-end pb-20 md:pb-32 mt-0"
        >
          <div className="absolute inset-0 w-full h-full">
            {heroVideo.thumbnail ? (
              <img src={heroVideo.thumbnail} alt="Hero" className="w-full h-full object-cover object-top" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-gray-900 to-gray-800"></div>
            )}
            {/* Mobile bottom gradient (stronger) */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/60 sm:via-[#141414]/40 to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#141414] to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-[#141414]"></div>
            {/* Desktop side gradient */}
            <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/60 to-transparent opacity-90"></div>
          </div>
          
          <div className="relative z-10 w-full px-4 md:px-12 max-w-3xl mx-auto md:mx-0 flex flex-col items-center md:items-start text-center md:text-left">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-extrabold drop-shadow-2xl mb-3 md:mb-4 leading-tight">
              {parseVideoInfo(heroVideo.filename).cleanName}
            </h1>
            
            <div className="flex items-center justify-center md:justify-start gap-3 mb-5 md:mb-6">
              {parseVideoInfo(heroVideo.filename).tag && (
                <span className="text-xs font-bold px-1.5 py-0.5 bg-white/10 backdrop-blur-md rounded border border-white/20 shadow-lg text-white">
                  {parseVideoInfo(heroVideo.filename).tag}
                </span>
              )}
              <span className="text-xs font-bold text-[#46d369] drop-shadow-md">98% Match</span>
              <span className="text-xs font-bold text-gray-300 border border-gray-600 bg-black/40 px-1 rounded-sm">18+</span>
            </div>

            <p className="hidden md:block text-sm md:text-lg text-white drop-shadow-lg mb-6 md:mb-8 line-clamp-3 max-w-2xl font-medium">
              Watch this incredible new release available right now on your personal streaming platform. 
              Enjoy it in premium high definition, completely ad-free.
            </p>
            
            <div className="flex justify-center md:justify-start gap-3 md:gap-4 flex-wrap w-full">
              <button 
                onClick={() => navigate(`/player?v=${encodeURIComponent(heroVideo.filename)}`)}
                className="flex items-center justify-center gap-2 px-6 py-2.5 md:px-8 md:py-3 bg-white text-black rounded-full font-bold text-sm md:text-lg hover:bg-white/80 transition-colors shadow-xl"
              >
                <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                Play
              </button>
              <button 
                className="flex items-center justify-center gap-2 px-6 py-2.5 md:px-8 md:py-3 bg-[#515451]/70 backdrop-blur-md text-white rounded-full font-bold text-sm md:text-lg hover:bg-[#515451] transition-colors shadow-xl"
              >
                <Info className="w-5 h-5 md:w-6 md:h-6" />
                More Info
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="w-full h-[60vh] flex items-center justify-center pt-20">
          <p className="text-xl text-white/50">Your library is empty. Go to Admin to add videos.</p>
        </div>
      )}

      {/* Continue Watching Carousel */}
      {videos.length > 0 && getContinueWatching().length > 0 && (
        <div className="relative z-20 -mt-6 md:-mt-16 px-4 md:px-12">
          <h2 className="text-lg md:text-xl font-bold mb-2">Continue Watching</h2>
          
          <div className="relative group -mx-4 px-4 md:-mx-12 md:px-12">
            <button 
              onClick={() => scrollLeft('slider-continue')}
              className="hidden md:flex absolute left-0 top-8 bottom-8 z-40 w-16 bg-gradient-to-r from-[#141414] to-transparent items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-r"
            >
              <ChevronLeft className="w-10 h-10 text-white drop-shadow-md hover:scale-125 transition-transform" />
            </button>
            
            <div 
              id="slider-continue"
              className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth py-4 px-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {getContinueWatching().map((video, idx) => {
                const percent = (video.progressInfo.time / video.progressInfo.duration) * 100;
                return (
                  <div 
                    key={`cw-${idx}`}
                    onClick={() => navigate(`/player?v=${encodeURIComponent(video.filename)}`)}
                    className="w-[140px] sm:w-[180px] md:w-[260px] lg:w-[280px] flex-none aspect-video relative cursor-pointer rounded-md md:rounded-xl transition-all duration-300 hover:scale-[1.15] hover:z-50 hover:mx-4 origin-center"
                  >
                    <div className="w-full h-full rounded-xl overflow-hidden bg-card shadow-xl relative group/card border border-transparent hover:border-white/20">
                      {video.thumbnail ? (
                        <img src={video.thumbnail} alt={video.filename} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                          <Play className="w-12 h-12 text-white/20" />
                        </div>
                      )}
                      
                      {/* Hover Info Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity flex flex-col justify-end p-4">
                        {parseVideoInfo(video.filename).tag && (
                          <div className="absolute top-3 right-3">
                            <span className="px-2 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold rounded shadow-xl border border-white/10">
                              {parseVideoInfo(video.filename).tag}
                            </span>
                          </div>
                        )}
                        <div className="flex gap-2 mb-2">
                          <button className="p-2 bg-white rounded-full hover:bg-white/80 transition text-black">
                            <Play className="w-4 h-4 fill-current" />
                          </button>
                        </div>
                        <h3 className="text-sm font-bold truncate drop-shadow-md">
                          {parseVideoInfo(video.filename).cleanName}
                        </h3>
                      </div>

                      {/* Progress Bar */}
                      <div className="absolute bottom-0 left-0 w-full h-1.5 bg-white/30 backdrop-blur-sm">
                        <div className="h-full bg-accent" style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button 
              onClick={() => scrollRight('slider-continue')}
              className="hidden md:flex absolute right-0 top-8 bottom-8 z-40 w-16 bg-gradient-to-l from-[#141414] to-transparent items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-l"
            >
              <ChevronRight className="w-10 h-10 text-white drop-shadow-md hover:scale-125 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* Horizontal Carousel */}
      {videos.length > 0 && (
        <div className={`relative z-20 pb-16 md:pb-20 px-4 md:px-12 ${getContinueWatching().length === 0 ? '-mt-6 md:-mt-16' : 'mt-2'}`}>
          <h2 className="text-lg md:text-xl font-bold mb-2">Trending Now</h2>
          
          <div className="relative group -mx-4 px-4 md:-mx-12 md:px-12">
            {/* Scroll Arrows */}
            <button 
              onClick={() => scrollLeft('slider')}
              className="hidden md:flex absolute left-0 top-8 bottom-8 z-40 w-16 bg-gradient-to-r from-[#141414] to-transparent items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-r"
            >
              <ChevronLeft className="w-10 h-10 text-white drop-shadow-md hover:scale-125 transition-transform" />
            </button>
            
            <div 
              id="slider"
              className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth py-4 px-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {videos.map((video, idx) => (
                <div 
                  key={idx}
                  onClick={() => navigate(`/player?v=${encodeURIComponent(video.filename)}`)}
                  className="w-[140px] sm:w-[180px] md:w-[260px] lg:w-[280px] flex-none aspect-video relative cursor-pointer rounded-md md:rounded-xl transition-all duration-300 hover:scale-[1.15] hover:z-50 hover:mx-4 origin-center"
                >
                  <div className="w-full h-full rounded-xl overflow-hidden bg-card shadow-xl relative group/card border border-transparent hover:border-white/20">
                    {video.thumbnail ? (
                      <img src={video.thumbnail} alt={video.filename} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                        <Play className="w-12 h-12 text-white/20" />
                      </div>
                    )}
                    
                    {/* Hover Info Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity flex flex-col justify-end p-4">
                      {parseVideoInfo(video.filename).tag && (
                        <div className="absolute top-3 right-3">
                          <span className="px-2 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold rounded shadow-xl border border-white/10">
                            {parseVideoInfo(video.filename).tag}
                          </span>
                        </div>
                      )}
                      <div className="flex gap-2 mb-2">
                        <button className="p-2 bg-white rounded-full hover:bg-white/80 transition text-black">
                          <Play className="w-4 h-4 fill-current" />
                        </button>
                      </div>
                      <h3 className="text-sm font-bold truncate drop-shadow-md">
                        {parseVideoInfo(video.filename).cleanName}
                      </h3>
                      <p className="text-[10px] font-semibold text-green-500 drop-shadow-md">98% Match</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => scrollRight('slider')}
              className="hidden md:flex absolute right-0 top-8 bottom-8 z-40 w-16 bg-gradient-to-l from-[#141414] to-transparent items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-l"
            >
              <ChevronRight className="w-10 h-10 text-white drop-shadow-md hover:scale-125 transition-transform" />
            </button>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
};

export default Home;
