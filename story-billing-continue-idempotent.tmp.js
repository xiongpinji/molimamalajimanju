const fs = require('fs');
const file = 'C:/Users/canqu/Documents/茉莉妈妈2/story-billing-continue.tmp.js';
let text = fs.readFileSync(file, 'utf8');
const from = "  if (count !== 1) throw new Error(`${file}: expected one match, got ${count}`);";
const to = "  if (count === 0) return;\n  if (count !== 1) throw new Error(`${file}: expected one match, got ${count}`);";
if (text.split(from).length - 1 !== 1) throw new Error('expected replaceOnce guard once');
fs.writeFileSync(file, text.replace(from, to));
