'use strict';

/**
 * Grok Chat 视频示例（chat/completions + video_config，流式进度）。
 * 运行：node --env-file=.env examples/grok-chat-video.js
 */

const path = require('node:path');
const { generateGrokChatVideo } = require('../src/services/deepwl');

async function main() {
  const result = await generateGrokChatVideo({
    model: 'grok-1.5-video-10s', // 或 grok-imagine-video / grok-imagine-video-cli
    prompt: 'A cute orange cat wearing headphones, nodding to music, rain outside the window, cinematic lighting',
    // imageUrls: ['https://your-cdn.com/ref.jpg'], // 图生视频（≤7 张，@IMAGE1 引用）
    seconds: 10,          // 6 / 10 / 12 / 16 / 20
    size: '1280x720',     // 720x1280 / 1280x720 / 960x960
    public_url: true,
    stream: true,
    onEvent: (e) => {
      if (e.type === 'progress') process.stdout.write(`\r进度 ${e.text}   `);
    },
    outputDir: path.join(__dirname, '..', 'output', 'videos'),
  });

  console.log('\n\n✅ 完成');
  console.log('媒体地址:', result.mediaUrl);
  console.log('本地文件:', result.localPath);
  if (!result.mediaUrl) {
    console.log('返回内容:', result.content.slice(0, 300));
  }
}

main().catch((err) => {
  console.error('❌ 失败：', err.message);
  process.exit(1);
});
