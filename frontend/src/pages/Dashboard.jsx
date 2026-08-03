import { useState, useEffect } from 'react';
import axios from 'axios';
import { HardDrive, Film, UploadCloud, DownloadCloud, Activity, Database, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const [status, setStatus] = useState({});

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/system-status', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStatus(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStatus();
  }, []);

  const Card = ({ title, value, icon: Icon, colorClass }) => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glassmorphism p-6 rounded-2xl flex items-center space-x-4"
    >
      <div className={`p-4 rounded-xl ${colorClass} bg-opacity-10`}>
        <Icon className={colorClass.replace('bg-', 'text-')} size={24} />
      </div>
      <div>
        <div className="text-gray-400 text-sm font-medium">{title}</div>
        <div className="text-2xl font-bold">{value || '...'}</div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold tracking-tight mb-8">Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Disk Usage" value={status.diskUsage} icon={HardDrive} colorClass="bg-accent" />
        <Card title="Movies Count" value="N/A" icon={Film} colorClass="bg-success" />
        <Card title="Current Upload" value="0" icon={UploadCloud} colorClass="bg-warning" />
        <Card title="Current Download" value="0" icon={DownloadCloud} colorClass="bg-error" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <Card title="RAM Usage" value={status.ramUsage} icon={Database} colorClass="bg-purple-500" />
        <Card title="CPU Usage" value={status.cpuUsage} icon={Cpu} colorClass="bg-blue-500" />
        <Card title="Network Speed" value="Unknown" icon={Activity} colorClass="bg-pink-500" />
      </div>
    </div>
  );
};

export default Dashboard;
