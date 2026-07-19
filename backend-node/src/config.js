'use strict';

/**
 * 全局配置：从环境变量读取。
 * 可用 .env 文件配合 `node --env-file=.env` 或自行注入环境变量。
 */
const config = {
  apiKey: process.env.DEEPWL_API_KEY || '',
  baseUrl: (process.env.DEEPWL_BASE_URL || 'https://zx1.deepwl.net').replace(/\/+$/, ''),
};

function requireApiKey() {
  if (!config.apiKey) {
    throw new Error('缺少 DEEPWL_API_KEY 环境变量，请参考 backend-node/.env.example 配置');
  }
  return config.apiKey;
}

module.exports = { config, requireApiKey };
