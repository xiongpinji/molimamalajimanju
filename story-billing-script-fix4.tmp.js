const fs = require('fs');
const file = 'C:/Users/canqu/Documents/茉莉妈妈2/story-billing-edit.tmp.js';
let text = fs.readFileSync(file, 'utf8');
const from = "`const { mergeCfgStyleWithDrama } = require('../utils/dramaStyleMerge');`";
const to = "`const loadConfig = require('../config').loadConfig;`";
const count = text.split(from).length - 1;
if (count !== 1) throw new Error(`expected import target once, got ${count}`);
fs.writeFileSync(file, text.replace(from, to));
