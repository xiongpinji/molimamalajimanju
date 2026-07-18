const fs = require('fs');

function replaceOnce(file, from, to) {
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const count = text.split(from).length - 1;
  if (count !== 1) throw new Error(`${file}: expected one match, got ${count}`);
  fs.writeFileSync(file, text.replace(from, to));
}

const root = 'C:/Users/canqu/Documents/茉莉妈妈2/research/libtv-open-source-audit/repos/LocalMiniDrama/';
const story = root + 'backend-node/src/services/storyGenerationService.js';
replaceOnce(story,
`const loadConfig = require('../config').loadConfig;`,
`const { mergeCfgStyleWithDrama } = require('../utils/dramaStyleMerge');
const { randomUUID } = require('crypto');
const creditLedger = require('./creditLedgerService');
const modelPrice = require('./modelPriceService');
const auditEvent = require('./auditEventService');`);
replaceOnce(story,
`async function generateStory(db, log, body) {`,
`function reserveStoryCredit(db, { userId, resourceId, operationKey, model }) {
  const canonicalModel = modelPrice.canonicalModel(model || 'GPT-5.5');
  const amount = modelPrice.requirePrice(db, canonicalModel);
  const reservation = creditLedger.reserve(db, {
    userId,
    operationKey,
    model: canonicalModel,
    resourceType: 'text',
    resourceId,
    amount,
  });
  auditEvent.record(db, {
    userId,
    eventType: 'generation.text.created',
    resourceType: 'text',
    resourceId,
    outcome: 'success',
  });
  return { reservation, model: canonicalModel, amount };
}

function settleStoryCredit(db, log, reservationId, outcome, message = '') {
  if (!reservationId) return null;
  try {
    const settled = creditLedger.settleGeneration(db, reservationId, outcome, message);
    auditEvent.record(db, {
      userId: settled?.user_id,
      eventType: outcome === 'completed' ? 'generation.text.completed' : 'generation.text.failed',
      resourceType: 'text',
      resourceId: settled?.resource_id,
      outcome: outcome === 'completed' ? 'success' : 'failed',
      code: outcome === 'failed' ? 'TEXT_GENERATION_FAILED' : null,
    });
    return settled;
  } catch (error) {
    log?.error?.('文本生成积分结算失败，保留原预扣状态', { reservation_id: reservationId, error: error.message });
    return null;
  }
}

async function generateStory(db, log, body) {`);
replaceOnce(story,
`  // 注意：不使用 json_mode=true，因为 response_format:json_object 要求返回 JSON 对象而非数组，
  // 会导致模型将数组包成 {"episodes":[...]} 对象，破坏解析逻辑。依靠 prompt 本身约束格式即可。
  const rawText = await aiClient.generateText(db, log, 'text', userPrompt, systemPrompt, {
    scene_key: 'story_generation',
    model: body.model || undefined,
    temperature: 0.8,
    min_max_tokens: minTokensNeeded,
  });`,
`  // 注意：不使用 json_mode=true，因为 response_format:json_object 要求返回 JSON 对象而非数组，
  // 会导致模型将数组包成 {"episodes":[...]} 对象，破坏解析逻辑。依靠 prompt 本身约束格式即可。
  let billingReservationId = body.billingReservationId || null;
  let billingModel = body.model || undefined;
  if (body.billingEnabled) {
    if (!body.userId) throw Object.assign(new Error('公开计费模式缺少用户身份'), { code: 'UNAUTHORIZED' });
    const prepared = billingReservationId
      ? { model: modelPrice.canonicalModel(body.model || 'GPT-5.5') }
      : reserveStoryCredit(db, {
        userId: body.userId,
        resourceId: body.billingResourceId || body.billingOperationKey || randomUUID(),
        operationKey: body.billingOperationKey || \`story_sync:\${body.userId}:\${randomUUID()}\`,
        model: body.model || 'GPT-5.5',
      });
    billingReservationId = billingReservationId || prepared.reservation.id;
    billingModel = prepared.model;
  }

  let rawText;
  try {
    rawText = await aiClient.generateText(db, log, 'text', userPrompt, systemPrompt, {
      scene_key: 'story_generation',
      model: billingModel,
      temperature: 0.8,
      min_max_tokens: minTokensNeeded,
    });
    if (billingReservationId) settleStoryCredit(db, log, billingReservationId, 'completed');
  } catch (error) {
    if (billingReservationId) settleStoryCredit(db, log, billingReservationId, 'failed', error.message);
    throw error;
  }`);
replaceOnce(story,
`function startStoryGeneration(db, log, req) {
  const dramaId = String(req.drama_id || '');
  if (!dramaId) throw new Error('drama_id 必填');`,
`function startStoryGeneration(db, log, req, options = {}) {
  const dramaId = String(req.drama_id || '');
  if (!dramaId) throw new Error('drama_id 必填');
  const billingEnabled = Boolean(options.billingEnabled);
  const userId = options.userId ? String(options.userId) : '';
  if (billingEnabled && !userId) throw Object.assign(new Error('公开计费模式缺少用户身份'), { code: 'UNAUTHORIZED' });`);
replaceOnce(story,
`  const existing = db.prepare(
    \`SELECT id FROM async_tasks
     WHERE resource_id = ? AND type = 'story_generation'
       AND status IN ('pending', 'processing') AND deleted_at IS NULL
     ORDER BY created_at DESC LIMIT 1\`
  ).get(dramaId);`,
`  const existingSql = \`SELECT id FROM async_tasks
     WHERE resource_id = ? AND type = 'story_generation'
       AND status IN ('pending', 'processing') AND deleted_at IS NULL\${billingEnabled ? ' AND user_id = ?' : ''}
     ORDER BY created_at DESC LIMIT 1\`;
  const existing = db.prepare(existingSql).get(...(billingEnabled ? [dramaId, userId] : [dramaId]));`);
replaceOnce(story,
`  const task = taskService.createTask(db, log, 'story_generation', dramaId);
  setImmediate(() => {
    processStoryGeneration(db, log, task.id, req).catch((err) => {`,
`  const task = taskService.createTask(db, log, 'story_generation', dramaId);
  let taskRequest = req;
  if (billingEnabled) {
    try {
      const prepared = reserveStoryCredit(db, {
        userId,
        resourceId: task.id,
        operationKey: \`story_task:\${task.id}\`,
        model: req.model || 'GPT-5.5',
      });
      db.prepare('UPDATE async_tasks SET user_id = ?, model = ?, credit_reservation_id = ? WHERE id = ?')
        .run(userId, prepared.model, prepared.reservation.id, task.id);
      taskRequest = { ...req, billingEnabled: true, userId, billingReservationId: prepared.reservation.id, billingResourceId: task.id, model: prepared.model };
    } catch (error) {
      taskService.updateTaskError(db, task.id, error.message || '积分预扣失败');
      throw error;
    }
  }
  setImmediate(() => {
    processStoryGeneration(db, log, task.id, taskRequest).catch((err) => {`);
replaceOnce(story,
`  startStoryGeneration,
};`,
`  startStoryGeneration,
  reserveStoryCredit,
  settleStoryCredit,
};`);

const routes = root + 'backend-node/src/routes/index.js';
replaceOnce(routes,
`        const taskId = storyGenerationService.startStoryGeneration(db, log, body);`,
`        const taskId = storyGenerationService.startStoryGeneration(db, log, body, { billingEnabled: publicPlatformEnabled, userId: req.user?.id });`);
replaceOnce(routes,
`      const result = await storyGenerationService.generateStory(db, log, body);`,
`      const result = await storyGenerationService.generateStory(db, log, publicPlatformEnabled
        ? { ...body, billingEnabled: true, userId: req.user?.id }
        : body);`);
replaceOnce(routes,
`      if (err.message && (err.message.includes('未配置') || err.message.includes('必填') || err.message.includes('不存在'))) {
        return response.badRequest(res, err.message);
      }
      response.internalError(res, err.message || '故事生成失败');`,
`      if (err.code === 'MODEL_PRICE_NOT_CONFIGURED') return response.error(res, 503, err.code, err.message);
      if (err.code === 'INSUFFICIENT_CREDITS') return response.error(res, 402, err.code, '积分不足，请充值后重试');
      if (err.code === 'UNSUPPORTED_BILLING_MODEL') return response.badRequest(res, err.message);
      if (err.message && (err.message.includes('未配置') || err.message.includes('必填') || err.message.includes('不存在'))) {
        return response.badRequest(res, err.message);
      }
      response.internalError(res, err.message || '故事生成失败');`);

const migrate = root + 'backend-node/src/db/migrate.js';
replaceOnce(migrate,
`    { name: 'deleted_at',   type: 'TEXT' },
  ]);

  // --- image_generations ---`,
`    { name: 'deleted_at',   type: 'TEXT' },
    { name: 'user_id',      type: 'TEXT' },
    { name: 'model',        type: 'TEXT' },
    { name: 'credit_reservation_id', type: 'TEXT' },
  ]);

  // --- image_generations ---`);
