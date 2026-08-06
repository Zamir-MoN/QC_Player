import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Clock, PlayCircle, Loader2 } from 'lucide-react';

const Queue = () => {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    // Initial fetch
    const fetchQueue = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/downloads/queue', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setQueue(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchQueue();

    // Socket setup
    const socket = io('', { path: '/api/socket.io' });
    socket.on('queueUpdate', (updatedQueue) => {
      setQueue(updatedQueue);
    });

    return () => socket.disconnect();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'text-success';
      case 'Failed': return 'text-error';
      case 'Downloading': return 'text-accent';
      case 'Uploading': return 'text-warning';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed': return <CheckCircle2 className="text-success" />;
      case 'Failed': return <AlertCircle className="text-error" />;
      case 'Downloading': return <Loader2 className="animate-spin text-accent" />;
      case 'Uploading': return <PlayCircle className="animate-pulse text-warning" />;
      default: return <Clock className="text-gray-400" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h2 className="text-3xl font-bold tracking-tight mb-8">Download Queue</h2>

      <div className="space-y-4">
        <AnimatePresence>
          {queue.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-center text-gray-500 py-12 glassmorphism rounded-2xl"
            >
              No active downloads in the queue.
            </motion.div>
          ) : (
            queue.map((item) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glassmorphism p-6 rounded-2xl border border-white/5 relative overflow-hidden"
              >
                {/* Background Progress Bar */}
                {item.progress && (
                  <div 
                    className="absolute inset-0 bg-accent/5 transition-all duration-300 ease-out z-0" 
                    style={{ width: item.progress }}
                  />
                )}

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                      {getStatusIcon(item.status)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">{item.name.split('/').pop()}</h4>
                      <p className="text-sm text-gray-400 flex items-center gap-2">
                        <span className={`font-medium ${getStatusColor(item.status)}`}>{item.status}</span>
                        <span>•</span>
                        <span>{item.step}</span>
                        <span>•</span>
                        <span className="bg-white/10 px-2 py-0.5 rounded text-xs">{item.category}</span>
                      </p>
                    </div>
                  </div>

                  {item.progress && (
                    <div className="flex flex-row md:flex-col items-center md:items-end gap-4 md:gap-1 text-sm font-medium w-full md:w-auto">
                      <div className="text-accent">{item.progress}</div>
                      {item.status === 'Downloading' && <div className="text-gray-400">{item.speed}</div>}
                      {item.status === 'Downloading' && <div className="text-gray-500 text-xs">ETA: {item.eta}</div>}
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Queue;
