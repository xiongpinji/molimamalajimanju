const fs = require('fs');
const file = 'C:/Users/canqu/Documents/茉莉妈妈2/story-billing-edit.tmp.js';
let text = fs.readFileSync(file, 'utf8');
const edits = [
  [
    'operationKey: body.billingOperationKey || \\`story_sync:${body.userId}:${randomUUID()}\\`,',
    'operationKey: body.billingOperationKey || \\`story_sync:\\${body.userId}:\\${randomUUID()}\\`,',
  ],
  [
    'operationKey: \\`story_task:${task.id}\\`,',
    'operationKey: \\`story_task:\\${task.id}\\`,',
  ],
];
for (const [from, to] of edits) {
  const count = text.split(from).length - 1;
  if (count !== 1) throw new Error(`expected operation interpolation once, got ${count}`);
  text = text.replace(from, to);
}
fs.writeFileSync(file, text);
