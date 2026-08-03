import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FileVideo, Trash2, Edit2, RefreshCw, Image } from 'lucide-react';

const Library = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/library', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFiles(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  const handleDelete = async (filename) => {
    if (!window.confirm(`Are you sure you want to delete ${filename}?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/library/${encodeURIComponent(filename)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchLibrary();
    } catch (err) {
      alert('Failed to delete file');
    }
  };

  const handleRename = async (filename) => {
    const newName = window.prompt(`Enter new name for ${filename}:`, filename);
    if (!newName || newName === filename) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/library/${encodeURIComponent(filename)}`, { newName }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchLibrary();
    } catch (err) {
      alert('Failed to rename file');
    }
  };

  const handleThumbnail = async (filename, currentThumbnail) => {
    const thumbnail = window.prompt(`Enter image URL for ${filename} (leave blank to remove):`, currentThumbnail || '');
    if (thumbnail === null || thumbnail === currentThumbnail) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/library/${encodeURIComponent(filename)}/thumbnail`, { thumbnail }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchLibrary();
    } catch (err) {
      alert('Failed to update thumbnail');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Library</h2>
        <button 
          onClick={fetchLibrary}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10 text-sm font-medium"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {files.map((file, idx) => (
          <motion.div 
            key={file.filename}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="glassmorphism rounded-2xl overflow-hidden group border border-white/5 hover:border-white/20 transition-all"
          >
            {/* Poster Placeholder */}
            <div className="h-48 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
              {file.thumbnail ? (
                <img src={file.thumbnail} alt={file.filename} className="w-full h-full object-cover" />
              ) : (
                <FileVideo size={48} className="text-gray-600 group-hover:text-accent transition-colors" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm">
                <button 
                  onClick={() => handleDelete(file.filename)}
                  className="p-2 bg-error/80 hover:bg-error rounded-full text-white transition-colors shadow-lg"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
                <button 
                  onClick={() => handleRename(file.filename)}
                  className="p-2 bg-accent/80 hover:bg-accent rounded-full text-white transition-colors shadow-lg"
                  title="Rename"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleThumbnail(file.filename, file.thumbnail)}
                  className="p-2 bg-green-500/80 hover:bg-green-500 rounded-full text-white transition-colors shadow-lg"
                  title="Update Thumbnail"
                >
                  <Image size={18} />
                </button>
              </div>
            </div>
            
            <div className="p-4">
              <h4 className="font-semibold text-sm truncate" title={file.filename}>
                {file.filename}
              </h4>
              <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
                <span>{file.size}</span>
                <span>{new Date(file.date).toLocaleDateString()}</span>
              </div>
            </div>
          </motion.div>
        ))}

        {!loading && files.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No files found in the VPS Uploads directory.
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;
