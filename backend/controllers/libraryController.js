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

const scanDirectory = async (dir, baseDir = '') => {
  let results = [];
  try {
    const list = await fs.readdir(dir, { withFileTypes: true });
    for (const item of list) {
      const itemPath = path.join(dir, item.name);
      const relativePath = path.posix.join(baseDir, item.name);
      
      if (item.isDirectory()) {
        const subResults = await scanDirectory(itemPath, relativePath);
        results = results.concat(subResults);
      } else if (item.isFile() && item.name.endsWith('.mp4')) {
        results.push(relativePath);
      }
    }
  } catch (e) {}
  return results;
};

const getLibrary = async (req, res) => {
  try {
    const metadata = await getMetadata();
    const libraryItems = [];

    const movieFiles = await scanDirectory(path.join(mountDir, 'Movies'), 'Movies');
    const webSeriesFiles = await scanDirectory(path.join(mountDir, 'Web Series'), 'Web Series');
    
    const allFiles = [...movieFiles, ...webSeriesFiles];

    for (const relativePath of allFiles) {
      const fullPath = path.join(mountDir, relativePath);
      try {
        const stats = await fs.stat(fullPath);
        libraryItems.push({
          filename: relativePath,
          size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
          date: stats.mtime,
          thumbnail: metadata[relativePath]?.thumbnail || null,
          mobileThumbnail: metadata[relativePath]?.mobileThumbnail || null,
          isBanner: metadata[relativePath]?.isBanner || false
        });
      } catch (e) {}
    }

    res.json(libraryItems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read library directory' });
  }
};

const deleteFile = async (req, res) => {
  const filename = Array.isArray(req.params.filepath) ? req.params.filepath.join('/') : req.params.filepath;
  const fullPath = path.join(mountDir, filename);
  const folderPath = path.dirname(fullPath);

  try {
    const rmProcess = spawn('rm', ['-rf', folderPath]);
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

    res.json({ message: 'Folder deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete folder' });
  }
};

const renameFile = async (req, res) => {
  const filename = Array.isArray(req.params.filepath) ? req.params.filepath.join('/') : req.params.filepath;
  const { newName } = req.body;
  const newBaseName = newName.replace(/\.[^/.]+$/, "");
  
  const oldFolderPath = path.dirname(path.join(mountDir, filename));
  const parentDir = path.dirname(oldFolderPath);
  const newFolderPath = path.join(parentDir, newBaseName);

  try {
    await fs.rename(oldFolderPath, newFolderPath);
    
    const files = await fs.readdir(newFolderPath);
    const oldBaseName = path.basename(oldFolderPath);
    
    for (const file of files) {
       if (file.startsWith(oldBaseName)) {
           const newFileName = file.replace(oldBaseName, newBaseName);
           await fs.rename(path.join(newFolderPath, file), path.join(newFolderPath, newFileName));
       }
    }
    
    const relativeParent = path.dirname(filename);
    const newRelativeFolder = path.posix.join(path.dirname(relativeParent), newBaseName);
    const newPosixPath = `${newRelativeFolder}/${newBaseName}.mp4`;
    
    const metadata = await getMetadata();
    if (metadata[filename]) {
      metadata[newPosixPath] = metadata[filename];
      delete metadata[filename];
      await saveMetadata(metadata);
    }

    res.json({ message: 'File and folder renamed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to rename file' });
  }
};

const updateThumbnail = async (req, res) => {
  const filename = Array.isArray(req.params.filepath) ? req.params.filepath.join('/') : req.params.filepath;
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
  const filename = Array.isArray(req.params.filepath) ? req.params.filepath.join('/') : req.params.filepath;
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
  const filename = Array.isArray(req.params.filepath) ? req.params.filepath.join('/') : req.params.filepath;
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
      index: idx,
      codec: s.codec_name,
      language: s.tags?.language || s.tags?.title || `Track ${idx + 1}`
    }));
    
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);
    const folder = path.dirname(filename);
    
    for (const track of tracks) {
      if (track.index === 0) {
        track.isDefault = true;
        track.isExtracted = true;
      } else {
        const outName = `${baseName}_audio_${track.id}.m4a`;
        const outRelativePath = path.posix.join(folder, outName);
        try {
          await fs.access(path.join(mountDir, outRelativePath));
          track.isExtracted = true;
          const encodePath = outRelativePath.split('/').map(encodeURIComponent).join('/');
          track.url = `/api/public/media/${encodePath}`;
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
  const filename = Array.isArray(req.params.filepath) ? req.params.filepath.join('/') : req.params.filepath;
  const { trackId } = req.body;
  const filepath = path.join(mountDir, filename);
  
  const ext = path.extname(filename);
  const baseName = path.basename(filename, ext);
  const folder = path.dirname(filename);
  
  const outName = `${baseName}_audio_${trackId}.m4a`;
  const outRelativePath = path.posix.join(folder, outName);
  const outPath = path.join(mountDir, outRelativePath);

  try {
    await fs.access(outPath);
    const encodePath = outRelativePath.split('/').map(encodeURIComponent).join('/');
    return res.json({ message: 'Already extracted', url: `/api/public/media/${encodePath}` });
  } catch (e) {}

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
