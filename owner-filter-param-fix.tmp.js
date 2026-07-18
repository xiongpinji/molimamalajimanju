const fs = require('fs');
const files = [
  'C:/Users/canqu/Documents/茉莉妈妈2/research/libtv-open-source-audit/repos/LocalMiniDrama/backend-node/src/services/imageService.js',
  'C:/Users/canqu/Documents/茉莉妈妈2/research/libtv-open-source-audit/repos/LocalMiniDrama/backend-node/src/services/videoService.js',
];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const from = ".run(now, now, ...ownerParams);";
  const to = ".run(now, ...ownerParams);";
  const count = text.split(from).length - 1;
  if (count !== 1) throw new Error(`${file}: expected one param mismatch, got ${count}`);
  fs.writeFileSync(file, text.replace(from, to));
}
