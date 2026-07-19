'use strict';

/**
 * 实测 grok-1.5-video-10s / grok-1.5-video-15s（用户指定型号）。
 * 用法：node --env-file=.env test/live-grok-1.5.js [10s|15s]
 */

const path = require('node:path');
const { generateVideo } = require('../src/services/deepwl');

const variant = process.argv[2] || '10s';
const model = `grok-1.5-video-${variant}`;
const duration = variant === '15s' ? 15 : 10;

async function main() {
  console.log(`模型: ${model}  时长: ${duration}s  提交中...`);
  const startedAt = Date.now();

  const result = await generateVideo({
    model,
    prompt: '一只橘猫戴着耳机听音乐，摇头晃脑，窗外下着大雨，电影感',
    images: [],
    aspect_ratio: '2:3',
    size: '720P',
    duration,
    outputDir: path.join(__dirname, '..', 'output', 'videos'),
    poll: { intervalMs: 8000, timeoutMs: 20 * 60 * 1000 },
    onProgress: (info) => {
      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      console.log(`[${elapsed}s] ${info.status}${info.progress != null ? ' ' + info.progress + '%' : ''}`);
    },
  });

  console.log('\n✅ 生成完成，总耗时', Math.round((Date.now() - startedAt) / 1000), '秒');
  console.log('任务 ID :', result.taskId);
  console.log('视频地址:', result.videoUrl);
  console.log('本地文件:', result.localPath);
}

main().catch((err) => {
  console.error('❌ 失败：', err.message);
  if (err.body) console.error('错误详情：', JSON.stringify(err.body).slice(0, 500));
  process.exit(1);
});
