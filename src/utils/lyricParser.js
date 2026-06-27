/**
 * 轻量 LRC 解析器 - 零外部依赖
 * 支持标准 [mm:ss.xx] 和 [mm:ss] 格式
 * 返回简单结构：[{ time: 秒数, text: 歌词 }]
 */

// 匹配一行 LRC: [mm:ss.xx] 或 [mm:ss] 或 [mm:ss.xxx]
const TIME_RE = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

/**
 * 解析 LRC 文本为带时间戳的歌词行
 * @param {string} text - LRC 原文
 * @returns {Array<{time:number, text:string}>} 按时间排序的歌词数组
 */
export function parseLyric(text) {
  if (!text || typeof text !== 'string' || !text.trim()) return [];

  const result = [];
  const lines = text.split(/\r?\n/);

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // 提取所有时间戳（一行可能有多个时间戳）
    const timestamps = [];
    let match;
    const re = new RegExp(TIME_RE.source, 'g');
    while ((match = re.exec(line)) !== null) {
      const mm = parseInt(match[1], 10);
      const ss = parseInt(match[2], 10);
      const frac = match[3] ? parseInt(match[3], 10) : 0;
      // 处理小数精度：两位数 / 100，三位数 / 1000
      const fracDiv = match[3] && match[3].length === 3 ? 1000 : 100;
      const time = mm * 60 + ss + frac / fracDiv;
      timestamps.push(time);
    }

    // 去掉时间戳，得到纯歌词文本
    const lyricText = line.replace(TIME_RE, '').trim();

    // 跳过纯元数据行（只含 [ti:] [ar:] [al:] 等但没有歌词内容）
    if (timestamps.length === 0) continue;
    if (!lyricText) continue;

    // 跳过元数据标签 [ti:xxx] [ar:xxx] [al:xxx] [by:xxx] 等
    if (/^\[(ti|ar|al|by|offset|tool|re|ve)\s*:/.test(line)) continue;

    // 每个时间戳创建一行（支持一行多时间戳的格式）
    for (const ts of timestamps) {
      result.push({ time: ts, text: lyricText });
    }
  }

  // 按时间排序
  result.sort((a, b) => a.time - b.time);

  return result;
}

/**
 * 根据当前播放时间找到对应的歌词行索引
 * @param {Array<{time:number, text:string}>} lyrics - 解析后的歌词数组
 * @param {number} currentTime - 当前播放时间（秒）
 * @returns {number} 当前行索引，-1 表示没有匹配
 */
export function findCurrentLineIndex(lyrics, currentTime) {
  if (!lyrics || !lyrics.length || currentTime == null) return -1;

  let result = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].time <= currentTime) {
      result = i;
    } else {
      break;
    }
  }
  return result;
}

/**
 * 把秒数格式化为 mm:ss 显示
 */
export function formatTime(sec) {
  if (!sec || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
