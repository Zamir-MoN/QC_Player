const fs = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');

const mountDir = process.env.MOUNT_DIR || '/home/ubuntu/QC_Player/Movies/VPS Uploads';
const metadataFile = path.join(__dirname, '../metadata.json');

const getMetadata = async () => {
  try {
    const data = await fs.readFile(metadataFile, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return {};
  }
};

const saveMetadata = async (data) => {
  await fs.writeFile(metadataFile, JSON.stringify(data, null, 2));
};

const getLibrary = async (req, res) => {
  try {
    const files = await fs.readdir(mountDir);
    const metadata = await getMetadata();
    const libraryItems = [];

    for (const file of files) {
      const stats = await fs.stat(path.join(mountDir, file));
      if (stats.isFile()) {
        libraryItems.push({
          filename: file,
          size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
          date: stats.mtime,
          thumbnail: metadata[file]?.thumbnail || null,
          mobileThumbnail: metadata[file]?.mobileThumbnail || null,
          isBanner: metadata[file]?.isBanner || false
        });
      }
    }

    res.json(libraryItems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read library directory' });
  }
};

const deleteFile = async (req, res) => {
  const { filename } = req.params;
  try {
    const rmProcess = spawn('rm', [path.join(mountDir, filename)]);
    await new Promise((resolve, reject) => {
      rmProcess.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`rm exited with code ${code}`));
      });
    });

    const metadata = await getMetadata();
    if (metadata[filename]) {
      delete metadata[filename];
      await saveMetadata(metadata);
    }

    res.json({ message: 'File deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
};

const renameFile = async (req, res) => {
  const { filename } = req.params;
  const { newName } = req.body;
  try {
    const mvProcess = spawn('mv', [path.join(mountDir, filename), path.join(mountDir, newName)]);
    await new Promise((resolve, reject) => {
      mvProcess.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`mv exited with code ${code}`));
      });
    });

    const metadata = await getMetadata();
    if (metadata[filename]) {
      metadata[newName] = metadata[filename];
      delete metadata[filename];
      await saveMetadata(metadata);
    }

    res.json({ message: 'File renamed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to rename file' });
  }
};

const updateThumbnail = async (req, res) => {
  const { filename } = req.params;
  const { thumbnail, mobileThumbnail } = req.body;
  try {
    const metadata = await getMetadata();
    if (!metadata[filename]) metadata[filename] = {};
    if (thumbnail !== undefined) metadata[filename].thumbnail = thumbnail;
    if (mobileThumbnail !== undefined) metadata[filename].mobileThumbnail = mobileThumbnail;
    await saveMetadata(metadata);
    res.json({ message: 'Thumbnails updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update thumbnail' });
  }
};

const updateBanner = async (req, res) => {
  const { filename } = req.params;
  const { isBanner } = req.body;
  try {
    const metadata = await getMetadata();
    if (!metadata[filename]) metadata[filename] = {};
    metadata[filename].isBanner = isBanner;
    await saveMetadata(metadata);
    res.json({ message: 'Banner status updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update banner status' });
  }
};

const getMediaTracks = async (req, res) => {
  const { filename } = req.params;
  const filepath = path.join(mountDir, filename);

  try {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-select_streams', 'a',
      '-show_entries', 'stream=index,codec_name:stream_tags=language,title',
      '-of', 'json',
      filepath
    ]);

    let output = '';
    ffprobe.stdout.on('data', (data) => output += data.toString());
    
    await new Promise((resolve, reject) => {
      ffprobe.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error('ffprobe failed'));
      });
    });

    const parsed = JSON.parse(output);
    const tracks = (parsed.streams || []).map((s, idx) => ({
      id: s.index,
      index: idx, // 0-based relative index for mapping
      codec: s.codec_name,
      language: s.tags?.language || s.tags?.title || `Track ${idx + 1}`
    }));
    
    // Check which tracks have already been extracted
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);
    for (const track of tracks) {
      if (track.index === 0) {
        track.isDefault = true;
        track.isExtracted = true; // The original file plays this
      } else {
        const outName = `${baseName}_audio_${track.id}.m4a`;
        try {
          await fs.access(path.join(mountDir, outName));
          track.isExtracted = true;
          track.url = `/api/public/media/${encodeURIComponent(outName)}`;
        } catch (e) {
          track.isExtracted = false;
        }
      }
    }
    
    res.json(tracks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to probe tracks' });
  }
};

const extractAudioTrack = async (req, res) => {
  const { filename } = req.params;
  const { trackId } = req.body; // use the actual ffprobe stream index
  const filepath = path.join(mountDir, filename);
  
  const ext = path.extname(filename);
  const baseName = path.basename(filename, ext);
  const outName = `${baseName}_audio_${trackId}.m4a`;
  const outPath = path.join(mountDir, outName);

  try {
    await fs.access(outPath);
    return res.json({ message: 'Already extracted', url: `/api/public/media/${encodeURIComponent(outName)}` });
  } catch (e) {
    // Proceed to extract
  }

  const tmpPath = outPath + '.tmp';

  try {
    const ffmpeg = spawn('ffmpeg', [
      '-i', filepath,
      '-map', `0:${trackId}`,
      '-c:a', 'aac',
      '-b:a', '192k',
      '-y',
      tmpPath
    ]);

    let errOutput = '';
    ffmpeg.stderr.on('data', data => errOutput += data.toString());

    ffmpeg.on('close', async (code) => {
      if (code === 0) {
        try {
          await fs.rename(tmpPath, outPath);
        } catch (err) {
          console.error("Failed to rename tmp file", err);
        }
      } else {
        console.error(`ffmpeg failed with code ${code}. Stderr: ${errOutput}`);
      }
    });

    res.json({ message: 'Extraction started in background' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to start audio extraction', details: error.message });
  }
};

module.exports = {
  getLibrary,
  deleteFile,
  renameFile,
  updateThumbnail,
  updateBanner,
  getMediaTracks,
  extractAudioTrack
};
