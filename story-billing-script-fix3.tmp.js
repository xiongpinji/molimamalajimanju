const fs = require('fs');
const file = 'C:/Users/canqu/Documents/茉莉妈妈2/story-billing-edit.tmp.js';
let text = fs.readFileSync(file, 'utf8');
const tick = String.fromCharCode(96);
const edits = [
  ['    ' + tick + 'SELECT id FROM async_tasks', '    \\' + tick + 'SELECT id FROM async_tasks'],
  ['     ORDER BY created_at DESC LIMIT 1' + tick + '\n  ).get(dramaId);', '     ORDER BY created_at DESC LIMIT 1\\' + tick + '\n  ).get(dramaId);'],
  ['  const existingSql = ' + tick + 'SELECT id FROM async_tasks', '  const existingSql = \\' + tick + 'SELECT id FROM async_tasks'],
  ['     ORDER BY created_at DESC LIMIT 1' + tick + ';\n  const existing = db.prepare(existingSql)', '     ORDER BY created_at DESC LIMIT 1\\' + tick + ';\n  const existing = db.prepare(existingSql)'],
  ['${billingEnabled ? \' AND user_id = ?\' : \'\'}', '\\${billingEnabled ? \' AND user_id = ?\' : \'\'}'],
];
for (const [from, to] of edits) {
  const count = text.split(from).length - 1;
  if (count !== 1) throw new Error(`expected one script segment, got ${count}: ${from}`);
  text = text.replace(from, to);
}
fs.writeFileSync(file, text);
