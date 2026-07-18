const fs = require('fs');
const p = 'C:/Users/canqu/Documents/茉莉妈妈2/research/libtv-open-source-audit/repos/LocalMiniDrama/backend-node/src/services/storyGenerationService.js';
const t = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const tick = String.fromCharCode(96);
const from = ['  const existing = db.prepare(', tick + 'SELECT id FROM async_tasks', "     WHERE resource_id = ? AND type = 'story_generation'", "       AND status IN ('pending', 'processing') AND deleted_at IS NULL", '     ORDER BY created_at DESC LIMIT 1' + tick, '  ).get(dramaId);'].join('\n');
console.log('count', t.split(from).length - 1);
console.log(JSON.stringify(from));
console.log(JSON.stringify(t.slice(t.indexOf('  const existing = db.prepare('), t.indexOf('  const existing = db.prepare(') + from.length + 10)));
