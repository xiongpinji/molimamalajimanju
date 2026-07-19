'use strict';

/**
 * GPT-Image-2 图像示例：1K 同步文生图 / 图生图 / 2K-4K 异步高清。
 * 运行：node --env-file=.env examples/image-gen.js [参考图路径(可选)]
 */

const path = require('node:path');
const { generateImageNow, editImageNow, generateImageHD } = require('../src/services/deepwl');

async function main() {
  const outDir = path.join(__dirname, '..', 'output', 'images');
  const refImage = process.argv[2];

  // 1. 同步文生图（1K，约 30-40s）
  console.log('--- 1K 同步文生图 ---');
  const sync = await generateImageNow({
    model: 'gpt-image-2',
    prompt: '一只橘猫趴在窗台上晒太阳，水彩画风格',
    size: '1024x1024',
    quality: 'high',
    response_format: 'url',
    outputDir: outDir,
  });
  console.log('✅', sync.images[0].localPath || sync.images[0].url);

  // 2. 图生图（传入参考图时执行）
  if (refImage) {
    console.log('--- 图生图 ---');
    const edited = await editImageNow({
      imagePath: refImage,
      prompt: '把背景改成海边日落',
      outputDir: outDir,
    });
    console.log('✅', edited.images[0].localPath || edited.images[0].url);
  }

  // 3. 2K 异步高清（提交→轮询→取图，video_url 字段是图片）
  console.log('--- 2K 异步高清 ---');
  const hd = await generateImageHD({
    model: 'gpt-image-2-2k',
    prompt: '一只橘猫坐在窗台上，产品摄影级',
    aspect_ratio: '1:1',
    outputDir: outDir,
    onProgress: (info) => console.log(`  ${info.status} ${info.progress ?? ''}`),
  });
  console.log('✅', hd.localPath || hd.imageUrl);
}

main().catch((err) => {
  console.error('❌ 失败：', err.message);
  process.exit(1);
});
