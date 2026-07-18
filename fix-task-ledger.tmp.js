const fs = require('fs');
const file = 'research/libtv-open-source-audit/repos/LocalMiniDrama/backend-node/src/services/taskService.js';
let text = fs.readFileSync(file, 'utf8');
function replaceOnce(from, to) {
  const count = text.split(from).length - 1;
  if (count !== 1) throw new Error(`literal expected one match, got ${count}`);
  text = text.replace(from, to);
}
function replaceRegexOnce(regex, to) {
  const matches = text.match(regex);
  if (!matches || matches.length !== 1) throw new Error(`regex expected one match, got ${matches ? matches.length : 0}`);
  text = text.replace(regex, to);
}
replaceRegexOnce(/    resource_id: r\.resource_id,\r?\n    created_at: r\.created_at,/, "    resource_id: r.resource_id,\n    user_id: r.user_id,\n    model: r.model,\n    credit_reservation_id: r.credit_reservation_id,\n    created_at: r.created_at,");
replaceRegexOnce(/  const msg = \(reason \|\| USER_CANCEL_TASK_MSG\)\.toString\(\)\.trim\(\) \|\| USER_CANCEL_TASK_MSG;\r?\n  updateTaskError\(db, taskId, msg\);/, "  const msg = (reason || USER_CANCEL_TASK_MSG).toString().trim() || USER_CANCEL_TASK_MSG;\n  if (task.credit_reservation_id) {\n    try {\n      creditLedger.settleGeneration(db, task.credit_reservation_id, 'failed', msg);\n    } catch (error) {\n      log.warn('取消任务积分结算失败', { task_id: taskId, reservation_id: task.credit_reservation_id, error: error.message });\n    }\n  }\n  updateTaskError(db, taskId, msg);");
replaceRegexOnce(/`SELECT id, type, status, resource_id FROM async_tasks\r?\n     WHERE status IN \('pending', 'processing'\) AND deleted_at IS NULL`/, "`SELECT id, type, status, resource_id, credit_reservation_id FROM async_tasks\n     WHERE status IN ('pending', 'processing') AND deleted_at IS NULL`");
replaceRegexOnce(/  for \(const row of rows\) \{\r?\n    updateTaskError\(db, row\.id, ORPHAN_ASYNC_TASK_MSG\);/, "  for (const row of rows) {\n    if (row.credit_reservation_id) {\n      try {\n        creditLedger.settleGeneration(db, row.credit_reservation_id, 'failed', ORPHAN_ASYNC_TASK_MSG);\n      } catch (error) {\n        log.warn('遗留任务积分结算失败', { task_id: row.id, reservation_id: row.credit_reservation_id, error: error.message });\n      }\n    }\n    updateTaskError(db, row.id, ORPHAN_ASYNC_TASK_MSG);");
fs.writeFileSync(file, text);
console.log('task ledger settlement fixes applied');
