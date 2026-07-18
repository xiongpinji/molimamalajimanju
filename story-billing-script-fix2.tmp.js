const fs = require('fs');
const file = 'C:/Users/canqu/Documents/茉莉妈妈2/story-billing-edit.tmp.js';
let text = fs.readFileSync(file, 'utf8');
const tick = String.fromCharCode(96);
for (const value of ['story_sync:${body.userId}:${randomUUID()}', 'story_task:${task.id}']) {
  const from = '\\' + tick + value + tick;
  const to = '\\' + tick + value + '\\' + tick;
  const count = text.split(from).length - 1;
  if (count !== 1) throw new Error(`expected one escaped nested template, got ${count}: ${value}`);
  text = text.replace(from, to);
}
fs.writeFileSync(file, text);
