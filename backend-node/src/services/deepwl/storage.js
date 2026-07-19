'use strict';

/** 结果提取与下载转存（结果 URL 会过期，完成后须尽快下载） */

const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { config } = require('../../config');

/**
 * 从任务信息里提取结果地址，兼容各渠道返回形态：
 * output.url → video_url → url → detail.url → metadata.url → data[0].url（omni）
 */
function pickResultUrl(taskInfo) {
  return (
    (taskInfo.output && taskInfo.output.url) ||
    taskInfo.video_url ||
    taskInfo.url ||
    (taskInfo.detail && taskInfo.detail.url) ||
    (taskInfo.metadata && taskInfo.metadata.url) ||
    (Array.isArray(taskInfo.data) && taskInfo.data[0] && taskInfo.data[0].url) ||
    null
  );
}

/** 相对路径（如 /v1/videos/{id}/content）补全为完整 URL */
function resolveUrl(url) {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return config.baseUrl + (url.startsWith('/') ? url : '/' + url);
}

/**
 * 下载媒体到本地文件。
 * @param {string} url 媒体地址（相对路径自动补全）
 * @param {string} destPath 目标路径（父目录自动创建）
 * @param {object} [opts]
 * @param {string} [opts.auth] 同源 API 地址（如 /content 代理）需带 Bearer 时传入 API Key
 */
async function downloadMedia(url, destPath, { auth } = {}) {
  if (!url) throw new Error('下载地址不能为空');
  const fullUrl = resolveUrl(url);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });

  const headers = {};
  if (auth && fullUrl.startsWith(config.baseUrl)) {
    headers.Authorization = `Bearer ${auth}`;
  }
  const resp = await fetch(fullUrl, { headers });
  if (!resp.ok || !resp.body) {
    throw new Error(`下载失败（HTTP ${resp.status}）：${fullUrl.slice(0, 120)}`);
  }
  await pipeline(Readable.fromWeb(resp.body), fs.createWriteStream(destPath));
  return destPath;
}

/** 保存 base64 数据到文件（gpt-image 的 b64_json 响应） */
function saveBase64(b64, destPath) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, Buffer.from(b64, 'base64'));
  return destPath;
}

/** 任务 ID 常带 grok: 前缀等非法字符，清洗为合法文件名 */
function safeFilename(name) {
  return String(name).replace(/[<>:"/\\|?*]/g, '_');
}

module.exports = { pickResultUrl, resolveUrl, downloadMedia, saveBase64, safeFilename };
