import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { FileVideo, Trash2, Edit2, RefreshCw, Image, X, Save } from 'lucide-react';

const Library = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingFile, setEditingFile] = useState(null);
  const [editName, setEditName] = useState('');
  const [editThumbnail, setEditThumbnail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  const openEditModal = (file) => {
    setEditingFile(file);
    setEditName(file.filename);
    setEditThumbnail(file.thumbnail || '');
  };

  const closeEditModal = () => {
    setEditingFile(null);
    setEditName('');
    setEditThumbnail('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setIsSaving(true);
    
    try {
      const token = localStorage.getItem('token');
      let targetFilename = editingFile.filename;

      // 1. Handle Rename
      if (editName !== editingFile.filename) {
        await axios.put(`/api/library/${encodeURIComponent(editingFile.filename)}`, { newName: editName }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        targetFilename = editName; // Update target for thumbnail request
      }

      // 2. Handle Thumbnail
      if (editThumbnail !== (editingFile.thumbnail || '')) {
        await axios.put(`/api/library/${encodeURIComponent(targetFilename)}/thumbnail`, { thumbnail: editThumbnail }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      closeEditModal();
      fetchLibrary();
    } catch (err) {
      console.error(err);
      alert('Failed to save changes');
    } finally {
      setIsSaving(false);
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
                  onClick={() => openEditModal(file)}
                  className="p-2 bg-accent/80 hover:bg-accent rounded-full text-white transition-colors shadow-lg"
                  title="Edit File"
                >
                  <Edit2 size={18} />
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

      {/* Edit Modal */}
      <AnimatePresence>
        {editingFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeEditModal}
            ></motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#1f2026] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Edit Media Info</h3>
                <button onClick={closeEditModal} className="text-gray-400 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">File Name</label>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent transition-all text-white placeholder-gray-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Thumbnail URL</label>
                  <input 
                    type="url" 
                    value={editThumbnail}
                    onChange={(e) => setEditThumbnail(e.target.value)}
                    placeholder="https://example.com/poster.jpg"
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent transition-all text-white placeholder-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-2">Leave blank to use default icon.</p>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={closeEditModal}
                    className="flex-1 py-3 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-medium text-gray-300"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-3 px-4 rounded-xl bg-accent hover:bg-accent/90 transition-colors font-medium text-white shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : (
                      <Save size={18} />
                    )}
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Library;
