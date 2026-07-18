const fs = require('fs')
const file = 'C:/Users/canqu/Documents/茉莉妈妈2/canvas-ui-implement.tmp.js'
let source = fs.readFileSync(file, 'utf8')
const from = "  return `${Math.round(zoom * 100)}%`"
const to = "  return String(Math.round(zoom * 100)) + '%'"
if (!source.includes(from)) throw new Error('zoomLabel marker not found')
source = source.replace(from, to)
fs.writeFileSync(file, source)
