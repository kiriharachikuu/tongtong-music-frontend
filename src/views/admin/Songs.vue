<template>
  <div>
    <h2 style="margin-top:0;">歌曲管理</h2>
    <div style="display:flex;gap:10px;margin-bottom:14px;">
      <input v-model="kw" class="search-input" placeholder="搜索歌曲/歌手/专辑" style="max-width:400px;" @keyup.enter="reload" />
      <button class="primary-btn" @click="quickAdd.open = true">+ 快速添加歌曲</button>
      <button class="ghost-btn" @click="batchUploadVisible = true"><Upload :size="16" style="margin-right:4px;vertical-align:middle;" />批量上传</button>
      <button class="ghost-btn" @click="showEditor(null)">仅建元数据</button>
    </div>

    <el-table :data="songs" style="width:100%">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="title" label="标题" />
      <el-table-column prop="singer" label="歌手" width="120" />
      <el-table-column prop="album" label="专辑" width="140" />
      <el-table-column prop="duration" label="时长(秒)" width="100" />
      <el-table-column label="播放量" width="100" align="center">
        <template #default="scope">{{ formatCount(scope.row.play_count) }}</template>
      </el-table-column>
      <el-table-column label="收藏量" width="100" align="center">
        <template #default="scope">{{ formatCount(scope.row.favorite_count) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="320">
        <template #default="scope">
          <button class="ghost-btn" style="margin-right:6px;" @click="showEditor(scope.row)">编辑</button>
          <button class="ghost-btn" style="margin-right:6px;" @click="openLrcEditor(scope.row)">歌词</button>
          <button class="ghost-btn" style="margin-right:6px;" @click="coverDialogVisible = scope.row">封面</button>
          <button class="ghost-btn" style="margin-right:6px;" @click="audioDialogVisible = scope.row">音频</button>
          <button class="ghost-btn" style="color:#FA2D48;" @click="remove(scope.row)">删除</button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 编辑弹窗 -->
    <div v-if="editing" style="position:fixed;inset:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;z-index:9999;" @click.self="editing=null">
      <div class="card" style="min-width:420px;">
        <h3 style="margin-top:0;">{{ editing.id ? '编辑歌曲' : '新建歌曲' }}</h3>
        <div class="field"><label>标题</label><input v-model="editing.title" /></div>
        <div class="field"><label>歌手</label><input v-model="editing.singer" /></div>
        <div class="field">
          <label>专辑</label>
          <select v-model="editing.albumId">
            <option value="">— 不关联专辑 —</option>
            <option v-for="a in albums" :key="a.id" :value="String(a.id)">{{ a.name }}{{ a.singer ? ' · ' + a.singer : '' }}</option>
          </select>
        </div>
        <div class="field"><label>时长(秒)</label><input type="number" v-model.number="editing.duration" /></div>
        <div class="field"><label>简介</label><input v-model="editing.description" /></div>
        <div class="field"><label>原唱</label><el-input v-model="editing.original_singer" placeholder="原唱歌手（可与歌手不同）" /></div>
        <div class="field"><label>备注</label><el-input v-model="editing.remark" type="textarea" :rows="3" placeholder="备注信息" /></div>
        <div style="display:flex;justify-content:flex-end;gap:10px;">
          <button class="ghost-btn" @click="editing=null">取消</button>
          <button class="primary-btn" @click="save">保存</button>
        </div>
      </div>
    </div>

    <!-- 封面上传（el-upload） -->
    <div v-if="coverDialogVisible" style="position:fixed;inset:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;z-index:9999;" @click.self="coverDialogVisible=null">
      <div class="card" style="min-width:420px;">
        <h3 style="margin-top:0;">上传封面 - {{ coverDialogVisible.title }}</h3>
        <el-upload
          drag
          :auto-upload="true"
          :show-file-list="false"
          accept="image/*"
          :http-request="(opts) => uploadCover(coverDialogVisible, opts.file)"
        >
          <div style="padding:20px;color:#999;">
            <Upload :size="32" style="margin-bottom:8px;" />
            <div>拖拽图片到此处，或点击选择</div>
            <div style="font-size:12px;">支持 JPG/PNG/WebP，最大 5MB</div>
          </div>
        </el-upload>
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px;">
          <button class="ghost-btn" @click="coverDialogVisible=null">关闭</button>
        </div>
      </div>
    </div>

    <!-- 音频上传（el-upload） -->
    <div v-if="audioDialogVisible" style="position:fixed;inset:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;z-index:9999;" @click.self="audioDialogVisible=null">
      <div class="card" style="min-width:420px;">
        <h3 style="margin-top:0;">上传音频 - {{ audioDialogVisible.title }}</h3>
        <el-upload
          drag
          :auto-upload="true"
          :show-file-list="false"
          accept="audio/*"
          :http-request="(opts) => uploadAudio(audioDialogVisible, opts.file)"
        >
          <div style="padding:20px;color:#999;">
            <Upload :size="32" style="margin-bottom:8px;" />
            <div>拖拽音频到此处，或点击选择</div>
            <div style="font-size:12px;">支持 MP3/FLAC/WAV/M4A，最大 50MB，自动转码 128kbps MP3</div>
          </div>
        </el-upload>
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px;">
          <button class="ghost-btn" @click="audioDialogVisible=null">关闭</button>
        </div>
      </div>
    </div>

    <!-- 快速添加歌曲（音频+封面+歌词一步到位） -->
    <div v-if="quickAdd.open" class="qa-overlay" @click.self="quickAdd.open = false">
      <div class="qa-dialog">
        <h3 style="margin-top:0;">快速添加歌曲</h3>

        <!-- 元数据 -->
        <div class="qa-row">
          <div class="qa-field"><label>标题 *</label><input v-model="quickAdd.title" placeholder="歌曲标题" /></div>
          <div class="qa-field"><label>歌手</label><input v-model="quickAdd.singer" placeholder="歌手名" /></div>
        </div>
        <div class="qa-row">
          <div class="qa-field">
            <label>专辑</label>
            <select v-model="quickAdd.albumId">
              <option value="">— 不关联专辑 —</option>
              <option v-for="a in albums" :key="a.id" :value="String(a.id)">{{ a.name }}{{ a.singer ? ' · ' + a.singer : '' }}</option>
            </select>
          </div>
          <div class="qa-field"><label>流派</label><input v-model="quickAdd.genre" placeholder="流行/摇滚/民谣…" /></div>
        </div>
        <div class="qa-row">
          <div class="qa-field" style="max-width:140px;"><label>年份</label><input type="number" v-model.number="quickAdd.metadataYear" placeholder="2024" /></div>
        </div>

        <!-- 音频上传（必须） -->
        <div class="qa-upload-row">
          <label>音频文件 * <span style="font-size:11px;color:#999;">MP3/FLAC/WAV/M4A，最大 50MB，自动转码 128kbps，选择后自动解析元数据</span></label>
          <el-upload
            drag
            :auto-upload="false"
            :show-file-list="true"
            :limit="1"
            accept="audio/*"
            :on-change="onAudioFileChange"
            :on-remove="() => { quickAdd.audioFile = null; quickAdd.metadata = null; quickAdd.metadataYear = 0; quickAdd.tempToken = ''; quickAdd.tempFileName = ''; quickAdd.probeError = ''; }"
          >
            <div style="padding:16px;color:#999;">
              <Upload :size="28" style="margin-bottom:6px;" />
              <div style="font-size:13px;">拖拽音频到此处，或点击选择</div>
            </div>
          </el-upload>

          <!-- 元数据探测状态 -->
          <div v-if="quickAdd.probing || quickAdd.metadata || quickAdd.probeError" class="qa-metadata">
            <div v-if="quickAdd.probing" class="qa-probe-loading">
              <Loader :size="16" class="qa-spin" style="color:#FA2D48;" />
              <span>正在上传并解析音频元数据... {{ quickAdd.probeProgress }}%</span>
            </div>
            <div v-else-if="quickAdd.probeError" class="qa-probe-error">
              <AlertCircle :size="16" style="color:#FA2D48;flex-shrink:0;" />
              <span style="flex:1;">{{ quickAdd.probeError }}</span>
              <button class="ghost-btn" style="font-size:12px;padding:2px 8px;" @click="probeAudioFile">重试</button>
            </div>
            <div v-else-if="quickAdd.metadata" class="qa-meta-grid">
              <div class="qa-meta-item"><label>时长</label><span>{{ formatDuration(quickAdd.metadata.duration) }}</span></div>
              <div class="qa-meta-item"><label>比特率</label><span>{{ quickAdd.metadata.bitrate || '?' }} kbps</span></div>
              <div class="qa-meta-item"><label>采样率</label><span>{{ quickAdd.metadata.sample_rate || '?' }} Hz</span></div>
              <div class="qa-meta-item"><label>编码</label><span>{{ quickAdd.metadata.codec || '未知' }}</span></div>
              <div class="qa-meta-item" v-if="quickAdd.metadata.title"><label>标题</label><span>{{ quickAdd.metadata.title }}</span></div>
              <div class="qa-meta-item" v-if="quickAdd.metadata.artist"><label>歌手</label><span>{{ quickAdd.metadata.artist }}</span></div>
              <div class="qa-meta-item" v-if="quickAdd.metadata.album"><label>专辑</label><span>{{ quickAdd.metadata.album }}</span></div>
              <div class="qa-meta-item" v-if="quickAdd.metadata.genre"><label>流派</label><span>{{ quickAdd.metadata.genre }}</span></div>
              <div class="qa-meta-item" v-if="quickAdd.metadata.year"><label>年份</label><span>{{ quickAdd.metadata.year }}</span></div>
            </div>
          </div>
        </div>

        <!-- 封面上传（可选） -->
        <div class="qa-upload-row">
          <label>封面图片 <span style="font-size:11px;color:#999;">可选，JPG/PNG/WebP，最大 5MB</span></label>
          <el-upload
            drag
            :auto-upload="false"
            :show-file-list="true"
            :limit="1"
            accept="image/*"
            :on-change="(f) => quickAdd.coverFile = f.raw"
            :on-remove="() => quickAdd.coverFile = null"
          >
            <div style="padding:16px;color:#999;">
              <ImageIcon :size="28" style="margin-bottom:6px;" />
              <div style="font-size:13px;">拖拽封面到此处，或点击选择</div>
            </div>
          </el-upload>
        </div>

        <!-- 歌词上传（可选） -->
        <div class="qa-upload-row">
          <label>歌词文件 <span style="font-size:11px;color:#999;">可选，.lrc 文本，支持逐字 LRC A2 格式</span></label>
          <div style="display:flex;gap:8px;align-items:center;">
            <el-upload
              :auto-upload="false"
              :show-file-list="false"
              accept=".lrc,text/plain"
              :on-change="async (f) => { quickAdd.lrcText = await f.raw.text(); quickAdd.lrcName = f.name; }"
            >
              <button class="ghost-btn" type="button" style="font-size:13px;">选择 .lrc 文件</button>
            </el-upload>
            <span v-if="quickAdd.lrcText" style="font-size:12px;color:#52c41a;">已加载 {{ quickAdd.lrcName }} ({{ quickAdd.lrcText.length }} 字)</span>
          </div>
          <textarea
            v-model="quickAdd.lrcText"
            class="qa-lrc-input"
            placeholder="[00:01.00] 第一行歌词&#10;[00:05.50] 第二行歌词...&#10;&#10;支持逐字格式：[00:15.00]<00:15.000>夜<00:15.500>幕..."
            spellcheck="false"
          ></textarea>
        </div>

        <!-- 进度 -->
        <div v-if="quickAdd.progress" class="qa-progress">
          <div v-for="step in quickAdd.steps" :key="step.label" class="qa-step">
            <Check v-if="step.done" :size="16" style="color:#52c41a;" />
            <Loader v-else-if="step.active" :size="16" class="qa-spin" style="color:#FA2D48;" />
            <Circle v-else :size="16" style="color:#ccc;" />
            <span :style="{ color: step.done ? '#52c41a' : step.active ? '#FA2D48' : '#999' }">{{ step.label }}</span>
          </div>
        </div>

        <!-- 操作 -->
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:14px;">
          <button class="ghost-btn" @click="quickAdd.open = false" :disabled="quickAdd.uploading">取消</button>
          <button class="primary-btn" @click="submitQuickAdd" :disabled="quickAdd.uploading || !quickAdd.title || !quickAdd.audioFile">
            {{ quickAdd.uploading ? '上传中…' : '一键添加' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 歌词编辑器 -->
    <div v-if="lrcEditor.song" style="position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:9999;" @click.self="lrcEditor.song=null">
      <div class="card" style="width:90%;max-width:720px;max-height:85vh;display:flex;flex-direction:column;">
        <h3 style="margin-top:0;">歌词编辑 - {{ lrcEditor.song.title }}</h3>

        <!-- 工具栏 -->
        <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;align-items:center;">
          <el-upload
            :auto-upload="true"
            :show-file-list="false"
            accept=".lrc,text/plain"
            :http-request="(opts) => importLrcFile(opts.file)"
          >
            <button class="ghost-btn" type="button">导入 .lrc 文件</button>
          </el-upload>
          <button class="ghost-btn" @click="formatLrc">格式化时间戳</button>
          <button class="ghost-btn" @click="validateLrc">语法校验</button>
          <span v-if="lrcEditor.validation" :style="{ color: lrcEditor.validation.ok ? '#52c41a' : '#FA2D48', fontSize: '12px' }">
            {{ lrcEditor.validation.msg }}
          </span>
        </div>

        <!-- 编辑区 -->
        <textarea
          v-model="lrcEditor.text"
          class="lrc-editor"
          placeholder="[00:01.00] 第一行歌词&#10;[00:05.50] 第二行歌词..."
          spellcheck="false"
        ></textarea>

        <!-- 预览 -->
        <div v-if="lrcEditor.preview.length" class="lrc-preview">
          <div style="font-size:12px;color:#999;margin-bottom:6px;">预览（前 10 行）</div>
          <div v-for="(line, i) in lrcEditor.preview.slice(0, 10)" :key="i" class="lrc-preview-line">
            <span class="lrc-time">{{ line.time }}</span>
            <span class="lrc-text">{{ line.text }}</span>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;">
          <button class="ghost-btn" style="color:#FA2D48;" @click="deleteLrc">删除歌词</button>
          <div style="display:flex;gap:10px;">
            <button class="ghost-btn" @click="lrcEditor.song=null">取消</button>
            <button class="primary-btn" @click="saveLrc">保存</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 批量上传 -->
    <BatchUploadDialog v-model="batchUploadVisible" @success="reload" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { Upload, Image as ImageIcon, Check, Loader, Circle, AlertCircle } from 'lucide-vue-next';
import { ElMessage } from 'element-plus';
import {
  adminListSongs, adminCreateSong, adminUpdateSong, adminDeleteSong,
  adminUploadSongCover, adminUploadSongAudio, adminUploadSongLrc,
  adminDeleteSongLrc, adminProbeAudio, getSongLyric,
  adminListAlbums
} from '../../api/endpoints';
import BatchUploadDialog from '../../components/admin/BatchUploadDialog.vue';

const songs = ref([]);
const albums = ref([]);
const kw = ref('');
const editing = ref(null);
const coverDialogVisible = ref(null);
const audioDialogVisible = ref(null);
const batchUploadVisible = ref(false);

// 快速添加状态
const quickAdd = reactive({
  open: false,
  title: '', singer: '', album: '', albumId: '', genre: '',
  audioFile: null, coverFile: null,
  lrcText: '', lrcName: '',
  uploading: false, progress: false,
  // 音频元数据探测
  probing: false,           // 正在探测
  probeError: '',           // 探测错误信息
  probeProgress: 0,         // 探测上传进度
  metadata: null,           // 探测到的元数据
  metadataYear: 0,          // 年份（可编辑）
  tempToken: '',            // 临时文件令牌
  tempFileName: '',         // 临时文件名
  uploadProgress: 0,        // 正式上传进度
  steps: [
    { label: '创建歌曲元数据', done: false, active: false },
    { label: '上传音频（转码 128kbps）', done: false, active: false },
    { label: '上传封面', done: false, active: false },
    { label: '上传歌词', done: false, active: false },
  ],
});

// 歌词编辑器状态
const lrcEditor = ref({
  song: null,
  text: '',
  validation: null,
  preview: computed(() => parseLrcPreview(lrcEditor.value.text)),
});

async function reload() {
  const r = await adminListSongs({ keyword: kw.value, limit: 200 });
  songs.value = (r && r.list) || [];
}
async function reloadAlbums() {
  try {
    const r = await adminListAlbums();
    albums.value = Array.isArray(r) ? r : (r && r.data) || [];
  } catch { albums.value = []; }
}
onMounted(() => { reload(); reloadAlbums(); });

function showEditor(s) {
  editing.value = s
    ? { ...s, albumId: s.album_id || '', original_singer: s.original_singer || '', remark: s.remark || '' }
    : { id: null, title: '', singer: '', albumId: '', duration: 0, description: '', original_singer: '', remark: '' };
}

async function save() {
  try {
    const payload = {
      title: editing.value.title,
      singer: editing.value.singer,
      genre: editing.value.genre,
      year: editing.value.year || 0,
      album_id: editing.value.albumId || undefined,
      original_singer: editing.value.original_singer || '',
      remark: editing.value.remark || '',
    };
    if (editing.value.id) {
      await adminUpdateSong(editing.value.id, payload);
    } else {
      await adminCreateSong(payload);
    }
    editing.value = null;
    ElMessage.success('保存成功');
    reload();
  } catch (e) { ElMessage.error(e.message); }
}

async function remove(s) {
  if (!confirm(`确认删除歌曲《${s.title}》?`)) return;
  await adminDeleteSong(s.id);
  ElMessage.success('已删除');
  reload();
}

/** 重置快速添加进度步骤 */
function resetSteps() {
  quickAdd.steps.forEach(s => { s.done = false; s.active = false; });
}

/** 格式化秒为 m:ss */
function formatDuration(sec) {
  if (!sec) return '0:00';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** 格式化数字：超 1 万显示「x.x万」 */
function formatCount(n) {
  if (n == null) return '0';
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  return String(n);
}

/**
 * 音频文件选择回调：保存文件后立即触发探测
 */
async function onAudioFileChange(file) {
  quickAdd.audioFile = file?.raw || null;
  // 重置探测状态
  quickAdd.probing = false;
  quickAdd.probeError = '';
  quickAdd.probeProgress = 0;
  quickAdd.metadata = null;
  quickAdd.metadataYear = 0;
  quickAdd.tempToken = '';
  quickAdd.tempFileName = '';
  if (!quickAdd.audioFile) return;
  await probeAudioFile();
}

/**
 * 上传音频到探测接口，解析元数据并预填表单
 */
async function probeAudioFile() {
  if (!quickAdd.audioFile) return;
  quickAdd.probing = true;
  quickAdd.probeError = '';
  quickAdd.probeProgress = 0;
  try {
    const fd = new FormData();
    fd.append('file', quickAdd.audioFile);
    const r = await adminProbeAudio(fd, (p) => { quickAdd.probeProgress = p; });
    quickAdd.metadata = r.metadata;
    quickAdd.metadataYear = r.metadata.year || 0;
    quickAdd.tempToken = r.tempToken;
    quickAdd.tempFileName = r.tempFileName;
    // 自动填充表单：有提取值就覆盖，无值则保留用户已填内容
    if (r.metadata.title) quickAdd.title = r.metadata.title;
    if (r.metadata.artist) quickAdd.singer = r.metadata.artist;
    if (r.metadata.album) {
      quickAdd.album = r.metadata.album;
      // 尝试匹配已有专辑
      const matched = albums.value.find(a => a.name === r.metadata.album);
      if (matched) quickAdd.albumId = String(matched.id);
    }
    if (r.metadata.genre) quickAdd.genre = r.metadata.genre;
    const filled = [r.metadata.title, r.metadata.artist, r.metadata.album, r.metadata.genre].filter(Boolean).length;
    ElMessage.success(`元数据解析成功：自动填充 ${filled} 项，时长 ${formatDuration(r.metadata.duration)} / ${r.metadata.bitrate}kbps`);
  } catch (e) {
    quickAdd.probeError = e.message || '解析失败';
    ElMessage.error('音频解析失败：' + quickAdd.probeError);
  } finally {
    quickAdd.probing = false;
  }
}

/** 快速添加：一键创建歌曲 + 上传音频/封面/歌词 */
async function submitQuickAdd() {
  if (!quickAdd.title || !quickAdd.audioFile) return;
  quickAdd.uploading = true;
  quickAdd.progress = true;
  resetSteps();

  try {
    // Step 1: 创建元数据
    quickAdd.steps[0].active = true;
    const r = await adminCreateSong({
      title: quickAdd.title,
      singer: quickAdd.singer,
      album: quickAdd.album,
      album_id: quickAdd.albumId || undefined,
      genre: quickAdd.genre,
      year: quickAdd.metadataYear || 0,
    });
    const songId = r?.id || r?.data?.id;
    if (!songId) throw new Error('创建歌曲失败');
    quickAdd.steps[0].done = true;
    quickAdd.steps[0].active = false;

    // Step 2: 上传音频（有 tempToken 时复用临时文件，不重新上传）
    quickAdd.steps[1].active = true;
    const audioFd = new FormData();
    if (quickAdd.tempToken && quickAdd.tempFileName) {
      // 仅传令牌，不传文件（后端复用临时文件）
      audioFd.append('tempToken', quickAdd.tempToken);
      audioFd.append('tempFileName', quickAdd.tempFileName);
    } else {
      audioFd.append('file', quickAdd.audioFile);
    }
    await adminUploadSongAudio(songId, audioFd, (p) => { quickAdd.uploadProgress = p; });
    quickAdd.steps[1].done = true;
    quickAdd.steps[1].active = false;

    // Step 3: 上传封面（可选）
    if (quickAdd.coverFile) {
      quickAdd.steps[2].active = true;
      const coverFd = new FormData();
      coverFd.append('file', quickAdd.coverFile);
      await adminUploadSongCover(songId, coverFd);
      quickAdd.steps[2].done = true;
      quickAdd.steps[2].active = false;
    } else {
      quickAdd.steps[2].done = true; // 跳过
    }

    // Step 4: 上传歌词（可选）
    if (quickAdd.lrcText.trim()) {
      quickAdd.steps[3].active = true;
      const lrcBlob = new Blob([quickAdd.lrcText], { type: 'text/plain' });
      const lrcFd = new FormData();
      lrcFd.append('file', lrcBlob, `${songId}.lrc`);
      await adminUploadSongLrc(songId, lrcFd);
      quickAdd.steps[3].done = true;
      quickAdd.steps[3].active = false;
    } else {
      quickAdd.steps[3].done = true; // 跳过
    }

    ElMessage.success(`《${quickAdd.title}》添加成功！`);
    quickAdd.open = false;
    quickAdd.progress = false;
    // 重置表单
    quickAdd.title = ''; quickAdd.singer = ''; quickAdd.album = ''; quickAdd.albumId = ''; quickAdd.genre = '';
    quickAdd.audioFile = null; quickAdd.coverFile = null;
    quickAdd.lrcText = ''; quickAdd.lrcName = '';
    quickAdd.metadata = null; quickAdd.metadataYear = 0; quickAdd.tempToken = ''; quickAdd.tempFileName = '';
    quickAdd.probing = false; quickAdd.probeError = ''; quickAdd.probeProgress = 0;
    quickAdd.uploadProgress = 0;
    reload();
  } catch (e) {
    ElMessage.error('添加失败: ' + (e.message || '未知错误'));
    // 标记当前步骤为失败
    const activeStep = quickAdd.steps.find(s => s.active);
    if (activeStep) { activeStep.active = false; }
  } finally {
    quickAdd.uploading = false;
  }
}

// el-upload 上传封面
async function uploadCover(s, file) {
  try {
    const fd = new FormData(); fd.append('file', file);
    await adminUploadSongCover(s.id, fd);
    ElMessage.success('封面已上传');
    coverDialogVisible.value = null;
    reload();
  } catch (e) { ElMessage.error('上传失败: ' + e.message); }
}

// el-upload 上传音频
async function uploadAudio(s, file) {
  try {
    const fd = new FormData(); fd.append('file', file);
    await adminUploadSongAudio(s.id, fd);
    ElMessage.success('音频已上传（128kbps MP3 转码）');
    audioDialogVisible.value = null;
    reload();
  } catch (e) { ElMessage.error('上传失败: ' + e.message); }
}

// ============ 歌词编辑器 ============

/** 打开歌词编辑器，加载现有歌词 */
async function openLrcEditor(song) {
  lrcEditor.value.song = song;
  lrcEditor.value.text = '';
  lrcEditor.value.validation = null;
  try {
    const text = await getSongLyric(song.id);
    lrcEditor.value.text = (typeof text === 'string' ? text : (text && text.lrc) || '') || '';
  } catch { /* 无歌词时为空 */ }
}

/** 导入 .lrc 文件到编辑器 */
async function importLrcFile(file) {
  try {
    const text = await file.text();
    lrcEditor.value.text = text;
    ElMessage.success(`已导入 ${file.name}`);
  } catch (e) { ElMessage.error('导入失败'); }
}

/** 保存歌词（将编辑器文本上传） */
async function saveLrc() {
  const song = lrcEditor.value.song;
  if (!song) return;
  // 校验
  const v = validateLrcText(lrcEditor.value.text);
  if (!v.ok) { lrcEditor.value.validation = v; ElMessage.error(v.msg); return; }
  try {
    const blob = new Blob([lrcEditor.value.text], { type: 'text/plain' });
    const fd = new FormData();
    fd.append('file', blob, `${song.id}.lrc`);
    await adminUploadSongLrc(song.id, fd);
    ElMessage.success('歌词已保存');
    lrcEditor.value.song = null;
    reload();
  } catch (e) { ElMessage.error('保存失败: ' + e.message); }
}

/** 删除歌词 */
async function deleteLrc() {
  const song = lrcEditor.value.song;
  if (!song) return;
  if (!confirm(`确认删除《${song.title}》的歌词？`)) return;
  try {
    await adminDeleteSongLrc(song.id);
    ElMessage.success('歌词已删除');
    lrcEditor.value.song = null;
    reload();
  } catch (e) { ElMessage.error('删除失败: ' + e.message); }
}

/** 语法校验 */
function validateLrc() {
  const v = validateLrcText(lrcEditor.value.text);
  lrcEditor.value.validation = v;
  if (v.ok) ElMessage.success(v.msg);
  else ElMessage.warning(v.msg);
}

/** 校验 LRC 文本：检查时间戳格式 [mm:ss.xx] */
function validateLrcText(text) {
  if (!text || !text.trim()) return { ok: false, msg: '歌词内容为空' };
  const lines = text.split('\n').filter((l) => l.trim());
  const timeRegex = /\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\]/;
  let validLines = 0;
  let invalidLines = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(timeRegex);
    if (m) {
      const mm = Number(m[1]); const ss = Number(m[2]);
      if (mm > 59 || ss > 59) invalidLines.push(i + 1);
      else validLines++;
    } else {
      invalidLines.push(i + 1);
    }
  }
  if (validLines === 0) return { ok: false, msg: '未检测到有效的时间戳行，格式应为 [mm:ss.xx] 歌词' };
  if (invalidLines.length > 0) return { ok: false, msg: `第 ${invalidLines.slice(0, 5).join(', ')} 行时间戳格式不正确` };
  return { ok: true, msg: `校验通过：${validLines} 行有效时间戳` };
}

/** 格式化时间戳：补全两位 + 毫秒 */
function formatLrc() {
  const lines = lrcEditor.value.text.split('\n');
  const formatted = lines.map((line) => {
    const m = line.match(/\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\](.*)/);
    if (!m) return line;
    const mm = String(m[1]).padStart(2, '0');
    const ss = String(m[2]).padStart(2, '0');
    let xxx = m[3] ? String(m[3]).padEnd(2, '0').slice(0, 2) : '00';
    return `[${mm}:${ss}.${xxx}]${m[4] || ''}`;
  });
  lrcEditor.value.text = formatted.join('\n');
  ElMessage.success('已格式化');
}

/** 解析 LRC 为预览数组 */
function parseLrcPreview(text) {
  if (!text) return [];
  const lines = text.split('\n');
  const result = [];
  const timeRegex = /\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\]/;
  for (const line of lines) {
    const m = line.match(timeRegex);
    if (m) {
      const mm = String(m[1]).padStart(2, '0');
      const ss = String(m[2]).padStart(2, '0');
      const xxx = m[3] ? String(m[3]).padEnd(2, '0').slice(0, 2) : '00';
      const textContent = line.replace(timeRegex, '').trim();
      result.push({ time: `${mm}:${ss}.${xxx}`, text: textContent });
    }
  }
  return result;
}
</script>

<style scoped>
.lrc-editor {
  width: 100%;
  min-height: 280px;
  max-height: 350px;
  font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
  padding: 12px;
  border: 1px solid var(--am-border);
  border-radius: var(--am-radius);
  background: var(--am-bg);
  color: var(--am-text);
  resize: vertical;
  outline: none;
}
.lrc-editor:focus { border-color: var(--am-primary); }
.lrc-preview {
  margin-top: 10px;
  padding: 10px;
  background: var(--am-bg);
  border-radius: 8px;
  border: 1px solid var(--am-border);
  max-height: 180px;
  overflow-y: auto;
}
.lrc-preview-line {
  display: flex;
  gap: 10px;
  padding: 3px 0;
  font-size: 13px;
}
.lrc-time {
  color: var(--am-primary);
  font-family: 'SF Mono', monospace;
  flex-shrink: 0;
  min-width: 60px;
}
.lrc-text { color: var(--am-text); }

/* ========== 快速添加对话框 ========== */
.qa-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999; padding: 20px;
}
.qa-dialog {
  background: var(--am-bg, #fff);
  border-radius: 16px;
  padding: 24px;
  width: 100%; max-width: 640px;
  max-height: 90vh; overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}
.qa-row { display: flex; gap: 12px; margin-bottom: 12px; }
.qa-field { flex: 1; }
.qa-field label, .qa-upload-row label {
  display: block; font-size: 13px; font-weight: 600;
  margin-bottom: 4px; color: var(--am-text, #333);
}
.qa-field input {
  width: 100%; padding: 8px 12px;
  border: 1px solid var(--am-border, #e0e0e0);
  border-radius: 8px; font-size: 14px;
  background: var(--am-bg, #fff); color: var(--am-text, #333);
  outline: none;
}
.qa-field input:focus { border-color: #FA2D48; }
.qa-upload-row { margin-bottom: 14px; }
.qa-lrc-input {
  width: 100%; min-height: 80px; max-height: 150px;
  margin-top: 6px; padding: 8px 12px;
  border: 1px solid var(--am-border, #e0e0e0);
  border-radius: 8px; font-size: 12px;
  font-family: 'SF Mono', 'Consolas', monospace;
  background: var(--am-bg, #fff); color: var(--am-text, #333);
  resize: vertical; outline: none;
}
.qa-lrc-input:focus { border-color: #FA2D48; }

/* 进度步骤 */
.qa-progress {
  display: flex; flex-direction: column; gap: 6px;
  padding: 12px; background: rgba(0,0,0,0.03);
  border-radius: 8px; margin-top: 10px;
}
.qa-step {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px;
}
.qa-spin { animation: qa-rotate 0.8s linear infinite; }
@keyframes qa-rotate { to { transform: rotate(360deg); } }

/* ========== 元数据探测面板 ========== */
.qa-metadata { margin-top: 8px; }
.qa-probe-loading, .qa-probe-error {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: 8px;
  font-size: 13px;
}
.qa-probe-loading { background: rgba(250,45,72,0.06); color: #FA2D48; }
.qa-probe-error { background: rgba(250,45,72,0.08); color: #FA2D48; }
.qa-meta-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 8px; padding: 10px 12px;
  background: rgba(0,0,0,0.03); border-radius: 8px;
}
.qa-meta-item { font-size: 12px; }
.qa-meta-item label { color: #999; margin-right: 4px; }
.qa-meta-item span { color: var(--am-text, #333); font-weight: 500; }
</style>
