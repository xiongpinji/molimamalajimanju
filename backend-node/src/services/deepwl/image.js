'use strict';

/**
 * GPT-Image-2 图像生成 API。
 * - 文生图：POST /v1/images/generations（同步）
 * - 图生图：POST /v1/images/edits（multipart）
 * - 高清异步：POST /v1/videos（2K/3.5K/4K，返回的 video_url 是图片地址）
 */
const fs = require('node:fs');
const path = require('node:path');
const { requestJson, requestForm } = require('./http');

const SYNC_SIZES = ['1024x1024', '1536x1024', '1024x1536', 'auto'];
const QUALITIES = ['auto', 'low', 'medium', 'high'];

/**
 * 文生图（同步，POST /v1/images/generations）。
 * @param {object} opts
 * @param {string} [opts.model] gpt-image-2 / gpt-image-2-1k / gemini-image 等
 * @param {string} opts.prompt 图片描述
 * @param {string} [opts.size] 1024x1024 / 1536x1024(横) / 1024x1536(竖) / auto（只控比例）
 * @param {string} [opts.quality] auto / low / medium / high
 * @param {number} [opts.n] 数量 1-4
 * @param {string} [opts.response_format] 'url'（推荐，返回完整地址）或 'b64_json'
 * @param {string|string[]} [opts.image] 参考图（gemini-image 支持，URL/base64/数组）
 * @returns {Promise<{data: Array<{url?:string, b64_json?:string}>}>}
 */
async function generateImage({
  model = 'gpt-image-2',
  prompt,
  size = '1024x1024',
  quality = 'high',
  n,
  response_format = 'url',
  image,
} = {}) {
  if (!prompt) throw new Error('prompt 不能为空');
  if (!SYNC_SIZES.includes(size)) throw new Error(`size 仅支持 ${SYNC_SIZES.join('/')}`);
  if (!QUALITIES.includes(quality)) throw new Error(`quality 仅支持 ${QUALITIES.join('/')}`);

  const body = { model, prompt, size, quality, response_format };
  if (n) body.n = n;
  if (image) body.image = image;
  return requestJson('/v1/images/generations', { method: 'POST', body });
}

/**
 * 图生图（multipart，POST /v1/images/edits）。
 * 参考图 ≤2K（长边 ≤2048）。内部用 FormData，绝不手动设 Content-Type。
 * @param {object} opts
 * @param {string} opts.imagePath 本地参考图路径
 * @param {string} opts.prompt 编辑描述（如 "把背景改成海边日落"）
 * @param {string} [opts.model] 默认 gpt-image-2
 */
async function editImage({ imagePath, prompt, model = 'gpt-image-2' } = {}) {
  if (!imagePath) throw new Error('imagePath 不能为空');
  if (!prompt) throw new Error('prompt 不能为空');
  if (!fs.existsSync(imagePath)) throw new Error(`参考图不存在：${imagePath}`);

  const form = new FormData();
  form.append('image', new Blob([fs.readFileSync(imagePath)]), path.basename(imagePath));
  form.append('prompt', prompt);
  form.append('model', model);
  return requestForm('/v1/images/edits', form);
}

/**
 * 高清图像异步任务（POST /v1/videos，gpt-image-2-2k / 3.5k / 4k）。
 * 提交后按视频任务轮询，完成时 video_url 字段是【图片】地址。
 * @param {object} opts
 * @param {string} [opts.model] gpt-image-2-2k（2048²）/ gpt-image-2-3.5k（2880²）/ gpt-image-2-4k
 * @param {string} opts.prompt 图片描述
 * @param {string} [opts.aspect_ratio] 1:1 / 16:9 / 9:16 / 4:3 / 3:2 / 5:4
 * @param {string} [opts.image] 参考图（URL 或 base64，填了即图生图）
 * @param {string[]} [opts.images] 多图融合（≤6 张，总和 ≤5MB）
 */
async function createImageTask({
  model = 'gpt-image-2-2k',
  prompt,
  aspect_ratio = '1:1',
  image,
  images,
} = {}) {
  if (!prompt) throw new Error('prompt 不能为空');
  if (images && images.length > 6) throw new Error(`多图融合最多 6 张，当前 ${images.length} 张`);

  const body = { model, prompt, aspect_ratio };
  if (image) body.image = image;
  if (images) body.images = images;
  return requestJson('/v1/videos', { method: 'POST', body });
}

module.exports = { generateImage, editImage, createImageTask, SYNC_SIZES, QUALITIES };
