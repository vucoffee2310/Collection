/**
 * Processor UI - Show ALL Real Fields (except prev*)
 */

import { getVideoId, copyToClipboard, downloadFile, formatJSON } from '../lib/helpers.js';
import { getCache, clearCache } from '../lib/cache.js';
import { getPotWithRetry } from '../lib/api.js';
import { convertSubtitlesToMarkedParagraphs } from '../core/subtitle-parser.js';
import { extractMarkersWithContext } from '../core/marker-extractor.js';
import { StreamingTranslationProcessor } from '../core/stream-processor.js';
import { loadCompoundData } from '../lib/compounds.js';
import { getGlobalStats } from '../lib/json-utils.js';

let lastClearedVideoId = null;

const processTrack = async (track) => {
  const videoId = getVideoId();
  const cacheKey = `${videoId}::${track.baseUrl}`;

  const contentCache = getCache('content');
  if (contentCache.has(cacheKey)) return contentCache.get(cacheKey);

  const { pot } = await getPotWithRetry(videoId);
  if (!pot) throw new Error('Unable to obtain POT token');

  const xml = await fetch(`${track.baseUrl}&fromExt=true&c=WEB&pot=${pot}`).then((r) => r.text());
  const { text, metadata, language } = convertSubtitlesToMarkedParagraphs(xml, track.languageCode);
  const content = `Translate into Vietnamese\n\n\`\`\`\n---\nhttps://www.udemy.com/742828/039131.php\n---\n\n${text}\n\`\`\``;

  const result = { content, metadata, language };
  contentCache.set(cacheKey, result);
  return result;
};

const getOrCreateJSON = async (track) => {
  const videoId = getVideoId();
  const cacheKey = `${videoId}::${track.baseUrl}`;

  const jsonCache = getCache('json');
  if (jsonCache.has(cacheKey)) return jsonCache.get(cacheKey);

  const result = await processTrack(track);
  const json = extractMarkersWithContext(result.content, result.metadata, result.language);
  json.sourceLanguage = result.language;

  jsonCache.set(cacheKey, json);
  return json;
};

const getPositionOrderedData = (json) => {
  const items = [];
  Object.values(json.markers || {}).forEach((instances) => {
    instances.forEach((inst) => items.push(inst));
  });
  items.sort((a, b) => a.position - b.position);
  return items;
};

const throttle = (fn, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};

const truncate = (str, len = 200) => {
  if (!str || str.length <= len) return str;
  return str.substring(0, len) + '...';
};

export const createProcessorUI = (track) => {
  const container = document.createElement('div');
  container.style.cssText =
    'padding: 12px; background: #f5f5f5; border: 1px solid #ccc; margin: 8px 0; border-radius: 4px;';

  const title = document.createElement('div');
  title.style.cssText = 'font-weight: bold; margin-bottom: 8px; font-size: 13px;';
  title.textContent = '🌐 AI Studio Translation';

  const status = document.createElement('div');
  status.style.cssText = 'font-size: 11px; color: #666; margin-bottom: 8px;';
  status.textContent = 'Ready to process';

  const btnContainer = document.createElement('div');
  btnContainer.style.cssText = 'margin-bottom: 8px;';

  const createBtn = (text, primary = false) => {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      padding: 8px 16px; margin-right: 8px; font-size: 12px; border-radius: 4px; cursor: pointer;
      background: ${primary ? '#000' : '#fff'}; color: ${primary ? '#fff' : '#000'};
      border: 1px solid #000; font-weight: ${primary ? 'bold' : 'normal'};
    `;
    btn.onmouseenter = () => (btn.style.background = primary ? '#333' : '#f0f0f0');
    btn.onmouseleave = () => (btn.style.background = primary ? '#000' : '#fff');
    return btn;
  };

  const processBtn = createBtn('Process Translation', true);
  const downloadBtn = createBtn('Download JSON');
  const copyBtn = createBtn('Copy JSON');
  const toggleBtn = createBtn('Show JSON ▼');

  downloadBtn.style.display = 'none';
  copyBtn.style.display = 'none';
  toggleBtn.style.display = 'none';

  btnContainer.append(processBtn, downloadBtn, copyBtn, toggleBtn);

  const statsBar = document.createElement('div');
  statsBar.style.cssText =
    'display: none; padding: 8px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 8px; font-size: 11px; font-family: monospace; color: #333;';

  const jsonViewer = document.createElement('div');
  jsonViewer.style.cssText = `
    display: none; max-height: 600px; overflow-y: auto; background: #1e1e1e;
    border: 1px solid #000; border-radius: 4px; padding: 10px;
    font-family: 'Consolas', 'Monaco', monospace; font-size: 10px; color: #d4d4d4; line-height: 1.5;
  `;

  let processedJSON = null;
  let positionCache = new Map();
  let userScrolledUp = false;

  const isNearBottom = (element) => {
    const threshold = 100;
    return element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
  };

  jsonViewer.addEventListener('scroll', () => {
    userScrolledUp = !isNearBottom(jsonViewer);
  });

  const smartScroll = () => {
    if (!userScrolledUp) {
      jsonViewer.scrollTop = 0;
    }
  };

  toggleBtn.onclick = () => {
    const hidden = jsonViewer.style.display === 'none';
    jsonViewer.style.display = hidden ? 'block' : 'none';
    toggleBtn.textContent = hidden ? 'Hide JSON ▲' : 'Show JSON ▼';
    if (hidden) {
      userScrolledUp = false;
      smartScroll();
    }
  };

  const updateStats = throttle((json) => {
    const all = Object.values(json.markers || {}).flat();
    const matched = all.filter((s) => s.status === 'MATCHED').length;
    const merged = all.filter((s) => s.status === 'MERGED').length;
    const orphaned = all.filter((s) => s.status?.includes('ORPHAN')).length;
    const total = json.totalMarkers || all.length;
    const percent = total ? Math.round(((matched + merged) / total) * 100) : 0;

    statsBar.textContent = `✅ ${matched} | 🔗 ${merged} | ❌ ${orphaned} | 📊 ${total} | 🎯 ${percent}%`;
  }, 300);

  // ===== SHOW ALL FIELDS (just exclude prev* methods) =====
  const renderPosition = (item) => {
    const colors = {
      MATCHED: '#4CAF50', MERGED: '#FF9800', ORPHAN: '#F44336',
      ORPHAN_GROUP: '#9C27B0', GAP: '#666'
    };
    const color = colors[item.status] || '#666';

    // Clone and process the item
    const data = {};

    Object.keys(item).forEach(key => {
      // Only exclude prev* context methods
      if (key.startsWith('prev')) return;

      const value = item[key];

      // Truncate long strings
      if (typeof value === 'string' && value.length > 200) {
        data[key] = truncate(value, 200);
      }
      // Copy everything else as-is (including arrays, objects, etc)
      else {
        data[key] = value;
      }
    });

    const json = JSON.stringify(data, null, 2).split('\n').map(l => '  ' + l).join('\n');

    return `
      <div id="pos-${item.position}" style="margin-bottom: 10px; padding: 8px; background: #2d2d2d; border-left: 4px solid ${color}; border-radius: 3px;">
        <div style="color: ${color}; font-weight: bold; margin-bottom: 4px; font-size: 11px;">#${item.position}: ${item.domainIndex} - ${item.status}</div>
        <pre style="margin: 0; color: #d4d4d4; font-size: 9px; white-space: pre-wrap; line-height: 1.4;">${json}</pre>
      </div>
    `;
  };

  const updateJSONView = throttle((json, changedPos = [], fullRebuild = false) => {
    const items = getPositionOrderedData(json);

    if (fullRebuild) {
      jsonViewer.innerHTML = items.map(item => renderPosition(item)).join('');
      items.forEach(item => positionCache.set(item.position, item.status));
      userScrolledUp = false;
      smartScroll();
    } else if (changedPos.length) {
      changedPos.forEach(pos => {
        const item = items.find(i => i.position === pos);
        if (!item) return;

        const existing = jsonViewer.querySelector(`#pos-${pos}`);
        const temp = document.createElement('div');
        temp.innerHTML = renderPosition(item);

        if (existing) {
          existing.replaceWith(temp.firstElementChild);
        } else {
          jsonViewer.appendChild(temp.firstElementChild);
        }
        positionCache.set(pos, item.status);
      });
      smartScroll();
    }
  }, 400);

  processBtn.onclick = async () => {
    processBtn.disabled = true;
    processBtn.textContent = 'Initializing...';
    status.textContent = 'Loading...';
    positionCache.clear();
    userScrolledUp = false;

    try {
      await loadCompoundData();
      const result = await processTrack(track);
      const sourceJSON = await getOrCreateJSON(track);

      const processor = new StreamingTranslationProcessor(JSON.parse(JSON.stringify(sourceJSON)));

      statsBar.style.display = 'block';
      toggleBtn.style.display = 'inline-block';
      jsonViewer.style.display = 'block';
      toggleBtn.textContent = 'Hide JSON ▲';

      updateStats(sourceJSON);
      updateJSONView(sourceJSON, [], true);

      status.textContent = 'Opening AI Studio...';
      processBtn.textContent = 'Processing...';

      let lastText = '';
      let cleanup;

      const handler = (e) => {
        const msg = e.detail;

        if (msg.action === 'aiStudioUpdate') {
          const chunk = msg.currentText.substring(lastText.length);
          if (chunk) {
            const result = processor.processChunk(chunk);
            const currentJSON = processor.getUpdatedJSON();

            updateStats(currentJSON);
            if (result.changedPositions?.length) {
              updateJSONView(currentJSON, result.changedPositions, false);
            }

            status.textContent = `Processing: ${processor.stats.matched} matched, ${processor.stats.merged} merged`;
            processor.clearChangedPositions();
          }
          lastText = msg.currentText;

          if (msg.isComplete) {
            processor.finalize();
            processedJSON = processor.getUpdatedJSON();

            userScrolledUp = false;
            updateStats(processedJSON);
            updateJSONView(processedJSON, [], true);
            copyToClipboard(formatJSON(processedJSON));

            const stats = getGlobalStats(processedJSON);
            const rate = ((processor.stats.matched + processor.stats.merged) / sourceJSON.totalMarkers * 100).toFixed(1);

            status.innerHTML = `✅ Complete! ${rate}% • ${stats.totalUtterances} utterances • JSON copied`;
            status.style.color = '#27ae60';

            processBtn.textContent = 'Done ✓';
            processBtn.style.background = '#27ae60';
            downloadBtn.style.display = 'inline-block';
            copyBtn.style.display = 'inline-block';

            cleanup();

            setTimeout(() => {
              processBtn.textContent = 'Process Translation';
              processBtn.style.background = '#000';
              processBtn.disabled = false;
            }, 3000);
          }
        }

        if (msg.action === 'aiStudioError' || msg.action === 'aiStudioClosed') {
          status.textContent = msg.action === 'aiStudioError' ? `❌ ${msg.error}` : '⚠️ AI Studio closed';
          status.style.color = '#d32f2f';
          processBtn.disabled = false;
          processBtn.textContent = 'Process Translation';
          cleanup();
        }

        if (msg.action === 'aiStudioStarted') {
          status.textContent = 'AI Studio started...';
        }
      };

      cleanup = () => window.removeEventListener('aiStudioMessage', handler);
      window.addEventListener('aiStudioMessage', handler);

      chrome.runtime.sendMessage({
        action: 'openAIStudio',
        promptText: result.content,
        cardName: `Translation: ${track.languageCode || 'Unknown'}`
      });
    } catch (err) {
      status.textContent = `❌ ${err.message}`;
      status.style.color = '#d32f2f';
      processBtn.disabled = false;
      processBtn.textContent = 'Process Translation';
    }
  };

  downloadBtn.onclick = () => {
    if (processedJSON) {
      downloadFile(formatJSON(processedJSON), `${getVideoId()}_translation.json`, 'application/json');
      downloadBtn.textContent = 'Downloaded ✓';
      setTimeout(() => (downloadBtn.textContent = 'Download JSON'), 2000);
    }
  };

  copyBtn.onclick = () => {
    if (processedJSON) {
      copyToClipboard(formatJSON(processedJSON));
      copyBtn.textContent = 'Copied ✓';
      setTimeout(() => (copyBtn.textContent = 'Copy JSON'), 2000);
    }
  };

  container.append(title, status, btnContainer, statsBar, jsonViewer);
  return container;
};

export const clearProcessorCache = () => {
  const currentVideoId = getVideoId();
  if (currentVideoId !== lastClearedVideoId) {
    clearCache('content');
    clearCache('json');
    lastClearedVideoId = currentVideoId;
  }
};