'use strict';

/** 共享 HTTP 层：认证、JSON/Form 请求、统一错误处理 */

const { config, requireApiKey } = require('../../config');

/** 解析响应并统一抛错（HTTP 错误 或 HTTP 200 但 body 带 error 两种形态） */
async function parseResponse(resp) {
  const text = await resp.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`API 返回非 JSON（HTTP ${resp.status}）：${text.slice(0, 200)}`);
  }
  const apiError = data && data.error && data.error.message;
  if (!resp.ok || apiError) {
    const err = new Error(`API 请求失败（HTTP ${resp.status}）：${apiError || data.message || text.slice(0, 200)}`);
    err.status = resp.status;
    err.body = data;
    throw err;
  }
  return data;
}

/** JSON 请求（GET/POST/PUT） */
async function requestJson(apiPath, { method = 'GET', body, query } = {}) {
  const url = new URL(config.baseUrl + apiPath);
  if (query) {
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  }
  const resp = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${requireApiKey()}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return parseResponse(resp);
}

/**
 * multipart/form-data 请求。
 * 注意：绝不能手动设置 Content-Type，fetch 会自动带 boundary；
 * 手动设置或手拼 body 会导致网关 500 failed to parse multipart form。
 */
async function requestForm(apiPath, formData, { method = 'POST' } = {}) {
  const resp = await fetch(config.baseUrl + apiPath, {
    method,
    headers: { Authorization: `Bearer ${requireApiKey()}` },
    body: formData,
  });
  return parseResponse(resp);
}

module.exports = { requestJson, requestForm };
