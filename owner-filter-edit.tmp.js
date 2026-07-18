const fs = require('fs');

function replaceOnce(file, from, to) {
  const text = fs.readFileSync(file, 'utf8');
  const count = text.split(from).length - 1;
  if (count !== 1) throw new Error(`${file}: expected one match, got ${count}`);
  fs.writeFileSync(file, text.replace(from, to));
}

const root = 'C:/Users/canqu/Documents/茉莉妈妈2/research/libtv-open-source-audit/repos/LocalMiniDrama/';
const image = root + 'backend-node/src/services/imageService.js';
replaceOnce(image,
`function list(db, query) {
  let sql = 'FROM image_generations WHERE deleted_at IS NULL';
  const params = [];`,
`function list(db, query, options = {}) {
  let sql = 'FROM image_generations WHERE deleted_at IS NULL';
  const params = [];
  if (options.billingEnabled) {
    sql += ' AND user_id = ?';
    params.push(options.userId || '');
  }`);
replaceOnce(image,
`function getById(db, id) {
  const r = db.prepare('SELECT * FROM image_generations WHERE id = ? AND deleted_at IS NULL').get(Number(id));`,
`function getById(db, id, options = {}) {
  const ownerClause = options.billingEnabled ? ' AND user_id = ?' : '';
  const params = options.billingEnabled ? [Number(id), options.userId || ''] : [Number(id)];
  const r = db.prepare('SELECT * FROM image_generations WHERE id = ? AND deleted_at IS NULL' + ownerClause).get(...params);`);
replaceOnce(image,
`function deleteById(db, log, id) {
  const numId = Number(id);
  const now = new Date().toISOString();`,
`function deleteById(db, log, id, options = {}) {
  const numId = Number(id);
  const now = new Date().toISOString();
  const ownerClause = options.billingEnabled ? ' AND user_id = ?' : '';
  const ownerParams = options.billingEnabled ? [numId, options.userId || ''] : [numId];`);
replaceOnce(image,
`    const row = db.prepare('SELECT storyboard_id FROM image_generations WHERE id = ? AND deleted_at IS NULL').get(numId);`,
`    const row = db.prepare('SELECT storyboard_id FROM image_generations WHERE id = ? AND deleted_at IS NULL' + ownerClause).get(...ownerParams);`);
replaceOnce(image,
`  const result = db.prepare('UPDATE image_generations SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL').run(now, numId);`,
`  const result = db.prepare('UPDATE image_generations SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL' + ownerClause).run(now, now, ...ownerParams);`);

const video = root + 'backend-node/src/services/videoService.js';
replaceOnce(video,
`function list(db, query) {
  let sql = 'FROM video_generations WHERE deleted_at IS NULL';
  const params = [];`,
`function list(db, query, options = {}) {
  let sql = 'FROM video_generations WHERE deleted_at IS NULL';
  const params = [];
  if (options.billingEnabled) {
    sql += ' AND user_id = ?';
    params.push(options.userId || '');
  }`);
replaceOnce(video,
`function getById(db, id) {
  const r = db.prepare('SELECT * FROM video_generations WHERE id = ? AND deleted_at IS NULL').get(Number(id));`,
`function getById(db, id, options = {}) {
  const ownerClause = options.billingEnabled ? ' AND user_id = ?' : '';
  const params = options.billingEnabled ? [Number(id), options.userId || ''] : [Number(id)];
  const r = db.prepare('SELECT * FROM video_generations WHERE id = ? AND deleted_at IS NULL' + ownerClause).get(...params);`);
replaceOnce(video,
`function deleteById(db, log, id) {
  const now = new Date().toISOString();
  const result = db.prepare('UPDATE video_generations SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL').run(now, Number(id));`,
`function deleteById(db, log, id, options = {}) {
  const now = new Date().toISOString();
  const ownerClause = options.billingEnabled ? ' AND user_id = ?' : '';
  const ownerParams = options.billingEnabled ? [Number(id), options.userId || ''] : [Number(id)];
  const result = db.prepare('UPDATE video_generations SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL' + ownerClause).run(now, now, ...ownerParams);`);

const imageRoutes = root + 'backend-node/src/routes/images.js';
replaceOnce(imageRoutes, `imageService.list(db, query)`, `imageService.list(db, query, { billingEnabled: options.billingEnabled, userId: req.user?.id })`);
replaceOnce(imageRoutes, `imageService.getById(db, req.params.id)`, `imageService.getById(db, req.params.id, { billingEnabled: options.billingEnabled, userId: req.user?.id })`);
replaceOnce(imageRoutes, `imageService.deleteById(db, log, req.params.id)`, `imageService.deleteById(db, log, req.params.id, { billingEnabled: options.billingEnabled, userId: req.user?.id })`);

const videoRoutes = root + 'backend-node/src/routes/videos.js';
replaceOnce(videoRoutes, `videoService.list(db, query)`, `videoService.list(db, query, { billingEnabled: options.billingEnabled, userId: req.user?.id })`);
replaceOnce(videoRoutes, `videoService.getById(db, req.params.id)`, `videoService.getById(db, req.params.id, { billingEnabled: options.billingEnabled, userId: req.user?.id })`);
replaceOnce(videoRoutes, `videoService.deleteById(db, log, req.params.id)`, `videoService.deleteById(db, log, req.params.id, { billingEnabled: options.billingEnabled, userId: req.user?.id })`);
