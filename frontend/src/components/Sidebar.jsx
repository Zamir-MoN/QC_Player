import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Upload, ListVideo, Library, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

const Sidebar = () => {
  const location = useLocation();

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/upload', label: 'Upload', icon: Upload },
    { path: '/admin/queue', label: 'Queue', icon: ListVideo },
    { path: '/admin/library', label: 'Library', icon: Library },
  ];

  return (
    <div className="w-64 glassmorphism border-r border-white/10 h-full flex flex-col z-10 relative">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent to-purple-400">QC_Player</h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all relative group ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {isActive && (
                <motion.div 
                  layoutId="activeTab" 
                  className="absolute inset-0 bg-accent/10 border border-accent/20 rounded-xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <item.icon size={20} className="relative z-10" />
              <span className="font-medium relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4">
        <button 
          onClick={() => {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }}
          className="w-full py-2 px-4 text-sm font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
