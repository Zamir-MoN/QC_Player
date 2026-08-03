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
          thumbnail: metadata[file]?.thumbnail || null
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
  const { thumbnail } = req.body;
  try {
    const metadata = await getMetadata();
    if (!metadata[filename]) metadata[filename] = {};
    metadata[filename].thumbnail = thumbnail;
    await saveMetadata(metadata);
    res.json({ message: 'Thumbnail updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update thumbnail' });
  }
};

module.exports = {
  getLibrary,
  deleteFile,
  renameFile,
  updateThumbnail
};
