const fs = require('fs');
const file = 'research/libtv-open-source-audit/repos/LocalMiniDrama/backend-node/src/services/videoService.js';
let text = fs.readFileSync(file, 'utf8');
function replaceOnce(regex, to) {
  const matches = text.match(regex);
  if (!matches || matches.length !== 1) throw new Error(`expected one match, got ${matches ? matches.length : 0}`);
  text = text.replace(regex, to);
}
replaceOnce(
  /function findActiveForStoryboard\(db, storyboardId\) \{\r?\n  if \(!storyboardId\) return null;\r?\n  return db\.prepare\(\r?\n    `SELECT \* FROM video_generations\r?\n     WHERE storyboard_id = \? AND status IN \('pending', 'processing'\) AND deleted_at IS NULL\r?\n     ORDER BY created_at DESC, id DESC LIMIT 1`\r?\n  \)\.get\(Number\(storyboardId\)\) \|\| null;\r?\n\}/,
  "function findActiveForStoryboard(db, storyboardId, options = {}) {\n  if (!storyboardId) return null;\n  const ownerClause = options.billingEnabled ? ' AND user_id = ?' : '';\n  const params = options.billingEnabled ? [Number(storyboardId), options.userId || ''] : [Number(storyboardId)];\n  return db.prepare(\n    `SELECT * FROM video_generations\n     WHERE storyboard_id = ? AND status IN ('pending', 'processing') AND deleted_at IS NULL${ownerClause}\n     ORDER BY created_at DESC, id DESC LIMIT 1`\n  ).get(...params) || null;\n}"
);
replaceOnce(
  /function create\(db, log, req, options = \{\}\) \{\r?\n  const body = req \|\| \{\};\r?\n  const dramaId = Number\(body\.drama_id\) \|\| 0;\r?\n  const storyboardId = body\.storyboard_id != null \? Number\(body\.storyboard_id\) : null;\r?\n  const active = findActiveForStoryboard\(db, storyboardId\);/,
  "function create(db, log, req, options = {}) {\n  const body = req || {};\n  const billingEnabled = Boolean(options.billingEnabled);\n  if (billingEnabled && !options.userId) throw Object.assign(new Error('公开计费模式缺少用户身份'), { code: 'UNAUTHORIZED' });\n  const dramaId = Number(body.drama_id) || 0;\n  const storyboardId = body.storyboard_id != null ? Number(body.storyboard_id) : null;\n  const active = findActiveForStoryboard(db, storyboardId, { billingEnabled, userId: options.userId });"
);
replaceOnce(/if \(options\.billingEnabled\) \{\r?\n      auditEvent\.record\(/, "if (billingEnabled) {\n      auditEvent.record(");
replaceOnce(/  if \(options\.billingEnabled\) \{\r?\n    if \(!options\.userId\) throw new Error\('缺少计费用户'\);/, "  if (billingEnabled) {\n    if (!options.userId) throw Object.assign(new Error('公开计费模式缺少用户身份'), { code: 'UNAUTHORIZED' });");
replaceOnce(/options\.billingEnabled \? String\(options\.userId\) : null, now, now/, "billingEnabled ? String(options.userId) : null, now, now");
replaceOnce(/    if \(options\.billingEnabled\) \{\r?\n      const reservation = creditLedger\.reserve\(/, "    if (billingEnabled) {\n      const reservation = creditLedger.reserve(");
replaceOnce(/        dramaId, storyboardId, body\.provider \|\| 'chatfire', prompt, body\.model \?\? null, body\.duration \?\? null,/, "        dramaId, storyboardId, body.provider || 'chatfire', prompt, billingModel || body.model || null, body.duration ?? null,");
text = text.replace(/function settleVideoCredit\(db, log, row, outcome, message = ''\) \{\r?\n  if \(!row\?\.credit_reservation_id\) return null;\r?\n  try \{\r?\n    return creditLedger\.settleGeneration\(db, row\.credit_reservation_id, outcome, message\);\r?\n  \} catch \(error\) \{\r?\n    log\?\.error\('视频积分结算失败，保留原预扣状态', \{ id: row\.id, error: error\.message \}\);\r?\n    return null;\r?\n  \}\r?\n\}/, "function settleVideoCredit(db, log, row, outcome, message = '') {\n  if (!row?.credit_reservation_id) return null;\n  try {\n    const settled = creditLedger.settleGeneration(db, row.credit_reservation_id, outcome, message);\n    auditEvent.record(db, {\n      userId: settled?.user_id,\n      eventType: outcome === 'completed' ? 'generation.video.completed' : 'generation.video.failed',\n      resourceType: 'video',\n      resourceId: row.id,\n      outcome: outcome === 'completed' ? 'success' : 'failed',\n      code: outcome === 'failed' ? 'VIDEO_GENERATION_FAILED' : null,\n    });\n    return settled;\n  } catch (error) {\n    log?.error('视频积分结算失败，保留原预扣状态', { id: row.id, error: error.message });\n    return null;\n  }\n}");
fs.writeFileSync(file, text);
console.log('video owner billing fixes applied');
