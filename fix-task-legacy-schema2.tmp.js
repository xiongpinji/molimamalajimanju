const fs = require('fs');
const file = 'research/libtv-open-source-audit/repos/LocalMiniDrama/backend-node/src/services/taskService.js';
let text = fs.readFileSync(file, 'utf8');
const regex = /  const rows = db\.prepare\(\r?\n    `SELECT id, type, status, resource_id, credit_reservation_id FROM async_tasks\r?\n     WHERE status IN \('pending', 'processing'\) AND deleted_at IS NULL`\r?\n  \)\.all\(\);/;
if (!regex.test(text) || text.match(regex).length !== 1) throw new Error('startup query not found exactly once');
const replacement = "  let rows;\n  try {\n    rows = db.prepare(\n      `SELECT id, type, status, resource_id, credit_reservation_id FROM async_tasks\n       WHERE status IN ('pending', 'processing') AND deleted_at IS NULL`\n    ).all();\n  } catch (error) {\n    if (!String(error.message || '').includes('credit_reservation_id')) throw error;\n    rows = db.prepare(\n      `SELECT id, type, status, resource_id FROM async_tasks\n       WHERE status IN ('pending', 'processing') AND deleted_at IS NULL`\n    ).all().map((row) => ({ ...row, credit_reservation_id: null }));\n  }";
fs.writeFileSync(file, text.replace(regex, replacement));
console.log('legacy task schema fallback applied');
