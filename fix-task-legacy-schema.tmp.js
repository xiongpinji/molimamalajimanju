const fs = require('fs');
const file = 'research/libtv-open-source-audit/repos/LocalMiniDrama/backend-node/src/services/taskService.js';
let text = fs.readFileSync(file, 'utf8');
const from = "  const rows = db.prepare(\n    `SELECT id, type, status, resource_id, credit_reservation_id FROM async_tasks\n     WHERE status IN ('pending', 'processing') AND deleted_at IS NULL`\n  ).all();";
const to = "  let rows;\n  try {\n    rows = db.prepare(\n      `SELECT id, type, status, resource_id, credit_reservation_id FROM async_tasks\n       WHERE status IN ('pending', 'processing') AND deleted_at IS NULL`\n    ).all();\n  } catch (error) {\n    if (!String(error.message || '').includes('credit_reservation_id')) throw error;\n    rows = db.prepare(\n      `SELECT id, type, status, resource_id FROM async_tasks\n       WHERE status IN ('pending', 'processing') AND deleted_at IS NULL`\n    ).all().map((row) => ({ ...row, credit_reservation_id: null }));\n  }";
const count = text.split(from).length - 1;
if (count !== 1) throw new Error(`expected one startup query, got ${count}`);
fs.writeFileSync(file, text.replace(from, to));
console.log('legacy task schema fallback applied');
