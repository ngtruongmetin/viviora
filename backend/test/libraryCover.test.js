const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ensureValidImage, localCoverPath } = require('../services/libraryCover');

test('library cover validation recognizes image signatures and rejects arbitrary content', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'viviora-cover-test-'));
  const pngPath = path.join(directory, 'cover.png');
  const textPath = path.join(directory, 'not-image.png');
  fs.writeFileSync(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]));
  fs.writeFileSync(textPath, 'not an image');
  try {
    assert.equal(await ensureValidImage(pngPath), '.png');
    assert.equal(await ensureValidImage(textPath), null);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('local library cover cleanup is constrained to Viviora cover paths', () => {
  assert.equal(localCoverPath('/uploads/library-covers/valid-cover.png')?.endsWith(path.join('library-covers', 'valid-cover.png')), true);
  assert.equal(localCoverPath('/uploads/library-covers/../avatar.jpg'), null);
  assert.equal(localCoverPath('https://example.com/cover.png'), null);
});
