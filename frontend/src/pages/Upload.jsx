import { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Download, Link as LinkIcon, Folder, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Upload = () => {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Movies');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleStartDownload = async (e) => {
    e.preventDefault();
    if (!url) return;
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/downloads/start', {
        url,
        name,
        category
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/queue');
    } catch (err) {
      console.error(err);
      alert('Failed to start download');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setUrl('');
    setName('');
    setCategory('Movies');
  };

  return (
    <div className="max-w-3xl mx-auto mt-10">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glassmorphism p-8 rounded-3xl"
      >
        <h2 className="text-3xl font-bold tracking-tight mb-8">New Download</h2>
        
        <form onSubmit={handleStartDownload} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300 flex items-center gap-2">
              <LinkIcon size={16} /> Movie Download URL
            </label>
            <input 
              type="url" 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent transition-all text-white placeholder-gray-500"
              placeholder="https://example.com/movie.mp4"
              value={url} 
              onChange={(e) => setUrl(e.target.value)} 
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300 flex items-center gap-2">
              <Tag size={16} /> Movie Name (optional)
            </label>
            <input 
              type="text" 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent transition-all text-white placeholder-gray-500"
              placeholder="e.g. Inception (2010).mp4"
              value={name} 
              onChange={(e) => setName(e.target.value)} 
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300 flex items-center gap-2">
                <Folder size={16} /> Category
              </label>
              <select 
                className="w-full bg-[#1A1B20] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent transition-all text-white"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option>Movies</option>
                <option>TV Shows</option>
                <option>Anime</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300 flex items-center gap-2">
                <Folder size={16} /> Target Folder
              </label>
              <input 
                type="text" 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-400 cursor-not-allowed"
                value="VPS Uploads"
                disabled
              />
            </div>
          </div>

          <div className="pt-6 flex gap-4">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1 bg-accent hover:bg-accent/80 text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
            >
              <Download size={20} />
              {isSubmitting ? 'Starting...' : 'Start Download'}
            </button>
            <button 
              type="button" 
              onClick={handleClear}
              className="px-8 bg-white/5 hover:bg-white/10 text-white font-semibold py-3 rounded-xl border border-white/10 transition-colors"
            >
              Clear
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default Upload;
