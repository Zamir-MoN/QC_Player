const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

let lastNet = { rx: 0, tx: 0, time: 0 };
let currentSpeed = { rxSpeed: 0, txSpeed: 0 };

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getSystemStatus = async () => {
  const mountDir = process.env.MOUNT_DIR || '/home/ubuntu/QC_Player/Movies/VPS Uploads';
  
  // 1. Check Google Drive Mounted
  let driveMounted = false;
  try {
    await fs.access(mountDir);
    driveMounted = true;
  } catch (e) {
    driveMounted = false;
  }

  // 2. Check Jellyfin Running (Simple check via ps or port, but since it's linux-specific, 
  // we'll simulate a basic check or just assume true for now, or use systemctl)
  let jellyfinRunning = false;
  try {
    const jellyfinCheck = spawn('systemctl', ['is-active', 'jellyfin']);
    jellyfinRunning = await new Promise((resolve) => {
      jellyfinCheck.on('close', (code) => resolve(code === 0));
    });
  } catch (e) {
    // If systemctl fails (e.g. on Windows), fallback to false
    jellyfinRunning = false;
  }

  // 3. Disk Usage (using df on linux)
  let diskUsage = '0%';
  try {
    const dfProcess = spawn('df', ['-h', mountDir]);
    diskUsage = await new Promise((resolve) => {
      let output = '';
      dfProcess.stdout.on('data', d => output += d);
      dfProcess.on('close', () => {
        const lines = output.trim().split('\n');
        if (lines.length > 1) {
          const parts = lines[1].trim().split(/\s+/);
          resolve(parts[4]); // The Use% column
        } else {
          resolve('N/A');
        }
      });
    });
  } catch (e) {
    diskUsage = 'N/A';
  }

  // 4. RAM Usage
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const ramUsage = `${((usedMem / totalMem) * 100).toFixed(1)}%`;

  // 5. CPU Usage (average)
  const cpus = os.cpus();
  const cpuUsage = cpus.reduce((acc, cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    const idle = cpu.times.idle;
    return acc + ((total - idle) / total);
  }, 0) / cpus.length;
  
  const cpuUsageStr = `${(cpuUsage * 100).toFixed(1)}%`;

  // 6. Movies Count
  let moviesCount = 0;
  try {
    const scan = async (dir) => {
       const list = await fs.readdir(dir, { withFileTypes: true });
       for (const item of list) {
          if (item.isDirectory()) {
             await scan(path.join(dir, item.name));
          } else if (item.name.endsWith('.mp4') || item.name.endsWith('.mkv')) {
             moviesCount++;
          }
       }
    };
    await scan(path.join(mountDir, 'Movies'));
    await scan(path.join(mountDir, 'Web Series'));
  } catch (e) {}

  // 7. Network Speed (Linux specific)
  try {
    const output = await fs.readFile('/proc/net/dev', 'utf8');
    const lines = output.split('\n');
    let totalRx = 0;
    let totalTx = 0;
    for (const line of lines) {
      if (line.includes(':') && !line.includes('lo:')) {
        const parts = line.split(':')[1].trim().split(/\s+/);
        totalRx += parseInt(parts[0], 10);
        totalTx += parseInt(parts[8], 10);
      }
    }
    
    const now = Date.now();
    if (lastNet.time > 0) {
      const timeDiff = (now - lastNet.time) / 1000;
      if (timeDiff > 0) {
        currentSpeed.rxSpeed = Math.max(0, (totalRx - lastNet.rx) / timeDiff);
        currentSpeed.txSpeed = Math.max(0, (totalTx - lastNet.tx) / timeDiff);
      }
    }
    lastNet = { rx: totalRx, tx: totalTx, time: now };
  } catch (e) {}

  return {
    driveMounted,
    jellyfinRunning,
    diskUsage,
    ramUsage,
    cpuUsage: cpuUsageStr,
    moviesCount,
    currentDownload: formatBytes(currentSpeed.rxSpeed) + '/s',
    currentUpload: formatBytes(currentSpeed.txSpeed) + '/s',
    networkSpeed: formatBytes(currentSpeed.rxSpeed + currentSpeed.txSpeed) + '/s'
  };
};

module.exports = {
  getSystemStatus
};
