const fs = require('fs');

function replaceOnce(file, from, to) {
  const text = fs.readFileSync(file, 'utf8');
  const count = text.split(from).length - 1;
  if (count !== 1) throw new Error(`${file}: expected one match, got ${count}`);
  fs.writeFileSync(file, text.replace(from, to));
}

const story = 'research/libtv-open-source-audit/repos/LocalMiniDrama/backend-node/src/services/storyGenerationService.js';
replaceOnce(
  story,
  "const loadConfig = require('../config').loadConfig;\nconst loadConfig = require('../config').loadConfig;\nconst { mergeCfgStyleWithDrama } = require('../utils/dramaStyleMerge');",
  "const loadConfig = require('../config').loadConfig;"
);
replaceOnce(
  story,
  "  const existing = db.prepare(\n    `SELECT id FROM async_tasks\n     WHERE resource_id = ? AND type = 'story_generation'\n       AND status IN ('pending', 'processing') AND deleted_at IS NULL\n     ORDER BY created_at DESC LIMIT 1`\n  ).get(dramaId);",
  "  const existingSql = `SELECT id FROM async_tasks\n     WHERE resource_id = ? AND type = 'story_generation'\n       AND status IN ('pending', 'processing') AND deleted_at IS NULL${billingEnabled ? ' AND user_id = ?' : ''}\n     ORDER BY created_at DESC LIMIT 1`;\n  const existing = db.prepare(existingSql).get(...(billingEnabled ? [dramaId, userId] : [dramaId]));"
);

const task = 'research/libtv-open-source-audit/repos/LocalMiniDrama/backend-node/src/services/taskService.js';
replaceOnce(task, "const { v4: uuidv4 } = require('uuid');", "const { v4: uuidv4 } = require('uuid');\nconst creditLedger = require('./creditLedgerService');");
replaceOnce(
  task,
  "    resource_id: r.resource_id,\n    created_at: r.created_at,",
  "    resource_id: r.resource_id,\n    user_id: r.user_id,\n    model: r.model,\n    credit_reservation_id: r.credit_reservation_id,\n    created_at: r.created_at,"
);
replaceOnce(
  task,
  "  const msg = (reason || USER_CANCEL_TASK_MSG).toString().trim() || USER_CANCEL_TASK_MSG;\n  updateTaskError(db, taskId, msg);",
  "  const msg = (reason || USER_CANCEL_TASK_MSG).toString().trim() || USER_CANCEL_TASK_MSG;\n  if (task.credit_reservation_id) {\n    try {\n      creditLedger.settleGeneration(db, task.credit_reservation_id, 'failed', msg);\n    } catch (error) {\n      log.warn('取消任务积分结算失败', { task_id: taskId, reservation_id: task.credit_reservation_id, error: error.message });\n    }\n  }\n  updateTaskError(db, taskId, msg);"
);
replaceOnce(
  task,
  "    `SELECT id, type, status, resource_id FROM async_tasks\n     WHERE status IN ('pending', 'processing') AND deleted_at IS NULL`",
  "    `SELECT id, type, status, resource_id, credit_reservation_id FROM async_tasks\n     WHERE status IN ('pending', 'processing') AND deleted_at IS NULL`"
);
replaceOnce(
  task,
  "  for (const row of rows) {\n    updateTaskError(db, row.id, ORPHAN_ASYNC_TASK_MSG);",
  "  for (const row of rows) {\n    if (row.credit_reservation_id) {\n      try {\n        creditLedger.settleGeneration(db, row.credit_reservation_id, 'failed', ORPHAN_ASYNC_TASK_MSG);\n      } catch (error) {\n        log.warn('遗留任务积分结算失败', { task_id: row.id, reservation_id: row.credit_reservation_id, error: error.message });\n      }\n    }\n    updateTaskError(db, row.id, ORPHAN_ASYNC_TASK_MSG);"
);

console.log('text billing service/task fixes applied');
