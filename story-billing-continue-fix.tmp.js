const fs = require('fs');
const file = 'C:/Users/canqu/Documents/茉莉妈妈2/story-billing-continue.tmp.js';
let text = fs.readFileSync(file, 'utf8');
const from = "  tick + 'SELECT id FROM async_tasks',";
const to = "  '    ' + tick + 'SELECT id FROM async_tasks',";
if (text.split(from).length - 1 !== 1) throw new Error('expected existing indentation segment once');
fs.writeFileSync(file, text.replace(from, to));
