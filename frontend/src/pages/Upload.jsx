import { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Link as LinkIcon, Folder, Tag, ChevronDown, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CustomSelect = ({ value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative">
      <div 
        className="w-full bg-[#1A1B20] border border-white/10 rounded-xl px-4 py-3 flex justify-between items-center cursor-pointer transition-all hover:border-accent/50 focus:outline-none text-white shadow-inner shadow-black/20"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-medium">{value}</span>
        <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-accent' : ''}`} />
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
            <motion.div 
              initial={{ opacity: 0, y: -5, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.98 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute z-20 w-full mt-2 bg-[#1f2026] border border-white/5 rounded-xl shadow-2xl backdrop-blur-3xl overflow-hidden ring-1 ring-white/10"
            >
              <div className="p-1">
                {options.map(opt => (
                  <div 
                    key={opt}
                    className={`px-3 py-2.5 my-0.5 rounded-lg cursor-pointer transition-all flex items-center gap-2 text-sm font-medium ${value === opt ? 'bg-accent/15 text-accent' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                    }}
                  >
                    <span className="flex-1">{opt}</span>
                    {value === opt && <Check size={16} className="text-accent" />}
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const Upload = () => {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Movies');
  const [tag, setTag] = useState('None');
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
        category,
        tag: tag !== 'None' ? tag : undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/admin/queue');
    } catch (err) {
      console.error(err);
      alert('Failed to start download: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setUrl('');
    setName('');
    setCategory('Movies');
    setTag('None');
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
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent transition-all text-white placeholder-gray-500 shadow-inner shadow-black/20"
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
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent transition-all text-white placeholder-gray-500 shadow-inner shadow-black/20"
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
              <CustomSelect 
                value={category} 
                onChange={setCategory} 
                options={['Movies', 'TV Shows', 'Anime']} 
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300 flex items-center gap-2">
                <Tag size={16} /> Quality Tag
              </label>
              <CustomSelect 
                value={tag} 
                onChange={setTag} 
                options={['None', 'HQ', 'HD', '4K']} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300 flex items-center gap-2">
                <Folder size={16} /> Target Folder
              </label>
              <input 
                type="text" 
                className="w-full bg-[#1A1B20] border border-white/10 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed shadow-inner shadow-black/20"
                value="VPS Uploads"
                disabled
              />
            </div>
          </div>

          <div className="pt-6 flex gap-4">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1 bg-accent hover:bg-accent/90 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2 hover:shadow-accent/40 hover:-translate-y-0.5 active:translate-y-0"
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
