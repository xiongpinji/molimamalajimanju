const fs = require('fs')
const path = require('path')
const root = 'C:/Users/canqu/Documents/茉莉妈妈2/research/libtv-open-source-audit/repos/LocalMiniDrama/frontweb'

function replaceOnce(fileName, from, to) {
  const file = path.join(root, fileName)
  let source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
  const count = source.split(from).length - 1
  if (count !== 1) throw new Error(`${fileName}: marker count ${count}`)
  fs.writeFileSync(file, source.replace(from, to))
}

replaceOnce(
  'src/views/DramaCanvas.vue',
  "import { List, Moon, Plus, Sunny, Grid, Operation } from '@element-plus/icons-vue'",
  "import { List, Moon, Plus, Sunny, Grid, Operation, Share } from '@element-plus/icons-vue'"
)
replaceOnce(
  'src/views/DramaCanvas.vue',
  '<div class="header-actions">\n          <el-button class="topbar-workflow-toggle"',
  '<div class="header-actions">\n          <el-button class="topbar-share" size="small" circle aria-label="分享画布" title="复制画布链接" @click="shareCanvas">\n            <el-icon><Share /></el-icon>\n          </el-button>\n          <el-button class="topbar-workflow-toggle"'
)
replaceOnce(
  'src/views/DramaCanvas.vue',
  'function toggleWorkflowPanel() {\n  showWorkflowPanel.value = !showWorkflowPanel.value\n}\n\nasync function fitCanvasView()',
  `function toggleWorkflowPanel() {
  showWorkflowPanel.value = !showWorkflowPanel.value
}

async function shareCanvas() {
  const url = window.location.href
  try {
    await navigator.clipboard.writeText(url)
    ElMessage.success('画布链接已复制')
  } catch {
    ElMessage.info(url)
  }
}

async function fitCanvasView()`
)
replaceOnce(
  'src/views/DramaCanvas.vue',
  '.canvas-topbar .topbar-workflow-toggle { min-width: 92px; }',
  '.canvas-topbar .topbar-workflow-toggle { min-width: 92px; }\n.canvas-topbar .topbar-share { width: 38px; padding: 0; }'
)
