const fs = require('node:fs');
const path = require('node:path');

const uploadDirectory = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));
const coverDirectory = path.join(uploadDirectory, 'library-covers');
const localCoverPrefix = '/uploads/library-covers/';

function extensionFromSignature(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
    return '.jpg';
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return '.png';
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  )
    return '.webp';
  return null;
}

async function ensureValidImage(filePath) {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return extensionFromSignature(buffer.subarray(0, bytesRead));
  } finally {
    await handle.close();
  }
}

function localCoverPath(coverUrl) {
  if (typeof coverUrl !== 'string' || !coverUrl.startsWith(localCoverPrefix)) return null;
  const filename = coverUrl.slice(localCoverPrefix.length);
  if (!filename || filename !== path.basename(filename)) return null;
  const resolved = path.resolve(coverDirectory, filename);
  return path.dirname(resolved) === coverDirectory ? resolved : null;
}

async function removeLocalCover(coverUrl) {
  const filePath = localCoverPath(coverUrl);
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function removeManyLocalCovers(coverUrls) {
  await Promise.all(
    coverUrls.map((coverUrl) =>
      removeLocalCover(coverUrl).catch((error) =>
        console.error('Could not remove library cover:', error),
      ),
    ),
  );
}

module.exports = {
  coverDirectory,
  ensureValidImage,
  localCoverPath,
  localCoverPrefix,
  removeLocalCover,
  removeManyLocalCovers,
  uploadDirectory,
};
