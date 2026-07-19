'use strict';

/**
 * Grok Chat 视频：`POST /v1/chat/completions` + `video_config`。
 * 支持 stream:true 推送「视频正在生成 NN%」进度。
 * 结果以 markdown（![image](url)）或纯链接形式出现在最终 content 中。
 */
const { config, requireApiKey } = require('../../config');

const VALID_VIDEO_SIZES = ['720x1280', '1280x720', '960x960'];

/** 从文本中提取全部 URL，并按内容粗分类 */
function extractMediaUrls(text) {
  const urls = text.match(/https?:\/\/[^\s)\]>"']+/g) || [];
  const videoUrl = urls.find((u) => /\.mp4(\?|\/|$)/i.test(u) || /\/videos?\//i.test(u)) || null;
  const imageUrl = urls.find((u) => /\.(png|jpe?g|webp|gif)(\?|\/|$)/i.test(u) || /images?\//i.test(u)) || null;
  return { urls, videoUrl, imageUrl, mediaUrl: videoUrl || imageUrl || urls[0] || null };
}

/**
 * 提交 Grok Chat 视频/图像生成。
 * @param {object} opts
 * @param {string} [opts.model] 默认 grok-imagine-video（deepwl 上可用 grok-1.5-video-10s 等）
 * @param {string} opts.prompt 提示词（≤4500 字符）
 * @param {string[]} [opts.imageUrls] 参考图（≤7 张，prompt 里可用 @IMAGE1..@IMAGE7）
 * @param {number} [opts.seconds] 6 / 10 / 12 / 16 / 20
 * @param {string} [opts.size] 720x1280 / 1280x720 / 960x960
 * @param {boolean} [opts.public_url] 建议 true，返回完整下载链接
 * @param {boolean} [opts.stream] 默认 true，推送生成进度
 * @param {(event: {type:string, text:string}) => void} [opts.onEvent] 流式事件回调（reasoning/content/progress）
 * @returns {Promise<{content:string, reasoning:string, urls:string[], videoUrl:string|null, imageUrl:string|null, mediaUrl:string|null}>}
 */
async function chatVideo({
  model = 'grok-imagine-video',
  prompt,
  imageUrls = [],
  seconds = 10,
  size = '1280x720',
  public_url = true,
  stream = true,
  onEvent,
} = {}) {
  if (!prompt) throw new Error('prompt 不能为空');
  if (!VALID_VIDEO_SIZES.includes(size)) {
    throw new Error(`size 仅支持 ${VALID_VIDEO_SIZES.join('/')}`);
  }
  if (imageUrls.length > 7) throw new Error(`参考图最多 7 张，当前 ${imageUrls.length} 张`);

  // 组装 messages：有参考图时 content 用数组形态
  const content = imageUrls.length
    ? [{ type: 'text', text: prompt }, ...imageUrls.map((url) => ({ type: 'image_url', image_url: { url } }))]
    : prompt;

  const body = {
    model,
    stream,
    messages: [{ role: 'user', content }],
    video_config: { seconds, size, public_url },
  };

  const resp = await fetch(config.baseUrl + '/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${requireApiKey()}`,
      'Content-Type': 'application/json',
      Accept: stream ? 'text/event-stream' : 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Chat 视频请求失败（HTTP ${resp.status}）：${text.slice(0, 300)}`);
  }

  if (!stream) {
    const text = await resp.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Chat 视频返回非 JSON（HTTP ${resp.status}）：${text.slice(0, 200)}`);
    }
    if (data.error) throw new Error(`Chat 视频返回错误：${data.error.message || JSON.stringify(data.error)}`);
    const message = (data.choices && data.choices[0] && data.choices[0].message) || {};
    return {
      content: message.content || '',
      reasoning: message.reasoning_content || '',
      ...extractMediaUrls(message.content || ''),
    };
  }

  return consumeSseStream(resp, onEvent);
}

/** 解析 SSE 流，累积 reasoning/content，回调进度事件 */
async function consumeSseStream(resp, onEvent) {
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let reasoning = '';

  const handleChunk = (json) => {
    const delta = json.choices && json.choices[0] && json.choices[0].delta;
    if (!delta) return;
    if (delta.reasoning_content) {
      reasoning += delta.reasoning_content;
      if (onEvent) onEvent({ type: 'reasoning', text: delta.reasoning_content });
    }
    if (delta.content) {
      content += delta.content;
      if (onEvent) {
        onEvent({ type: 'content', text: delta.content });
        const m = delta.content.match(/(\d{1,3})\s*%/);
        if (m) onEvent({ type: 'progress', text: m[0] });
      }
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE 事件以 \n\n 分隔，data: 前缀
    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const eventRaw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of eventRaw.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') continue;
        try {
          handleChunk(JSON.parse(payload));
        } catch {
          // 忽略无法解析的心跳/注释块
        }
      }
    }
  }

  return { content, reasoning, ...extractMediaUrls(content) };
}

module.exports = { chatVideo, extractMediaUrls, VALID_VIDEO_SIZES };
