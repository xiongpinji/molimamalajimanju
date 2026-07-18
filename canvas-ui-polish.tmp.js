const fs = require('fs')
const path = require('path')

const root = 'C:/Users/canqu/Documents/茉莉妈妈2/research/libtv-open-source-audit/repos/LocalMiniDrama/frontweb'

function replaceOnce(fileName, from, to) {
  const file = path.join(root, fileName)
  let source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
  const count = source.split(from).length - 1
  if (count !== 1) throw new Error(`${fileName}: marker count ${count}: ${from.slice(0, 100)}`)
  source = source.replace(from, to)
  fs.writeFileSync(file, source)
}

replaceOnce(
  'src/views/DramaCanvas.vue',
  '  focusedNodeId,\n  drama,\n  imagesBySbId,',
  '  focusedNodeId,\n  currentViewport,\n  drama,\n  imagesBySbId,'
)

replaceOnce(
  'src/views/DramaCanvas.vue',
  '\n</style>\n\n<style>\nhtml.light .drama-canvas-page { background: var(--bg-page); }',
  `
/* LibTV 风格画布工作区覆盖层 */
.header.canvas-topbar {
  position: absolute;
  inset: 0 0 auto;
  z-index: 30;
  border-bottom: 0;
  background: transparent;
  pointer-events: none;
}
.canvas-topbar .header-inner {
  margin: 12px 16px 0;
  padding: 8px 10px;
  flex-wrap: nowrap;
  border: 1px solid rgba(82, 82, 91, 0.7);
  border-radius: 16px;
  background: rgba(24, 24, 27, 0.82);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(18px);
  pointer-events: auto;
}
.workspace-switcher { min-width: 156px; }
.canvas-name {
  padding-left: 12px;
  border-left: 1px solid #3f3f46;
  color: #a1a1aa;
  font-size: 12px;
  white-space: nowrap;
}
.canvas-topbar .header-actions { gap: 6px; }
.canvas-topbar .header-action-optional { display: none; }
.canvas-topbar .topbar-workflow-toggle { min-width: 92px; }
.canvas-topbar .el-button { min-height: 38px; }
.canvas-topbar .workflow-bar,
.canvas-topbar .generate-bar,
.canvas-topbar .workflow-progress { pointer-events: auto; }
.canvas-topbar .workflow-bar,
.canvas-topbar .generate-bar {
  margin: 8px 16px 0;
  padding: 10px 14px;
  border: 1px solid rgba(82, 82, 91, 0.65);
  border-radius: 14px;
  background: rgba(24, 24, 27, 0.92);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(18px);
}
.canvas-topbar .workflow-progress {
  margin: 8px 16px 0;
  padding: 7px 12px;
  border-radius: 10px;
  background: rgba(24, 24, 27, 0.86);
}
.canvas-shell { position: relative; width: 100%; }
.canvas-sidebar {
  position: absolute;
  top: 82px;
  left: 16px;
  bottom: 16px;
  z-index: 20;
  width: 248px;
  border: 1px solid rgba(82, 82, 91, 0.72);
  border-radius: 16px;
  background: rgba(24, 24, 27, 0.9);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.38);
  backdrop-filter: blur(18px);
}
.canvas-main { width: 100%; height: 100%; }
.vue-flow-canvas { background: #101014; }
.canvas-topbar .layout-status { font-size: 11px; white-space: nowrap; }
@media (max-width: 980px) {
  .canvas-topbar .header-inner { margin: 8px 10px 0; }
  .canvas-topbar .btn-theme { display: none; }
  .page-title { max-width: 160px; }
}
@media (max-width: 680px) {
  .canvas-topbar .header-inner { padding: 7px 8px; }
  .workspace-switcher { min-width: 0; }
  .brand-copy, .breadcrumb-sep, .canvas-name, .layout-status { display: none; }
  .brand-logo { width: 34px; height: 34px; }
  .page-title { max-width: 120px; }
  .episode-select { width: 112px !important; }
  .canvas-sidebar { top: 70px; left: 8px; right: 8px; width: auto; }
}
@media (prefers-reduced-motion: reduce) {
  .canvas-topbar .header-inner { transition: none; }
}
</style>

<style>
html.light .drama-canvas-page { background: var(--bg-page); }`)

replaceOnce(
  'src/components/dramaCanvas/CanvasFloatingToolbar.vue',
  'const zoomLabel = computed(() => {\n  const zoom = Number(ctx?.getViewport?.()?.zoom || 0.75)',
  'const zoomLabel = computed(() => {\n  const zoom = Number(ctx?.currentViewport?.value?.zoom || 0.75)'
)
