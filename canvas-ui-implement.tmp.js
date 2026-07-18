const fs = require('fs')
const path = require('path')

const root = 'C:/Users/canqu/Documents/茉莉妈妈2/research/libtv-open-source-audit/repos/LocalMiniDrama/frontweb'

function update(fileName, edits) {
  const file = path.join(root, fileName)
  let source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
  for (const [from, to] of edits) {
    const count = source.split(from).length - 1
    if (count !== 1) throw new Error(`${fileName}: expected one marker, found ${count}: ${from.slice(0, 80)}`)
    source = source.replace(from, to)
  }
  fs.writeFileSync(file, source)
}

update('src/views/DramaCanvas.vue', [
  ['<header class="header">', '<header class="header canvas-topbar" :class="{ \'workflow-open\': showWorkflowPanel }">'],
  ['<h1 class="logo" @click="router.push(\'/\')">', '<div class="logo workspace-switcher" role="button" tabindex="0" @click="router.push(\'/\')" @keydown.enter="router.push(\'/\')">'],
  ['</h1>\n        <span class="breadcrumb-sep">', '</div>\n        <span class="breadcrumb-sep">'],
  ['<span class="page-title">{{ drama?.title || \'加载中…\' }}</span>', '<span class="page-title">{{ drama?.title || \'加载中…\' }}</span>\n        <span class="canvas-name">画布 1</span>'],
  ['<div class="header-actions">\n          <el-button size="small" type="warning" plain @click="focusScriptNode">', '<div class="header-actions">\n          <el-button class="topbar-workflow-toggle" size="small" :type="showWorkflowPanel ? \'primary\' : \'default\'" plain @click="toggleWorkflowPanel">\n            <el-icon><Operation /></el-icon>\n            工作流\n          </el-button>\n          <el-button class="header-action-optional" size="small" type="warning" plain @click="focusScriptNode">'],
  ['<el-button size="small" @click="openCreateDialog(\'storyboard\')">', '<el-button class="header-action-optional" size="small" @click="openCreateDialog(\'storyboard\')">'],
  ['<el-button size="small" @click="openCreateDialog(\'character\')">角色</el-button>', '<el-button class="header-action-optional" size="small" @click="openCreateDialog(\'character\')">角色</el-button>'],
  ['<el-button size="small" @click="openCreateDialog(\'scene\')">场景</el-button>', '<el-button class="header-action-optional" size="small" @click="openCreateDialog(\'scene\')">场景</el-button>'],
  ['<el-button size="small" @click="openCreateDialog(\'prop\')">道具</el-button>', '<el-button class="header-action-optional" size="small" @click="openCreateDialog(\'prop\')">道具</el-button>'],
  ['<el-button size="small" @click="openCreateDialog(\'episode\')">', '<el-button class="header-action-optional" size="small" @click="openCreateDialog(\'episode\')">'],
  ['<el-button size="small" :loading="aligningNodes" @click="onAlignNodes">', '<el-button class="header-action-optional" size="small" :loading="aligningNodes" @click="onAlignNodes">'],
  ['<div class="workflow-bar">', '<div v-if="showWorkflowPanel" class="workflow-bar">'],
  ['<div v-if="workflowProgress" class="workflow-progress">{{ workflowProgress }}</div>', '<div v-if="showWorkflowPanel && workflowProgress" class="workflow-progress">{{ workflowProgress }}</div>'],
  ['<div class="generate-bar">', '<div v-if="showWorkflowPanel" class="generate-bar">'],
  ['<div v-if="episodeGenProgress" class="workflow-progress episode-gen">{{ episodeGenProgress }}</div>', '<div v-if="showWorkflowPanel && episodeGenProgress" class="workflow-progress episode-gen">{{ episodeGenProgress }}</div>'],
  ['<div v-loading="loading" class="canvas-shell">', '<div v-loading="loading" class="canvas-shell" :class="{ \'sidebar-open\': sidebarVisible }">'],
  ['<aside v-if="drama" class="canvas-sidebar">', '<aside v-if="drama && sidebarVisible" class="canvas-sidebar">'],
  ["import { List, Moon, Plus, Sunny, Grid } from '@element-plus/icons-vue'", "import { List, Moon, Plus, Sunny, Grid, Operation } from '@element-plus/icons-vue'"],
  ['const focusedNodeId = ref(null)\nconst canvasMainRef = ref(null)', 'const focusedNodeId = ref(null)\nconst sidebarVisible = ref(false)\nconst showWorkflowPanel = ref(false)\nconst canvasMainRef = ref(null)'],
  ['function onViewportChange(viewport) {\n  currentViewport.value = { x: viewport.x, y: viewport.y, zoom: viewport.zoom }\n}', `function onViewportChange(viewport) {
  currentViewport.value = { x: viewport.x, y: viewport.y, zoom: viewport.zoom }
}

function toggleSidebar() {
  sidebarVisible.value = !sidebarVisible.value
}

function toggleWorkflowPanel() {
  showWorkflowPanel.value = !showWorkflowPanel.value
}

async function fitCanvasView() {
  const api = canvasFlowApi.value
  if (!api?.fitView) return
  await api.fitView({ padding: 0.14, duration: 250, includeHiddenNodes: false })
  const viewport = api.getViewport?.()
  if (viewport) currentViewport.value = { x: viewport.x, y: viewport.y, zoom: viewport.zoom }
}

function showCanvasHelp() {
  ElMessage.info('快捷键：空格拖动画布，Ctrl/⌘ + 滚轮缩放，双击节点打开编辑')
}`],
  ['  registerCanvasFlowApi: (api) => {\n    canvasFlowApi.value = api\n  },', `  registerCanvasFlowApi: (api) => {
    canvasFlowApi.value = api
  },
  sidebarVisible,
  showWorkflowPanel,
  toggleSidebar,
  toggleWorkflowPanel,
  focusScript: focusScriptNode,
  goListMode,
  toggleTheme,
  alignNodes: onAlignNodes,
  fitCanvasView,
  zoomIn: () => canvasFlowApi.value?.zoomIn?.({ duration: 180 }),
  zoomOut: () => canvasFlowApi.value?.zoomOut?.({ duration: 180 }),
  showCanvasHelp,`],
])

update('src/components/dramaCanvas/CanvasFlowAligner.vue', [
  ['const { fitView, getViewport } = useVueFlow()', 'const { fitView, getViewport, zoomIn, zoomOut } = useVueFlow()'],
  ['ctx?.registerCanvasFlowApi?.({ fitView, getViewport })', 'ctx?.registerCanvasFlowApi?.({ fitView, getViewport, zoomIn, zoomOut })'],
])

update('src/components/dramaCanvas/CanvasFloatingToolbar.vue', [
  ['<template>\n  <div class="canvas-floating-toolbar nodrag nopan">\n    <span class="toolbar-label">快速新建</span>\n    <el-button size="small" @click="create(\'storyboard\')">分镜</el-button>\n    <el-button size="small" @click="create(\'character\')">角色</el-button>\n    <el-button size="small" @click="create(\'scene\')">场景</el-button>\n    <el-button size="small" @click="create(\'prop\')">道具</el-button>\n    <el-button size="small" @click="create(\'episode\')">集</el-button>\n  </div>\n</template>\n\n<script setup>\nimport { useCanvasContext } from \'@/composables/useCanvasContext\'\n\nconst ctx = useCanvasContext()\n\nfunction create(type) {\n  ctx?.openCreateDialog?.(type)\n}\n</script>\n\n<style scoped>\n.canvas-floating-toolbar {\n  position: absolute;\n  left: 12px;\n  bottom: 12px;\n  z-index: 10;\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  padding: 8px 12px;\n  border-radius: 10px;\n  border: 1px solid #3f3f46;\n  background: rgba(24, 24, 27, 0.94);\n  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);\n  flex-wrap: wrap;\n  max-width: calc(100% - 24px);\n}\n.toolbar-label {\n  font-size: 11px;\n  color: #71717a;\n  margin-right: 4px;\n  white-space: nowrap;\n}\n</style>', `<template>
  <div class="canvas-floating-toolbar nodrag nopan" @mousedown.stop>
    <div v-if="addMenuVisible" class="canvas-add-menu" role="menu">
      <div class="add-menu-title">添加节点</div>
      <button v-for="item in addItems" :key="item.type" type="button" class="add-menu-item" role="menuitem" @click="create(item.type)">
        <el-icon><component :is="item.icon" /></el-icon>
        <span>{{ item.label }}</span>
        <small>{{ item.hint }}</small>
      </button>
    </div>

    <div class="toolbar-main">
      <button type="button" class="toolbar-primary" :aria-expanded="addMenuVisible" aria-label="添加节点" title="添加节点" @click="toggleAddMenu">
        <el-icon><Plus /></el-icon>
      </button>
      <span class="toolbar-divider" aria-hidden="true" />
      <button type="button" class="toolbar-button" :class="{ active: workflowOpen }" aria-label="打开工作流面板" title="工作流" @click="toggleWorkflow">
        <el-icon><Operation /></el-icon><span>工作流</span>
      </button>
      <button type="button" class="toolbar-button" :class="{ active: sidebarOpen }" aria-label="打开素材库" title="素材库" @click="toggleSidebar">
        <el-icon><FolderOpened /></el-icon><span>素材库</span>
      </button>
      <button type="button" class="toolbar-button" aria-label="打开剧本节点" title="剧本" @click="focusScript">
        <el-icon><Document /></el-icon><span>剧本</span>
      </button>
      <button type="button" class="toolbar-button" aria-label="整理画布节点" title="整理节点" @click="alignNodes">
        <el-icon><Grid /></el-icon><span>整理</span>
      </button>
      <span class="toolbar-divider" aria-hidden="true" />
      <button type="button" class="toolbar-icon" aria-label="画布帮助" title="帮助" @click="showHelp">
        <el-icon><QuestionFilled /></el-icon>
      </button>
      <button type="button" class="toolbar-icon" aria-label="返回列表模式" title="列表模式" @click="goList">
        <el-icon><List /></el-icon>
      </button>
      <span class="toolbar-divider toolbar-divider-spacer" aria-hidden="true" />
      <button type="button" class="toolbar-icon" aria-label="缩小画布" title="缩小" @click="zoomOut">
        <el-icon><ZoomOut /></el-icon>
      </button>
      <span class="zoom-label" aria-live="polite">{{ zoomLabel }}</span>
      <button type="button" class="toolbar-icon" aria-label="放大画布" title="放大" @click="zoomIn">
        <el-icon><ZoomIn /></el-icon>
      </button>
      <button type="button" class="toolbar-icon" aria-label="适配画布" title="适配视图" @click="fitView">
        <el-icon><FullScreen /></el-icon>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Document, FolderOpened, FullScreen, Grid, List, Operation, Plus, QuestionFilled, ZoomIn, ZoomOut } from '@element-plus/icons-vue'
import { useCanvasContext } from '@/composables/useCanvasContext'

const ctx = useCanvasContext()
const addMenuVisible = ref(false)

const addItems = [
  { type: 'storyboard', label: '分镜', hint: '镜头与首尾帧', icon: Document },
  { type: 'character', label: '角色', hint: '角色设定', icon: FolderOpened },
  { type: 'scene', label: '场景', hint: '空间与氛围', icon: FullScreen },
  { type: 'prop', label: '道具', hint: '关键物件', icon: Operation },
  { type: 'episode', label: '新集', hint: '从剧本开始', icon: List },
]

const workflowOpen = computed(() => Boolean(ctx?.showWorkflowPanel?.value))
const sidebarOpen = computed(() => Boolean(ctx?.sidebarVisible?.value))
const zoomLabel = computed(() => {
  const zoom = Number(ctx?.getViewport?.()?.zoom || 0.75)
  return String(Math.round(zoom * 100)) + '%'
})

function toggleAddMenu() {
  addMenuVisible.value = !addMenuVisible.value
}

function create(type) {
  addMenuVisible.value = false
  ctx?.openCreateDialog?.(type)
}

function toggleWorkflow() { ctx?.toggleWorkflowPanel?.() }
function toggleSidebar() { ctx?.toggleSidebar?.() }
function focusScript() { ctx?.focusScript?.() }
function alignNodes() { ctx?.alignNodes?.() }
function showHelp() { ctx?.showCanvasHelp?.() }
function goList() { ctx?.goListMode?.() }
function zoomIn() { ctx?.zoomIn?.() }
function zoomOut() { ctx?.zoomOut?.() }
function fitView() { ctx?.fitCanvasView?.() }
</script>

<style scoped>
.canvas-floating-toolbar {
  position: absolute;
  left: 50%;
  bottom: 18px;
  z-index: 25;
  transform: translateX(-50%);
  max-width: calc(100% - 28px);
}
.toolbar-main {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 54px;
  padding: 6px 10px;
  border: 1px solid rgba(82, 82, 91, 0.72);
  border-radius: 17px;
  background: rgba(24, 24, 27, 0.92);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(18px);
}
button {
  font: inherit;
  color: #d4d4d8;
}
.toolbar-primary,
.toolbar-button,
.toolbar-icon {
  min-width: 44px;
  min-height: 44px;
  border: 0;
  border-radius: 11px;
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  transition: background 180ms ease, color 180ms ease, transform 180ms ease;
}
.toolbar-primary {
  width: 48px;
  background: #f4f4f5;
  color: #18181b;
  font-size: 22px;
}
.toolbar-button { padding: 0 11px; font-size: 12px; }
.toolbar-icon { width: 44px; font-size: 18px; }
.toolbar-button:hover,
.toolbar-icon:hover { background: rgba(129, 140, 248, 0.16); color: #c7d2fe; }
.toolbar-button.active { background: rgba(129, 140, 248, 0.2); color: #c4b5fd; }
.toolbar-primary:hover { transform: scale(1.03); background: #ffffff; }
.toolbar-divider { width: 1px; height: 24px; margin: 0 4px; background: #3f3f46; }
.toolbar-divider-spacer { margin-left: 8px; }
.zoom-label { width: 42px; color: #a1a1aa; font-size: 11px; text-align: center; font-variant-numeric: tabular-nums; }
.canvas-add-menu {
  position: absolute;
  left: 0;
  bottom: 66px;
  width: 236px;
  padding: 8px;
  border: 1px solid #3f3f46;
  border-radius: 14px;
  background: rgba(24, 24, 27, 0.97);
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.45);
}
.add-menu-title { padding: 4px 8px 7px; color: #71717a; font-size: 11px; }
.add-menu-item {
  width: 100%;
  min-height: 44px;
  display: grid;
  grid-template-columns: 26px 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.add-menu-item:hover { background: rgba(129, 140, 248, 0.14); }
.add-menu-item span { font-size: 13px; color: #e4e4e7; }
.add-menu-item small { color: #71717a; font-size: 10px; }
@media (max-width: 760px) {
  .toolbar-button span { display: none; }
  .toolbar-button { width: 44px; padding: 0; }
  .toolbar-divider-spacer, .zoom-label { display: none; }
  .toolbar-main { gap: 2px; }
}
@media (prefers-reduced-motion: reduce) {
  .toolbar-primary, .toolbar-button, .toolbar-icon { transition: none; }
}
</style>`],
])
