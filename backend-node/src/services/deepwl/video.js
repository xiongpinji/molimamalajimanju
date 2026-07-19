'use strict';

/**
 * 视频生成 API（Grok / Omni / Kling / Veo 等，按模型名路由）。
 * 文档：docs/deepwl-api-grok-video.md、docs/aihubcc-api-integration.md
 */
const fs = require('node:fs');
const path = require('node:path');
const { requestJson } = require('./http');

const VALID_DURATIONS = [6, 10, 15];
const VALID_ASPECT_RATIOS = ['16:9', '9:16', '2:3', '3:2', '1:1'];
const VALID_SIZES = ['720P', '1080P'];

function assertCreateOptions({ model, prompt, images, duration, endpoint }) {
  if (!model) throw new Error('model 不能为空');
  if (!prompt || typeof prompt !== 'string') throw new Error('prompt 不能为空');
  if (!Array.isArray(images)) throw new Error('images 必须是数组（文生视频传 []）');
  if (images.length > 6) throw new Error(`images 最多 6 张，当前 ${images.length} 张`);
  if (endpoint === 'openai') {
    if (!Number.isInteger(duration) || duration < 1 || duration > 300) {
      throw new Error('duration 必须是 1-300 的正整数秒');
    }
  } else if (!VALID_DURATIONS.includes(duration)) {
    throw new Error(`duration 仅支持 ${VALID_DURATIONS.join('/')} 秒`);
  }
}

/**
 * 提交视频生成任务。
 * @param {object} opts
 * @param {string} [opts.endpoint] 'unified'（默认，/v1/video/create）或 'openai'（/v1/videos，omni/kling 等）
 * @param {string} opts.model 模型名（grok-video-3 / omni-fast / kling-2.5-720p / veo_3_1 ...）
 * @param {string} opts.prompt 提示词；多图参考用 @img1/@img2 引用 images 顺序
 * @param {string[]} [opts.images] 参考图（URL/base64），文生传 []
 * @param {string} [opts.aspect_ratio] 16:9 / 9:16 / 2:3 / 3:2 / 1:1
 * @param {string} [opts.size] 720P / 1080P
 * @param {number} [opts.duration] 秒数
 * omni 专用透传字段（仅 openai 端点生效）：
 * @param {string} [opts.image_url] 单张参考图
 * @param {string} [opts.first_image_url] 首帧
 * @param {string} [opts.last_image_url] 末帧
 * @param {string} [opts.video_url] V2V 源视频（≤8MB、≤1920x1080）
 * @param {string[]} [opts.videos] V2V 双源视频（最多 2 个）
 * @param {string} [opts.input_reference] 单张首帧参考图（grok-imagine-video-1.5-cli 必填）
 */
async function createVideo({
  endpoint = 'unified',
  model = 'grok-video-3',
  prompt,
  images = [],
  aspect_ratio = '3:2',
  size = '720P',
  duration = 10,
  image_url,
  first_image_url,
  last_image_url,
  video_url,
  videos,
  input_reference,
}) {
  assertCreateOptions({ model, prompt, images, duration, endpoint });

  if (endpoint === 'openai') {
    const body = { model, prompt, seconds: String(duration), aspect_ratio, size };
    if (images.length === 1) body.image = images[0];
    if (images.length > 1) body.images = images;
    // omni 系列字段透传
    if (image_url) body.image_url = image_url;
    if (first_image_url) body.first_image_url = first_image_url;
    if (last_image_url) body.last_image_url = last_image_url;
    if (video_url) body.video_url = video_url;
    if (videos) body.videos = videos;
    if (input_reference) body.input_reference = input_reference;
    return requestJson('/v1/videos', { method: 'POST', body });
  }

  return requestJson('/v1/video/create', {
    method: 'POST',
    body: { model, prompt, images, aspect_ratio, size, duration },
  });
}

/** 查询任务（/v1/video/query?id=，兼容 OpenAI 格式与统一格式创建的任务） */
async function queryTask(taskId) {
  if (!taskId) throw new Error('taskId 不能为空');
  return requestJson('/v1/video/query', { query: { id: taskId } });
}

/** 查询任务（OpenAI 风格，GET /v1/videos/{task_id}） */
async function queryTaskOpenAI(taskId) {
  if (!taskId) throw new Error('taskId 不能为空');
  return requestJson(`/v1/videos/${encodeURIComponent(taskId)}`);
}

/** Remix：基于已有任务生成变体（POST /v1/video/remix） */
async function remixVideo(taskId, { model = 'grok-video-3', prompt, aspect_ratio = '3:2', size = '720P', parent_post_id } = {}) {
  if (!taskId) throw new Error('taskId 不能为空');
  if (!prompt) throw new Error('prompt 不能为空');
  const body = { model, prompt, aspect_ratio, size, task_id: taskId };
  if (parent_post_id) body.parent_post_id = parent_post_id;
  return requestJson('/v1/video/remix', { method: 'POST', body });
}

/** Extend：从原视频第 start_time 秒开始延展（POST /v1/video/extend） */
async function extendVideo(taskId, { model = 'grok-video-3', prompt, start_time, aspect_ratio, size, images, upscale } = {}) {
  if (!taskId) throw new Error('taskId 不能为空');
  if (!prompt) throw new Error('prompt 不能为空');
  const body = { model, prompt, task_id: taskId };
  if (start_time != null) body.start_time = start_time;
  if (aspect_ratio) body.aspect_ratio = aspect_ratio;
  if (size) body.size = size;
  if (images) body.images = images;
  if (upscale != null) body.upscale = upscale;
  return requestJson('/v1/video/extend', { method: 'POST', body });
}

/** 预签名上传本地文件，返回公网 download_url（两步：签发 → PUT 文件本体） */
async function uploadFile(filePath, { contentType, expire } = {}) {
  const mime = contentType || guessMime(filePath);
  const sign = await requestJson('/v1/file/upload', {
    method: 'PUT',
    body: { headers: { 'Content-Type': mime }, params: expire ? { expire } : {} },
  });
  if (!sign.upload_url || !sign.download_url) {
    throw new Error(`预签名响应缺少 upload_url/download_url：${JSON.stringify(sign).slice(0, 200)}`);
  }
  const uploadResp = await fetch(sign.upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': mime },
    body: fs.readFileSync(filePath),
  });
  if (!uploadResp.ok) {
    throw new Error(`文件上传失败（HTTP ${uploadResp.status}）：${path.basename(filePath)}`);
  }
  return sign.download_url;
}

/** 查询 API Key 余额（GET /api/usage/token/） */
async function getBalance() {
  return requestJson('/api/usage/token/');
}

function guessMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.webp': 'image/webp', '.gif': 'image/gif',
    '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm',
  };
  return map[ext] || 'application/octet-stream';
}

module.exports = {
  createVideo,
  queryTask,
  queryTaskOpenAI,
  remixVideo,
  extendVideo,
  uploadFile,
  getBalance,
  VALID_DURATIONS,
  VALID_ASPECT_RATIOS,
  VALID_SIZES,
};
