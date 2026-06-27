import api from './client';

export function getHealth() { return api.get('/health'); }
export function login({ username, password }) { return api.post('/auth/login', { username, password }); }
export function register({ username, password, nickname }) { return api.post('/auth/register', { username, password, nickname }); }
export function me() { return api.get('/auth/me'); }

// 歌曲
export function listSongs(params = {}) { return api.get('/songs', { params }); }
export function getSong(id) { return api.get(`/songs/${id}`); }
export function getSongLyric(id) { return api.get(`/songs/${id}/lrc`); }
export function getSongLyricParsed(id) { return api.get(`/songs/${id}/lyric`); }
export function listAlbums() { return api.get('/songs/albums'); }
export function getAlbum(id) { return api.get(`/songs/albums/${id}`); }

// 横幅
export function listBanners() { return api.get('/banners'); }

// 歌单
export function listPlaylists() { return api.get('/playlists'); }
export function getPlaylist(id) { return api.get(`/playlists/${id}`); }
export function createPlaylist(data) { return api.post('/playlists', data); }
export function addSongToPlaylist(playlistId, songIds) { return api.post(`/playlists/${playlistId}/songs`, { songIds }); }
export function deletePlaylist(id) { return api.delete(`/playlists/${id}`); }

// 收藏
export function listFavorites() { return api.get('/favorites'); }
export function addFavorite(id) { return api.post(`/favorites/${id}`); }
export function removeFavorite(id) { return api.delete(`/favorites/${id}`); }

// 播放队列
export function getQueue() { return api.get('/player/queue'); }
export function saveQueue(payload) { return api.post('/player/queue', payload); }

// 每日推荐
export function getDaily() { return api.get('/daily'); }

// 发现页聚合
export function getDiscover() { return api.get('/discover'); }

// 历史
export function listHistory() { return api.get('/history'); }
export function reportPlayed(id) { return api.post(`/history/${id}`); }

// ========== admin ==========
export function adminListSongs(params = {}) { return api.get('/admin/songs', { params }); }
export function adminCreateSong(data) { return api.post('/admin/songs', data); }
export function adminUpdateSong(id, data) { return api.post(`/admin/songs/${id}`, data); }
export function adminDeleteSong(id) { return api.delete(`/admin/songs/${id}`); }
export function adminUploadSongCover(id, formData) {
  return api.post(`/admin/songs/${id}/cover`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
}

// ============ 专辑管理 ============
export function adminListAlbums(keyword = '') {
  return api.get('/admin/albums', { params: keyword ? { keyword } : {} });
}
export function adminCreateAlbum(data) { return api.post('/admin/albums', data); }
export function adminUpdateAlbum(id, data) { return api.post(`/admin/albums/${id}`, data); }
export function adminDeleteAlbum(id) { return api.delete(`/admin/albums/${id}`); }
export function adminUploadAlbumCover(id, formData) {
  return api.post(`/admin/albums/${id}/cover`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
}

// ============ 环境变量配置 ============
export function adminGetEnv() { return api.get('/admin/env'); }
export function adminSaveEnv(updates) { return api.post('/admin/env', { updates }); }

/**
 * 带 onUploadProgress 的通用上传封装（音频上传超时放宽至 5 分钟）
 */
function uploadWithProgress(url, formData, onProgress, headers = {}) {
  return api.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data', ...headers },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
    timeout: 5 * 60 * 1000,
  });
}

/**
 * 探测音频元数据：上传文件到后端临时目录，ffprobe 解析后返回 { metadata, tempToken, tempFileName }
 * @param {FormData} formData 包含 file 字段
 * @param {(percent:number)=>void} [onProgress] 上传进度回调
 */
export function adminProbeAudio(formData, onProgress) {
  return uploadWithProgress('/admin/songs/probe-audio', formData, onProgress);
}

/**
 * 上传歌曲音频（支持 tempToken 复用临时文件，避免二次上传）
 * @param {number} id 歌曲 ID
 * @param {FormData} formData 表单数据（含 file 或留空由 tempToken 复用）
 * @param {(percent:number)=>void} [onProgress] 上传进度回调
 * @param {string} [tempToken] 临时文件令牌
 * @param {string} [tempFileName] 临时文件名
 */
export function adminUploadSongAudio(id, formData, onProgress, tempToken, tempFileName) {
  if (tempToken && tempFileName) {
    formData.append('tempToken', tempToken);
    formData.append('tempFileName', tempFileName);
  }
  return uploadWithProgress(`/admin/songs/${id}/audio`, formData, onProgress);
}
export function adminUploadSongLrc(id, formData) {
  return api.post(`/admin/songs/${id}/lrc`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
}
export function adminDeleteSongLrc(id) { return api.delete(`/admin/songs/${id}/lrc`); }
export function adminStats() { return api.get('/admin/stats'); }
export function adminUsers() { return api.get('/admin/users'); }
export function adminDeleteUser(id) { return api.delete(`/admin/users/${id}`); }
export function adminBanners() { return api.get('/admin/banners'); }
export function adminCreateBanner(data) { return api.post('/admin/banners', data); }
export function adminUploadBannerImage(id, formData) {
  return api.post(`/admin/banners/${id}/image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
}
export function adminUpdateBanner(id, data) { return api.post(`/admin/banners/${id}`, data); }
export function adminDeleteBanner(id) { return api.delete(`/admin/banners/${id}`); }
export function adminPlaylists() { return api.get('/admin/playlists'); }
export function adminCreatePlaylist(data) { return api.post('/admin/playlists', data); }
export function adminUpdatePlaylist(id, data) { return api.post(`/admin/playlists/${id}`, data); }
export function adminDeletePlaylist(id) { return api.delete(`/admin/playlists/${id}`); }
export function adminPlaylistsAddSongs(id, songIds) { return api.post(`/admin/playlists/${id}/songs`, { songIds }); }
export function adminLogs() { return api.get('/admin/logs'); }
export function adminStorageTest() { return api.post('/admin/storage/test'); }
export function adminStorageConfig() { return api.get('/admin/storage/config'); }
export function adminSaveStorageConfig(items) { return api.post('/admin/storage/config', { items }); }
export function adminDeleteStorageConfig(key) { return api.delete(`/admin/storage/config/${key}`); }
export function adminMigrate() { return api.post('/admin/storage/migrate'); }
export function adminMigrateProgress() { return api.get('/admin/storage/migrate/progress'); }
// ============ 排行榜 ============
export function getRanking(params = {}) { return api.get('/ranking', { params }); }

// ============ 版本管理 ============
export function getLatestVersion() { return api.get('/version/latest'); }
export function adminListVersions() { return api.get('/admin/versions'); }
export function adminCreateVersion(data) { return api.post('/admin/versions', data); }
export function adminUpdateVersion(id, data) { return api.put(`/admin/versions/${id}`, data); }
export function adminDeleteVersion(id) { return api.delete(`/admin/versions/${id}`); }

// ============ 用户资料更新 ============
export function updateMe(data) { return api.patch('/auth/me', data); }

// ============ 收藏检查 ============
export function checkFavorite(songId) { return api.get(`/favorites/${songId}/check`); }

// ============ 播放历史单条删除 ============
export function deleteHistory(songId) { return api.delete(`/history/${songId}`); }

// ============ 歌单重命名与排序 ============
export function renamePlaylist(id, name) { return api.patch(`/playlists/${id}`, { name }); }
export function reorderPlaylistSongs(id, fromPosition, toPosition) {
  return api.patch(`/playlists/${id}/reorder`, { fromPosition, toPosition });
}

// ============ 系统歌单 ============
export function listSystemPlaylists() { return api.get('/playlists', { params: { system: 1 } }); }

// ============ 操作日志过滤 ============
export function adminLogsFiltered(params = {}) { return api.get('/admin/logs', { params }); }

// ============ 歌曲下载 URL ============
export function getDownloadUrl(id) {
  const token = localStorage.getItem('tt_token') || '';
  return `/api/songs/${id}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
}
