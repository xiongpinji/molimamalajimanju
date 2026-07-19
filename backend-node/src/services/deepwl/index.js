'use strict';

/**
 * deepwl 平台客户端 —— 高层封装入口。
 *
 * 视频：generateVideo（提交+轮询+下载）、generateGrokChatVideo（Chat 方式）
 * 图像：generateImageNow（同步）、editImageNow（图生图）、generateImageHD（2K/4K 异步）
 *
 * 配置：DEEPWL_API_KEY / DEEPWL_BASE_URL（见 .env.example）
 */

const path = require('node:path');
const { config } = require('../../config');
const video = require('./video');
const image = require('./image');
const grokChat = require('./grokChatVideo');
const { waitForTask } = require('./poller');
const { pickResultUrl, resolveUrl, downloadMedia, saveBase64, safeFilename } = require('./storage');

/**
 * 一站式视频生成：提交 → 轮询 → 下载转存。
 * @param {object} opts createVideo 全部参数，外加：
 * @param {string} [opts.outputDir] 下载目录；不传则只返回 URL
 * @param {string} [opts.filename] 文件名，默认 任务ID.mp4
 * @param {object} [opts.poll] 轮询参数 { intervalMs, timeoutMs }
 * @param {string} [opts.queryStyle] 查询方式 'unified'(/v1/video/query) 或 'openai'(/v1/videos/{id})；
 *   默认跟随 endpoint（openai 端点创建的任务用 openai 查询）
 * @param {(info:object)=>void} [opts.onProgress] 轮询回调
 * @returns {Promise<{taskId:string, resultUrl:string, localPath:string|null, raw:object}>}
 */
async function generateVideo({ outputDir, filename, poll, queryStyle, onProgress, ...createOpts }) {
  const created = await video.createVideo(createOpts);
  const taskId = created.id || created.task_id;
  if (!taskId) throw new Error(`创建任务响应缺少 id/task_id：${JSON.stringify(created).slice(0, 200)}`);

  const queryFn = (queryStyle || (createOpts.endpoint === 'openai' ? 'openai' : 'unified')) === 'openai'
    ? video.queryTaskOpenAI
    : video.queryTask;
  const done = await waitForTask(queryFn, taskId, { ...poll, onProgress });

  const resultUrl = pickResultUrl(done);
  if (!resultUrl) throw new Error(`任务完成但未找到结果地址：${JSON.stringify(done).slice(0, 300)}`);

  let localPath = null;
  if (outputDir) {
    const name = filename || `${safeFilename(taskId)}.mp4`;
    localPath = await downloadMedia(resultUrl, path.join(outputDir, name), { auth: config.apiKey });
  }
  return { taskId, resultUrl: resolveUrl(resultUrl), localPath, raw: done };
}

/**
 * 同步文生图（gpt-image-2 1K 档）。
 * @param {object} opts generateImage 参数，外加 outputDir/filename 用于落盘
 * @returns {Promise<{images: Array<{url?:string, localPath?:string}>, raw:object}>}
 */
async function generateImageNow({ outputDir, filename, ...genOpts }) {
  const resp = await image.generateImage(genOpts);
  const images = [];
  for (let i = 0; i < (resp.data || []).length; i++) {
    const item = resp.data[i];
    const out = { url: item.url || null, localPath: null };
    if (outputDir) {
      const name = filename || `image-${Date.now()}-${i + 1}.png`;
      const dest = path.join(outputDir, safeFilename(name));
      if (item.url) {
        out.localPath = await downloadMedia(item.url, dest, { auth: config.apiKey });
      } else if (item.b64_json) {
        out.localPath = saveBase64(item.b64_json, dest);
      }
    }
    images.push(out);
  }
  return { images, raw: resp };
}

/**
 * 图生图（multipart 编辑）。
 * @returns {Promise<{images: Array<{url?:string, localPath?:string}>, raw:object}>}
 */
async function editImageNow({ outputDir, filename, ...editOpts }) {
  const resp = await image.editImage(editOpts);
  const images = [];
  for (let i = 0; i < (resp.data || []).length; i++) {
    const item = resp.data[i];
    const out = { url: item.url || null, localPath: null };
    if (outputDir) {
      const name = filename || `edit-${Date.now()}-${i + 1}.png`;
      const dest = path.join(outputDir, safeFilename(name));
      if (item.url) {
        out.localPath = await downloadMedia(item.url, dest, { auth: config.apiKey });
      } else if (item.b64_json) {
        out.localPath = saveBase64(item.b64_json, dest);
      }
    }
    images.push(out);
  }
  return { images, raw: resp };
}

/**
 * 高清图像异步生成（gpt-image-2-2k / 3.5k / 4k）：提交 → 轮询 → 取图。
 * 注意：完成时的 video_url 字段是【图片】地址。
 */
async function generateImageHD({ outputDir, filename, poll, queryStyle = 'openai', onProgress, ...taskOpts }) {
  const created = await image.createImageTask(taskOpts);
  const taskId = created.id || created.task_id;
  if (!taskId) throw new Error(`创建任务响应缺少 id/task_id：${JSON.stringify(created).slice(0, 200)}`);

  // 高清图任务经 /v1/videos 创建，默认用 openai 风格查询（/v1/videos/{id}）
  const queryFn = queryStyle === 'openai' ? video.queryTaskOpenAI : video.queryTask;
  const done = await waitForTask(queryFn, taskId, { ...poll, onProgress });

  const resultUrl = pickResultUrl(done);
  if (!resultUrl) throw new Error(`任务完成但未找到图片地址：${JSON.stringify(done).slice(0, 300)}`);

  let localPath = null;
  if (outputDir) {
    const name = filename || `${safeFilename(taskId)}.png`;
    localPath = await downloadMedia(resultUrl, path.join(outputDir, name), { auth: config.apiKey });
  }
  return { taskId, imageUrl: resolveUrl(resultUrl), localPath, raw: done };
}

/**
 * Grok Chat 视频（chat/completions + video_config）：提交（流式收进度）→ 提取媒体链接 → 下载。
 * @param {object} opts grokChat.chatVideo 参数，外加 outputDir/filename
 * @returns {Promise<{content:string, mediaUrl:string|null, localPath:string|null, raw:object}>}
 */
async function generateGrokChatVideo({ outputDir, filename, ...chatOpts }) {
  const result = await grokChat.chatVideo(chatOpts);
  let localPath = null;
  if (outputDir && result.mediaUrl) {
    const ext = result.videoUrl ? '.mp4' : '.png';
    const name = filename || `grok-chat-${Date.now()}${ext}`;
    localPath = await downloadMedia(result.mediaUrl, path.join(outputDir, safeFilename(name)), { auth: config.apiKey });
  }
  return { content: result.content, mediaUrl: result.mediaUrl, localPath, raw: result };
}

module.exports = {
  // 高层：视频
  generateVideo,
  generateGrokChatVideo,
  // 高层：图像
  generateImageNow,
  editImageNow,
  generateImageHD,
  // 底层：视频
  ...video,
  // 底层：图像
  ...image,
  // 底层：grok chat / 轮询 / 存储
  ...grokChat,
  waitForTask,
  pickResultUrl,
  resolveUrl,
  downloadMedia,
  saveBase64,
  safeFilename,
};
