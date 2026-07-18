const fs = require('fs')
const file = 'C:/Users/canqu/Documents/茉莉妈妈2/canvas-ui-implement.tmp.js'
let source = fs.readFileSync(file, 'utf8')
const from = "  let source = fs.readFileSync(file, 'utf8')"
const to = "  let source = fs.readFileSync(file, 'utf8').replace(/\\r\\n/g, '\\n')"
if (!source.includes(from)) throw new Error('line-ending marker not found')
source = source.replace(from, to)
fs.writeFileSync(file, source)
