'use strict';

/**
 * aihubcc 平台实测：gpt-image-2-2k（异步高清图）→ grok-imagine-video-1.5-cli（图生视频）
 * 运行：node --env-file=.env test/live-aihubcc.js
 */

const path = require('node:path');
const { generateImageHD, generateVideo } = require('../src/services/deepwl');

const ts = () => new Date().toLocaleTimeString();

async function main() {
  // ===== 第一步：gpt-image-2-2k 异步生成 2K 图 =====
  console.log(`[${ts()}] ① 提交 gpt-image-2-2k 高清图任务...`);
  const img = await generateImageHD({
    model: 'gpt-image-2-2k',
    prompt: 'A cute fluffy orange cat wearing big black headphones, sitting on a windowsill, heavy rain outside the window, cinematic lighting, ultra detailed',
    aspect_ratio: '16:9',
    outputDir: path.join(__dirname, '..', 'output', 'images'),
    filename: 'aihubcc-2k-cat.png',
    poll: { intervalMs: 6000, timeoutMs: 8 * 60 * 1000 },
    onProgress: (i) => console.log(`[${ts()}]   图片 ${i.status} ${i.progress ?? ''}`),
  });
  console.log(`[${ts()}] ✅ 图片完成: ${img.localPath}`);
  console.log(`[${ts()}]    图片URL: ${img.imageUrl}`);

  // ===== 第二步：grok-imagine-video-1.5-cli 图生视频 =====
  console.log(`[${ts()}] ② 提交 grok-imagine-video-1.5-cli 图生视频任务...`);
  const vid = await generateVideo({
    endpoint: 'openai',
    model: 'grok-imagine-video-1.5-cli',
    prompt: 'gentle camera push-in, the cat nods its head to the music rhythm, rain drops sliding on the window',
    input_reference: img.imageUrl, // 1.5-cli 必填：单张首帧参考图
    duration: 10,                  // 单图最长 15s
    size: '1280x720',
    aspect_ratio: '16:9',
    outputDir: path.join(__dirname, '..', 'output', 'videos'),
    filename: 'aihubcc-grok15-cat.mp4',
    poll: { intervalMs: 8000, timeoutMs: 8 * 60 * 1000 },
    onProgress: (i) => console.log(`[${ts()}]   视频 ${i.status} ${i.progress ?? ''}`),
  });
  console.log(`[${ts()}] ✅ 视频完成: ${vid.localPath}`);

  console.log('\n🎉 全链路成功：gpt-image-2-2k 出图 → grok-imagine-video-1.5-cli 出片');
}

main().catch((err) => {
  console.error(`\n❌ 失败：${err.message}`);
  if (err.body) console.error('错误详情：', JSON.stringify(err.body).slice(0, 500));
  process.exit(1);
});
