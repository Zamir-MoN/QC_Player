import { useState, useEffect } from 'react';
import axios from 'axios';
import { HardDrive, Cpu, Database, Activity, CheckCircle2, XCircle } from 'lucide-react';

const TopHeader = () => {
  const [status, setStatus] = useState({
    driveMounted: false,
    jellyfinRunning: false,
    diskUsage: '...',
    ramUsage: '...',
    cpuUsage: '...'
  });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/system-status', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStatus(res.data);
      } catch (err) {
        console.error('Failed to fetch status');
      }
    };
    
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const StatusItem = ({ label, value, icon: Icon, isBool = false }) => (
    <div className="flex items-center space-x-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
      {isBool ? (
        value ? <CheckCircle2 size={16} className="text-success" /> : <XCircle size={16} className="text-error" />
      ) : (
        <Icon size={16} className="text-gray-400" />
      )}
      <span className="text-xs font-medium text-gray-300 hidden md:block">{label}</span>
      {!isBool && <span className="text-sm font-semibold text-white ml-1">{value}</span>}
    </div>
  );

  return (
    <header className="h-16 glassmorphism border-b border-white/10 flex items-center justify-between px-6 z-10 relative">
      <div className="font-semibold text-lg tracking-tight">Admin Overview</div>
      <div className="flex items-center space-x-3">
        <StatusItem label="G-Drive" value={status.driveMounted} isBool={true} />
        <StatusItem label="Jellyfin" value={status.jellyfinRunning} isBool={true} />
        <StatusItem label="Disk" value={status.diskUsage} icon={HardDrive} />
        <StatusItem label="RAM" value={status.ramUsage} icon={Database} />
        <StatusItem label="CPU" value={status.cpuUsage} icon={Cpu} />
      </div>
    </header>
  );
};

export default TopHeader;
