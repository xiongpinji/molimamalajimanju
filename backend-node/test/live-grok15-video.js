'use strict';

/**
 * 单独重试 grok-imagine-video-1.5-cli：input_reference 改用 base64 直传
 * （排查 xAI 无法拉取国内 CDN 图片导致的 upstream 404）
 * 运行：node --env-file=.env test/live-grok15-video.js
 */

const fs = require('node:fs');
const path = require('node:path');
const { createVideo, queryTaskOpenAI, waitForTask, pickResultUrl, downloadMedia } = require('../src/services/deepwl');

const ts = () => new Date().toLocaleTimeString();

async function main() {
  const imgPath = path.join(__dirname, '..', 'output', 'images', 'aihubcc-2k-cat.png');
  const buf = fs.readFileSync(imgPath);
  console.log(`[${ts()}] 参考图: ${imgPath} (${(buf.length / 1024).toFixed(0)} KB)`);
  const dataUrl = `data:image/jpeg;base64,${buf.toString('base64')}`;

  console.log(`[${ts()}] 提交 grok-imagine-video-1.5-cli（base64 参考图）...`);
  const created = await createVideo({
    endpoint: 'openai',
    model: 'grok-imagine-video-1.5-cli',
    prompt: 'gentle camera push-in, the cat nods its head to the music rhythm, rain drops sliding on the window',
    input_reference: dataUrl,
    duration: 10,
    size: '1280x720',
    aspect_ratio: '16:9',
  });
  const taskId = created.id || created.task_id;
  console.log(`[${ts()}] 任务ID: ${taskId}  初始状态: ${created.status}`);

  const done = await waitForTask(queryTaskOpenAI, taskId, {
    intervalMs: 8000,
    timeoutMs: 8 * 60 * 1000,
    maxConsecutiveErrors: 8, // 平台文档称瞬时错误会自动重试，多容忍一些
    onProgress: (i) => console.log(`[${ts()}]   ${i.status} ${i.progress ?? ''}`),
  });

  const url = pickResultUrl(done);
  console.log(`[${ts()}] 完成，视频地址: ${url}`);
  const dest = await downloadMedia(url, path.join(__dirname, '..', 'output', 'videos', 'aihubcc-grok15-cat.mp4'));
  const size = fs.statSync(dest).size;
  console.log(`[${ts()}] ✅ 已下载: ${dest} (${(size / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((err) => {
  console.error(`\n❌ 失败：${err.message}`);
  if (err.task) console.error('任务状态：', JSON.stringify(err.task).slice(0, 500));
  if (err.body) console.error('错误详情：', JSON.stringify(err.body).slice(0, 500));
  process.exit(1);
});
