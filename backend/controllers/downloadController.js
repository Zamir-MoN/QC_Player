const { spawn } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid'); // Need to install uuid

let ioInstance;
const queue = new Map();

const setIo = (io) => {
  ioInstance = io;
};

const broadcastQueue = () => {
  if (ioInstance) {
    const queueArray = Array.from(queue.values());
    ioInstance.emit('queueUpdate', queueArray);
  }
};

const refreshJellyfin = async () => {
  try {
    const url = process.env.JELLYFIN_URL;
    const apiKey = process.env.JELLYFIN_API_KEY;
    if (url && apiKey) {
      await axios.post(`${url}/Library/Refresh?api_key=${apiKey}`);
      console.log('Jellyfin library refresh triggered.');
    }
  } catch (error) {
    console.error('Failed to refresh Jellyfin:', error.message);
  }
};

const startDownload = async (req, res) => {
  let downloadTask, tempDir, mountDir, finalFilename, url, category, id;
  try {
    const body = req.body;
    url = body.url;
    const name = body.name;
    category = body.category;
    const tag = body.tag;
    
    if (!url) return res.status(400).json({ error: 'URL is required' });

    id = uuidv4();
    tempDir = process.env.TEMP_DIR || '/tmp/qcplayer';
    mountDir = process.env.MOUNT_DIR || '/home/ubuntu/QC_Player/Movies/VPS Uploads';
    finalFilename = name ? name : url.split('/').pop().split('?')[0] || 'downloaded_file';

    // Append quality tag to filename if provided
    if (tag) {
      const extMatch = finalFilename.match(/\.[^/.]+$/);
      if (extMatch) {
        finalFilename = finalFilename.replace(/\.[^/.]+$/, ` [${tag}]${extMatch[0]}`);
      } else {
        finalFilename = `${finalFilename} [${tag}]`;
      }
    }

    downloadTask = {
      id,
      url,
      name: finalFilename,
      category,
      status: 'Waiting',
      progress: '0%',
      speed: '0 KB/s',
      eta: 'Unknown',
      step: 'Initializing'
    };

    queue.set(id, downloadTask);
    broadcastQueue();
    res.json({ message: 'Download added to queue', id });
  } catch (initError) {
    console.error('Failed to initialize download:', initError);
    return res.status(500).json({ error: 'Failed to initialize download: ' + initError.message });
  }

  // Run workflow asynchronously
  try {
    // STEP 1: Create temp folder
    downloadTask.step = 'Creating Temp Folder';
    broadcastQueue();
    await fs.mkdir(tempDir, { recursive: true });

    // STEP 2: Download using aria2c
    downloadTask.status = 'Downloading';
    downloadTask.step = 'aria2c download';
    broadcastQueue();

    const ariaArgs = [
      '-x16', '-s16', '-k1M',
      '-d', tempDir,
      '-o', finalFilename,
      url
    ];

    const ariaProcess = spawn('aria2c', ariaArgs);
    
    ariaProcess.stdout.on('data', (data) => {
      const output = data.toString();
      // Basic parse of aria2c output to extract progress
      // Example: [#123456 1.2MiB/2.4MiB(50%) CN:1 SD:1 DL:1.2MiB ETA:1s]
      const progressMatch = output.match(/\(([\d.]+%)\)/);
      const speedMatch = output.match(/DL:([\w.]+)/);
      const etaMatch = output.match(/ETA:([\w]+)/);

      if (progressMatch) downloadTask.progress = progressMatch[1];
      if (speedMatch) downloadTask.speed = speedMatch[1];
      if (etaMatch) downloadTask.eta = etaMatch[1];
      
      broadcastQueue();
    });

    await new Promise((resolve, reject) => {
      ariaProcess.on('error', (err) => reject(new Error(`aria2c spawn failed: ${err.message}`)));
      ariaProcess.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`aria2c exited with code ${code}`));
      });
    });

    // STEP 3: Convert to MP4 using ffmpeg
    downloadTask.status = 'Converting';
    downloadTask.step = 'Converting to MP4';
    broadcastQueue();

    const sourcePath = path.join(tempDir, finalFilename);
    const mp4Filename = finalFilename.includes('.') ? finalFilename.replace(/\\.[^/.]+$/, ".mp4") : finalFilename + ".mp4";
    const convertedPath = path.join(tempDir, mp4Filename);
    
    let finalSourcePath = sourcePath;
    let finalDestFilename = finalFilename;

    // Attempt conversion on all files that are not already .mp4
    // FFmpeg is smart enough to detect video files even without an extension.
    // If it's not a video (like a zip file), it will gracefully fail and fallback to the original file.
    if (!finalFilename.match(/\\.mp4$/i)) {
      const ffmpegProcess = spawn('ffmpeg', [
        '-y',
        '-nostdin',
        '-i', sourcePath,
        '-map', '0:v',
        '-map', '0:a?',
        '-c', 'copy',
        convertedPath
      ]);

      await new Promise((resolve) => {
        ffmpegProcess.on('error', (err) => {
          console.warn(`FFmpeg spawn failed: ${err.message}. Falling back.`);
          resolve();
        });
        ffmpegProcess.on('close', (code) => {
          if (code === 0) {
            finalSourcePath = convertedPath;
            finalDestFilename = mp4Filename;
          } else {
            console.warn(`FFmpeg conversion failed with code ${code}. Falling back to original file.`);
          }
          resolve();
        });
      });
    }

    // STEP 4: Move file
    downloadTask.status = 'Uploading';
    downloadTask.step = 'Moving file to Mount';
    broadcastQueue();

    const categoryFolder = category === 'Movies' ? 'Movies' : 'Web Series';
    const folderName = finalDestFilename.replace(/\.[^/.]+$/, "");
    const destDir = path.join(mountDir, categoryFolder, folderName);
    const destPath = path.join(destDir, finalDestFilename);
    
    // Ensure nested mount dir exists
    await fs.mkdir(destDir, { recursive: true }).catch(()=>null);

    const mvProcess = spawn('mv', [finalSourcePath, destPath]);
    await new Promise((resolve, reject) => {
      mvProcess.on('error', (err) => reject(new Error(`mv spawn failed: ${err.message}`)));
      mvProcess.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`mv exited with code ${code}`));
      });
    });

    // STEP 5: Extract Audio Tracks
    downloadTask.status = 'Extracting Audio';
    downloadTask.step = 'Extracting alternate audio tracks';
    broadcastQueue();

    try {
      const ffprobe = spawn('ffprobe', [
        '-v', 'error',
        '-select_streams', 'a',
        '-show_entries', 'stream=index,codec_name:stream_tags=language,title',
        '-of', 'json',
        destPath
      ]);

      let output = '';
      ffprobe.stdout.on('data', (data) => output += data.toString());
      
      await new Promise((resolve) => {
        ffprobe.on('error', () => resolve());
        ffprobe.on('close', () => resolve());
      });

      if (output) {
        const parsed = JSON.parse(output);
        const tracks = parsed.streams || [];
        
        for (const track of tracks) {
          // Skip the default track (index 0)
          if (track.index !== 0) {
            const trackId = track.index;
            const ext = path.extname(finalDestFilename);
            const baseName = path.basename(finalDestFilename, ext);
            
            const outName = `${baseName}_audio_${trackId}.m4a`;
            const outPath = path.join(destDir, outName);
            
            // Extract the track
            const ffmpeg = spawn('ffmpeg', [
              '-i', destPath,
              '-map', `0:${trackId}`,
              '-c:a', 'aac',
              '-b:a', '192k',
              '-y',
              outPath
            ]);

            await new Promise((resolve) => {
              ffmpeg.on('error', () => resolve());
              ffmpeg.on('close', () => resolve());
            });
          }
        }
      }
    } catch (err) {
      console.warn("Failed to automatically extract audio tracks:", err);
    }

    // STEP 6: Delete temp files
    downloadTask.step = 'Cleaning up';
    broadcastQueue();
    
    // We remove the specific file and aria2c fragments if any, but since we used mv, the file is gone.
    // To be safe, run rm on the .aria2 file if it exists, or clear the tempdir content.
    const rmProcess = spawn('rm', ['-rf', tempDir]);
    await new Promise((resolve) => {
      rmProcess.on('error', () => resolve());
      rmProcess.on('close', () => resolve());
    });

    // STEP 7: Refresh Jellyfin
    downloadTask.step = 'Refreshing Jellyfin';
    broadcastQueue();
    await refreshJellyfin();

    downloadTask.status = 'Completed';
    downloadTask.step = 'Done';
    downloadTask.progress = '100%';
    broadcastQueue();

  } catch (error) {
    console.error('Download workflow failed:', error);
    downloadTask.status = 'Failed';
    downloadTask.step = 'Error: ' + error.message;
    broadcastQueue();
  }
};

const getQueue = (req, res) => {
  res.json(Array.from(queue.values()));
};

module.exports = {
  setIo,
  startDownload,
  getQueue
};
