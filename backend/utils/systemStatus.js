const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

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

  return {
    driveMounted,
    jellyfinRunning,
    diskUsage,
    ramUsage,
    cpuUsage: cpuUsageStr
  };
};

module.exports = {
  getSystemStatus
};
