'use strict';

/**
 * Omni 视频示例（Gemini Veo 系）：文生 / 图生 / V2V。
 * 运行：node --env-file=.env examples/omni-video.js
 */

const path = require('node:path');
const { generateVideo } = require('../src/services/deepwl');

async function main() {
  const result = await generateVideo({
    endpoint: 'openai',
    model: 'omni-fast', // 无水印换 omni-fast-no-water；V2V 换 omni-fast-v2v + video_url
    prompt: '雨夜霓虹街道，镜头缓慢推进，电影感光影',
    aspect_ratio: '16:9', // omni 仅支持 16:9 / 9:16
    duration: 10,         // Gemini 固定约 10s
    // image_url: 'https://your-cdn.com/photo.jpg',   // 图生视频打开这行
    outputDir: path.join(__dirname, '..', 'output', 'videos'),
    poll: { intervalMs: 8000, timeoutMs: 8 * 60 * 1000 }, // omni 约 1-5 分钟
    onProgress: (info) => {
      console.log(`[${new Date().toLocaleTimeString()}] ${info.status} ${info.progress ?? ''}`);
    },
  });

  console.log('\n✅ 生成完成');
  console.log('任务 ID :', result.taskId);
  console.log('本地文件:', result.localPath);
}

main().catch((err) => {
  console.error('❌ 失败：', err.message);
  process.exit(1);
});
