'use strict';

/**
 * 图生视频示例：本地图片 → 预签名上传 → 拿公网 URL → 提交图生视频任务。
 * 运行：node --env-file=.env examples/image2video.js [图片路径]
 */

const path = require('node:path');
const { generateVideo, uploadFile } = require('../src/services/deepwl');

async function main() {
  const imagePath = process.argv[2];
  if (!imagePath) {
    console.error('用法：node examples/image2video.js <图片路径>');
    process.exit(1);
  }

  console.log('上传参考图...');
  const imageUrl = await uploadFile(imagePath);
  console.log('图片地址:', imageUrl);

  const result = await generateVideo({
    endpoint: 'openai',
    model: 'kling-2.5-720p',
    prompt: '@img1 中的人物自然转身，头发和衣摆轻微摆动',
    images: [imageUrl],
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
  console.log('本地文件:', result.localPath);
}

main().catch((err) => {
  console.error('❌ 失败：', err.message);
  process.exit(1);
});
