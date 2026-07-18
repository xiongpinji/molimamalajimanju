const fs = require('fs');
const file = 'C:/Users/canqu/Documents/茉莉妈妈2/story-billing-edit.tmp.js';
let text = fs.readFileSync(file, 'utf8');
const tick = String.fromCharCode(96);
const replacements = [
  [
    'operationKey: body.billingOperationKey || ' + tick + 'story_sync:${body.userId}:${randomUUID()}' + tick + ',',
    'operationKey: body.billingOperationKey || \\' + tick + 'story_sync:${body.userId}:${randomUUID()}' + tick + ',',
  ],
  [
    'operationKey: `story_task:${task.id}`',
    'operationKey: \\' + tick + 'story_task:${task.id}' + tick,
  ],
];
for (const [from, to] of replacements) {
  const count = text.split(from).length - 1;
  if (count !== 1) throw new Error(`expected one nested template, got ${count}: ${from}`);
  text = text.replace(from, to);
}
fs.writeFileSync(file, text);
