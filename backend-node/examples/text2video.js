'use strict';

/**
 * 文生视频示例。
 * 运行：node --env-file=.env examples/text2video.js
 */

const path = require('node:path');
const { generateVideo } = require('../src/services/deepwl');

async function main() {
  const result = await generateVideo({
    endpoint: 'openai',
    model: 'kling-2.5-720p', // 也可换 grok-video-3 / omni-fast / veo_3_1
    prompt: '猫咪听歌摇头晃脑，窗外下着大雨',
    images: [], // 文生视频传空数组
    aspect_ratio: '16:9',
    size: '720P',
    duration: 5,
    outputDir: path.join(__dirname, '..', 'output', 'videos'),
    onProgress: (info) => {
      console.log(`[${new Date().toLocaleTimeString()}] ${info.status} ${info.progress ?? ''}`);
    },
  });

  console.log('\n✅ 生成完成');
  console.log('任务 ID :', result.taskId);
  console.log('视频地址:', result.resultUrl);
  console.log('本地文件:', result.localPath);
}

main().catch((err) => {
  console.error('❌ 失败：', err.message);
  process.exit(1);
});
