'use strict';

/** 轮询工具：等待异步任务完成 */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 轮询任务直到完成/失败/超时。
 * @param {(taskId: string) => Promise<object>} queryFn 查询函数
 * @param {string} taskId 任务 ID
 * @param {object} [opts]
 * @param {number} [opts.intervalMs] 轮询间隔，默认 5000
 * @param {number} [opts.timeoutMs] 超时时间，默认 10 分钟
 * @param {number} [opts.maxConsecutiveErrors] 允许的连续查询异常次数，默认 3
 * @param {(info: object) => void} [opts.onProgress] 每次查询到状态的回调
 * @returns {Promise<object>} 完成时的任务信息
 */
async function waitForTask(queryFn, taskId, {
  intervalMs = 5000,
  timeoutMs = 10 * 60 * 1000,
  maxConsecutiveErrors = 3,
  onProgress,
} = {}) {
  const deadline = Date.now() + timeoutMs;
  let consecutiveErrors = 0;

  while (Date.now() < deadline) {
    let info;
    try {
      info = await queryFn(taskId);
      consecutiveErrors = 0;
    } catch (err) {
      consecutiveErrors += 1;
      if (consecutiveErrors >= maxConsecutiveErrors) {
        throw new Error(`连续 ${maxConsecutiveErrors} 次查询失败，最后错误：${err.message}`);
      }
      await sleep(intervalMs);
      continue;
    }

    if (onProgress) onProgress(info);

    if (info.status === 'completed') return info;
    if (info.status === 'failed' || info.status === 'cancelled') {
      const reason = (info.error && info.error.message) || info.status;
      const err = new Error(`任务${info.status === 'failed' ? '失败' : '被取消'}：${reason}`);
      err.task = info;
      throw err;
    }

    await sleep(intervalMs);
  }

  throw new Error(`任务超时（${Math.round(timeoutMs / 1000)} 秒内未完成）：${taskId}`);
}

module.exports = { waitForTask, sleep };
