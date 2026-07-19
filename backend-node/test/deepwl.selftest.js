'use strict';

/**
 * deepwl 平台客户端自测：本地 mock 服务器，无需真实 Key、不访问外网。
 * 运行：node test/deepwl.selftest.js
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert');

const FAKE_MP4 = Buffer.from('fake-mp4-content-for-selftest');
const FAKE_PNG = Buffer.from('fake-png-bytes');

const state = {
  queryCount: 0,
  uploadedBody: null,
  lastCreateBody: null,
  lastOpenaiBody: null,
  lastRemixBody: null,
  editsContentType: null,
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const port = () => server.address().port;

  const readBody = (cb) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => cb(Buffer.concat(chunks)));
  };
  const json = (code, obj) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
  };

  // 媒体/OSS 路由走预签名，无需 Bearer（与真实行为一致）
  const publicPaths = ['/media/', '/public/', '/oss-put'];
  if (!publicPaths.some((p) => url.pathname.startsWith(p))
      && req.headers.authorization !== 'Bearer test-key') {
    return json(401, { error: { message: 'Invalid API key provided', code: 'invalid_api_key' } });
  }

  if (req.method === 'POST' && url.pathname === '/v1/video/create') {
    return readBody((buf) => {
      state.lastCreateBody = JSON.parse(buf.toString());
      json(200, { id: 'grok:mock-task-1', status: 'processing', status_update_time: Date.now() });
    });
  }

  if (req.method === 'GET' && url.pathname === '/v1/video/query') {
    const id = url.searchParams.get('id');
    if (id === 'grok:will-fail') {
      return json(200, { id, status: 'failed', error: { message: 'Content policy violation' } });
    }
    if (id === 'task_kling-style') {
      return json(200, { id, status: 'completed', progress: 100, metadata: { url: `http://127.0.0.1:${port()}/media/fake.mp4` } });
    }
    if (id === 'task_omni-style') {
      return json(200, { id, status: 'completed', progress: 100, data: [{ url: `/v1/videos/${id}/content` }] });
    }
    if (id === 'task_img-hd') {
      return json(200, { id, status: 'completed', progress: 100, video_url: `http://127.0.0.1:${port()}/media/fake.png` });
    }
    state.queryCount += 1;
    if (state.queryCount < 3) {
      return json(200, { id, status: 'processing', progress: state.queryCount * 30, video_url: null });
    }
    return json(200, { id, status: 'completed', progress: 100, video_url: `http://127.0.0.1:${port()}/media/fake.mp4` });
  }

  if (req.method === 'POST' && url.pathname === '/v1/videos') {
    return readBody((buf) => {
      state.lastOpenaiBody = JSON.parse(buf.toString());
      const model = state.lastOpenaiBody.model || '';
      const id = model.includes('image') ? 'task_img-hd' : 'task_openai-1';
      json(200, { id, task_id: id, object: 'video', status: 'queued', progress: 0 });
    });
  }

  if (req.method === 'GET' && url.pathname.startsWith('/v1/videos/')) {
    const id = decodeURIComponent(url.pathname.slice('/v1/videos/'.length));
    if (id === 'task_img-hd') {
      return json(200, { id, status: 'completed', progress: 100, video_url: `http://127.0.0.1:${port()}/media/fake.png` });
    }
    return json(404, { error: { message: 'Invalid URL (GET /v1/videos/{id})' } });
  }

  if (req.method === 'POST' && url.pathname === '/v1/video/remix') {
    return readBody((buf) => {
      state.lastRemixBody = JSON.parse(buf.toString());
      json(200, { id: 'grok:mock-remix-1', status: 'processing', status_update_time: Date.now() });
    });
  }

  if (req.method === 'PUT' && url.pathname === '/v1/file/upload') {
    return json(200, {
      upload_url: `http://127.0.0.1:${port()}/oss-put?signature=abc`,
      download_url: `http://127.0.0.1:${port()}/public/test.png`,
      method: 'PUT',
      expire: 900,
    });
  }

  if (req.method === 'PUT' && url.pathname === '/oss-put') {
    return readBody((buf) => {
      state.uploadedBody = buf;
      res.writeHead(200).end();
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/usage/token/') {
    return json(200, { code: true, message: 'ok', data: { total_granted: 100, total_used: 25, total_available: 75 } });
  }

  if (req.method === 'POST' && url.pathname === '/v1/images/generations') {
    return readBody((buf) => {
      state.lastImageBody = JSON.parse(buf.toString());
      json(200, { created: 1, data: [{ url: `http://127.0.0.1:${port()}/media/fake.png` }] });
    });
  }

  if (req.method === 'POST' && url.pathname === '/v1/images/edits') {
    state.editsContentType = req.headers['content-type'] || '';
    return readBody(() => {
      json(200, { created: 1, data: [{ url: `http://127.0.0.1:${port()}/media/fake.png` }] });
    });
  }

  if (req.method === 'POST' && url.pathname === '/v1/chat/completions') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    const chunk = (delta) => `data: ${JSON.stringify({ choices: [{ delta }] })}\n\n`;
    res.write(chunk({ role: 'assistant', reasoning_content: 'Thinking\n' }));
    res.write(chunk({ content: '视频正在生成 45%\n' }));
    setTimeout(() => {
      res.write(chunk({ content: `完成！![video](http://127.0.0.1:${port()}/media/fake.mp4)` }));
      res.write('data: [DONE]\n\n');
      res.end();
    }, 50);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/media/fake.mp4') {
    res.writeHead(200, { 'Content-Type': 'video/mp4' });
    return res.end(FAKE_MP4);
  }

  if (req.method === 'GET' && url.pathname === '/media/fake.png') {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    return res.end(FAKE_PNG);
  }

  json(404, { error: { message: 'not found' } });
});

async function main() {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  process.env.DEEPWL_API_KEY = 'test-key';
  process.env.DEEPWL_BASE_URL = `http://127.0.0.1:${port}`;

  const api = require('../src/services/deepwl');
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deepwl-selftest-'));
  const progressLog = [];

  // 1. 视频一站式：提交 → 轮询 → 下载
  const result = await api.generateVideo({
    prompt: '自测文生视频', images: [], aspect_ratio: '3:2', size: '720P', duration: 6,
    outputDir, poll: { intervalMs: 30 },
    onProgress: (info) => progressLog.push(info.status),
  });
  assert.strictEqual(result.taskId, 'grok:mock-task-1');
  assert.deepStrictEqual(fs.readFileSync(result.localPath), FAKE_MP4);
  assert.ok(!path.basename(result.localPath).includes(':'));
  assert.deepStrictEqual(progressLog, ['processing', 'processing', 'completed']);
  assert.strictEqual(state.lastCreateBody.model, 'grok-video-3');
  console.log('✅ 1. 视频 提交→轮询→下载');

  // 2. OpenAI 格式 + omni 字段透传
  await api.createVideo({
    endpoint: 'openai', model: 'omni-fast-v2v', prompt: '自测', duration: 10,
    image_url: 'https://x/ref.jpg', first_image_url: 'https://x/f.jpg', last_image_url: 'https://x/l.jpg',
    video_url: 'https://x/a.mp4', videos: ['https://x/a.mp4', 'https://x/b.mp4'],
  });
  const ob = state.lastOpenaiBody;
  assert.strictEqual(ob.seconds, '10');
  assert.strictEqual(ob.image_url, 'https://x/ref.jpg');
  assert.strictEqual(ob.first_image_url, 'https://x/f.jpg');
  assert.strictEqual(ob.last_image_url, 'https://x/l.jpg');
  assert.strictEqual(ob.video_url, 'https://x/a.mp4');
  assert.deepStrictEqual(ob.videos, ['https://x/a.mp4', 'https://x/b.mp4']);
  console.log('✅ 2. OpenAI 格式 + omni 字段透传');

  // 3. remix
  const remix = await api.remixVideo('grok:mock-task-1', { prompt: '变体', aspect_ratio: '3:2', size: '1080P' });
  assert.strictEqual(remix.id, 'grok:mock-remix-1');
  assert.strictEqual(state.lastRemixBody.task_id, 'grok:mock-task-1');
  console.log('✅ 3. remix');

  // 4. 预签名上传
  const tmpPng = path.join(outputDir, 'ref.png');
  fs.writeFileSync(tmpPng, FAKE_PNG);
  const downloadUrl = await api.uploadFile(tmpPng);
  assert.ok(downloadUrl.includes('/public/test.png'));
  assert.deepStrictEqual(state.uploadedBody, FAKE_PNG);
  console.log('✅ 4. 预签名上传');

  // 5. 余额
  assert.strictEqual((await api.getBalance()).data.total_available, 75);
  console.log('✅ 5. 余额查询');

  // 6. 参数校验
  await assert.rejects(() => api.createVideo({ prompt: 'x', duration: 7 }), /duration 仅支持/);
  await assert.rejects(() => api.createVideo({ prompt: 'x', images: new Array(7).fill('u'), duration: 6 }), /最多 6 张/);
  await assert.rejects(() => api.chatVideo({ prompt: 'x', size: '999x999' }), /size 仅支持/);
  console.log('✅ 6. 参数校验');

  // 7. 任务失败分支
  await assert.rejects(
    () => api.waitForTask(api.queryTask, 'grok:will-fail', { intervalMs: 10 }),
    /Content policy violation/,
  );
  console.log('✅ 7. 失败分支');

  // 8. metadata.url 提取
  const klingStyle = await api.waitForTask(api.queryTask, 'task_kling-style', { intervalMs: 10 });
  assert.ok(api.pickResultUrl(klingStyle).includes('/media/fake.mp4'));
  console.log('✅ 8. metadata.url 提取');

  // 9. omni data[0].url 提取 + 相对路径补全
  const omniStyle = await api.waitForTask(api.queryTask, 'task_omni-style', { intervalMs: 10 });
  const omniUrl = api.pickResultUrl(omniStyle);
  assert.strictEqual(omniUrl, '/v1/videos/task_omni-style/content');
  assert.strictEqual(api.resolveUrl(omniUrl), `http://127.0.0.1:${port}/v1/videos/task_omni-style/content`);
  console.log('✅ 9. omni data[0].url + 相对路径补全');

  // 10. 同步文生图 + 下载
  const img = await api.generateImageNow({ prompt: '苹果', outputDir, filename: 'sync.png' });
  assert.strictEqual(state.lastImageBody.model, 'gpt-image-2');
  assert.strictEqual(state.lastImageBody.response_format, 'url');
  assert.deepStrictEqual(fs.readFileSync(img.images[0].localPath), FAKE_PNG);
  console.log('✅ 10. 同步文生图');

  // 11. 图生图 multipart（必须自动带 boundary，不得手动设 Content-Type）
  const edited = await api.editImageNow({ imagePath: tmpPng, prompt: '换背景', outputDir, filename: 'edit.png' });
  assert.ok(state.editsContentType.startsWith('multipart/form-data; boundary='), `Content-Type 异常: ${state.editsContentType}`);
  assert.deepStrictEqual(fs.readFileSync(edited.images[0].localPath), FAKE_PNG);
  console.log('✅ 11. 图生图 multipart');

  // 12. 高清图像异步任务（video_url 是图片）
  const hd = await api.generateImageHD({ model: 'gpt-image-2-2k', prompt: '4K苹果', outputDir, filename: 'hd.png', poll: { intervalMs: 10 } });
  assert.strictEqual(hd.taskId, 'task_img-hd');
  assert.deepStrictEqual(fs.readFileSync(hd.localPath), FAKE_PNG);
  console.log('✅ 12. 高清图像异步任务');

  // 13. Grok Chat 视频（SSE 流式：进度事件 + 媒体链接提取）
  const events = [];
  const chat = await api.chatVideo({
    prompt: '生成视频', stream: true,
    onEvent: (e) => events.push(e.type),
  });
  assert.ok(chat.content.includes('视频正在生成 45%'));
  assert.ok(chat.mediaUrl && chat.mediaUrl.includes('/media/fake.mp4'));
  assert.ok(events.includes('reasoning') && events.includes('progress'));
  console.log('✅ 13. Grok Chat 视频流式解析');

  // 14. Grok Chat 一站式（下载媒体）
  const chatFull = await api.generateGrokChatVideo({ prompt: '生成视频', outputDir, filename: 'chat.mp4' });
  assert.deepStrictEqual(fs.readFileSync(chatFull.localPath), FAKE_MP4);
  console.log('✅ 14. Grok Chat 一站式下载');

  // 15. 非流式 chat（服务端返回非 JSON 时的错误包装）
  await assert.rejects(() => api.chatVideo({ prompt: 'x', stream: false }), /非 JSON|请求失败/);
  console.log('✅ 15. 非流式错误处理');

  fs.rmSync(outputDir, { recursive: true, force: true });
  console.log('\n🎉 全部 15 项自测通过');
}

main()
  .catch((err) => {
    console.error('❌ 自测失败：', err);
    process.exitCode = 1;
  })
  .finally(() => server.close());
