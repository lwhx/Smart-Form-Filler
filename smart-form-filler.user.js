// ==UserScript==
// @name         表单填充助手
// @namespace    https://github.com/yourname/enhanced-autofill
// @version      1.1.1
// @description  支持保存/填充各类表单数据(输入框、文本域、下拉框、单选框、复选框)，支持预设规则与自定义标题，完美适配移动端。支持Supabase云端同步。
// @author       flykkk
// @include      *://*/*login*
// @include      *://*/register
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      nqxfpgqwpwawbovhclfe.supabase.co
// @run-at       document-end
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // 防止在 iframe 中重复运行（解决页面中页面卡顿问题）
    if (window.self !== window.top) {
        // 在 iframe 中不执行，避免重复创建UI导致卡顿
        return;
    }

    // ---------- 样式注入 (简洁美观、易用设计) ----------
    GM_addStyle(`
        :root {
            --eaf-primary: #4a90d9;
            --eaf-primary-hover: #3a7bc8;
            --eaf-bg: #ffffff;
            --eaf-surface: #f5f7fa;
            --eaf-border: #e1e4e8;
            --eaf-text: #24292e;
            --eaf-text-secondary: #586069;
            --eaf-success: #28a745;
            --eaf-danger: #dc3545;
            --eaf-shadow: 0 2px 8px rgba(0,0,0,0.08);
            --eaf-shadow-lg: 0 4px 16px rgba(0,0,0,0.12);
        }

        /* 主按钮 */
        #enhanced-autofill-widget {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 2147483647;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        .eaf-btn {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: #4a90d9;
            color: white;
            border: none;
            box-shadow: 0 4px 12px rgba(74, 144, 217, 0.35);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.25s ease;
            outline: none;
        }
        .eaf-btn:hover {
            background: #3a7bc8;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(74, 144, 217, 0.45);
        }
        .eaf-btn:active {
            transform: translateY(0);
        }
        .eaf-btn svg {
            width: 24px;
            height: 24px;
            fill: none;
            stroke: white;
            stroke-width: 2;
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        /* 菜单面板 */
        .eaf-panel {
            position: fixed;
            bottom: 86px;
            right: 20px;
            background: var(--eaf-bg);
            border-radius: 12px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.15);
            padding: 8px 0;
            min-width: 200px;
            z-index: 2147483647;
            border: 1px solid var(--eaf-border);
            font-size: 14px;
            color: var(--eaf-text);
        }

        /* 菜单项 */
        .eaf-menu-item {
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            transition: all 0.15s;
            color: var(--eaf-text);
        }
        .eaf-menu-item:hover {
            background: var(--eaf-surface);
        }
        .eaf-menu-item:active {
            background: #e8ecf1;
        }
        .eaf-icon {
            font-size: 18px;
            width: 24px;
            text-align: center;
        }

        /* 侧边栏 */
        .eaf-sidebar {
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            width: 380px;
            max-width: 100vw;
            background: var(--eaf-bg);
            box-shadow: -4px 0 20px rgba(0,0,0,0.1);
            z-index: 2147483647;
            transform: translateX(100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            flex-direction: column;
            font-size: 14px;
        }
        .eaf-sidebar.visible {
            transform: translateX(0);
        }

        /* 侧边栏头部 */
        .eaf-sidebar-header {
            padding: 16px 20px;
            border-bottom: 1px solid var(--eaf-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #4a90d9;
            color: white;
            flex-shrink: 0;
        }
        .eaf-sidebar-header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: white;
        }
        .eaf-sidebar-close {
            background: rgba(255,255,255,0.15);
            border: none;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            color: white;
            font-size: 18px;
        }
        .eaf-sidebar-close:hover {
            background: rgba(255,255,255,0.25);
        }

        /* 侧边栏内容 */
        .eaf-sidebar-body {
            padding: 16px 20px;
            overflow-y: auto;
            flex: 1;
        }
        .eaf-sidebar-body::-webkit-scrollbar {
            width: 6px;
        }
        .eaf-sidebar-body::-webkit-scrollbar-track {
            background: transparent;
        }
        .eaf-sidebar-body::-webkit-scrollbar-thumb {
            background: #d1d5da;
            border-radius: 3px;
        }

        /* 输入框 */
        .eaf-input, .eaf-textarea {
            width: 100%;
            padding: 10px 14px;
            margin: 8px 0;
            background: var(--eaf-bg);
            border: 1px solid var(--eaf-border);
            border-radius: 8px;
            color: var(--eaf-text);
            font-size: 14px;
            box-sizing: border-box;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        .eaf-input:focus, .eaf-textarea:focus {
            outline: none;
            border-color: var(--eaf-primary);
            box-shadow: 0 0 0 3px rgba(74,144,217,0.15);
        }
        .eaf-input::placeholder {
            color: #a0a0a0;
        }

        /* 按钮 */
        .eaf-button-row {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 16px;
        }
        .eaf-button {
            padding: 8px 16px;
            border-radius: 6px;
            border: 1px solid var(--eaf-border);
            background: var(--eaf-bg);
            color: var(--eaf-text);
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s;
        }
        .eaf-button:hover {
            background: var(--eaf-surface);
            border-color: #c6cbd1;
        }
        .eaf-button-primary {
            background: var(--eaf-primary);
            border-color: var(--eaf-primary);
            color: white;
        }
        .eaf-button-primary:hover {
            background: var(--eaf-primary-hover);
            border-color: var(--eaf-primary-hover);
        }
        .eaf-button-danger {
            color: var(--eaf-danger);
            border-color: #f5c6cb;
        }
        .eaf-button-danger:hover {
            background: #f8d7da;
            border-color: #f1b0b7;
        }

        /* 列表项 */
        .eaf-list-item {
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            transition: background 0.15s;
            border-radius: 8px;
            margin: 4px 0;
            color: var(--eaf-text);
        }
        .eaf-list-item:hover {
            background: var(--eaf-surface);
        }
        .eaf-title {
            font-weight: 500;
            flex: 1;
        }
        .eaf-badge {
            background: #e1e4e8;
            color: var(--eaf-text-secondary);
            border-radius: 12px;
            padding: 2px 8px;
            font-size: 11px;
            font-weight: 500;
        }

        /* 字段卡片 */
        .eaf-field-row {
            background: var(--eaf-surface);
            border-radius: 8px;
            margin: 8px 0;
            padding: 12px;
            border: 1px solid var(--eaf-border);
        }
        .eaf-field-row-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        .eaf-field-row-title {
            font-weight: 500;
            color: var(--eaf-text);
        }
        .eaf-small-btn {
            background: var(--eaf-bg);
            border: 1px solid var(--eaf-border);
            color: var(--eaf-text-secondary);
            border-radius: 4px;
            padding: 4px 10px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.15s;
        }
        .eaf-small-btn:hover {
            background: #f0f0f0;
            color: var(--eaf-text);
        }
        .eaf-small-btn.danger:hover {
            color: var(--eaf-danger);
            border-color: #f5c6cb;
            background: #f8d7da;
        }

        /* 添加字段按钮 */
        .eaf-add-field-btn {
            width: 100%;
            padding: 10px;
            border: 2px dashed var(--eaf-border);
            border-radius: 8px;
            background: transparent;
            color: var(--eaf-text-secondary);
            cursor: pointer;
            font-size: 13px;
            transition: all 0.15s;
            margin-top: 8px;
        }
        .eaf-add-field-btn:hover {
            border-color: var(--eaf-primary);
            color: var(--eaf-primary);
            background: rgba(74,144,217,0.05);
        }

        /* 滚动区域 */
        .eaf-scroll {
            max-height: 50vh;
            overflow-y: auto;
        }
        .eaf-scroll::-webkit-scrollbar {
            width: 6px;
        }
        .eaf-scroll::-webkit-scrollbar-track {
            background: transparent;
        }
        .eaf-scroll::-webkit-scrollbar-thumb {
            background: #d1d5da;
            border-radius: 3px;
        }

        /* 空状态 */
        .eaf-empty {
            text-align: center;
            padding: 40px 20px;
            color: var(--eaf-text-secondary);
        }
        .eaf-empty-icon {
            font-size: 48px;
            margin-bottom: 12px;
            opacity: 0.5;
        }

        /* Toast 提示 */
        .eaf-toast {
            position: fixed;
            bottom: 90px;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            background: #333;
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 2147483647;
            opacity: 0;
            transition: all 0.3s ease;
            pointer-events: none;
        }
        .eaf-toast.visible {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        .eaf-toast.success {
            background: var(--eaf-success);
        }
        .eaf-toast.error {
            background: var(--eaf-danger);
        }

        /* 分组标题 */
        .eaf-group-title {
            padding: 8px 16px 4px;
            font-size: 12px;
            font-weight: 600;
            color: var(--eaf-text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* 移动端适配 */
        @media (max-width: 640px) {
            #enhanced-autofill-widget {
                bottom: 16px;
                right: 16px;
            }
            .eaf-btn {
                width: 48px;
                height: 48px;
                font-size: 20px;
            }
            .eaf-panel {
                right: 12px;
                bottom: 76px;
                min-width: 180px;
            }
            .eaf-modal {
                width: 92vw;
            }
        }
    `);

    // ---------- 存储 Keys ----------
    const STORAGE_SAVED_FORMS = 'eaf_saved_forms';
    const STORAGE_PRESETS = 'eaf_presets';
    const STORAGE_DRAFTS = 'eaf_drafts';
    const STORAGE_STATS = 'eaf_stats';
    const STORAGE_TAGS = 'eaf_tags';
    const STORAGE_SUPABASE_KEY = 'eaf_supabase_anon_key';
    const STORAGE_SYNC_STATE = 'eaf_sync_state';
    const STORAGE_DELETED_IDS = 'eaf_deleted_ids';

    // ---------- 全局数据 ----------
    let savedForms = [];     // { id, title, fields, url, tags, createdAt }
    let deletedIds = [];     // 增量同步用：记录已删除的表单/预设 ID
    let presets = [];       // { id, name, fields, urlPattern }
    let fillHistory = [];   // 撤销用：保存填充前的状态
    let currentDraft = null;
    let stats = { fillCount: 0, exportCount: 0, lastUsed: null };

    // ---------- Supabase 云端同步配置 ----------
    const SUPABASE_CONFIG = {
        url: 'https://nqxfpgqwpwawbovhclfe.supabase.co',
        get anonKey() {
            return GM_getValue(STORAGE_SUPABASE_KEY, '');
        },
        set anonKey(val) {
            GM_setValue(STORAGE_SUPABASE_KEY, val);
        },
        get isEnabled() {
            return !!this.anonKey;
        }
    };

    // ---------- 同步状态管理 ----------
    let syncState = {
        lastSyncTime: null,
        isSyncing: false,
        lastError: null
    };

    function loadSyncState() {
        syncState = GM_getValue(STORAGE_SYNC_STATE, {
            lastSyncTime: null,
            isSyncing: false,
            lastError: null
        });
    }

    function saveSyncState() {
        GM_setValue(STORAGE_SYNC_STATE, {
            lastSyncTime: syncState.lastSyncTime,
            isSyncing: false,
            lastError: syncState.lastError
        });
    }

    // ---------- Supabase REST API 封装 ----------
    const SupabaseAPI = {
        _request(method, table, data, queryParams) {
            return new Promise((resolve, reject) => {
                if (!SUPABASE_CONFIG.isEnabled) {
                    reject(new Error('Supabase 未配置'));
                    return;
                }

                let url = `${SUPABASE_CONFIG.url}/rest/v1/${table}`;
                if (queryParams) {
                    url += `?${queryParams}`;
                }

                const options = {
                    method: method,
                    url: url,
                    headers: {
                        'apikey': SUPABASE_CONFIG.anonKey,
                        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': method === 'POST' ? 'return=representation' :
                                  method === 'PATCH' ? 'return=representation' : 'count=exact'
                    },
                    onload(response) {
                        try {
                            if (response.status >= 200 && response.status < 300) {
                                const body = response.responseText;
                                resolve(body ? JSON.parse(body) : null);
                            } else {
                                reject(new Error(`Supabase API 错误: ${response.status} ${response.statusText}`));
                            }
                        } catch (e) {
                            reject(new Error(`响应解析失败: ${e.message}`));
                        }
                    },
                    onerror(error) {
                        reject(new Error(`网络请求失败: ${error}`));
                    },
                    ontimeout() {
                        reject(new Error('请求超时'));
                    }
                };

                if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE')) {
                    options.data = JSON.stringify(data);
                }

                GM_xmlhttpRequest(options);
            });
        },

        select(table, queryParams) {
            return this._request('GET', table, null, queryParams);
        },

        insert(table, data) {
            return this._request('POST', table, data);
        },

        update(table, data, queryParams) {
            return this._request('PATCH', table, data, queryParams);
        },

        upsert(table, data) {
            return new Promise((resolve, reject) => {
                if (!SUPABASE_CONFIG.isEnabled) {
                    reject(new Error('Supabase 未配置'));
                    return;
                }

                const url = `${SUPABASE_CONFIG.url}/rest/v1/${table}`;

                const options = {
                    method: 'POST',
                    url: url,
                    headers: {
                        'apikey': SUPABASE_CONFIG.anonKey,
                        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'resolution=merge-duplicates,return=representation'
                    },
                    data: JSON.stringify(data),
                    onload(response) {
                        try {
                            if (response.status >= 200 && response.status < 300) {
                                const body = response.responseText;
                                resolve(body ? JSON.parse(body) : null);
                            } else {
                                reject(new Error(`Supabase upsert 错误: ${response.status} ${response.statusText}`));
                            }
                        } catch (e) {
                            reject(new Error(`响应解析失败: ${e.message}`));
                        }
                    },
                    onerror(error) {
                        reject(new Error(`网络请求失败: ${error}`));
                    },
                    ontimeout() {
                        reject(new Error('请求超时'));
                    }
                };

                GM_xmlhttpRequest(options);
            });
        },

        delete_(table, queryParams) {
            return this._request('DELETE', table, null, queryParams);
        }
    };

    // ---------- Supabase 双向同步逻辑 ----------

    async function syncToRemote(silent = false) {
        if (!SUPABASE_CONFIG.isEnabled || syncState.isSyncing) return;

        syncState.isSyncing = true;
        syncState.lastError = null;

        try {
            const now = Date.now();
            const lastSync = syncState.lastSyncTime || 0;
            let uploadedCount = 0;
            let deletedCount = 0;

            // 增量上传：只上传 updatedAt > lastSyncTime 的表单
            for (const form of savedForms) {
                const formUpdated = form.updatedAt || form.createdAt || 0;
                if (lastSync > 0 && formUpdated <= lastSync) continue;

                const record = {
                    id: form.id,
                    title: form.title,
                    fields: JSON.stringify(form.fields),
                    url: form.url || '',
                    domain: form.domain || '',
                    tags: JSON.stringify(form.tags || []),
                    created_at: form.createdAt || now,
                    updated_at: now,
                    synced_at: now
                };
                await SupabaseAPI.upsert('autofill_forms', record);
                uploadedCount++;
            }

            // 增量上传：只上传 updatedAt > lastSyncTime 的预设
            for (const preset of presets) {
                const presetUpdated = preset.updatedAt || preset.createdAt || 0;
                if (lastSync > 0 && presetUpdated <= lastSync) continue;

                const record = {
                    id: preset.id,
                    name: preset.name,
                    fields: JSON.stringify(preset.fields),
                    url_pattern: preset.urlPattern || '',
                    created_at: preset.createdAt || now,
                    updated_at: now,
                    synced_at: now
                };
                await SupabaseAPI.upsert('autofill_presets', record);
                uploadedCount++;
            }

            // 同步统计数据（始终上传，数据量小）
            const statsRecord = {
                id: 'default',
                fill_count: stats.fillCount || 0,
                export_count: stats.exportCount || 0,
                last_used: stats.lastUsed,
                synced_at: now
            };
            await SupabaseAPI.upsert('autofill_stats', statsRecord);

            // 增量删除：只删除本地上次同步后删除的记录
            const pendingDeletes = deletedIds.filter(d => !lastSync || (d.deletedAt || 0) > lastSync);
            for (const item of pendingDeletes) {
                const table = item.type === 'preset' ? 'autofill_presets' : 'autofill_forms';
                await SupabaseAPI.delete_(table, `id=eq.${item.id}`);
                deletedCount++;
            }

            // 清空已同步的删除记录
            deletedIds = [];
            GM_setValue(STORAGE_DELETED_IDS, deletedIds);

            syncState.lastSyncTime = now;
            if (!silent) {
                const msg = uploadedCount > 0 || deletedCount > 0
                    ? `☁️ 同步成功（上传${uploadedCount}项，删除${deletedCount}项）`
                    : '☁️ 数据已是最新';
                showToast(msg, 'success');
            }
        } catch (e) {
            _dataDirty = true; // 同步失败，保留脏标记
            syncState.lastError = e.message;
            console.error('[Autofill] 同步到云端失败:', e);
            if (!silent) showToast(`同步失败: ${e.message}`, 'error');
        } finally {
            syncState.isSyncing = false;
            saveSyncState();
        }
    }

    async function syncFromRemote(silent = false) {
        if (!SUPABASE_CONFIG.isEnabled || syncState.isSyncing) return;

        syncState.isSyncing = true;
        syncState.lastError = null;

        try {
            // 从云端拉取表单数据
            const remoteForms = await SupabaseAPI.select('autofill_forms', 'select=*&order=created_at.desc');
            const mappedRemoteForms = remoteForms.map(rf => ({
                id: rf.id,
                title: rf.title,
                fields: typeof rf.fields === 'string' ? JSON.parse(rf.fields) : rf.fields,
                url: rf.url,
                domain: rf.domain || '',
                tags: typeof rf.tags === 'string' ? JSON.parse(rf.tags) : (rf.tags || []),
                createdAt: rf.created_at,
                updatedAt: rf.updated_at,
                syncedAt: rf.synced_at
            }));

            // 冲突检测（非静默模式才弹窗）
            const conflicts = detectConflicts(savedForms, mappedRemoteForms);
            if (conflicts.length > 0 && !silent) {
                const decisions = await showConflictDialog(conflicts);
                // 应用用户选择
                const decisionMap = new Map();
                decisions.forEach(d => decisionMap.set(d.id, d));

                // 先用默认合并，再用用户选择覆盖
                const mergedForms = mergeForms(savedForms, mappedRemoteForms);
                for (const [id, chosen] of decisionMap) {
                    const idx = mergedForms.findIndex(f => f.id === id);
                    if (idx >= 0) {
                        mergedForms[idx] = { ...chosen, syncedAt: Date.now() };
                    }
                }
                savedForms = mergedForms;
            } else {
                const mergedForms = mergeForms(savedForms, mappedRemoteForms);
                savedForms = mergedForms;
            }
            saveForms();

            // 从云端拉取预设规则
            const remotePresets = await SupabaseAPI.select('autofill_presets', 'select=*&order=created_at.desc');
            const mergedPresets = mergePresets(presets, remotePresets.map(rp => ({
                id: rp.id,
                name: rp.name,
                fields: typeof rp.fields === 'string' ? JSON.parse(rp.fields) : rp.fields,
                urlPattern: rp.url_pattern,
                createdAt: rp.created_at
            })));
            presets = mergedPresets;
            savePresets();

            // 从云端拉取统计数据（取较大的值）
            const remoteStats = await SupabaseAPI.select('autofill_stats', 'select=*&id=eq.default');
            if (remoteStats && remoteStats.length > 0) {
                const rs = remoteStats[0];
                stats.fillCount = Math.max(stats.fillCount || 0, rs.fill_count || 0);
                stats.exportCount = Math.max(stats.exportCount || 0, rs.export_count || 0);
                if (rs.last_used) {
                    stats.lastUsed = Math.max(stats.lastUsed || 0, rs.last_used);
                }
                saveStats();
            }

            syncState.lastSyncTime = Date.now();
            if (!silent) showToast('☁️ 从云端同步成功', 'success');
        } catch (e) {
            syncState.lastError = e.message;
            console.error('[Autofill] 从云端同步失败:', e);
            if (!silent) showToast(`同步失败: ${e.message}`, 'error');
        } finally {
            syncState.isSyncing = false;
            saveSyncState();
        }
    }

    // 检测冲突：本地和远端都有更新
    function detectConflicts(localForms, remoteForms) {
        const localMap = new Map();
        for (const f of localForms) localMap.set(f.id, f);

        const conflicts = [];
        for (const remote of remoteForms) {
            const local = localMap.get(remote.id);
            if (!local) continue;

            const localUpdated = local.updatedAt || local.createdAt || 0;
            const remoteUpdated = remote.updatedAt || remote.createdAt || 0;
            const localSynced = local.syncedAt || 0;

            // 本地有更新（比上次同步更新）且远端也有更新（比本地更新时间新）
            if (localUpdated > localSynced && remoteUpdated > localSynced && localUpdated !== remoteUpdated) {
                conflicts.push({ local, remote });
            }
        }
        return conflicts;
    }

    // 冲突解决弹窗
    function showConflictDialog(conflicts) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed; inset: 0; background: rgba(0,0,0,0.5);
                z-index: 2147483646; display: flex; align-items: center; justify-content: center;
            `;

            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: white; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.2);
                max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;

            let itemsHtml = conflicts.map((c, i) => `
                <div style="padding:12px;border:1px solid var(--eaf-border);border-radius:8px;margin:8px 0;">
                    <div style="font-weight:500;margin-bottom:8px;">${escapeHtml(c.local.title || c.remote.title)}</div>
                    <div style="display:flex;gap:8px;">
                        <label style="flex:1;padding:8px;border:2px solid var(--eaf-border);border-radius:6px;cursor:pointer;text-align:center;font-size:12px;">
                            <input type="radio" name="conflict-${i}" value="local" checked>
                            <div style="margin-top:4px;font-weight:500;">📁 本地版本</div>
                            <div style="color:var(--eaf-text-secondary);margin-top:2px;">${c.local.updatedAt ? new Date(c.local.updatedAt).toLocaleString() : '未知'}</div>
                        </label>
                        <label style="flex:1;padding:8px;border:2px solid var(--eaf-border);border-radius:6px;cursor:pointer;text-align:center;font-size:12px;">
                            <input type="radio" name="conflict-${i}" value="remote">
                            <div style="margin-top:4px;font-weight:500;">☁️ 云端版本</div>
                            <div style="color:var(--eaf-text-secondary);margin-top:2px;">${c.remote.updatedAt ? new Date(c.remote.updatedAt).toLocaleString() : '未知'}</div>
                        </label>
                    </div>
                </div>
            `).join('');

            dialog.innerHTML = `
                <div style="padding:16px 20px;border-bottom:1px solid var(--eaf-border);background:#fff3cd;border-radius:12px 12px 0 0;">
                    <div style="font-size:16px;font-weight:600;color:#856404;">⚠️ 发现同步冲突</div>
                    <div style="font-size:13px;color:#856404;margin-top:4px;">以下数据在本地和云端都被修改，请选择保留版本</div>
                </div>
                <div style="padding:16px 20px;">
                    ${itemsHtml}
                </div>
                <div style="padding:12px 20px;text-align:right;border-top:1px solid var(--eaf-border);">
                    <button id="conflict-apply-btn" style="padding:8px 20px;background:#4a90d9;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;">应用选择</button>
                </div>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            dialog.querySelector('#conflict-apply-btn').onclick = () => {
                const decisions = [];
                conflicts.forEach((c, i) => {
                    const selected = dialog.querySelector(`input[name="conflict-${i}"]:checked`).value;
                    decisions.push(selected === 'local' ? c.local : c.remote);
                });
                overlay.remove();
                resolve(decisions);
            };
        });
    }

    // 合并表单数据（冲突感知）
    function mergeForms(localForms, remoteForms) {
        const merged = new Map();

        for (const form of localForms) {
            merged.set(form.id, form);
        }

        for (const remote of remoteForms) {
            const local = merged.get(remote.id);
            if (!local) {
                merged.set(remote.id, remote);
            } else {
                const localTime = local.updatedAt || local.createdAt || 0;
                const remoteTime = remote.updatedAt || remote.createdAt || 0;
                if (remoteTime > localTime) {
                    merged.set(remote.id, remote);
                }
            }
        }

        return Array.from(merged.values());
    }

    // 合并预设数据
    function mergePresets(localPresets, remotePresets) {
        const merged = new Map();

        for (const preset of localPresets) {
            merged.set(preset.id, preset);
        }

        for (const remote of remotePresets) {
            const local = merged.get(remote.id);
            if (!local) {
                merged.set(remote.id, remote);
            } else {
                const localTime = local.createdAt || 0;
                const remoteTime = remote.createdAt || 0;
                if (remoteTime > localTime) {
                    merged.set(remote.id, remote);
                }
            }
        }

        return Array.from(merged.values());
    }

    // 双向同步入口（先拉取再推送）
    async function fullSync() {
        if (!SUPABASE_CONFIG.isEnabled) {
            showToast('请先配置 Supabase Anon Key', 'error');
            return;
        }
        try {
            await syncFromRemote();
            await syncToRemote();
        } catch (e) {
            console.error('[Autofill] 全量同步失败:', e);
        }
    }

    // ---------- 辅助函数 ----------
    function loadData() {
        savedForms = GM_getValue(STORAGE_SAVED_FORMS, []);
        presets = GM_getValue(STORAGE_PRESETS, []);
        stats = GM_getValue(STORAGE_STATS, { fillCount: 0, exportCount: 0, lastUsed: null });
        deletedIds = GM_getValue(STORAGE_DELETED_IDS, []);
        loadSyncState();
        loadFieldAliases();
    }

    // 防抖自动上传到云端（避免频繁请求）
    let _autoSyncTimer = null;
    let _dataDirty = false; // 脏标记：数据是否变更
    function markDirty() {
        _dataDirty = true;
    }
    function scheduleAutoSync() {
        if (!SUPABASE_CONFIG.isEnabled) return;
        if (_autoSyncTimer) clearTimeout(_autoSyncTimer);
        _autoSyncTimer = setTimeout(async () => {
            if (!_dataDirty) return; // 无变更则跳过同步
            _dataDirty = false;
            try {
                await syncToRemote(true);
            } catch (e) {
                _dataDirty = true; // 同步失败，保留脏标记
                console.debug('[Autofill] 自动同步失败:', e);
            }
        }, 3000);
    }

    function saveForms() {
        GM_setValue(STORAGE_SAVED_FORMS, savedForms);
        markDirty();
        scheduleAutoSync();
    }
    function savePresets() {
        GM_setValue(STORAGE_PRESETS, presets);
        markDirty();
        scheduleAutoSync();
    }
    function saveStats() {
        GM_setValue(STORAGE_STATS, stats);
        markDirty();
        scheduleAutoSync();
    }

    // 生成简单ID
    function generateId() {
        return Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    }

    // ---------- 1. 数据导出/导入 ----------
    function exportData() {
        const data = {
            version: '1.0',
            exportTime: Date.now(),
            savedForms: savedForms,
            presets: presets
        };
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `表单数据_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        stats.exportCount++;
        saveStats();
        showToast('导出成功', 'success');
    }

    function importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.savedForms) {
                    const existingIds = new Set(savedForms.map(f => f.id));
                    const newForms = data.savedForms.filter(f => !existingIds.has(f.id));
                    savedForms.push(...newForms);
                    saveForms();
                }
                if (data.presets) {
                    const existingIds = new Set(presets.map(p => p.id));
                    const newPresets = data.presets.filter(p => !existingIds.has(p.id));
                    presets.push(...newPresets);
                    savePresets();
                }
                showToast(`导入成功：${data.savedForms?.length || 0}个表单，${data.presets?.length || 0}个预设`, 'success');
            } catch (err) {
                showToast('导入失败：文件格式错误', 'error');
            }
        };
        reader.readAsText(file);
    }

    // ---------- 2. 一键撤销填充 ----------
    function saveFillHistory() {
        fillHistory.push(getCachedFormFields());
        if (fillHistory.length > 10) fillHistory.shift();
    }

    function undoLastFill() {
        if (fillHistory.length === 0) {
            showToast('没有可撤销的操作', 'error');
            return;
        }
        const previousState = fillHistory.pop();

        // 使用填充函数恢复之前状态（不保存历史，允许恢复空值）
        fillFormWithFields(previousState, false, true);
        showToast('已撤销填充', 'success');
    }

    function findElementByIdentifier(identifier) {
        const all = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea');
        for (let el of all) {
            if (getElementIdentifier(el) === identifier) return el;
        }
        return null;
    }

    // ---------- 3. 快捷键操作 ----------
    function setupShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+F 快速填充最近一条
            if (e.ctrlKey && e.shiftKey && e.key === 'F') {
                e.preventDefault();
                if (savedForms.length > 0) {
                    saveFillHistory();
                    fillFormWithFields(savedForms[0].fields);
                    stats.fillCount++;
                    stats.lastUsed = Date.now();
                    saveStats();
                } else {
                    showToast('没有保存的表单', 'error');
                }
            }
            // Ctrl+Shift+Z 撤销
            if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
                e.preventDefault();
                undoLastFill();
            }
            // Ctrl+Shift+S 快速保存
            if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                saveCurrentForm();
            }
        });
    }

    // ---------- 自动保存草稿（静默保存，不弹窗） ----------
    let autoSaveTimer = null;
    let _lastDraftJson = ''; // 用于检测草稿是否变化
    function startAutoSave() {
        // 静默保存草稿到本地存储，不弹窗打扰用户
        autoSaveTimer = setInterval(() => {
            const fields = getCachedFormFields();
            const hasContent = fields.some(f => f.value && String(f.value).trim() !== '');
            if (hasContent) {
                const draftJson = JSON.stringify(fields.map(f => ({ identifier: f.identifier, value: f.value })));
                if (draftJson === _lastDraftJson) return; // 内容无变化，跳过保存
                _lastDraftJson = draftJson;
                currentDraft = {
                    url: location.href,
                    title: document.title,
                    fields: fields,
                    savedAt: Date.now()
                };
                GM_setValue('draft_' + location.pathname, JSON.stringify(currentDraft));
            }
        }, 30000);
    }

    // ---------- 5. 智能推荐填充 ----------
    function getRecommendedForms() {
        const currentUrl = location.href;
        const currentDomain = location.hostname;

        return savedForms.filter(form => {
            if (form.url) {
                if (currentUrl.includes(form.url) || form.url.includes(currentDomain)) return true;
            }
            // 域名匹配
            try {
                const formDomain = new URL(form.url || '').hostname;
                if (formDomain === currentDomain) return true;
            } catch (e) {}
            return false;
        }).slice(0, 3);
    }

    // ---------- 6. 智能学习模块 ----------
    const STORAGE_FIELD_ALIASES = 'eaf_field_aliases';

    let fieldAliases = {};

    function loadFieldAliases() {
        fieldAliases = GM_getValue(STORAGE_FIELD_ALIASES, {});
    }

    function saveFieldAliases() {
        GM_setValue(STORAGE_FIELD_ALIASES, fieldAliases);
    }

    // 学习同义词：当两个字段填充了相同的值，它们的标识符可能是同义词
    function learnFromFill(savedFields, currentFields) {
        let learned = 0;

        for (const saved of savedFields) {
            if (!saved.value || saved.type === 'hidden' || saved.type === 'checkbox') continue;

            for (const current of currentFields) {
                if (!current.value || current.type === 'hidden' || current.type === 'checkbox') continue;
                if (saved.identifier === current.identifier) continue;
                if (String(saved.value) !== String(current.value)) continue;

                const key = saved.identifier.toLowerCase().replace(/[*:：\s]/g, '');
                const alias = current.identifier.toLowerCase().replace(/[*:：\s]/g, '');

                if (key === alias) continue;

                if (!fieldAliases[key]) {
                    fieldAliases[key] = new Set();
                    fieldAliases[key].add(saved.identifier);
                }
                if (!fieldAliases[key].has(current.identifier)) {
                    fieldAliases[key].add(current.identifier);
                    learned++;
                }

                if (!fieldAliases[alias]) {
                    fieldAliases[alias] = new Set();
                    fieldAliases[alias].add(current.identifier);
                }
                if (!fieldAliases[alias].has(saved.identifier)) {
                    fieldAliases[alias].add(saved.identifier);
                    learned++;
                }
            }
        }

        if (learned > 0) {
            const serializable = {};
            for (const k in fieldAliases) {
                serializable[k] = Array.from(fieldAliases[k]);
            }
            fieldAliases = serializable;
            saveFieldAliases();
        }

        return learned;
    }

    // 获取标识符的所有同义词
    function getAliasesForIdentifier(identifier) {
        const key = identifier.toLowerCase().replace(/[*:：\s]/g, '');
        const raw = fieldAliases[key];
        if (!raw) return [identifier];
        const aliases = Array.isArray(raw) ? raw : Array.from(raw);
        if (!aliases.includes(identifier)) aliases.unshift(identifier);
        return aliases;
    }

    // 基于智能学习的字段匹配（增强 fuzzyMatch）
    function smartMatchFields(savedFields) {
        const currentFields = getCachedFormFields();
        const matched = [];

        for (const saved of savedFields) {
            const aliases = getAliasesForIdentifier(saved.identifier);

            for (const alias of aliases) {
                for (const current of currentFields) {
                    if (fuzzyMatch(current.identifier, alias)) {
                        matched.push({
                            savedField: saved,
                            currentField: current,
                            alias: alias
                        });
                        break;
                    }
                }
                if (matched.length > 0 && matched[matched.length - 1].savedField === saved) break;
            }
        }

        return matched;
    }

    // ---------- 6. 搜索功能 ----------
    function searchForms(keyword) {
        if (!keyword) return savedForms;
        const k = keyword.toLowerCase();
        return savedForms.filter(form =>
            form.title.toLowerCase().includes(k) ||
            form.fields.some(f => f.identifier.toLowerCase().includes(k))
        );
    }

    function searchPresets(keyword) {
        if (!keyword) return presets;
        const k = keyword.toLowerCase();
        return presets.filter(preset =>
            preset.name.toLowerCase().includes(k) ||
            preset.fields.some(f => f.identifier.toLowerCase().includes(k))
        );
    }

    // ---------- 7. 使用统计 ----------
    function getStats() {
        return {
            totalForms: savedForms.length,
            totalPresets: presets.length,
            fillCount: stats.fillCount,
            exportCount: stats.exportCount,
            lastUsed: stats.lastUsed ? new Date(stats.lastUsed).toLocaleString() : '从未'
        };
    }

    // ========== 增强模块：异步等待机制 ==========

    function waitForElement(selector, timeout = 5000, container = document) {
        return new Promise((resolve, reject) => {
            const element = container.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver((mutations, obs) => {
                const el = container.querySelector(selector);
                if (el) {
                    obs.disconnect();
                    resolve(el);
                }
            });

            observer.observe(container === document ? document.body : container, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`waitForElement timeout: ${selector}`));
            }, timeout);
        });
    }

    function waitForFieldUpdate(field, condition, timeout = 3000) {
        return new Promise((resolve, reject) => {
            if (condition(field)) {
                resolve(field);
                return;
            }

            const observer = new MutationObserver((mutations, obs) => {
                if (condition(field)) {
                    obs.disconnect();
                    resolve(field);
                }
            });

            observer.observe(field, {
                attributes: true,
                childList: true,
                subtree: true,
                characterData: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error('waitForFieldUpdate timeout'));
            }, timeout);
        });
    }

    function waitFor(timeout) {
        return new Promise(resolve => setTimeout(resolve, timeout));
    }

    // ========== 增强模块：组件类型定义 ==========

    const COMPONENT_TYPES = {
        STANDARD_INPUT: 'standard-input',
        STANDARD_SELECT: 'standard-select',
        STANDARD_TEXTAREA: 'standard-textarea',
        STANDARD_RADIO: 'standard-radio',
        STANDARD_CHECKBOX: 'standard-checkbox',

        CONTENTEDITABLE: 'contenteditable',
        ARIA_TEXTBOX: 'aria-textbox',
        ARIA_COMBOBOX: 'aria-combobox',
        ARIA_RADIO: 'aria-radio',
        ARIA_CHECKBOX: 'aria-checkbox',

        CUSTOM_INPUT: 'custom-input',
        CUSTOM_RADIO: 'custom-radio',
        CUSTOM_CHECKBOX: 'custom-checkbox',

        ELEMENT_INPUT: 'element-input',
        ELEMENT_SELECT: 'element-select',
        ELEMENT_RADIO: 'element-radio',
        ELEMENT_CHECKBOX: 'element-checkbox',
        ELEMENT_CASCADER: 'element-cascader',
        ELEMENT_DATE: 'element-date',

        ANT_INPUT: 'ant-input',
        ANT_SELECT: 'ant-select',
        ANT_RADIO: 'ant-radio',
        ANT_CHECKBOX: 'ant-checkbox',
        ANT_CASCADER: 'ant-cascader',
        ANT_DATE: 'ant-date',

        IVIEW_INPUT: 'iview-input',
        IVIEW_SELECT: 'iview-select',
        IVIEW_RADIO: 'iview-radio',
        IVIEW_CHECKBOX: 'iview-checkbox',
        IVIEW_CASCADER: 'iview-cascader',

        ADDRESS_CASCADE_SELECTS: 'address-cascade-selects',

        VANT_INPUT: 'vant-input',
        VANT_SELECT: 'vant-select',
        VANT_RADIO: 'vant-radio',
        VANT_CHECKBOX: 'vant-checkbox',

        NATIVE_DATE: 'native-date',
        NATIVE_TIME: 'native-time'
    };

    // ========== 框架配置表 ==========

    const FRAMEWORK_DETECTION = [
        { prefix: 'element', input: '.el-input', select: '.el-select', radio: '.el-radio', checkbox: '.el-checkbox', cascader: '.el-cascader', date: '.el-date-editor, .el-date-picker' },
        { prefix: 'ant', input: '.ant-input', select: '.ant-select', radio: '.ant-radio', checkbox: '.ant-checkbox', cascader: '.ant-cascader', date: '.ant-picker' },
        { prefix: 'iview', input: '.ivu-input', select: '.ivu-select', radio: '.ivu-radio', checkbox: '.ivu-checkbox', cascader: '.ivu-cascader' },
        { prefix: 'vant', input: '.van-field', select: '.van-picker', radio: '.van-radio', checkbox: '.van-checkbox' }
    ];

    const FRAMEWORK_MAP = {
        element: {
            formItem: '.el-form-item',
            formItemLabel: '.el-form-item__label',
            containerSelectors: '.el-input, .el-select, .el-radio, .el-checkbox, .el-cascader, .el-date-editor',
            radio: { wrappers: ['.el-radio'], checkedClasses: ['is-checked'] },
            checkbox: { wrappers: ['.el-checkbox'], checkedClasses: ['is-checked'] }
        },
        ant: {
            formItem: '.ant-form-item',
            formItemLabel: '.ant-form-item-label label',
            containerSelectors: '.ant-input, .ant-select, .ant-radio, .ant-checkbox, .ant-cascader, .ant-picker',
            radio: { wrappers: ['.ant-radio-wrapper', '.ant-radio'], checkedClasses: ['ant-radio-wrapper-checked', 'ant-radio-checked'] },
            checkbox: { wrappers: ['.ant-checkbox-wrapper', '.ant-checkbox'], checkedClasses: ['ant-checkbox-wrapper-checked', 'ant-checkbox-checked'] }
        },
        iview: {
            formItem: '.ivu-form-item',
            formItemLabel: '.ivu-form-item-label',
            containerSelectors: '.ivu-input, .ivu-select, .ivu-radio, .ivu-checkbox, .ivu-cascader',
            radio: { wrappers: ['.ivu-radio-wrapper'], checkedClasses: ['ivu-radio-checked'] },
            checkbox: { wrappers: ['.ivu-checkbox-wrapper'], checkedClasses: ['ivu-checkbox-checked'] }
        },
        vant: {
            formItem: '.van-field',
            formItemLabel: '.van-field__label',
            containerSelectors: '.van-field, .van-radio, .van-checkbox, .van-picker',
            radio: { wrappers: ['.van-radio'], checkedClasses: ['van-radio--checked'] },
            checkbox: { wrappers: ['.van-checkbox'], checkedClasses: ['van-checkbox--checked'] }
        }
    };

    function getVueInstance(node) {
        if (!node) return null;
        return node.__vue__ || node._vnode?.component?.proxy || node.__vueParentComponent?.proxy || null;
    }

    function findFormItemLabel(element) {
        const allFormItems = Object.values(FRAMEWORK_MAP).map(fw => fw.formItem).join(', ');
        let formItem = element.closest(allFormItems);
        if (formItem && formItem.className && formItem.className.includes('__content')) {
            formItem = formItem.parentElement?.closest(allFormItems);
        }
        if (formItem) {
            for (const fw of Object.values(FRAMEWORK_MAP)) {
                const label = formItem.querySelector(fw.formItemLabel);
                if (label && label.innerText.trim()) return label.innerText.trim();
            }
            const genericLabel = formItem.querySelector('label');
            if (genericLabel && genericLabel.innerText.trim()) return genericLabel.innerText.trim();
        }
        return '';
    }

    function createRadioHandler(config) {
        return {
            getValue: (el) => {
                for (let i = 0; i < config.wrappers.length; i++) {
                    const wrapper = el.closest(config.wrappers[i]);
                    if (wrapper && wrapper.classList.contains(config.checkedClasses[i])) {
                        return el.value;
                    }
                }
                return el.checked ? el.value : '';
            },
            setValue: (el, value) => {
                const wrapper = config.wrappers.reduce((found, sel) => found || el.closest(sel), null);
                if (el.value === value || fuzzyMatch(el.value, String(value))) {
                    if (wrapper) {
                        wrapper.click();
                    } else {
                        el.checked = true;
                        triggerEvents(el, ['change', 'click']);
                    }
                }
            }
        };
    }

    function createCheckboxHandler(config) {
        return {
            getValue: (el) => {
                for (let i = 0; i < config.wrappers.length; i++) {
                    const wrapper = el.closest(config.wrappers[i]);
                    if (wrapper && wrapper.classList.contains(config.checkedClasses[i])) {
                        return true;
                    }
                }
                return el.checked;
            },
            setValue: (el, value) => {
                const wrapper = config.wrappers.reduce((found, sel) => found || el.closest(sel), null);
                const shouldCheck = value === true || value === 'true' || value === el.value;
                if (wrapper) {
                    const isChecked = config.checkedClasses.some(cls => wrapper.classList.contains(cls));
                    if (isChecked !== shouldCheck) {
                        wrapper.click();
                    }
                } else {
                    el.checked = shouldCheck;
                    triggerEvents(el, ['change', 'click']);
                }
            }
        };
    }

    // ========== 增强模块：组件类型检测 ==========

    function detectComponentType(el) {
        if (!el || !el.tagName) return null;

        const tag = el.tagName.toLowerCase();
        const type = (el.type || '').toLowerCase();

        if (tag === 'input') {
            if (type === 'radio') return COMPONENT_TYPES.STANDARD_RADIO;
            if (type === 'checkbox') return COMPONENT_TYPES.STANDARD_CHECKBOX;
            if (type === 'date' || type === 'datetime-local') return COMPONENT_TYPES.NATIVE_DATE;
            if (type === 'time') return COMPONENT_TYPES.NATIVE_TIME;
            return COMPONENT_TYPES.STANDARD_INPUT;
        }
        if (tag === 'select') return COMPONENT_TYPES.STANDARD_SELECT;
        if (tag === 'textarea') return COMPONENT_TYPES.STANDARD_TEXTAREA;

        if (el.getAttribute && el.getAttribute('contenteditable') === 'true') {
            return COMPONENT_TYPES.CONTENTEDITABLE;
        }

        const role = el.getAttribute ? el.getAttribute('role') : null;
        if (role === 'textbox') return COMPONENT_TYPES.ARIA_TEXTBOX;
        if (role === 'combobox') return COMPONENT_TYPES.ARIA_COMBOBOX;
        if (role === 'radio') return COMPONENT_TYPES.ARIA_RADIO;
        if (role === 'checkbox') return COMPONENT_TYPES.ARIA_CHECKBOX;

        if (el.closest) {
            for (const fw of FRAMEWORK_DETECTION) {
                const prefix = fw.prefix.toUpperCase();
                if (fw.select && el.closest(fw.select)) return COMPONENT_TYPES[prefix + '_SELECT'];
                if (fw.cascader && el.closest(fw.cascader)) return COMPONENT_TYPES[prefix + '_CASCADER'];
                if (fw.date && el.closest(fw.date)) return COMPONENT_TYPES[prefix + '_DATE'];
                if (fw.radio && el.closest(fw.radio)) return COMPONENT_TYPES[prefix + '_RADIO'];
                if (fw.checkbox && el.closest(fw.checkbox)) return COMPONENT_TYPES[prefix + '_CHECKBOX'];
                if (fw.input && el.closest(fw.input)) return COMPONENT_TYPES[prefix + '_INPUT'];
            }
        }

        if (tag === 'div' || tag === 'span') {
            if (el.classList && (
                el.classList.contains('input') ||
                el.classList.contains('textbox') ||
                el.getAttribute('contenteditable') === 'true'
            )) {
                return COMPONENT_TYPES.CUSTOM_INPUT;
            }
        }

        return null;
    }

    // ========== 增强模块：统一操作接口 ==========

    const ComponentHandlers = {
        [COMPONENT_TYPES.STANDARD_INPUT]: {
            getValue: (el) => el.value,
            setValue: (el, value) => {
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                nativeSetter.call(el, value);
                triggerEvents(el, ['input', 'change']);
            }
        },
        [COMPONENT_TYPES.STANDARD_TEXTAREA]: {
            getValue: (el) => el.value,
            setValue: (el, value) => {
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
                nativeSetter.call(el, value);
                triggerEvents(el, ['input', 'change']);
            }
        },
        [COMPONENT_TYPES.STANDARD_SELECT]: {
            getValue: (el) => el.multiple ? Array.from(el.selectedOptions).map(o => o.value) : el.value,
            setValue: (el, value) => {
                if (el.multiple && Array.isArray(value)) {
                    Array.from(el.options).forEach(opt => {
                        opt.selected = value.includes(opt.value) || value.includes(opt.text);
                    });
                } else {
                    el.value = value;
                    for (let i = 0; i < el.options.length; i++) {
                        if (el.options[i].value === value || el.options[i].text === value) {
                            el.selectedIndex = i;
                            break;
                        }
                    }
                }
                triggerEvents(el, ['change', 'input']);
            }
        },
        [COMPONENT_TYPES.STANDARD_RADIO]: {
            getValue: (el) => el.checked ? el.value : '',
            setValue: (el, value) => {
                if (el.value === value) {
                    el.checked = true;
                    triggerEvents(el, ['change', 'click']);
                }
            }
        },
        [COMPONENT_TYPES.STANDARD_CHECKBOX]: {
            getValue: (el) => el.checked,
            setValue: (el, value) => {
                const shouldCheck = value === true || value === 'true' || value === el.value;
                if (el.checked !== shouldCheck) {
                    el.checked = shouldCheck;
                    triggerEvents(el, ['change', 'click']);
                }
            }
        },
        [COMPONENT_TYPES.CONTENTEDITABLE]: {
            getValue: (el) => el.innerText || el.textContent,
            setValue: (el, value) => {
                el.innerText = value;
                triggerEvents(el, ['input', 'change', 'blur']);
            }
        },
        [COMPONENT_TYPES.ARIA_TEXTBOX]: {
            getValue: (el) => el.innerText || el.textContent || el.getAttribute('aria-valuenow') || '',
            setValue: (el, value) => {
                if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') {
                    el.innerText = value;
                } else {
                    el.setAttribute('aria-valuenow', value);
                    const input = el.querySelector('input');
                    if (input) input.value = value;
                }
                triggerEvents(el, ['input', 'change']);
            }
        },
        [COMPONENT_TYPES.ARIA_COMBOBOX]: {
            getValue: (el) => {
                const input = el.querySelector('input');
                return input ? input.value : el.getAttribute('aria-valuenow') || '';
            },
            setValue: async (el, value) => {
                const input = el.querySelector('input');
                if (input) {
                    input.value = value;
                    triggerEvents(input, ['input', 'change']);
                }
            }
        },
        [COMPONENT_TYPES.ARIA_RADIO]: {
            getValue: (el) => {
                const isChecked = el.getAttribute('aria-checked') === 'true' ||
                                  el.classList.contains('checked') ||
                                  el.classList.contains('selected');
                return isChecked ? (el.getAttribute('data-value') || el.getAttribute('aria-label') || el.innerText) : '';
            },
            setValue: (el, value) => {
                const itemValue = el.getAttribute('data-value') || el.getAttribute('aria-label') || el.innerText?.trim();
                if (itemValue === value || fuzzyMatch(String(itemValue), String(value))) {
                    el.click();
                    el.setAttribute('aria-checked', 'true');
                    el.classList.add('checked', 'selected');
                    triggerEvents(el, ['change', 'click']);
                }
            }
        },
        [COMPONENT_TYPES.ARIA_CHECKBOX]: {
            getValue: (el) => el.getAttribute('aria-checked') === 'true',
            setValue: (el, value) => {
                const shouldCheck = value === true || value === 'true';
                if (el.getAttribute('aria-checked') !== String(shouldCheck)) {
                    el.click();
                    el.setAttribute('aria-checked', String(shouldCheck));
                    el.classList.toggle('checked', shouldCheck);
                    triggerEvents(el, ['change', 'click']);
                }
            }
        },
        [COMPONENT_TYPES.CUSTOM_INPUT]: {
            getValue: (el) => el.innerText || el.textContent || el.getAttribute('data-value') || '',
            setValue: (el, value) => {
                if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') {
                    el.innerText = value;
                } else {
                    el.textContent = value;
                    el.setAttribute('data-value', value);
                }
                triggerEvents(el, ['input', 'change']);
            }
        },
        [COMPONENT_TYPES.ELEMENT_INPUT]: {
            getValue: (el) => el.value,
            setValue: (el, value) => {
                const container = el.closest('.el-input');
                if (container) {
                    const vueInstance = getVueInstance(container);
                    if (vueInstance) {
                        try {
                            vueInstance.$emit('update:modelValue', value);
                            vueInstance.$emit('input', value);
                            vueInstance.$emit('change', value);
                        } catch (e) {}
                    }
                }
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                nativeSetter.call(el, value);
                triggerEvents(el, ['input', 'change']);
            }
        },
        [COMPONENT_TYPES.ELEMENT_SELECT]: {
            getValue: (el) => {
                const container = el.closest('.el-select');
                if (container) {
                    const vueInstance = getVueInstance(container);
                    if (vueInstance && vueInstance.modelValue !== undefined) return vueInstance.modelValue;
                    if (vueInstance && vueInstance.value !== undefined) return vueInstance.value;
                }
                return el.value;
            },
            setValue: async (el, value) => {
                const container = el.closest('.el-select');
                if (!container) return;

                const vueInstance = getVueInstance(container);
                if (vueInstance) {
                    try {
                        vueInstance.$emit('update:modelValue', value);
                        vueInstance.$emit('input', value);
                        vueInstance.$emit('change', value);
                    } catch (e) {}
                }

                const wrapper = container.querySelector('.el-select__wrapper, .el-input');
                if (wrapper) {
                    wrapper.click();
                    await waitFor(200);

                    try {
                        const dropdown = await waitForElement('.el-select__popper, .el-select-dropdown', 2000);
                        const items = dropdown.querySelectorAll('.el-select-dropdown__item');
                        for (const item of items) {
                            const itemText = item.innerText?.trim();
                            const itemValue = item.getAttribute('data-value');
                            if (itemText === value || itemValue === value || itemText === String(value)) {
                                item.click();
                                await waitFor(300);
                                break;
                            }
                        }
                    } catch (e) {}
                }
            }
        },
        [COMPONENT_TYPES.ELEMENT_RADIO]: createRadioHandler(FRAMEWORK_MAP.element.radio),
        [COMPONENT_TYPES.ELEMENT_CHECKBOX]: createCheckboxHandler(FRAMEWORK_MAP.element.checkbox),
        [COMPONENT_TYPES.ELEMENT_CASCADER]: {
            getValue: (el) => {
                const container = el.closest('.el-cascader');
                if (container) {
                    const vueInstance = getVueInstance(container);
                    if (vueInstance && vueInstance.modelValue !== undefined) return vueInstance.modelValue;
                }
                return el.value;
            },
            setValue: async (el, values) => {
                const container = el.closest('.el-cascader');
                if (!container) return;

                const valueArray = Array.isArray(values) ? values : [values];

                const vueInstance = getVueInstance(container);
                if (vueInstance) {
                    try {
                        vueInstance.$emit('update:modelValue', valueArray);
                        vueInstance.$emit('change', valueArray);
                    } catch (e) {}
                }

                const input = container.querySelector('.el-input__inner, input');
                if (input) {
                    input.click();
                    await waitFor(200);
                }

                for (let level = 0; level < valueArray.length; level++) {
                    try {
                        const dropdown = await waitForElement('.el-cascader__dropdown, .el-cascader-menus', 2000);
                        const menus = dropdown.querySelectorAll('.el-cascader-menu');
                        const currentMenu = menus[level];
                        if (currentMenu) {
                            const items = currentMenu.querySelectorAll('.el-cascader-node');
                            for (const item of items) {
                                const itemValue = item.getAttribute('data-value') || item.innerText?.trim();
                                if (itemValue === valueArray[level] || fuzzyMatch(itemValue, String(valueArray[level]))) {
                                    item.click();
                                    await waitFor(300);
                                    break;
                                }
                            }
                        }
                    } catch (e) {
                        console.debug('[Autofill] Cascader level error:', level, e);
                    }
                }
            }
        },
        [COMPONENT_TYPES.ANT_INPUT]: {
            getValue: (el) => el.value,
            setValue: (el, value) => {
                const container = el.closest('.ant-input');
                if (container) {
                    const vueInstance = getVueInstance(container);
                    if (vueInstance) {
                        try {
                            vueInstance.$emit('update:value', value);
                            vueInstance.$emit('change', { target: { value } });
                        } catch (e) {}
                    }
                }
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                nativeSetter.call(el, value);
                triggerEvents(el, ['input', 'change']);
            }
        },
        [COMPONENT_TYPES.ANT_SELECT]: {
            getValue: (el) => {
                const container = el.closest('.ant-select');
                if (container) {
                    const vueInstance = getVueInstance(container);
                    if (vueInstance && vueInstance.value !== undefined) return vueInstance.value;
                    const selectionItem = container.querySelector('.ant-select-selection-item');
                    if (selectionItem) return selectionItem.innerText.trim();
                }
                return el.value;
            },
            setValue: async (el, value) => {
                const container = el.closest('.ant-select');
                if (!container) return;

                const vueInstance = getVueInstance(container);
                if (vueInstance) {
                    try {
                        vueInstance.$emit('update:value', value);
                        vueInstance.$emit('change', value);
                    } catch (e) {}
                }

                const selector = container.querySelector('.ant-select-selector');
                if (selector) {
                    selector.click();
                    await waitFor(200);

                    try {
                        const dropdown = await waitForElement('.ant-select-dropdown:not(.ant-select-dropdown-hidden)', 2000);
                        const items = dropdown.querySelectorAll('.ant-select-item-option');
                        for (const item of items) {
                            if (item.innerText.trim() === value || item.getAttribute('data-value') === value) {
                                item.click();
                                await waitFor(300);
                                break;
                            }
                        }
                    } catch (e) {}
                }
            }
        },
        [COMPONENT_TYPES.ANT_RADIO]: createRadioHandler(FRAMEWORK_MAP.ant.radio),
        [COMPONENT_TYPES.ANT_CHECKBOX]: createCheckboxHandler(FRAMEWORK_MAP.ant.checkbox),
        [COMPONENT_TYPES.ANT_CASCADER]: {
            getValue: (el) => {
                const container = el.closest('.ant-cascader');
                if (container) {
                    const vueInstance = getVueInstance(container);
                    if (vueInstance && vueInstance.value !== undefined) return vueInstance.value;
                }
                return el.value;
            },
            setValue: async (el, values) => {
                const container = el.closest('.ant-cascader');
                if (!container) return;

                const valueArray = Array.isArray(values) ? values : [values];

                const vueInstance = getVueInstance(container);
                if (vueInstance) {
                    try {
                        vueInstance.$emit('update:value', valueArray);
                        vueInstance.$emit('change', valueArray);
                    } catch (e) {}
                }

                const input = container.querySelector('.ant-cascader-input, input');
                if (input) {
                    input.click();
                    await waitFor(200);
                }

                for (let level = 0; level < valueArray.length; level++) {
                    try {
                        const dropdown = await waitForElement('.ant-cascader-dropdown:not(.ant-cascader-dropdown-hidden)', 2000);
                        const menus = dropdown.querySelectorAll('.ant-cascader-menu');
                        const currentMenu = menus[level];
                        if (currentMenu) {
                            const items = currentMenu.querySelectorAll('.ant-cascader-menu-item');
                            for (const item of items) {
                                const itemValue = item.getAttribute('data-value') || item.innerText?.trim();
                                if (itemValue === valueArray[level] || fuzzyMatch(itemValue, String(valueArray[level]))) {
                                    item.click();
                                    await waitFor(300);
                                    break;
                                }
                            }
                        }
                    } catch (e) {
                        console.debug('[Autofill] Ant Cascader level error:', level, e);
                    }
                }
            }
        },
        [COMPONENT_TYPES.NATIVE_DATE]: {
            getValue: (el) => el.value,
            setValue: (el, value) => {
                el.value = value;
                triggerEvents(el, ['input', 'change']);
            }
        },
        [COMPONENT_TYPES.NATIVE_TIME]: {
            getValue: (el) => el.value,
            setValue: (el, value) => {
                el.value = value;
                triggerEvents(el, ['input', 'change']);
            }
        },
        [COMPONENT_TYPES.IVIEW_INPUT]: {
            getValue: (el) => el.value,
            setValue: (el, value) => {
                const container = el.closest('.ivu-input');
                if (container) {
                    const vueInstance = getVueInstance(container);
                    if (vueInstance) {
                        try {
                            vueInstance.$emit('input', value);
                            vueInstance.$emit('on-change', value);
                        } catch (e) {}
                    }
                }
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                nativeSetter.call(el, value);
                triggerEvents(el, ['input', 'change']);
            }
        },
        [COMPONENT_TYPES.IVIEW_SELECT]: {
            getValue: (el) => {
                const container = el.closest('.ivu-select');
                if (container) {
                    const vueInstance = getVueInstance(container);
                    if (vueInstance && vueInstance.value !== undefined) return vueInstance.value;
                    const selected = container.querySelector('.ivu-select-selected-value');
                    if (selected) return selected.innerText.trim();
                }
                return el.value;
            },
            setValue: async (el, value) => {
                const container = el.closest('.ivu-select');
                if (!container) return;

                const vueInstance = getVueInstance(container);
                if (vueInstance) {
                    try {
                        vueInstance.$emit('input', value);
                        vueInstance.$emit('on-change', value);
                    } catch (e) {}
                }

                const selection = container.querySelector('.ivu-select-selection');
                if (selection) {
                    selection.click();
                    await waitFor(200);

                    try {
                        const dropdown = await waitForElement('.ivu-select-dropdown:not(.ivu-select-dropdown-hidden)', 2000);
                        const items = dropdown.querySelectorAll('.ivu-select-item');
                        for (const item of items) {
                            if (item.innerText.trim() === value || item.getAttribute('data-value') === value) {
                                item.click();
                                await waitFor(300);
                                break;
                            }
                        }
                    } catch (e) {}
                }
            }
        },
        [COMPONENT_TYPES.IVIEW_RADIO]: createRadioHandler(FRAMEWORK_MAP.iview.radio),
        [COMPONENT_TYPES.IVIEW_CHECKBOX]: createCheckboxHandler(FRAMEWORK_MAP.iview.checkbox),
        [COMPONENT_TYPES.IVIEW_CASCADER]: {
            getValue: (el) => {
                const container = el.closest('.ivu-cascader');
                if (container) {
                    const vueInstance = getVueInstance(container);
                    if (vueInstance && vueInstance.value !== undefined) return vueInstance.value;
                }
                return el.value;
            },
            setValue: async (el, values) => {
                const container = el.closest('.ivu-cascader');
                if (!container) return;

                const valueArray = Array.isArray(values) ? values : [values];

                const vueInstance = getVueInstance(container);
                if (vueInstance) {
                    try {
                        vueInstance.$emit('input', valueArray);
                        vueInstance.$emit('on-change', valueArray);
                    } catch (e) {}
                }

                const input = container.querySelector('.ivu-input');
                if (input) {
                    input.click();
                    await waitFor(200);
                }

                for (let level = 0; level < valueArray.length; level++) {
                    try {
                        const dropdown = await waitForElement('.ivu-cascader-dropdown:not(.ivu-cascader-dropdown-hidden)', 2000);
                        const menus = dropdown.querySelectorAll('.ivu-cascader-menu');
                        const currentMenu = menus[level];
                        if (currentMenu) {
                            const items = currentMenu.querySelectorAll('.ivu-cascader-menu-item');
                            for (const item of items) {
                                const itemValue = item.getAttribute('data-value') || item.innerText?.trim();
                                if (itemValue === valueArray[level] || fuzzyMatch(itemValue, String(valueArray[level]))) {
                                    item.click();
                                    await waitFor(300);
                                    break;
                                }
                            }
                        }
                    } catch (e) {
                        console.debug('[Autofill] iView Cascader level error:', level, e);
                    }
                }
            }
        },
        [COMPONENT_TYPES.VANT_INPUT]: {
            getValue: (el) => el.value,
            setValue: (el, value) => {
                const container = el.closest('.van-field');
                if (container) {
                    const vueInstance = getVueInstance(container);
                    if (vueInstance) {
                        try {
                            vueInstance.$emit('update:modelValue', value);
                            vueInstance.$emit('input', value);
                        } catch (e) {}
                    }
                }
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                nativeSetter.call(el, value);
                triggerEvents(el, ['input', 'change']);
            }
        },
        [COMPONENT_TYPES.VANT_SELECT]: {
            getValue: (el) => {
                const container = el.closest('.van-field');
                if (container) {
                    const input = container.querySelector('.van-field__control');
                    return input ? input.value : '';
                }
                return el.value;
            },
            setValue: async (el, value) => {
                const container = el.closest('.van-field');
                if (!container) return;

                const input = container.querySelector('.van-field__control');
                if (input) {
                    input.click();
                    await waitFor(300);

                    try {
                        const picker = await waitForElement('.van-picker', 2000);
                        const columns = picker.querySelectorAll('.van-picker-column');
                        if (columns.length > 0) {
                            const items = columns[0].querySelectorAll('.van-picker-column__item');
                            for (const item of items) {
                                if (item.innerText.trim() === value || item.getAttribute('data-value') === value) {
                                    item.click();
                                    await waitFor(200);
                                    break;
                                }
                            }
                        }

                        const confirmBtn = picker.querySelector('.van-picker__confirm, .van-picker__toolbar button:last-child');
                        if (confirmBtn) {
                            confirmBtn.click();
                            await waitFor(200);
                        }
                    } catch (e) {}
                }
            }
        },
        [COMPONENT_TYPES.VANT_RADIO]: createRadioHandler(FRAMEWORK_MAP.vant.radio),
        [COMPONENT_TYPES.VANT_CHECKBOX]: createCheckboxHandler(FRAMEWORK_MAP.vant.checkbox)
    };

    function triggerEvents(el, events) {
        events.forEach(eventType => {
            const event = new Event(eventType, { bubbles: true, cancelable: true });
            el.dispatchEvent(event);
        });

        el.dispatchEvent(new FocusEvent('focus'));
        el.dispatchEvent(new FocusEvent('blur'));
    }

    function getValue(element, type = null) {
        const componentType = type || detectComponentType(element);
        const handler = ComponentHandlers[componentType];
        if (handler && handler.getValue) {
            try {
                return handler.getValue(element);
            } catch (e) {
                console.debug('[Autofill] getValue error:', e);
            }
        }
        return element.value || element.innerText || '';
    }

    async function setValue(element, value, type = null) {
        const componentType = type || detectComponentType(element);
        const handler = ComponentHandlers[componentType];
        if (handler && handler.setValue) {
            try {
                await handler.setValue(element, value);
                return true;
            } catch (e) {
                console.debug('[Autofill] setValue error:', e);
            }
        }
        return false;
    }

    // ========== 增强模块：字段发现增强 ==========

    function discoverAllFields() {
        const fields = [];
        const processed = new Set();

        const selectors = [
            'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"])',
            'select',
            'textarea',
            '[contenteditable="true"]',
            '[role="textbox"]',
            '[role="combobox"]',
            '[role="radio"]',
            '[role="checkbox"]',
            '.el-input input',
            '.el-select',
            '.el-radio',
            '.el-checkbox',
            '.el-cascader',
            '.ant-input input',
            '.ant-select',
            '.ant-radio',
            '.ant-checkbox',
            '.ant-cascader',
            '.ivu-input input',
            '.ivu-select',
            '.ivu-radio',
            '.ivu-checkbox',
            '.ivu-cascader',
            '.van-field input',
            '.van-radio',
            '.van-checkbox'
        ];

        const selector = selectors.join(', ');
        const elements = document.querySelectorAll(selector);

        elements.forEach(el => {
            const componentType = detectComponentType(el);
            if (!componentType) return;

            const container = getComponentContainer(el, componentType);
            if (container && processed.has(container)) return;
            if (container) processed.add(container);

            const identifier = getEnhancedIdentifier(el, componentType);
            const value = getValue(el, componentType);

            fields.push({
                element: el,
                identifier,
                value,
                type: componentType,
                container
            });
        });

        discoverRadioGroups(fields, processed);
        discoverCheckboxGroups(fields, processed);

        return fields;
    }

    function getComponentContainer(el, type) {
        if (type.startsWith('element-') || type.startsWith('ant-')) {
            return el.closest(FRAMEWORK_MAP.element.containerSelectors + ', ' + FRAMEWORK_MAP.ant.containerSelectors);
        }
        if (type.startsWith('iview-')) {
            return el.closest(FRAMEWORK_MAP.iview.containerSelectors);
        }
        if (type.startsWith('vant-')) {
            return el.closest(FRAMEWORK_MAP.vant.containerSelectors);
        }
        if (type === COMPONENT_TYPES.ARIA_RADIO || type === COMPONENT_TYPES.ARIA_CHECKBOX) {
            return el.closest('[role="radiogroup"], [role="group"]') || el;
        }
        return el;
    }

    function getEnhancedIdentifier(el, type) {
        const existingId = getElementIdentifier(el);
        if (existingId && !existingId.startsWith('radio_group_') && !existingId.startsWith('checkbox_group_')) {
            return existingId;
        }

        if (el.getAttribute) {
            const ariaLabel = el.getAttribute('aria-label');
            if (ariaLabel) return ariaLabel;

            const dataName = el.getAttribute('data-name') || el.getAttribute('data-field') || el.getAttribute('data-key');
            if (dataName) return dataName;
        }

        if (type && (type.startsWith('element-') || type.startsWith('ant-') || type.startsWith('iview-') || type.startsWith('vant-'))) {
            const container = getComponentContainer(el, type);
            if (container) {
                const label = findFormItemLabel(container);
                if (label) return label;
            }
        }

        return existingId;
    }

    function discoverRadioGroups(fields, processed) {
        const radioGroups = new Map();

        document.querySelectorAll('input[type="radio"]').forEach(radio => {
            const name = radio.name;
            if (!name) return;

            if (!radioGroups.has(name)) {
                radioGroups.set(name, []);
            }
            radioGroups.get(name).push(radio);
        });

        radioGroups.forEach((radios, name) => {
            const firstRadio = radios[0];
            const container = firstRadio.closest('.el-radio-group, .ant-radio-group, [role="radiogroup"]') || firstRadio.parentElement;

            if (processed.has(container)) return;
            processed.add(container);

            const groupInfo = getRadioGroupValueAndIdentifier(radios);
            const allGroups = getAllRadioGroups();
            const groupIndex = allGroups.findIndex(g => g.length > 0 && g[0] === radios[0]);

            fields.push({
                element: firstRadio,
                identifier: groupInfo.identifier,
                value: groupInfo.value,
                type: 'radio-group',
                groupName: name,
                baseIdentifier: groupInfo.baseIdentifier,
                checkedIndex: groupInfo.checkedIndex,
                groupIndex: groupIndex,
                container
            });
        });

        document.querySelectorAll('[role="radio"]:not(input)').forEach(radio => {
            if (processed.has(radio)) return;

            const group = radio.closest('[role="radiogroup"]') || radio.parentElement;
            if (processed.has(group)) return;
            processed.add(group);

            const radios = group.querySelectorAll('[role="radio"]');
            let selectedValue = '';
            radios.forEach(r => {
                if (r.getAttribute('aria-checked') === 'true' || r.classList.contains('checked')) {
                    selectedValue = r.getAttribute('data-value') || r.innerText?.trim();
                }
            });

            const identifier = group.getAttribute('aria-label') ||
                              group.getAttribute('data-name') ||
                              getElementIdentifier(radio);

            fields.push({
                element: radio,
                identifier,
                value: selectedValue,
                type: COMPONENT_TYPES.ARIA_RADIO,
                container: group
            });
        });
    }

    function discoverCheckboxGroups(fields, processed) {
        const checkboxGroups = new Map();

        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            const name = checkbox.name;
            if (!name) return;

            const count = document.querySelectorAll(`input[type="checkbox"][name="${name}"]`).length;
            if (count <= 1) return;

            if (!checkboxGroups.has(name)) {
                checkboxGroups.set(name, []);
            }
            checkboxGroups.get(name).push(checkbox);
        });

        checkboxGroups.forEach((checkboxes, name) => {
            const firstCb = checkboxes[0];
            const container = firstCb.closest('.el-checkbox-group, .ant-checkbox-group, [role="group"]') || firstCb.parentElement;

            if (processed.has(container)) return;
            processed.add(container);

            const groupInfo = getCheckboxGroupValueAndIdentifier(checkboxes, name);

            fields.push({
                element: firstCb,
                identifier: groupInfo.identifier,
                value: groupInfo.value,
                type: 'checkbox-group',
                groupName: name,
                container
            });
        });

        document.querySelectorAll('[role="checkbox"]:not(input)').forEach(checkbox => {
            if (processed.has(checkbox)) return;
            processed.add(checkbox);

            const isChecked = checkbox.getAttribute('aria-checked') === 'true' || checkbox.classList.contains('checked');
            const value = checkbox.getAttribute('data-value') || checkbox.innerText?.trim();
            const identifier = checkbox.getAttribute('aria-label') || getElementIdentifier(checkbox);

            fields.push({
                element: checkbox,
                identifier,
                value: isChecked ? value : '',
                type: COMPONENT_TYPES.ARIA_CHECKBOX,
                container: checkbox
            });
        });
    }

    // ---------- 智能提取字段标识符 (label文本/placeholder/name/id) ----------
    function getElementIdentifier(el) {
        // 1. 从父级form-item获取label
        const formItemLabel = findFormItemLabel(el);
        if (formItemLabel) return formItemLabel;

        // 2. 关联label (for 或者父级label)
        let labelText = '';
        if (el.id && !isDynamicId(el.id)) {
            const label = document.querySelector(`label[for="${el.id}"]`);
            if (label) labelText = label.innerText.trim();
        }
        if (!labelText && el.closest('label')) {
            const parentLabel = el.closest('label');
            if (parentLabel) {
                const clone = parentLabel.cloneNode(true);
                if (clone.querySelector('input, select, textarea')) {
                    clone.querySelector('input, select, textarea').remove();
                }
                labelText = clone.innerText.trim();
            }
        }
        if (labelText) return labelText;

        // 3. placeholder
        if (el.placeholder) return el.placeholder;
        // 4. aria-label
        if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
        // 5. name
        if (el.name) return el.name;
        // 6. id (排除动态生成的ID)
        if (el.id && !isDynamicId(el.id)) return el.id;

        // 7. 兜底
        return `${el.tagName}_${el.placeholder || el.name || el.className}_${Array.from(el.parentElement?.children || []).indexOf(el)}`;
    }

    // 判断是否为动态生成的ID
    function isDynamicId(id) {
        if (!id) return false;
        const dynamicPatterns = [
            /^el-id-\d+-\d+$/,           // Element Plus: el-id-8575-140
            /^:r[0-9a-z]+:$/,            // React: :r1:, :r2:
            /^radix-/,                    // Radix UI
            /-\d{4,}$/,                   // 以长数字结尾
            /_[a-f0-9]{6,}$/i,           // 以随机字符串结尾
        ];
        return dynamicPatterns.some(p => p.test(id));
    }

    // 精确匹配函数（用于预设规则填充）
    function fuzzyMatch(text, pattern) {
        if (!text || !pattern) return false;
        const t = text.toLowerCase().trim();
        const p = pattern.toLowerCase().trim();
        // 精确匹配
        if (t === p) return true;
        // 移除常见标点符号后匹配（如冒号、空格等）
        const clean = (s) => s.replace(/[*:：\s\n,，.。;；!！?？'""''()（）\[\]【】]/g, '');
        const cleanT = clean(t);
        const cleanP = clean(p);
        if (cleanT === cleanP) return true;
        return false;
    }

    // 获取radio组的选中值和统一标识符
    function getRadioGroupValueAndIdentifier(radioGroup) {
        // 优先使用原生 checked 属性
        let checkedRadio = radioGroup.find(r => r.checked);
        let checkedIndex = radioGroup.findIndex(r => r.checked);

        // 如果没有找到 checked，检查框架特定的选中状态（Ant Design, Element UI 等）
        if (!checkedRadio) {
            for (let i = 0; i < radioGroup.length; i++) {
                const radio = radioGroup[i];

                // 方法1: 检查 input 元素的 aria-checked 属性
                if (radio.getAttribute('aria-checked') === 'true') {
                    checkedRadio = radio;
                    checkedIndex = i;
                    break;
                }

                // 方法2: 检查 Ant Design 的 wrapper 类
                const antWrapper = radio.closest('.ant-radio');
                if (antWrapper) {
                    if (antWrapper.classList.contains('ant-radio-checked')) {
                        checkedRadio = radio;
                        checkedIndex = i;
                        break;
                    }
                }

                // 方法3: 检查 Ant Design 的 label wrapper
                const antLabelWrapper = radio.closest('.ant-radio-wrapper');
                if (antLabelWrapper) {
                    if (antLabelWrapper.classList.contains('ant-radio-wrapper-checked')) {
                        checkedRadio = radio;
                        checkedIndex = i;
                        break;
                    }
                }

                // 方法4: 检查 Element UI
                const elWrapper = radio.closest('.el-radio');
                if (elWrapper) {
                    const elInput = elWrapper.querySelector('.el-radio__input');
                    if (elInput && elInput.classList.contains('is-checked')) {
                        checkedRadio = radio;
                        checkedIndex = i;
                        break;
                    }
                }

                // 方法5: 检查 iView
                const ivuWrapper = radio.closest('.ivu-radio-wrapper');
                if (ivuWrapper) {
                    if (ivuWrapper.classList.contains('ivu-radio-checked')) {
                        checkedRadio = radio;
                        checkedIndex = i;
                        break;
                    }
                }

                // 方法6: 通用 checked 类
                const genericWrapper = radio.closest('[class*="radio"]');
                if (genericWrapper) {
                    if (genericWrapper.classList.contains('checked') ||
                        genericWrapper.getAttribute('aria-checked') === 'true') {
                        checkedRadio = radio;
                        checkedIndex = i;
                        break;
                    }
                }
            }
        }

        const value = checkedRadio ? checkedRadio.value : '';

        let identifier = '';
        let contextPath = '';
        const firstRadio = radioGroup[0];
        if (firstRadio) {
            // 1. 优先从 fieldset 获取 legend
            const fieldset = firstRadio.closest('fieldset');
            if (fieldset) {
                const legend = fieldset.querySelector('legend');
                if (legend) identifier = legend.innerText.trim();
            }

            // 2. 从表单项获取 label
            if (!identifier) {
                const formItem = firstRadio.closest('.ant-form-item, .el-form-item, .ivu-form-item, .van-field, [class*="form-item"], [class*="form-group"]');
                if (formItem) {
                    const labelEl = formItem.querySelector('.ant-form-item-label label, .el-form-item__label, .ivu-form-item-label, .van-field__label, label');
                    if (labelEl) {
                        identifier = labelEl.innerText.trim();
                    }
                    if (!identifier) {
                        const labelContainer = formItem.querySelector('.ant-form-item-label');
                        if (labelContainer) {
                            identifier = labelContainer.innerText.trim();
                        }
                    }
                }
            }

            // 3. 从 radio group 容器获取关联 label
            if (!identifier) {
                const radioGroupContainer = firstRadio.closest('.ant-radio-group, .el-radio-group, .ivu-radio-group, [class*="radio-group"]');
                if (radioGroupContainer && radioGroupContainer.id) {
                    const labelForId = document.querySelector(`label[for="${radioGroupContainer.id}"]`);
                    if (labelForId) identifier = labelForId.innerText.trim();
                }
            }

            // 4. 向上查找标题/问题文本（用于问卷调查类页面）
            if (!identifier) {
                let parent = firstRadio.parentElement;
                while (parent && parent !== document.body) {
                    // 查找标题元素（h1-h6、带序号的文本等）
                    const titleEl = parent.querySelector('h1, h2, h3, h4, h5, h6, .title, .question, [class*="title"], [class*="question"]');
                    if (titleEl) {
                        const titleText = titleEl.innerText?.trim();
                        if (titleText && titleText.length > 0 && titleText.length < 200) {
                            identifier = titleText;
                            break;
                        }
                    }

                    // 查找父元素的前置文本节点（可能是问题描述）
                    const prevSibling = parent.previousElementSibling;
                    if (prevSibling) {
                        const siblingText = prevSibling.innerText?.trim();
                        if (siblingText && siblingText.length > 0 && siblingText.length < 200 &&
                            (siblingText.match(/^\d+[、.．]/) || siblingText.match(/^[一二三四五六七八九十]+[、.．]/))) {
                            identifier = siblingText;
                            break;
                        }
                    }

                    parent = parent.parentElement;
                }
            }

            // 5. 兜底：获取父容器的第一行文本
            if (!identifier) {
                let parent = firstRadio.parentElement;
                while (parent && parent !== document.body) {
                    const prevText = parent.innerText.split('\n')[0]?.trim();
                    if (prevText && prevText.length > 0 && prevText.length < 50) {
                        identifier = prevText;
                        break;
                    }
                    parent = parent.parentElement;
                }
            }

            if (!identifier) identifier = `radio_group_${firstRadio.name || 'unnamed'}`;

            // 添加上下文索引以确保唯一性
            const allRadioGroups = getAllRadioGroups();
            const groupIndex = allRadioGroups.findIndex(group => group.includes(firstRadio));
            if (groupIndex >= 0) {
                contextPath = `_q${groupIndex}`;
            }
        }
        const finalIdentifier = identifier + contextPath;
        return { identifier: finalIdentifier, value, baseIdentifier: identifier, checkedIndex };
    }

    // 缓存单选框组，避免重复计算
    let cachedRadioGroups = null;
    let cachedRadioGroupsTime = 0;
    const CACHE_DURATION = 1000; // 缓存1秒

    // 获取页面中所有单选框组（带缓存）
    function getAllRadioGroups() {
        const now = Date.now();
        if (cachedRadioGroups && (now - cachedRadioGroupsTime) < CACHE_DURATION) {
            return cachedRadioGroups;
        }

        const groups = [];
        const processedNames = new Set();
        const allRadios = document.querySelectorAll('input[type="radio"]');

        allRadios.forEach(radio => {
            const name = radio.name;
            if (!name || processedNames.has(name)) return;
            processedNames.add(name);
            const group = Array.from(document.querySelectorAll(`input[type="radio"][name="${name}"]`));
            if (group.length > 0) {
                groups.push(group);
            }
        });

        // 处理无 name 的单选框
        const noNameRadios = document.querySelectorAll('input[type="radio"]:not([name])');
        const processedContainers = new Set();
        noNameRadios.forEach(radio => {
            const container = radio.closest('[class*="radio-group"], [role="radiogroup"]') || radio.parentElement;
            if (processedContainers.has(container)) return;
            processedContainers.add(container);
            const group = Array.from(container.querySelectorAll('input[type="radio"]:not([name])'));
            if (group.length > 0) {
                groups.push(group);
            }
        });

        cachedRadioGroups = groups;
        cachedRadioGroupsTime = now;
        return groups;
    }

    // 清除缓存（在页面变化时调用）
    function clearRadioGroupsCache() {
        cachedRadioGroups = null;
        cachedRadioGroupsTime = 0;
    }

    // 获取表单项在表单中的索引位置
    function getFormItemIndex(formItem) {
        const allFormItems = document.querySelectorAll('.ant-form-item, .el-form-item, .ivu-form-item, .van-field, [class*="form-item"], [class*="form-group"]');
        for (let i = 0; i < allFormItems.length; i++) {
            if (allFormItems[i] === formItem) {
                return i;
            }
        }
        return -1;
    }

    // 获取单选框组在页面中的索引
    function getRadioGroupIndex(radioEl) {
        const name = radioEl.name;
        if (!name) return -1;
        const processedContainers = new Set();
        const allRadios = document.querySelectorAll(`input[type="radio"][name="${name}"]`);
        let groupIndex = 0;
        for (const radio of allRadios) {
            const container = radio.closest('[class*="radio-group"], [role="radiogroup"]') || radio.parentElement;
            if (!processedContainers.has(container)) {
                if (container.contains(radioEl)) {
                    return groupIndex;
                }
                processedContainers.add(container);
                groupIndex++;
            }
        }
        return -1;
    }

    // 获取checkbox组（同名多选）选中值数组 & 标识符
    function getCheckboxGroupValueAndIdentifier(checkboxGroup, name) {
        const checkedValues = checkboxGroup.filter(cb => cb.checked).map(cb => cb.value);
        let identifier = '';
        const firstCb = checkboxGroup[0];
        if (firstCb) {
            const parentLabel = firstCb.closest('label');
            if (parentLabel) identifier = parentLabel.innerText.replace(/checkbox|□/i, '').trim();
            if (!identifier && firstCb.closest('fieldset')) {
                const legend = firstCb.closest('fieldset')?.querySelector('legend');
                if (legend) identifier = legend.innerText.trim();
            }
            if (!identifier) {
                const formItem = firstCb.closest('.ant-form-item, .el-form-item, .ivu-form-item, .van-field, [class*="form-item"], [class*="form-group"]');
                if (formItem) {
                    const labelEl = formItem.querySelector('.ant-form-item-label label, .el-form-item__label, .ivu-form-item-label, .van-field__label, label');
                    if (labelEl) identifier = labelEl.innerText.trim();
                }
            }
            if (!identifier && firstCb.id) {
                const labelFor = document.querySelector(`label[for="${firstCb.id}"]`);
                if (labelFor) identifier = labelFor.innerText.trim();
            }
            if (!identifier) {
                const form = firstCb.closest('form');
                if (form) {
                    const formLabels = [];
                    checkboxGroup.forEach(cb => {
                        if (cb.id) {
                            const lbl = document.querySelector(`label[for="${cb.id}"]`);
                            if (lbl) formLabels.push(lbl.innerText.trim());
                        }
                    });
                    if (formLabels.length > 0) {
                        identifier = formLabels[0].replace(/[我有一辆艘架台部个只]/g, '').trim() || formLabels[0];
                    }
                }
            }
            if (!identifier) identifier = `checkbox_group_${name}`;
        }
        return { identifier, value: checkedValues };
    }

    // 查找单选框组的容器标识（用于没有 name 属性的自定义组件）
    function findRadioGroupContainer(radioEl) {
        const container = radioEl.closest('[class*="radio-group"], [role="radiogroup"], .ant-radio-group, .el-radio-group, .ivu-radio-group');
        if (container) {
            return container.className || container.id || `radio_container_${Array.from(container.querySelectorAll('input[type="radio"]')).map(r => r.value).join('_')}`;
        }
        const parent = radioEl.parentElement;
        if (parent) {
            const grandParent = parent.parentElement;
            if (grandParent) {
                const radios = grandParent.querySelectorAll('input[type="radio"]');
                if (radios.length > 1) {
                    return `parent_${grandParent.className || grandParent.tagName}_${radios.length}`;
                }
            }
        }
        return null;
    }

    // 根据容器标识查找单选框组
    function findRadioGroupByContainer(radioEl, containerKey) {
        const container = radioEl.closest('[class*="radio-group"], [role="radiogroup"], .ant-radio-group, .el-radio-group, .ivu-radio-group');
        if (container) {
            return Array.from(container.querySelectorAll('input[type="radio"]'));
        }
        const parent = radioEl.parentElement;
        if (parent) {
            const grandParent = parent.parentElement;
            if (grandParent) {
                return Array.from(grandParent.querySelectorAll('input[type="radio"]'));
            }
        }
        return [radioEl];
    }

    // 查找复选框组的容器标识（用于没有 name 属性的自定义组件）
    function findCheckboxGroupContainer(checkboxEl) {
        const container = checkboxEl.closest('[class*="checkbox-group"], [role="group"], .ant-checkbox-group, .el-checkbox-group, .ivu-checkbox-group');
        if (container) {
            return container.className || container.id || `checkbox_container_${Array.from(container.querySelectorAll('input[type="checkbox"]')).map(c => c.value).join('_')}`;
        }
        const parent = checkboxEl.parentElement;
        if (parent) {
            const grandParent = parent.parentElement;
            if (grandParent) {
                const checkboxes = grandParent.querySelectorAll('input[type="checkbox"]');
                if (checkboxes.length > 1) {
                    return `parent_${grandParent.className || grandParent.tagName}_${checkboxes.length}`;
                }
            }
        }
        return null;
    }

    // 根据容器标识查找复选框组
    function findCheckboxGroupByContainer(checkboxEl, containerKey) {
        const container = checkboxEl.closest('[class*="checkbox-group"], [role="group"], .ant-checkbox-group, .el-checkbox-group, .ivu-checkbox-group');
        if (container) {
            return Array.from(container.querySelectorAll('input[type="checkbox"]'));
        }
        const parent = checkboxEl.parentElement;
        if (parent) {
            const grandParent = parent.parentElement;
            if (grandParent) {
                return Array.from(grandParent.querySelectorAll('input[type="checkbox"]'));
            }
        }
        return [checkboxEl];
    }

    // ---------- 通用下拉选择组件检测与处理 ----------
    // 检测是否为自定义下拉组件（Element Plus, Ant Design, iView, 等）
    function detectCustomSelect(el) {
        // Element Plus el-select
        const elSelect = el.closest('.el-select');
        if (elSelect) {
            return { type: 'element-plus', container: elSelect };
        }
        // Ant Design Select
        const antSelect = el.closest('.ant-select');
        if (antSelect) {
            return { type: 'ant-design', container: antSelect };
        }
        // iView / View UI
        const iviewSelect = el.closest('.ivu-select');
        if (iviewSelect) {
            return { type: 'iview', container: iviewSelect };
        }
        // Element UI (Vue 2)
        const elUISelect = el.closest('.el-select');
        if (elUISelect && !elSelect) {
            return { type: 'element-ui', container: elUISelect };
        }
        // Vant
        const vantPicker = el.closest('.van-picker') || el.closest('.van-field');
        if (vantPicker && el.closest('.van-field')) {
            return { type: 'vant', container: vantPicker };
        }
        // 通用检测：有 readonly 的 input 且父级有 select/picker/dropdown 类名
        if (el.tagName === 'INPUT' && el.readOnly) {
            const parent = el.parentElement;
            if (parent && /select|picker|dropdown|combo/i.test(parent.className)) {
                return { type: 'generic-readonly', container: parent };
            }
        }
        return null;
    }

    // 从自定义下拉组件获取当前值
    function getCustomSelectValue(selectInfo) {
        const { type, container } = selectInfo;
        try {
            // Element Plus / Element UI
            if (type === 'element-plus' || type === 'element-ui') {
                // 尝试从 Vue 实例获取
                const vueInstance = getVueInstance(container);
                if (vueInstance) {
                    if (vueInstance.modelValue !== undefined) return vueInstance.modelValue;
                    if (vueInstance.value !== undefined) return vueInstance.value;
                    if (vueInstance.$props?.modelValue !== undefined) return vueInstance.$props.modelValue;
                    if (vueInstance.$props?.value !== undefined) return vueInstance.$props.value;
                }
                // 从 DOM 获取显示文本
                const selectedText = container.querySelector('.el-select__selected-item:not(.is-hidden) span, .el-select__tags-text, .el-input__inner');
                if (selectedText && selectedText.innerText) {
                    return selectedText.innerText.trim();
                }
                // 获取 input 的值
                const input = container.querySelector('input.el-input__inner, input.el-select__input');
                if (input && input.value) return input.value;
                return '';
            }
            // Ant Design
            if (type === 'ant-design') {
                const vueInstance = getVueInstance(container);
                if (vueInstance) {
                    if (vueInstance.value !== undefined) return vueInstance.value;
                    if (vueInstance.$props?.value !== undefined) return vueInstance.$props.value;
                }
                const selectionItem = container.querySelector('.ant-select-selection-item, .ant-select-selection-placeholder');
                if (selectionItem) return selectionItem.innerText.trim();
                return '';
            }
            // iView
            if (type === 'iview') {
                const vueInstance = getVueInstance(container);
                if (vueInstance && vueInstance.value !== undefined) return vueInstance.value;
                const selected = container.querySelector('.ivu-select-selected-value');
                if (selected) return selected.innerText.trim();
                return '';
            }
            // Vant
            if (type === 'vant') {
                const vueInstance = getVueInstance(container);
                if (vueInstance && vueInstance.value !== undefined) return vueInstance.value;
                const input = container.querySelector('.van-field__control');
                if (input) return input.value;
                return '';
            }
            // 通用 readonly input
            if (type === 'generic-readonly') {
                const input = container.querySelector('input[readonly]');
                return input ? input.value : '';
            }
        } catch (e) {
            console.debug('[Autofill] getCustomSelectValue error:', e);
        }
        return '';
    }

    // 获取自定义下拉组件的标识符
    function getCustomSelectIdentifier(selectInfo) {
        const { container } = selectInfo;
        // 先找关联的 label
        const formItem = container.closest('.el-form-item, .ant-form-item, .ivu-form-item, .van-field');
        if (formItem) {
            const label = formItem.querySelector('.el-form-item__label, .ant-form-item-label label, .ivu-form-item-label, .van-field__label');
            if (label && label.innerText.trim()) return label.innerText.trim();
        }
        // 尝试 aria-label
        const ariaLabel = container.getAttribute('aria-label');
        if (ariaLabel) return ariaLabel;
        // 尝试 placeholder
        const input = container.querySelector('input[placeholder]');
        if (input && input.placeholder) return input.placeholder;
        // 尝试当前显示的值或 placeholder 文本 (用于区分级联选择器)
        const placeholderSpan = container.querySelector('.el-select__placeholder span, .el-select__selected-item:not(.is-hidden) span');
        if (placeholderSpan && placeholderSpan.innerText) {
            const text = placeholderSpan.innerText.trim();
            // 如果是"请选择xxx"格式的placeholder，直接使用
            if (text.startsWith('请选择') || text.includes('省') || text.includes('市') || text.includes('区') || text.includes('县')) {
                return text;
            }
        }
        // 尝试 id 关联的 label
        const inputEl = container.querySelector('input[id]');
        if (inputEl && inputEl.id) {
            const labelEl = document.querySelector(`label[for="${inputEl.id}"]`);
            if (labelEl) return labelEl.innerText.trim();
        }
        // 最后尝试使用父容器的类名 + 索引来区分
        const parentContainer = container.closest('.address-select-container, [class*="address"], [class*="region"], [class*="area"]');
        if (parentContainer) {
            const selects = parentContainer.querySelectorAll('.el-select, .ant-select, .ivu-select');
            const index = Array.from(selects).indexOf(container);
            if (index >= 0) {
                const classHint = parentContainer.className.match(/address|region|area/i);
                return `${classHint ? classHint[0] : 'select'}_${index + 1}`;
            }
        }
        return `select_${Date.now()}`;
    }

    // 获取自定义下拉组件的所有选项
    function getCustomSelectOptions(selectInfo) {
        const { type, container } = selectInfo;
        const options = [];
        try {
            // Element Plus / Element UI - 需要打开下拉菜单才能获取选项
            if (type === 'element-plus' || type === 'element-ui') {
                // 尝试从 Vue 实例获取选项列表
                const vueInstance = getVueInstance(container);
                if (vueInstance) {
                    // Element Plus
                    if (vueInstance.options) {
                        vueInstance.options.forEach(opt => {
                            if (typeof opt === 'object') {
                                options.push({ label: opt.label || opt.text, value: opt.value });
                            } else {
                                options.push({ label: String(opt), value: opt });
                            }
                        });
                    }
                    // 通过 $parent 查找
                    let parent = vueInstance.$parent;
                    while (parent && options.length === 0) {
                        if (parent.options) {
                            parent.options.forEach(opt => {
                                if (typeof opt === 'object') {
                                    options.push({ label: opt.label || opt.text, value: opt.value });
                                } else {
                                    options.push({ label: String(opt), value: opt });
                                }
                            });
                        }
                        parent = parent.$parent;
                    }
                }
            }
        } catch (e) {
            console.debug('[Autofill] getCustomSelectOptions error:', e);
        }
        return options;
    }

    // ---------- 时间选择器检测与处理 ----------
    function detectDatePicker(el) {
        const elDatePicker = el.closest('.el-date-editor, .el-date-picker');
        if (elDatePicker) {
            const input = elDatePicker.querySelector('input');
            const hasTimeClass = elDatePicker.classList.contains('el-date-editor--datetime') ||
                                 elDatePicker.querySelector('.el-input__inner')?.placeholder?.includes('时间');
            return {
                type: hasTimeClass ? 'element-datetime' : 'element-date',
                container: elDatePicker,
                input: input
            };
        }
        const antDatePicker = el.closest('.ant-picker');
        if (antDatePicker && (antDatePicker.classList.contains('ant-picker-date') || antDatePicker.classList.contains('ant-picker-datetime') || antDatePicker.classList.contains('ant-picker-time'))) {
            return {
                type: antDatePicker.classList.contains('ant-picker-time') ? 'ant-time' : 'ant-date',
                container: antDatePicker,
                input: antDatePicker.querySelector('input')
            };
        }
        if (el.tagName === 'INPUT' && (el.type === 'date' || el.type === 'time' || el.type === 'datetime-local')) {
            return {
                type: 'native-' + el.type,
                container: el,
                input: el
            };
        }
        return null;
    }

    function getDatePickerValue(pickerInfo) {
        const { type, container, input } = pickerInfo;
        try {
            if (type.startsWith('native-')) {
                return input.value;
            }
            if (type.startsWith('element-')) {
                const vueInstance = getVueInstance(container);
                if (vueInstance) {
                    if (vueInstance.modelValue !== undefined) return vueInstance.modelValue;
                    if (vueInstance.value !== undefined) return vueInstance.value;
                    if (vueInstance.$props?.modelValue !== undefined) return vueInstance.$props.modelValue;
                }
                return input ? input.value : '';
            }
            if (type.startsWith('ant-')) {
                const vueInstance = getVueInstance(container);
                if (vueInstance) {
                    if (vueInstance.value !== undefined) return vueInstance.value;
                    if (vueInstance.$props?.value !== undefined) return vueInstance.$props.value;
                }
                return input ? input.value : '';
            }
        } catch (e) {
            console.debug('[Autofill] getDatePickerValue error:', e);
        }
        return '';
    }

    function getDatePickerIdentifier(pickerInfo) {
        const { container } = pickerInfo;
        const formItem = container.closest('.el-form-item, .ant-form-item, .ivu-form-item, .van-field, [class*="form-item"]');
        if (formItem) {
            const label = formItem.querySelector('.el-form-item__label, .ant-form-item-label label, .ivu-form-item-label, .van-field__label, label');
            if (label) return label.innerText.trim();
        }
        const input = pickerInfo.input;
        if (input) {
            if (input.placeholder) return input.placeholder;
            if (input.id) {
                const labelEl = document.querySelector(`label[for="${input.id}"]`);
                if (labelEl) return labelEl.innerText.trim();
            }
        }
        return `datepicker_${Date.now()}`;
    }

    function fillDatePicker(pickerInfo, value) {
        const { type, container, input } = pickerInfo;
        if (!value) return false;
        try {
            if (type.startsWith('native-')) {
                input.value = value;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
            }
            if (type.startsWith('element-')) {
                const vueInstance = getVueInstance(container);
                if (vueInstance) {
                    if (typeof vueInstance.$emit === 'function') {
                        vueInstance.$emit('update:modelValue', value);
                        vueInstance.$emit('input', value);
                        vueInstance.$emit('change', value);
                    }
                    if (vueInstance.$ && vueInstance.$.emit) {
                        vueInstance.$.emit('update:modelValue', value);
                        vueInstance.$.emit('change', value);
                    }
                }
                if (input) {
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                    nativeInputValueSetter.call(input, value);
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
                return true;
            }
            if (type.startsWith('ant-')) {
                const vueInstance = getVueInstance(container);
                if (vueInstance) {
                    if (typeof vueInstance.$emit === 'function') {
                        vueInstance.$emit('update:value', value);
                        vueInstance.$emit('change', value);
                    }
                }
                if (input) {
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                    nativeInputValueSetter.call(input, value);
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
                return true;
            }
        } catch (e) {
            console.debug('[Autofill] fillDatePicker error:', e);
        }
        return false;
    }

    // 查找页面所有时间选择器
    function findAllDatePickers() {
        const pickers = [];
        const processed = new Set();
        const selectors = [
            '.el-date-editor',
            '.el-date-picker',
            '.ant-picker-date',
            '.ant-picker-datetime',
            '.ant-picker-time',
            'input[type="date"]',
            'input[type="time"]',
            'input[type="datetime-local"]'
        ];
        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                if (processed.has(el)) return;
                const pickerInfo = detectDatePicker(el);
                if (pickerInfo) {
                    processed.add(pickerInfo.container);
                    pickers.push(pickerInfo);
                }
            });
        });
        return pickers;
    }

    // 填充自定义下拉组件
    function fillCustomSelect(selectInfo, value) {
        const { type, container } = selectInfo;
        if (!value && value !== 0) return Promise.resolve(false);
        return new Promise((resolve) => {
            try {
                // Element Plus / Element UI
                if (type === 'element-plus' || type === 'element-ui') {
                    const vueInstance = getVueInstance(container);
                    if (vueInstance) {
                        if (typeof vueInstance.$emit === 'function') {
                            vueInstance.$emit('update:modelValue', value);
                            vueInstance.$emit('input', value);
                            vueInstance.$emit('change', value);
                        }
                        if (vueInstance.$ && vueInstance.$.emit) {
                            vueInstance.$.emit('update:modelValue', value);
                            vueInstance.$.emit('change', value);
                        }
                        if (vueInstance.modelValue !== undefined) {
                            vueInstance.modelValue = value;
                        }
                        if (vueInstance.value !== undefined) {
                            vueInstance.value = value;
                        }
                    }
                    // 模拟点击打开下拉菜单，然后点击选项
                    const wrapper = container.querySelector('.el-select__wrapper, .el-input');
                    if (wrapper) {
                        wrapper.click();
                        setTimeout(() => {
                            const dropdowns = document.querySelectorAll('.el-select__popper, .el-select-dropdown');
                            let foundAndClicked = false;
                            dropdowns.forEach(dropdown => {
                                const items = dropdown.querySelectorAll('.el-select-dropdown__item');
                                items.forEach(item => {
                                    const itemText = item.innerText?.trim();
                                    const itemValue = item.getAttribute('data-value');
                                    if (itemText === value || itemValue === value || itemText === String(value)) {
                                        item.click();
                                        foundAndClicked = true;
                                    }
                                });
                            });
                            // 等待选择完成后 resolve
                            setTimeout(() => {
                                resolve(true);
                            }, foundAndClicked ? 300 : 100);
                        }, 200);
                    } else {
                        const input = container.querySelector('input');
                        if (input) {
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                        setTimeout(() => resolve(true), 100);
                    }
                    return;
                }
                // Ant Design
                if (type === 'ant-design') {
                    const vueInstance = getVueInstance(container);
                    if (vueInstance) {
                        if (typeof vueInstance.$emit === 'function') {
                            vueInstance.$emit('update:value', value);
                            vueInstance.$emit('change', value);
                        }
                    }
                    const selector = container.querySelector('.ant-select-selector');
                    if (selector) {
                        selector.click();
                        setTimeout(() => {
                            const dropdowns = document.querySelectorAll('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
                            dropdowns.forEach(dropdown => {
                                const items = dropdown.querySelectorAll('.ant-select-item-option');
                                items.forEach(item => {
                                    if (item.innerText.trim() === value) {
                                        item.click();
                                    }
                                });
                            });
                            setTimeout(() => resolve(true), 300);
                        }, 200);
                    } else {
                        setTimeout(() => resolve(true), 100);
                    }
                    return;
                }
                // iView
                if (type === 'iview') {
                    const vueInstance = getVueInstance(container);
                    if (vueInstance) {
                        vueInstance.$emit('input', value);
                        vueInstance.$emit('on-change', value);
                    }
                    setTimeout(() => resolve(true), 100);
                    return;
                }
                // Vant
                if (type === 'vant') {
                    const vueInstance = getVueInstance(container);
                    if (vueInstance) {
                        if (typeof vueInstance.$emit === 'function') {
                            vueInstance.$emit('update:modelValue', value);
                            vueInstance.$emit('input', value);
                        }
                    }
                    setTimeout(() => resolve(true), 100);
                    return;
                }
                // 通用：直接设置 input 值
                if (type === 'generic-readonly') {
                    const input = container.querySelector('input[readonly]');
                    if (input) {
                        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                        nativeInputValueSetter.call(input, value);
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        setTimeout(() => resolve(true), 100);
                        return;
                    }
                }
                resolve(false);
            } catch (e) {
                console.debug('[Autofill] fillCustomSelect error:', e);
                resolve(false);
            }
        });
    }

    // 判断字段是否为验证码字段
    function isCaptchaField(identifier, element) {
        if (!identifier) return false;
        const captchaKeywords = ['验证码', 'captcha', 'code', '验证', '校验码', '图形码', '安全码', '随机码', 'verify', 'auth', 'security'];
        const lowerId = identifier.toLowerCase();
        const isCaptcha = captchaKeywords.some(keyword => lowerId.includes(keyword.toLowerCase()));

        // 额外检查：检查元素是否有验证码相关属性
        if (element && !isCaptcha) {
            const placeholder = (element.placeholder || '').toLowerCase();
            const name = (element.name || '').toLowerCase();
            const id = (element.id || '').toLowerCase();
            const className = (element.className || '').toLowerCase();

            const allText = placeholder + ' ' + name + ' ' + id + ' ' + className;
            return captchaKeywords.some(keyword => allText.includes(keyword.toLowerCase()));
        }

        return isCaptcha;
    }

    // 过滤掉验证码字段
    function filterCaptchaFields(fields) {
        return fields.filter(field => {
            const isCaptcha = isCaptchaField(field.identifier, field.element);
            if (isCaptcha) {
                console.debug('[Autofill] 过滤验证码字段:', field.identifier);
            }
            return !isCaptcha;
        });
    }

    // 收集当前页面所有表单数据 (返回fields数组)
    function collectContentEditablesAndAria(fields, processedContentEditables, processedAriaComponents) {
        document.querySelectorAll('[contenteditable="true"]').forEach(el => {
            if (processedContentEditables.has(el)) return;
            processedContentEditables.add(el);

            if (el.closest('.el-input, .ant-input, .el-select, .ant-select')) return;

            const identifier = getEnhancedIdentifier(el, COMPONENT_TYPES.CONTENTEDITABLE);
            const value = el.innerText || el.textContent || '';
            fields.push({ identifier, value, type: COMPONENT_TYPES.CONTENTEDITABLE });
        });

        document.querySelectorAll('[role="textbox"]:not(input):not(textarea)').forEach(el => {
            if (processedAriaComponents.has(el)) return;
            processedAriaComponents.add(el);

            const identifier = el.getAttribute('aria-label') ||
                              el.getAttribute('data-name') ||
                              getElementIdentifier(el);
            const value = el.innerText || el.textContent || el.getAttribute('aria-valuenow') || '';
            fields.push({ identifier, value, type: COMPONENT_TYPES.ARIA_TEXTBOX });
        });

        document.querySelectorAll('[role="combobox"]:not(select)').forEach(el => {
            if (processedAriaComponents.has(el)) return;
            if (el.closest('.el-select, .ant-select, .el-cascader, .ant-cascader')) return;
            processedAriaComponents.add(el);

            const identifier = el.getAttribute('aria-label') ||
                              el.getAttribute('data-name') ||
                              getElementIdentifier(el);
            const input = el.querySelector('input');
            const value = input ? input.value : el.getAttribute('aria-valuenow') || '';
            fields.push({ identifier, value, type: COMPONENT_TYPES.ARIA_COMBOBOX, container: el });
        });
    }

    function collectCascaderComponents(fields, processedCascaders) {
        document.querySelectorAll('.el-cascader').forEach(container => {
            if (processedCascaders.has(container)) return;
            processedCascaders.add(container);

            const vueInstance = getVueInstance(container);
            let value = [];
            if (vueInstance && vueInstance.modelValue !== undefined) {
                value = Array.isArray(vueInstance.modelValue) ? vueInstance.modelValue : [vueInstance.modelValue];
            }

            const formItem = container.closest('.el-form-item, .ant-form-item, [class*="form-item"]');
            let identifier = '级联选择器';
            if (formItem) {
                const label = formItem.querySelector('.el-form-item__label, .ant-form-item-label label, label');
                if (label) identifier = label.innerText.trim();
            }
            if (container.getAttribute('aria-label')) {
                identifier = container.getAttribute('aria-label');
            }

            fields.push({
                identifier,
                value,
                type: COMPONENT_TYPES.ELEMENT_CASCADER,
                container
            });
        });

        document.querySelectorAll('.ant-cascader').forEach(container => {
            if (processedCascaders.has(container)) return;
            processedCascaders.add(container);

            const vueInstance = getVueInstance(container);
            let value = [];
            if (vueInstance && vueInstance.value !== undefined) {
                value = Array.isArray(vueInstance.value) ? vueInstance.value : [vueInstance.value];
            }

            const formItem = container.closest('.ant-form-item, .el-form-item, [class*="form-item"]');
            let identifier = '级联选择器';
            if (formItem) {
                const label = formItem.querySelector('.ant-form-item-label label, .el-form-item__label, label');
                if (label) identifier = label.innerText.trim();
            }
            if (container.getAttribute('aria-label')) {
                identifier = container.getAttribute('aria-label');
            }

            fields.push({
                identifier,
                value,
                type: COMPONENT_TYPES.ANT_CASCADER,
                container
            });
        });

        document.querySelectorAll('.ivu-cascader').forEach(container => {
            if (processedCascaders.has(container)) return;
            processedCascaders.add(container);

            const vueInstance = getVueInstance(container);
            let value = [];
            if (vueInstance && vueInstance.value !== undefined) {
                value = Array.isArray(vueInstance.value) ? vueInstance.value : [vueInstance.value];
            }

            const formItem = container.closest('.ivu-form-item, [class*="form-item"]');
            let identifier = '级联选择器';
            if (formItem) {
                const label = formItem.querySelector('.ivu-form-item-label, label');
                if (label) identifier = label.innerText.trim();
            }
            if (container.getAttribute('aria-label')) {
                identifier = container.getAttribute('aria-label');
            }

            fields.push({
                identifier,
                value,
                type: COMPONENT_TYPES.IVIEW_CASCADER,
                container
            });
        });
    }

    function collectAddressCascadeSelects(fields, processed) {
        const addressContainers = document.querySelectorAll('.address-select-container, [class*="address"], [class*="region"], [class*="area"]');

        addressContainers.forEach(container => {
            if (processed.has(container)) return;

            const selects = container.querySelectorAll('.el-select, .ant-select, .ivu-select');
            if (selects.length < 2) return;

            const isAddressSelect = Array.from(selects).some((select, index) => {
                const placeholder = select.querySelector('.el-select__placeholder span, .ant-select-selection-placeholder, .ivu-select-placeholder');
                if (!placeholder) return false;
                const text = placeholder.innerText || placeholder.textContent || '';
                return /省|市|区|县|城市|区县/.test(text);
            });

            if (!isAddressSelect) return;

            processed.add(container);

            const formItem = container.closest('.el-form-item, .ant-form-item, .ivu-form-item, [class*="form-item"]');
            let identifier = '地址选择';
            if (formItem) {
                const label = formItem.querySelector('.el-form-item__label, .ant-form-item-label label, .ivu-form-item-label, label');
                if (label) identifier = label.innerText.trim();
            }
            if (container.getAttribute('aria-label')) {
                identifier = container.getAttribute('aria-label');
            }

            const values = [];
            const selectInfos = [];

            selects.forEach((select, index) => {
                let currentValue = '';
                let placeholder = '';

                const vueInstance = getVueInstance(select);
                if (vueInstance) {
                    if (vueInstance.modelValue !== undefined) currentValue = vueInstance.modelValue;
                    else if (vueInstance.value !== undefined) currentValue = vueInstance.value;
                }

                const placeholderEl = select.querySelector('.el-select__placeholder span, .ant-select-selection-placeholder, .ivu-select-placeholder');
                if (placeholderEl) {
                    placeholder = placeholderEl.innerText || placeholderEl.textContent || '';
                }

                const isDisabled = select.querySelector('.is-disabled, .ant-select-disabled, .ivu-select-disabled') !== null;

                values.push(currentValue);
                selectInfos.push({
                    element: select,
                    value: currentValue,
                    placeholder,
                    index,
                    isDisabled
                });
            });

            fields.push({
                identifier,
                value: values,
                type: COMPONENT_TYPES.ADDRESS_CASCADE_SELECTS,
                container,
                selectInfos,
                selectCount: selects.length
            });
        });
    }

    async function fillAddressCascadeSelects(container, values) {
        if (!Array.isArray(values) || values.length === 0) {
            return;
        }

        const selects = container.querySelectorAll('.el-select, .ant-select, .ivu-select');
        if (selects.length === 0) {
            return;
        }

        for (let i = 0; i < Math.min(values.length, selects.length); i++) {
            const select = selects[i];
            const value = values[i];

            if (!value) {
                continue;
            }

            const wrapper = select.querySelector('.el-select__wrapper, .ant-select-selector, .ivu-select-selection');
            if (!wrapper) {
                continue;
            }

            const isDisabled = select.querySelector('.is-disabled, .ant-select-disabled, .ivu-select-disabled') !== null;
            if (isDisabled) {
                let waited = 0;
                const maxWait = 5000;
                while (waited < maxWait) {
                    await waitFor(200);
                    waited += 200;

                    const stillDisabled = select.querySelector('.is-disabled, .ant-select-disabled, .ivu-select-disabled') !== null;
                    if (!stillDisabled) {
                        break;
                    }
                }

                if (waited >= maxWait) {
                    continue;
                }
            }

            const vueInstance = getVueInstance(select);
            if (vueInstance) {
                try {
                    vueInstance.$emit('update:modelValue', value);
                    vueInstance.$emit('input', value);
                    vueInstance.$emit('change', value);
                } catch (e) {}
            }

            wrapper.click();
            await waitFor(300);

            try {
                const dropdown = await waitForElement('.el-select__popper, .el-select-dropdown, .ant-select-dropdown:not(.ant-select-dropdown-hidden), .ivu-select-dropdown', 2000);

                const items = dropdown.querySelectorAll('.el-select-dropdown__item, .ant-select-item-option, .ivu-select-item');
                let found = false;

                for (const item of items) {
                    const itemText = item.innerText?.trim();
                    const itemValue = item.getAttribute('data-value');

                    if (itemText === value || itemValue === value || fuzzyMatch(itemText, String(value))) {
                        item.click();
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    document.body.click();
                }

                await waitFor(500);

            } catch (e) {
                document.body.click();
            }
        }
    }

    // 字段收集缓存：短时间内多次调用只扫描一次 DOM
    let _fieldCache = null;
    let _fieldCacheTime = 0;
    const FIELD_CACHE_TTL = 1000; // 1秒缓存

    function invalidateFieldCache() {
        _fieldCache = null;
        _fieldCacheTime = 0;
    }

    function getCachedFormFields() {
        const now = Date.now();
        if (_fieldCache && (now - _fieldCacheTime) < FIELD_CACHE_TTL) {
            return _fieldCache;
        }
        _fieldCache = _collectFormFieldsImpl();
        _fieldCacheTime = now;
        return _fieldCache;
    }

    function _collectFormFieldsImpl() {
        const fields = [];
        const processedRadios = new Set();
        const processedCheckboxes = new Set();
        const processedCustomSelects = new Set();
        const processedDatePickers = new Set();
        const processedContentEditables = new Set();
        const processedAriaComponents = new Set();
        const processedCascaders = new Set();

        collectContentEditablesAndAria(fields, processedContentEditables, processedAriaComponents);

        collectCascaderComponents(fields, processedCascaders);

        collectAddressCascadeSelects(fields, processedCascaders);

        const inputs = document.querySelectorAll('input:not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), select, textarea');
        for (let el of inputs) {
            const tag = el.tagName.toLowerCase();
            const type = el.type ? el.type.toLowerCase() : '';

            // ----- 时间选择器检测 (优先处理) -----
            const datePickerInfo = detectDatePicker(el);
            if (datePickerInfo) {
                if (processedDatePickers.has(datePickerInfo.container)) continue;
                processedDatePickers.add(datePickerInfo.container);
                const identifier = getDatePickerIdentifier(datePickerInfo);
                const value = getDatePickerValue(datePickerInfo);
                fields.push({ identifier, value, type: 'date-picker', pickerType: datePickerInfo.type });
                continue;
            }

            // ----- 自定义下拉组件检测 (优先处理) -----
            const customSelectInfo = detectCustomSelect(el);
            if (customSelectInfo) {
                if (processedCustomSelects.has(customSelectInfo.container)) continue;
                processedCustomSelects.add(customSelectInfo.container);
                const identifier = getCustomSelectIdentifier(customSelectInfo);
                const value = getCustomSelectValue(customSelectInfo);
                fields.push({ identifier, value, type: 'custom-select', selectType: customSelectInfo.type });
                continue;
            }

            // ----- 隐藏域 -----
            if (type === 'hidden') {
                const identifier = getElementIdentifier(el);
                fields.push({ identifier, value: el.value, type: 'hidden' });
                continue;
            }

            // ----- 滑块 -----
            if (type === 'range') {
                const identifier = getElementIdentifier(el);
                fields.push({ identifier, value: el.value, type: 'range' });
                continue;
            }

            // ----- 颜色选择器 -----
            if (type === 'color') {
                const identifier = getElementIdentifier(el);
                fields.push({ identifier, value: el.value, type: 'color' });
                continue;
            }

            // ----- 单选框组 -----
            if (type === 'radio') {
                const name = el.name;
                if (name) {
                    if (processedRadios.has(name)) continue;
                    processedRadios.add(name);
                    const radioGroup = Array.from(document.querySelectorAll(`input[type="radio"][name="${name}"]`));
                    const groupInfo = getRadioGroupValueAndIdentifier(radioGroup);
                    // 计算组索引（在页面中的位置）
                    const allGroups = getAllRadioGroups();
                    const groupIndex = allGroups.findIndex(g =>
                        g.length > 0 && g[0] === radioGroup[0]
                    );

                    fields.push({
                        identifier: groupInfo.identifier,
                        value: groupInfo.value,
                        type: 'radio-group',
                        groupName: name,
                        baseIdentifier: groupInfo.baseIdentifier,
                        checkedIndex: groupInfo.checkedIndex,
                        groupIndex: groupIndex
                    });
                    continue;
                }
                const containerKey = findRadioGroupContainer(el);
                if (containerKey) {
                    if (processedRadios.has(containerKey)) continue;
                    processedRadios.add(containerKey);
                    const radioGroup = findRadioGroupByContainer(el, containerKey);
                    if (radioGroup.length > 1) {
                        const groupInfo = getRadioGroupValueAndIdentifier(radioGroup);
                        // 计算组索引
                        const allGroups = getAllRadioGroups();
                        const groupIndex = allGroups.findIndex(g =>
                            g.length > 0 && g[0] === radioGroup[0]
                        );

                        fields.push({
                            identifier: groupInfo.identifier,
                            value: groupInfo.value,
                            type: 'radio-group',
                            containerKey: containerKey,
                            baseIdentifier: groupInfo.baseIdentifier,
                            checkedIndex: groupInfo.checkedIndex,
                            groupIndex: groupIndex
                        });
                        continue;
                    }
                }
                const identifier = getElementIdentifier(el);
                fields.push({ identifier, value: el.checked ? el.value : '', type: 'radio' });
                continue;
            }

            // ----- 复选框组 -----
            if (type === 'checkbox') {
                const name = el.name;
                if (name && document.querySelectorAll(`input[type="checkbox"][name="${name}"]`).length > 1) {
                    if (processedCheckboxes.has(name)) continue;
                    processedCheckboxes.add(name);
                    const checkboxGroup = Array.from(document.querySelectorAll(`input[type="checkbox"][name="${name}"]`));
                    const { identifier, value } = getCheckboxGroupValueAndIdentifier(checkboxGroup, name);
                    fields.push({ identifier, value, type: 'checkbox-group', groupName: name });
                    continue;
                }
                const containerKey = findCheckboxGroupContainer(el);
                if (containerKey) {
                    if (processedCheckboxes.has(containerKey)) continue;
                    processedCheckboxes.add(containerKey);
                    const checkboxGroup = findCheckboxGroupByContainer(el, containerKey);
                    if (checkboxGroup.length > 1) {
                        const { identifier, value } = getCheckboxGroupValueAndIdentifier(checkboxGroup, containerKey);
                        fields.push({ identifier, value, type: 'checkbox-group', containerKey: containerKey });
                        continue;
                    }
                }
                const identifier = getElementIdentifier(el);
                fields.push({ identifier, value: el.checked, type: 'checkbox' });
                continue;
            }

            // ----- 下拉框（支持多选） -----
            if (tag === 'select') {
                const identifier = getElementIdentifier(el);
                if (el.multiple) {
                    // 多选下拉框：保存所有选中的值
                    const selectedValues = Array.from(el.selectedOptions).map(opt => opt.value);
                    fields.push({ identifier, value: selectedValues, type: 'select-multiple' });
                } else {
                    fields.push({ identifier, value: el.value, type: 'select' });
                }
                continue;
            }

            // ----- 其他输入框（text, password, email, tel, url, search, number, date, time 等） -----
            const identifier = getElementIdentifier(el);
            let value = el.value;
            fields.push({ identifier, value, type: type || 'input' });
        }

        // ----- 收集纯 div/span 自定义表单组件 -----
        collectCustomDivComponents(fields, processedRadios, processedCheckboxes);

        return fields;
    }

    // 收集纯 div/span 自定义表单组件（无原生 input 元素）
    function collectCustomDivComponents(fields, processedRadios, processedCheckboxes) {
        // 1. 收集自定义单选组件 (role=radio 或 class 包含 radio)
        const customRadios = document.querySelectorAll('[role="radio"], [class*="radio"]:not(input):not(.ant-radio-input):not(.el-radio__original):not(.ivu-radio-input)');
        const customRadioGroups = new Map();

        customRadios.forEach(radio => {
            if (radio.tagName === 'INPUT') return;
            const groupContainer = radio.closest('[role="radiogroup"], [class*="radio-group"]') || radio.parentElement;
            const groupKey = groupContainer.className || groupContainer.id || `custom_radio_group_${customRadioGroups.size}`;

            if (!customRadioGroups.has(groupKey)) {
                customRadioGroups.set(groupKey, { container: groupContainer, items: [] });
            }
            customRadioGroups.get(groupKey).items.push(radio);
        });

        customRadioGroups.forEach((group, groupKey) => {
            if (processedRadios.has(groupKey)) return;
            processedRadios.add(groupKey);

            const identifier = getCustomRadioGroupIdentifier(group.container, group.items);
            const value = getCustomRadioGroupValue(group.items);

            if (group.items.length > 0) {
                fields.push({
                    identifier,
                    value,
                    type: 'custom-radio-group',
                    containerKey: groupKey,
                    selector: generateElementSelector(group.container)
                });
            }
        });

        // 2. 收集自定义复选组件 (role=checkbox 或 class 包含 checkbox)
        const customCheckboxes = document.querySelectorAll('[role="checkbox"], [class*="checkbox"]:not(input):not(.ant-checkbox-input):not(.el-checkbox__original):not(.ivu-checkbox-input)');
        const customCheckboxGroups = new Map();

        customCheckboxes.forEach(checkbox => {
            if (checkbox.tagName === 'INPUT') return;
            const groupContainer = checkbox.closest('[role="group"], [class*="checkbox-group"]') || checkbox.parentElement;
            const groupKey = groupContainer.className || groupContainer.id || `custom_checkbox_group_${customCheckboxGroups.size}`;

            if (!customCheckboxGroups.has(groupKey)) {
                customCheckboxGroups.set(groupKey, { container: groupContainer, items: [] });
            }
            customCheckboxGroups.get(groupKey).items.push(checkbox);
        });

        customCheckboxGroups.forEach((group, groupKey) => {
            if (processedCheckboxes.has(groupKey)) return;
            processedCheckboxes.add(groupKey);

            const identifier = getCustomCheckboxGroupIdentifier(group.container, group.items);
            const value = getCustomCheckboxGroupValue(group.items);

            if (group.items.length > 0) {
                fields.push({
                    identifier,
                    value,
                    type: 'custom-checkbox-group',
                    containerKey: groupKey,
                    selector: generateElementSelector(group.container)
                });
            }
        });

        // 3. 收集自定义可点击选项 (如投票选项等)
        const customOptions = document.querySelectorAll('[class*="option"][class*="active"], [class*="item"][class*="selected"], [class*="choice"][class*="active"]');
        customOptions.forEach(option => {
            const container = option.closest('[class*="options"], [class*="choices"], [class*="list"]');
            if (container) {
                const identifier = container.getAttribute('aria-label') || container.className || 'custom_options';
                const value = option.getAttribute('data-value') || option.getAttribute('data-id') || option.innerText?.trim();
                if (value) {
                    fields.push({
                        identifier,
                        value,
                        type: 'custom-option',
                        selector: generateElementSelector(option)
                    });
                }
            }
        });
    }

    // 获取自定义单选组的标识符
    function getCustomRadioGroupIdentifier(container, items) {
        // 尝试从容器获取
        const ariaLabel = container.getAttribute('aria-label');
        if (ariaLabel) return ariaLabel;

        // 尝试从表单项获取 label
        const formItem = container.closest('.ant-form-item, .el-form-item, .ivu-form-item, [class*="form-item"]');
        if (formItem) {
            const label = formItem.querySelector('.ant-form-item-label label, .el-form-item__label, .ivu-form-item-label, label');
            if (label) return label.innerText.trim();
        }

        // 尝试从父元素获取标题
        let parent = container.parentElement;
        while (parent && parent !== document.body) {
            const titleEl = parent.querySelector('.title, .label, [class*="title"], [class*="label"]');
            if (titleEl) {
                const text = titleEl.innerText?.trim();
                if (text && text.length < 50) return text;
            }
            parent = parent.parentElement;
        }

        return 'custom_radio_group';
    }

    // 获取自定义单选组的值
    function getCustomRadioGroupValue(items) {
        for (const item of items) {
            const isSelected = item.classList.contains('checked') ||
                              item.classList.contains('selected') ||
                              item.classList.contains('active') ||
                              item.getAttribute('aria-checked') === 'true' ||
                              item.getAttribute('data-checked') === 'true';
            if (isSelected) {
                return item.getAttribute('data-value') ||
                       item.getAttribute('data-id') ||
                       item.innerText?.trim();
            }
        }
        return '';
    }

    // 获取自定义复选组的标识符
    function getCustomCheckboxGroupIdentifier(container, items) {
        const ariaLabel = container.getAttribute('aria-label');
        if (ariaLabel) return ariaLabel;

        const formItem = container.closest('.ant-form-item, .el-form-item, .ivu-form-item, [class*="form-item"]');
        if (formItem) {
            const label = formItem.querySelector('.ant-form-item-label label, .el-form-item__label, .ivu-form-item-label, label');
            if (label) return label.innerText.trim();
        }

        return 'custom_checkbox_group';
    }

    // 获取自定义复选组的值
    function getCustomCheckboxGroupValue(items) {
        const values = [];
        for (const item of items) {
            const isSelected = item.classList.contains('checked') ||
                              item.classList.contains('selected') ||
                              item.classList.contains('active') ||
                              item.getAttribute('aria-checked') === 'true' ||
                              item.getAttribute('data-checked') === 'true';
            if (isSelected) {
                values.push(item.getAttribute('data-value') ||
                           item.getAttribute('data-id') ||
                           item.innerText?.trim());
            }
        }
        return values;
    }

    // 生成元素选择器（用于后续定位）
    function generateElementSelector(el) {
        if (el.id) return `#${el.id}`;

        const path = [];
        let current = el;
        while (current && current !== document.body) {
            let selector = current.tagName.toLowerCase();
            if (current.className && typeof current.className === 'string') {
                const classes = current.className.split(' ').filter(c => c && c.length < 30);
                if (classes.length > 0) {
                    selector += '.' + classes.slice(0, 2).join('.');
                }
            }
            path.unshift(selector);
            current = current.parentElement;
        }
        return path.join(' > ');
    }

    // 核心填充函数: 根据fields数组填充表单
    async function fillFormWithFields(fields, saveHistory = true, allowEmpty = false) {
        invalidateFieldCache();
        // 保存填充前的状态（用于撤销）
        if (saveHistory) {
            saveFillHistory();
        }

        // 追踪已填充的元素，避免重复填充
        const filledElements = new Set();

        for (let field of fields) {
            const { identifier, value, type, selectType, pickerType, groupName, containerKey, selector, baseIdentifier, checkedIndex, groupIndex } = field;
            if (!identifier) continue;

            // ----- 单选框组填充 (使用 groupIndex 精确匹配) -----
            if (type === 'radio-group') {
                fillRadioGroupPrecise(identifier, value, groupName, containerKey, baseIdentifier, checkedIndex, groupIndex);
                continue;
            }

            // ----- 自定义 div/span 单选组填充 -----
            if (type === 'custom-radio-group') {
                fillCustomRadioGroup(identifier, value, containerKey, selector);
                continue;
            }

            // ----- 自定义 div/span 复选组填充 -----
            if (type === 'custom-checkbox-group') {
                fillCustomCheckboxGroup(identifier, value, containerKey, selector);
                continue;
            }

            // ----- 自定义选项填充 -----
            if (type === 'custom-option') {
                fillCustomOption(identifier, value, selector);
                continue;
            }

            // ----- 复选框组填充 (优先处理，避免被单个匹配) -----
            if (type === 'checkbox-group' && Array.isArray(value)) {
                let targetCheckboxes = [];
                if (groupName) {
                    targetCheckboxes = Array.from(document.querySelectorAll(`input[type="checkbox"][name="${groupName}"]`));
                } else if (containerKey) {
                    const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
                    for (const cb of allCheckboxes) {
                        const cbContainerKey = findCheckboxGroupContainer(cb);
                        if (cbContainerKey === containerKey) {
                            targetCheckboxes.push(cb);
                        }
                    }
                }
                if (targetCheckboxes.length > 0) {
                    targetCheckboxes.forEach(cb => {
                        if (filledElements.has(cb)) return;
                        fillCheckboxElement(cb, value.includes(cb.value));
                        filledElements.add(cb);
                    });
                    continue;
                }
            }

            // ----- 时间选择器填充 -----
            if (type === 'date-picker') {
                const datePickers = findAllDatePickers();
                for (const pickerInfo of datePickers) {
                    const pickerIdentifier = getDatePickerIdentifier(pickerInfo);
                    if (fuzzyMatch(pickerIdentifier, identifier)) {
                        fillDatePicker(pickerInfo, value);
                    }
                }
                continue;
            }

            // ----- 自定义下拉组件填充 (异步等待，支持级联选择器) -----
            if (type === 'custom-select') {
                const customSelects = findAllCustomSelects();
                for (const selectInfo of customSelects) {
                    // 跳过已填充的元素
                    if (filledElements.has(selectInfo.container)) continue;
                    const selectIdentifier = getCustomSelectIdentifier(selectInfo);
                    if (fuzzyMatch(selectIdentifier, identifier)) {
                        await fillCustomSelect(selectInfo, value);
                        filledElements.add(selectInfo.container);
                        break;
                    }
                }
                continue;
            }

            // ----- 级联选择器填充 (Element UI / Ant Design) -----
            if (type === COMPONENT_TYPES.ELEMENT_CASCADER || type === COMPONENT_TYPES.ANT_CASCADER) {
                const cascaderSelector = type === COMPONENT_TYPES.ELEMENT_CASCADER ? '.el-cascader' : '.ant-cascader';
                const cascaders = document.querySelectorAll(cascaderSelector);

                for (const cascader of cascaders) {
                    if (filledElements.has(cascader)) continue;

                    const formItem = cascader.closest('.el-form-item, .ant-form-item, [class*="form-item"]');
                    let cascaderIdentifier = '级联选择器';
                    if (formItem) {
                        const label = formItem.querySelector('.el-form-item__label, .ant-form-item-label label, label');
                        if (label) cascaderIdentifier = label.innerText.trim();
                    }
                    if (cascader.getAttribute('aria-label')) {
                        cascaderIdentifier = cascader.getAttribute('aria-label');
                    }

                    if (fuzzyMatch(cascaderIdentifier, identifier)) {
                        const handler = ComponentHandlers[type];
                        if (handler) {
                            const input = cascader.querySelector('input');
                            if (input) {
                                await handler.setValue(input, value);
                                filledElements.add(cascader);
                                break;
                            }
                        }
                    }
                }
                continue;
            }

            // ----- 地址级联选择器填充 (多个独立Select组合) -----
            if (type === COMPONENT_TYPES.ADDRESS_CASCADE_SELECTS) {
                const addressContainers = document.querySelectorAll('.address-select-container, [class*="address"], [class*="region"], [class*="area"]');

                for (const container of addressContainers) {
                    if (filledElements.has(container)) continue;

                    const formItem = container.closest('.el-form-item, .ant-form-item, .ivu-form-item, [class*="form-item"]');
                    let containerIdentifier = '地址选择';
                    if (formItem) {
                        const label = formItem.querySelector('.el-form-item__label, .ant-form-item-label label, .ivu-form-item-label, label');
                        if (label) containerIdentifier = label.innerText.trim();
                    }
                    if (container.getAttribute('aria-label')) {
                        containerIdentifier = container.getAttribute('aria-label');
                    }

                    if (fuzzyMatch(containerIdentifier, identifier)) {
                        await fillAddressCascadeSelects(container, value);
                        filledElements.add(container);
                        break;
                    }
                }
                continue;
            }

            // ----- 地址级联选择器填充 (多个独立Select组合) -----
            if (type === COMPONENT_TYPES.ADDRESS_CASCADE_SELECTS) {
                const addressContainers = document.querySelectorAll('.address-select-container, [class*="address"], [class*="region"], [class*="area"]');

                for (const container of addressContainers) {
                    if (filledElements.has(container)) continue;

                    const formItem = container.closest('.el-form-item, .ant-form-item, .ivu-form-item, [class*="form-item"]');
                    let containerIdentifier = '地址选择';
                    if (formItem) {
                        const label = formItem.querySelector('.el-form-item__label, .ant-form-item-label label, .ivu-form-item-label, label');
                        if (label) containerIdentifier = label.innerText.trim();
                    }
                    if (container.getAttribute('aria-label')) {
                        containerIdentifier = container.getAttribute('aria-label');
                    }

                    if (fuzzyMatch(containerIdentifier, identifier)) {
                        await fillAddressCascadeSelects(container, value);
                        filledElements.add(container);
                        break;
                    }
                }
                continue;
            }

            // ----- contenteditable 填充 -----
            if (type === COMPONENT_TYPES.CONTENTEDITABLE || type === COMPONENT_TYPES.ARIA_TEXTBOX) {
                const contentEditables = document.querySelectorAll('[contenteditable="true"], [role="textbox"]:not(input):not(textarea)');

                for (const el of contentEditables) {
                    if (filledElements.has(el)) continue;
                    if (el.closest('.el-input, .ant-input, .el-select, .ant-select')) continue;

                    const elIdentifier = el.getAttribute('aria-label') ||
                                        el.getAttribute('data-name') ||
                                        getElementIdentifier(el);

                    if (fuzzyMatch(elIdentifier, identifier)) {
                        const handler = ComponentHandlers[type];
                        if (handler) {
                            await handler.setValue(el, value);
                            filledElements.add(el);
                            break;
                        }
                    }
                }
                continue;
            }

            // ----- ARIA combobox 填充 -----
            if (type === COMPONENT_TYPES.ARIA_COMBOBOX) {
                const comboboxes = document.querySelectorAll('[role="combobox"]:not(select)');

                for (const el of comboboxes) {
                    if (filledElements.has(el)) continue;
                    if (el.closest('.el-select, .ant-select, .el-cascader, .ant-cascader')) continue;

                    const elIdentifier = el.getAttribute('aria-label') ||
                                        el.getAttribute('data-name') ||
                                        getElementIdentifier(el);

                    if (fuzzyMatch(elIdentifier, identifier)) {
                        const handler = ComponentHandlers[COMPONENT_TYPES.ARIA_COMBOBOX];
                        if (handler) {
                            await handler.setValue(el, value);
                            filledElements.add(el);
                            break;
                        }
                    }
                }
                continue;
            }

            let elements = [];
            const allCandidates = Array.from(document.querySelectorAll('input:not([type="hidden"]), select, textarea'));

            // 跳过空值字段（避免覆盖有效值）- 但撤销时需要恢复空值
            if (!allowEmpty && (value === '' || value === null || value === undefined)) {
                continue;
            }

            const matches = (el) => {
                const elIdentifier = getElementIdentifier(el);
                if (fuzzyMatch(elIdentifier, identifier)) return true;

                // 智能学习：尝试同义词匹配
                const aliases = getAliasesForIdentifier(identifier);
                for (const alias of aliases) {
                    if (alias !== identifier && fuzzyMatch(elIdentifier, alias)) return true;
                }

                if (el.id && !isDynamicId(el.id)) {
                    const labelFor = document.querySelector(`label[for="${el.id}"]`);
                    if (labelFor && fuzzyMatch(labelFor.innerText.trim(), identifier)) return true;
                }

                if (el.closest('label')) {
                    const labelText = el.closest('label').innerText.replace(/[*\n]/g, '').trim();
                    if (fuzzyMatch(labelText, identifier)) return true;
                }

                if (el.placeholder && fuzzyMatch(el.placeholder, identifier)) return true;

                if (el.getAttribute('aria-label') && fuzzyMatch(el.getAttribute('aria-label'), identifier)) return true;

                if (el.name && fuzzyMatch(el.name, identifier)) return true;

                const formItem = el.closest('.el-form-item, .ant-form-item, .ivu-form-item, .van-field, [class*="form-item"], [class*="form-group"]');
                if (formItem) {
                    const label = formItem.querySelector('.el-form-item__label, .ant-form-item-label label, .ivu-form-item-label, .van-field__label, label');
                    if (label && fuzzyMatch(label.innerText.trim(), identifier)) return true;
                }

                const customSelectInfo = detectCustomSelect(el);
                if (customSelectInfo) {
                    const customIdentifier = getCustomSelectIdentifier(customSelectInfo);
                    if (fuzzyMatch(customIdentifier, identifier)) return true;
                }

                const datePickerInfo = detectDatePicker(el);
                if (datePickerInfo) {
                    const pickerIdentifier = getDatePickerIdentifier(datePickerInfo);
                    if (fuzzyMatch(pickerIdentifier, identifier)) return true;
                }

                return false;
            };
            elements = allCandidates.filter(matches);
            if (elements.length === 0) continue;

            for (let el of elements) {
                const datePickerInfo = detectDatePicker(el);
                if (datePickerInfo) {
                    if (filledElements.has(datePickerInfo.container)) continue;
                    fillDatePicker(datePickerInfo, value);
                    filledElements.add(datePickerInfo.container);
                    continue;
                }

                const customSelectInfo = detectCustomSelect(el);
                if (customSelectInfo) {
                    if (filledElements.has(customSelectInfo.container)) continue;
                    await fillCustomSelect(customSelectInfo, value);
                    filledElements.add(customSelectInfo.container);
                    continue;
                }

                // 跳过已填充的元素
                if (filledElements.has(el)) continue;
                filledElements.add(el);

                const tag = el.tagName.toLowerCase();
                const inputType = el.type ? el.type.toLowerCase() : '';
                if (inputType === 'radio') {
                    fillRadioElement(el, value);
                } else if (inputType === 'checkbox') {
                    if (type === 'checkbox-group' && Array.isArray(value)) {
                        const name = el.name;
                        if (name) {
                            const allCheckboxes = document.querySelectorAll(`input[type="checkbox"][name="${name}"]`);
                            allCheckboxes.forEach(cb => {
                                fillCheckboxElement(cb, value.includes(cb.value));
                            });
                        } else if (containerKey) {
                            const allCheckboxes = findCheckboxGroupByContainer(el, containerKey);
                            allCheckboxes.forEach(cb => {
                                fillCheckboxElement(cb, value.includes(cb.value));
                            });
                        } else {
                            fillCheckboxElement(el, value.includes(el.value));
                        }
                    } else if (type === 'checkbox') {
                        fillCheckboxElement(el, value === true || value === 'true');
                    } else if (!type || type === 'input') {
                        fillCheckboxElement(el, value === true || value === 'true' || value === el.value);
                    }
                } else if (tag === 'select') {
                    fillNativeSelect(el, value);
                } else {
                    fillInputElement(el, value);
                }
            }
        }

        if (saveHistory && fields.length > 0) {
            const currentFields = getCachedFormFields();
            const learned = learnFromFill(fields, currentFields);
            if (learned > 0) {
                console.debug(`[Autofill] 智能学习了 ${learned} 个字段映射关系`);
            }
        }

        showToast('✓ 填充完成', 'success');
    }

    // 精确填充单选框组
    function fillRadioGroupPrecise(identifier, value, groupName, containerKey, baseIdentifier, checkedIndex, groupIndex) {
        clearRadioGroupsCache();

        let targetRadios = [];
        const allRadioGroups = getAllRadioGroups();

        // 1. 最优先：使用 groupIndex 精确匹配（最可靠）
        if (groupIndex !== undefined && groupIndex >= 0 && groupIndex < allRadioGroups.length) {
            targetRadios = allRadioGroups[groupIndex];
        }

        // 2. 使用完整标识符精确匹配
        if (targetRadios.length === 0) {
            for (const group of allRadioGroups) {
                const groupInfo = getRadioGroupValueAndIdentifier(group);
                if (groupInfo.identifier === identifier) {
                    targetRadios = group;
                    break;
                }
            }
        }

        // 3. 使用 groupName 匹配（但需要验证索引）
        if (targetRadios.length === 0 && groupName) {
            const groupsWithSameName = allRadioGroups.filter(group =>
                group[0] && group[0].name === groupName
            );

            if (groupsWithSameName.length === 1) {
                targetRadios = groupsWithSameName[0];
            } else if (groupsWithSameName.length > 1 && checkedIndex >= 0) {
                for (const group of groupsWithSameName) {
                    const groupInfo = getRadioGroupValueAndIdentifier(group);
                    if (groupInfo.checkedIndex === checkedIndex) {
                        targetRadios = group;
                        break;
                    }
                }
            }
        }

        // 4. 使用 containerKey 匹配
        if (targetRadios.length === 0 && containerKey) {
            for (const group of allRadioGroups) {
                const firstRadio = group[0];
                if (!firstRadio) continue;
                const radioContainerKey = findRadioGroupContainer(firstRadio);
                if (radioContainerKey === containerKey) {
                    targetRadios = group;
                    break;
                }
            }
        }

        // 5. 模糊匹配（最后手段）
        if (targetRadios.length === 0 && baseIdentifier) {
            for (const group of allRadioGroups) {
                const groupInfo = getRadioGroupValueAndIdentifier(group);
                if (fuzzyMatch(groupInfo.baseIdentifier, baseIdentifier)) {
                    targetRadios = group;
                    break;
                }
            }
        }

        // 填充找到的单选框
        if (targetRadios.length > 0) {
            // 优先使用 checkedIndex 填充（最可靠）
            if (checkedIndex >= 0 && checkedIndex < targetRadios.length) {
                fillRadioElementFast(targetRadios[checkedIndex]);
                return;
            }

            // 按值匹配
            for (const radio of targetRadios) {
                if (radio.value === value) {
                    fillRadioElementFast(radio);
                    return;
                }
            }

            // 模糊匹配值
            for (const radio of targetRadios) {
                if (fuzzyMatch(radio.value, value)) {
                    fillRadioElementFast(radio);
                    return;
                }
            }
        }
    }

    // 快速填充单选框（无延迟）
    function fillRadioElementFast(radioEl) {
        // 对于 Ant Design 等框架，需要点击 label 或 wrapper 才能正确触发
        const antWrapper = radioEl.closest('.ant-radio-wrapper');
        if (antWrapper) {
            antWrapper.click();
            return;
        }

        const elWrapper = radioEl.closest('.el-radio');
        if (elWrapper) {
            elWrapper.click();
            return;
        }

        const ivuWrapper = radioEl.closest('.ivu-radio-wrapper');
        if (ivuWrapper) {
            ivuWrapper.click();
            return;
        }

        // 原生单选框：直接设置 checked 并触发事件
        radioEl.checked = true;
        radioEl.dispatchEvent(new Event('change', { bubbles: true }));
        radioEl.dispatchEvent(new Event('input', { bubbles: true }));
        radioEl.dispatchEvent(new Event('click', { bubbles: true }));
    }

    // 填充自定义 div/span 单选组 - 优化版本
    function fillCustomRadioGroup(identifier, value, containerKey, selector) {
        let container = null;
        if (selector) {
            try {
                container = document.querySelector(selector);
            } catch (e) {}
        }

        if (!container) {
            const customRadios = document.querySelectorAll('[role="radio"], [class*="radio"]:not(input)');
            for (const radio of customRadios) {
                const groupContainer = radio.closest('[role="radiogroup"], [class*="radio-group"]') || radio.parentElement;
                const groupIdentifier = getCustomRadioGroupIdentifier(groupContainer, [radio]);
                if (fuzzyMatch(groupIdentifier, identifier)) {
                    container = groupContainer;
                    break;
                }
            }
        }

        if (!container) return;

        const items = container.querySelectorAll('[role="radio"], [class*="radio"]:not(input)');
        for (const item of items) {
            const itemValue = item.getAttribute('data-value') ||
                             item.getAttribute('data-id') ||
                             item.innerText?.trim();

            if (itemValue === value || fuzzyMatch(String(itemValue), String(value))) {
                item.click();
                item.classList.add('checked', 'selected', 'active');
                item.setAttribute('aria-checked', 'true');
                break;
            }
        }
    }

    // 填充自定义 div/span 复选组 - 优化版本
    function fillCustomCheckboxGroup(identifier, value, containerKey, selector) {
        let container = null;
        if (selector) {
            try {
                container = document.querySelector(selector);
            } catch (e) {}
        }

        if (!container) {
            const customCheckboxes = document.querySelectorAll('[role="checkbox"], [class*="checkbox"]:not(input)');
            for (const checkbox of customCheckboxes) {
                const groupContainer = checkbox.closest('[role="group"], [class*="checkbox-group"]') || checkbox.parentElement;
                const groupIdentifier = getCustomCheckboxGroupIdentifier(groupContainer, [checkbox]);
                if (fuzzyMatch(groupIdentifier, identifier)) {
                    container = groupContainer;
                    break;
                }
            }
        }

        if (!container) return;

        const items = container.querySelectorAll('[role="checkbox"], [class*="checkbox"]:not(input)');
        const valueArray = Array.isArray(value) ? value : [value];

        items.forEach(item => {
            const itemValue = item.getAttribute('data-value') ||
                             item.getAttribute('data-id') ||
                             item.innerText?.trim();

            const shouldCheck = valueArray.some(v => v === itemValue || fuzzyMatch(String(v), String(itemValue)));
            const isCurrentlyChecked = item.classList.contains('checked') ||
                                       item.classList.contains('selected') ||
                                       item.classList.contains('active') ||
                                       item.getAttribute('aria-checked') === 'true';

            if (shouldCheck !== isCurrentlyChecked) {
                item.click();
                if (shouldCheck) {
                    item.classList.add('checked', 'selected', 'active');
                    item.setAttribute('aria-checked', 'true');
                } else {
                    item.classList.remove('checked', 'selected', 'active');
                    item.setAttribute('aria-checked', 'false');
                }
            }
        });
    }

    // 填充自定义选项 - 优化版本
    function fillCustomOption(identifier, value, selector) {
        const containers = document.querySelectorAll('[class*="options"], [class*="choices"], [class*="list"]');
        for (const container of containers) {
            const containerIdentifier = container.getAttribute('aria-label') || container.className;
            if (!fuzzyMatch(containerIdentifier, identifier)) continue;

            const options = container.querySelectorAll('[class*="option"], [class*="item"], [class*="choice"]');
            for (const option of options) {
                const optionValue = option.getAttribute('data-value') ||
                                   option.getAttribute('data-id') ||
                                   option.innerText?.trim();

                if (optionValue === value || fuzzyMatch(String(optionValue), String(value))) {
                    option.click();
                    option.classList.add('active', 'selected');
                    break;
                }
            }
        }
    }

    // 查找页面所有自定义下拉组件
    function findAllCustomSelects() {
        const selects = [];
        const processed = new Set();
        const selectors = [
            '.el-select',
            '.ant-select',
            '.ivu-select',
            '.van-field',
            '[class*="select"]:not([class*="input"])',
            '[class*="picker"]:not([class*="input"])',
            '[class*="dropdown"]'
        ];
        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(container => {
                if (processed.has(container)) return;
                processed.add(container);
                const input = container.querySelector('input');
                if (input) {
                    const selectInfo = detectCustomSelect(input);
                    if (selectInfo) {
                        selects.push(selectInfo);
                    }
                }
            });
        });
        return selects;
    }

    // 填充单选框 (支持各种自定义框架组件) - 优化版本，无延迟
    function fillRadioElement(radioEl, value) {
        // 处理空值情况（撤销时需要取消选中）
        if (value === '' || value === null || value === undefined) {
            if (radioEl.checked) {
                radioEl.checked = false;
                radioEl.dispatchEvent(new Event('change', { bubbles: true }));
                radioEl.dispatchEvent(new Event('input', { bubbles: true }));
            }
            return;
        }

        if (radioEl.value !== value) return;
        const customWrapper = radioEl.closest('[class*="radio"], [role="radio"]');
        if (customWrapper && customWrapper !== radioEl) {
            customWrapper.click();
        }
        radioEl.checked = true;
        radioEl.dispatchEvent(new Event('change', { bubbles: true }));
        radioEl.dispatchEvent(new Event('input', { bubbles: true }));
        radioEl.dispatchEvent(new Event('click', { bubbles: true }));
    }

    // 填充复选框 (支持各种自定义框架组件) - 优化版本，无延迟
    function fillCheckboxElement(checkboxEl, shouldCheck) {
        // 确保 shouldCheck 是布尔值
        const checkValue = shouldCheck === true || shouldCheck === 'true' || shouldCheck === true;

        if (checkValue === checkboxEl.checked) return;
        const customWrapper = checkboxEl.closest('[class*="checkbox"], [role="checkbox"]');
        if (customWrapper && customWrapper !== checkboxEl) {
            customWrapper.click();
        }
        checkboxEl.checked = checkValue;
        checkboxEl.dispatchEvent(new Event('change', { bubbles: true }));
        checkboxEl.dispatchEvent(new Event('input', { bubbles: true }));
        checkboxEl.dispatchEvent(new Event('click', { bubbles: true }));
    }

    // 填充原生 select
    function fillNativeSelect(selectEl, value) {
        // 处理空值情况（撤销时需要清除选择）
        if (value === '' || value === null || value === undefined) {
            selectEl.selectedIndex = -1;
            selectEl.value = '';
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
            selectEl.dispatchEvent(new Event('input', { bubbles: true }));
            return;
        }

        selectEl.value = value;
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        selectEl.dispatchEvent(new Event('input', { bubbles: true }));
        const options = selectEl.options;
        for (let i = 0; i < options.length; i++) {
            if (options[i].value === value || options[i].text === value) {
                selectEl.selectedIndex = i;
                break;
            }
        }
    }

    // 填充普通输入框 (支持 React/Vue 等框架)
    function fillInputElement(inputEl, value) {
        // 尝试获取 Vue 实例并更新 (Vue 3 + Element Plus)
        const elInput = inputEl.closest('.el-input');
        if (elInput) {
            // 尝试多种方式获取 Vue 实例
            let vueInstance = getVueInstance(elInput);

            // 尝试从父元素获取
            if (!vueInstance) {
                const parent = elInput.parentElement;
                if (parent) {
                    vueInstance = getVueInstance(parent);
                }
            }

            // 尝试从 el-form-item 获取
            if (!vueInstance) {
                const formItem = elInput.closest('.el-form-item');
                if (formItem) {
                    vueInstance = getVueInstance(formItem);
                }
            }

            if (vueInstance) {
                try {
                    if (typeof vueInstance.$emit === 'function') {
                        vueInstance.$emit('update:modelValue', value);
                        vueInstance.$emit('input', value);
                        vueInstance.$emit('change', value);
                    }
                    if (vueInstance.$ && vueInstance.$.emit) {
                        vueInstance.$.emit('update:modelValue', value);
                        vueInstance.$.emit('change', value);
                    }
                } catch (e) {
                    console.debug('[Autofill] Vue emit error:', e);
                }
            }
        }

        // 尝试获取 Ant Design Vue 实例
        const antInput = inputEl.closest('.ant-input');
        if (antInput) {
            const vueInstance = getVueInstance(antInput);
            if (vueInstance) {
                try {
                    if (typeof vueInstance.$emit === 'function') {
                        vueInstance.$emit('update:value', value);
                        vueInstance.$emit('update:modelValue', value);
                        vueInstance.$emit('change', { target: { value: value } });
                    }
                } catch (e) {
                    console.debug('[Autofill] Ant Design Vue emit error:', e);
                }
            }
        }

        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;

        if (inputEl.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
            nativeTextAreaValueSetter.call(inputEl, value);
        } else if (nativeInputValueSetter) {
            nativeInputValueSetter.call(inputEl, value);
        } else {
            inputEl.value = value;
        }

        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        inputEl.dispatchEvent(new FocusEvent('focus'));
        inputEl.dispatchEvent(new FocusEvent('blur'));
    }

    // Toast 提示
    function showToast(msg, type = 'info', duration = 2000) {
        let toast = document.querySelector('.eaf-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'eaf-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.className = 'eaf-toast ' + type;
        toast.offsetHeight;
        requestAnimationFrame(() => toast.classList.add('visible'));
        setTimeout(() => toast.classList.remove('visible'), duration);
    }

    // 保存当前表单数据（使用Element UI风格对话框）
    function saveCurrentForm() {
        let fields = getCachedFormFields();
        // 过滤掉验证码字段
        fields = filterCaptchaFields(fields);
        if (fields.length === 0) {
            showToast('未检测到表单字段（已过滤验证码）', 'error');
            return;
        }

        const defaultTitle = `表单_${new Date().toLocaleString()}`;

        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: 2147483646;
            opacity: 0;
            transition: opacity 0.3s;
        `;
        document.body.appendChild(overlay);

        // 创建对话框
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.9);
            width: 420px;
            max-width: 90vw;
            background: white;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 2147483647;
            opacity: 0;
            transition: all 0.3s;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        dialog.innerHTML = `
            <div style="padding: 20px 20px 10px;">
                <div style="font-size: 18px; font-weight: 500; color: #303133; margin-bottom: 8px;">保存表单数据</div>
                <div style="font-size: 14px; color: #606266; line-height: 1.5;">
                    请输入此组数据的标题，方便后续识别和使用。
                </div>
            </div>
            <div style="padding: 10px 20px;">
                <input id="save-form-title" style="
                    width: 100%;
                    padding: 10px 15px;
                    border: 1px solid #dcdfe6;
                    border-radius: 4px;
                    font-size: 14px;
                    color: #606266;
                    box-sizing: border-box;
                    outline: none;
                    transition: border-color 0.2s;
                " placeholder="例如：登录信息" value="${defaultTitle}">
                <div style="margin-top: 8px; font-size: 12px; color: #909399;">
                    共检测到 ${fields.length} 个字段
                </div>
            </div>
            <div style="padding: 10px 20px 20px; text-align: right;">
                <button id="cancel-save-btn" style="
                    padding: 9px 20px;
                    font-size: 14px;
                    border-radius: 4px;
                    border: 1px solid #dcdfe6;
                    background: white;
                    color: #606266;
                    cursor: pointer;
                    margin-right: 10px;
                    transition: all 0.2s;
                ">取消</button>
                <button id="confirm-save-btn" style="
                    padding: 9px 20px;
                    font-size: 14px;
                    border-radius: 4px;
                    border: 1px solid #409eff;
                    background: #409eff;
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s;
                ">保存</button>
            </div>
        `;
        document.body.appendChild(dialog);

        // 显示动画
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            dialog.style.opacity = '1';
            dialog.style.transform = 'translate(-50%, -50%) scale(1)';
        });

        const titleInput = dialog.querySelector('#save-form-title');
        const cancelBtn = dialog.querySelector('#cancel-save-btn');
        const saveBtn = dialog.querySelector('#confirm-save-btn');

        // 输入框焦点样式
        titleInput.addEventListener('focus', () => {
            titleInput.style.borderColor = '#409eff';
        });
        titleInput.addEventListener('blur', () => {
            titleInput.style.borderColor = '#dcdfe6';
        });

        // 按钮悬停效果
        cancelBtn.addEventListener('mouseenter', () => {
            cancelBtn.style.color = '#409eff';
            cancelBtn.style.borderColor = '#c6e2ff';
            cancelBtn.style.background = '#ecf5ff';
        });
        cancelBtn.addEventListener('mouseleave', () => {
            cancelBtn.style.color = '#606266';
            cancelBtn.style.borderColor = '#dcdfe6';
            cancelBtn.style.background = 'white';
        });

        saveBtn.addEventListener('mouseenter', () => {
            saveBtn.style.background = '#66b1ff';
            saveBtn.style.borderColor = '#66b1ff';
        });
        saveBtn.addEventListener('mouseleave', () => {
            saveBtn.style.background = '#409eff';
            saveBtn.style.borderColor = '#409eff';
        });

        const closeDialog = () => {
            overlay.style.opacity = '0';
            dialog.style.opacity = '0';
            dialog.style.transform = 'translate(-50%, -50%) scale(0.9)';
            setTimeout(() => {
                overlay.remove();
                dialog.remove();
            }, 300);
        };

        cancelBtn.onclick = closeDialog;
        overlay.onclick = closeDialog;

        saveBtn.onclick = () => {
            const title = titleInput.value.trim();
            if (!title) {
                titleInput.style.borderColor = '#f56c6c';
                titleInput.style.boxShadow = '0 0 0 2px rgba(245,108,108,0.2)';
                showToast('请输入标题', 'error');
                return;
            }
            const newForm = {
                id: generateId(),
                title: title,
                fields: fields,
                url: location.href,
                domain: location.hostname,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            savedForms.unshift(newForm);
            saveForms();
            closeDialog();
            showToast(`已保存: ${title}`, 'success');
        };

        titleInput.focus();
        titleInput.select();

        titleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveBtn.click();
            } else if (e.key === 'Escape') {
                closeDialog();
            }
        });
    }

    // 展示填充列表 (savedForms + presets) - 支持多配置文件按域名分组
    function showFillList() {
        let content = `
            <div style="margin-bottom:12px;">
                <input type="text" id="fill-search-input" class="eaf-input" placeholder="搜索表单名称...">
            </div>
            <div id="eaf-fill-list-container"></div>
        `;
        const sidebar = openSidebar('选择填充项', content);
        const container = sidebar.querySelector('#eaf-fill-list-container');
        const searchInput = sidebar.querySelector('#fill-search-input');

        function renderItems(keyword) {
            container.innerHTML = '';

            let filteredForms = savedForms;
            if (keyword) {
                const k = keyword.toLowerCase();
                filteredForms = savedForms.filter(f =>
                    f.title.toLowerCase().includes(k) ||
                    (f.domain || '').toLowerCase().includes(k)
                );
            }

            if (filteredForms.length === 0 && presets.length === 0) {
                container.innerHTML = `
                    <div class="eaf-empty">
                        <div class="eaf-empty-icon">📋</div>
                        <p>暂无填充数据</p>
                        <span style="font-size:13px;">请先保存表单或添加预设规则</span>
                    </div>`;
                return;
            }

            if (filteredForms.length) {
                const currentDomain = location.hostname;

                // 按域名分组
                const domainGroups = new Map();
                const noDomainForms = [];

                filteredForms.forEach(form => {
                    const domain = form.domain || '';
                    if (domain) {
                        if (!domainGroups.has(domain)) {
                            domainGroups.set(domain, []);
                        }
                        domainGroups.get(domain).push(form);
                    } else {
                        noDomainForms.push(form);
                    }
                });

                // 当前域名的数据排在最前面
                const sortedDomains = Array.from(domainGroups.keys()).sort((a, b) => {
                    if (a === currentDomain) return -1;
                    if (b === currentDomain) return 1;
                    return 0;
                });

                // 当前网站的配置
                if (domainGroups.has(currentDomain)) {
                    const groupTitle = document.createElement('div');
                    groupTitle.className = 'eaf-group-title';
                    groupTitle.style.color = '#4a90d9';
                    groupTitle.innerText = `📍 当前网站 (${currentDomain})`;
                    container.appendChild(groupTitle);

                    const forms = domainGroups.get(currentDomain).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                    forms.forEach(form => {
                        container.appendChild(createFormItem(form));
                    });
                }

                // 其他网站的配置
                sortedDomains.forEach(domain => {
                    if (domain === currentDomain) return;

                    const groupTitle = document.createElement('div');
                    groupTitle.className = 'eaf-group-title';
                    groupTitle.innerText = `🌐 ${domain}`;
                    container.appendChild(groupTitle);

                    const forms = domainGroups.get(domain).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                    forms.forEach(form => {
                        container.appendChild(createFormItem(form));
                    });
                });

                // 无域名信息的数据
                if (noDomainForms.length > 0) {
                    const groupTitle = document.createElement('div');
                    groupTitle.className = 'eaf-group-title';
                    groupTitle.innerText = '📦 其他';
                    container.appendChild(groupTitle);

                    noDomainForms.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).forEach(form => {
                        container.appendChild(createFormItem(form));
                    });
                }
            }

            if (presets.length) {
                const groupTitle = document.createElement('div');
                groupTitle.className = 'eaf-group-title';
                groupTitle.innerText = '预设规则';
                container.appendChild(groupTitle);

                const sortedPresets = [...presets].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                sortedPresets.forEach(preset => {
                    const item = document.createElement('div');
                    item.className = 'eaf-list-item';
                    item.innerHTML = `
                        <span class="eaf-icon">⚡</span>
                        <span class="eaf-title">${escapeHtml(preset.name)}</span>
                        <span class="eaf-badge">${preset.fields.length}项</span>
                    `;
                    item.onclick = () => {
                        fillFormWithFields(preset.fields);
                        showToast('填充完成', 'success');
                        closeSidebar();
                    };
                    container.appendChild(item);
                });
            }
        }

        function createFormItem(form) {
            const item = document.createElement('div');
            item.className = 'eaf-list-item';
            const timeStr = form.createdAt ? new Date(form.createdAt).toLocaleDateString() : '';
            item.innerHTML = `
                <span class="eaf-icon">📋</span>
                <div style="flex:1;">
                    <div class="eaf-title">${escapeHtml(form.title)}</div>
                    <div style="font-size:11px;color:var(--eaf-text-secondary);margin-top:2px;">${timeStr}</div>
                </div>
                <span class="eaf-badge">${form.fields.length}项</span>
            `;
            item.onclick = () => {
                fillFormWithFields(form.fields);
                showToast('填充完成', 'success');
                closeSidebar();
            };
            return item;
        }

        searchInput.addEventListener('input', () => {
            renderItems(searchInput.value.trim());
        });
        renderItems();
    }

    // ---------- 预设规则管理UI ----------
    function managePresets() {
        let content = `
            <div id="eaf-preset-list" class="eaf-scroll" style="max-height:45vh;"></div>
            <button id="eaf-add-preset" class="eaf-add-field-btn" style="margin-top:12px;">+ 新增预设规则</button>
        `;
        const sidebar = openSidebar('预设规则', content);

        const container = sidebar.querySelector('#eaf-preset-list');
        const addBtn = sidebar.querySelector('#eaf-add-preset');

        function renderPresetList() {
            if (!container) return;
            container.innerHTML = '';

            if (presets.length === 0) {
                container.innerHTML = `
                    <div class="eaf-empty">
                        <div class="eaf-empty-icon">⚡</div>
                        <p>暂无预设规则</p>
                        <span style="font-size:13px;">点击下方按钮添加</span>
                    </div>`;
                return;
            }

            presets.forEach((preset) => {
                const card = document.createElement('div');
                card.className = 'eaf-field-row';
                card.innerHTML = `
                    <div class="eaf-field-row-header">
                        <span class="eaf-field-row-title">${escapeHtml(preset.name)}</span>
                        <div>
                            <button class="eaf-small-btn edit-preset" data-id="${preset.id}">编辑</button>
                            <button class="eaf-small-btn danger del-preset" data-id="${preset.id}">删除</button>
                        </div>
                    </div>
                    <div style="font-size:12px; color:var(--eaf-text-secondary);">包含 ${preset.fields.length} 个字段映射</div>
                `;
                container.appendChild(card);
            });

            container.querySelectorAll('.edit-preset').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    const preset = presets.find(p => p.id === id);
                    if (preset) editPreset(preset);
                });
            });

            container.querySelectorAll('.del-preset').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    if (confirm('确定删除此预设规则？')) {
                        deletedIds.push({ id, type: 'preset', deletedAt: Date.now() });
                        GM_setValue(STORAGE_DELETED_IDS, deletedIds);
                        presets = presets.filter(p => p.id !== id);
                        savePresets();
                        renderPresetList();
                        showToast('已删除', 'success');
                    }
                });
            });
        }

        function editPreset(preset = null) {
            const isNew = !preset;
            let fieldsArray = preset ? [...preset.fields] : [];

            let content = `
                <div class="eaf-field">
                    <label>规则名称</label>
                    <input id="preset-name" class="eaf-input" placeholder="例如：登录信息" value="${preset ? escapeHtml(preset.name) : ''}">
                </div>
                <div class="eaf-field" style="margin-top:12px;">
                    <label>字段映射</label>
                    <div id="fields-editor"></div>
                    <button id="add-field-btn" class="eaf-add-field-btn">+ 添加字段</button>
                </div>
                <div class="eaf-button-row" style="margin-top:20px;">
                    <button id="cancel-preset-btn" class="eaf-button">取消</button>
                    <button id="save-preset-btn" class="eaf-button eaf-button-primary">保存</button>
                </div>
            `;

            const editSidebar = openSidebar(isNew ? '新建预设规则' : '编辑预设', content);

            const nameInput = editSidebar.querySelector('#preset-name');
            const fieldsContainer = editSidebar.querySelector('#fields-editor');
            const addFieldBtn = editSidebar.querySelector('#add-field-btn');
            const cancelBtn = editSidebar.querySelector('#cancel-preset-btn');
            const saveBtn = editSidebar.querySelector('#save-preset-btn');

            function renderFields() {
                fieldsContainer.innerHTML = '';
                if (fieldsArray.length === 0) {
                    fieldsContainer.innerHTML = '<div style="color:var(--eaf-text-secondary);font-size:13px;padding:8px 0;">暂无字段，请添加</div>';
                    return;
                }

                fieldsArray.forEach((field, idx) => {
                    const div = document.createElement('div');
                    div.className = 'eaf-field-row';
                    div.style.marginBottom = '8px';
                    div.innerHTML = `
                        <input class="eaf-input field-identifier" placeholder="字段标识（如：用户名）" value="${escapeHtml(field.identifier)}">
                        <input class="eaf-input field-value" placeholder="填充值" value="${escapeHtml(field.value)}" style="margin-top:6px;">
                        <button class="eaf-small-btn danger remove-field" data-idx="${idx}" style="margin-top:6px;">删除</button>
                    `;
                    fieldsContainer.appendChild(div);
                });

                fieldsContainer.querySelectorAll('.remove-field').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const idx = parseInt(btn.getAttribute('data-idx'));
                        fieldsArray.splice(idx, 1);
                        renderFields();
                    });
                });

                const rows = fieldsContainer.querySelectorAll('.eaf-field-row');
                rows.forEach((row, i) => {
                    const identInput = row.querySelector('.field-identifier');
                    const valInput = row.querySelector('.field-value');
                    identInput.addEventListener('input', () => {
                        if (fieldsArray[i]) fieldsArray[i].identifier = identInput.value;
                    });
                    valInput.addEventListener('input', () => {
                        if (fieldsArray[i]) fieldsArray[i].value = valInput.value;
                    });
                });
            }
            renderFields();

            addFieldBtn.onclick = () => {
                fieldsArray.push({ identifier: '', value: '' });
                renderFields();
            };

            cancelBtn.onclick = () => {
                managePresets();
            };

            saveBtn.onclick = () => {
                const name = nameInput.value.trim();
                if (!name) {
                    showToast('请输入规则名称', 'error');
                    return;
                }
                const validFields = fieldsArray.filter(f => f.identifier.trim() !== '');
                if (validFields.length === 0) {
                    showToast('至少添加一个有效字段', 'error');
                    return;
                }

                if (isNew) {
                    const newPreset = { id: generateId(), name, fields: validFields, createdAt: Date.now() };
                    presets.unshift(newPreset);
                } else {
                    preset.name = name;
                    preset.fields = validFields;
                    preset.updatedAt = Date.now();
                }
                savePresets();
                managePresets();
                showToast(isNew ? '预设已添加' : '已更新', 'success');
            };
        }

        renderPresetList();
        addBtn.onclick = () => editPreset(null);
    }

    // 数据管理（保存的表单 + 预设规则）
    function manageSavedForms() {
        let content = `
            <div style="display:flex;gap:8px;margin-bottom:12px;align-items:center;">
                <input type="text" id="search-manage" class="eaf-input" placeholder="搜索..." style="flex:1;">
                <button id="select-all-btn" class="eaf-small-btn" style="white-space:nowrap;">全选</button>
                <button id="delete-selected-btn" class="eaf-small-btn danger" style="white-space:nowrap;">删除选中</button>
            </div>
            <div id="eaf-saved-list" class="eaf-scroll" style="max-height:60vh;"></div>
        `;
        const sidebar = openSidebar('数据管理', content);
        const container = sidebar.querySelector('#eaf-saved-list');
        const searchInput = sidebar.querySelector('#search-manage');
        const selectAllBtn = sidebar.querySelector('#select-all-btn');
        const deleteSelectedBtn = sidebar.querySelector('#delete-selected-btn');

        let selectedForms = new Set();
        let selectedPresets = new Set();

        function updateSelectAllBtn() {
            const totalItems = savedForms.length + presets.length;
            const selectedItems = selectedForms.size + selectedPresets.size;
            if (selectedItems === 0) {
                selectAllBtn.textContent = '全选';
                selectAllBtn.classList.remove('active');
            } else if (selectedItems === totalItems && totalItems > 0) {
                selectAllBtn.textContent = '取消全选';
                selectAllBtn.classList.add('active');
            } else {
                selectAllBtn.textContent = '全选';
                selectAllBtn.classList.remove('active');
            }
        }

        function updateDeleteBtn() {
            const hasSelection = selectedForms.size > 0 || selectedPresets.size > 0;
            deleteSelectedBtn.style.opacity = hasSelection ? '1' : '0.5';
            deleteSelectedBtn.disabled = !hasSelection;
        }

        function renderSaved(formsList = savedForms, presetsList = presets) {
            container.innerHTML = '';
            selectedForms.clear();
            selectedPresets.clear();
            updateSelectAllBtn();
            updateDeleteBtn();

            if (formsList.length === 0 && presetsList.length === 0) {
                container.innerHTML = `
                    <div class="eaf-empty">
                        <div class="eaf-empty-icon">📋</div>
                        <p>暂无数据</p>
                        <span style="font-size:13px;">保存表单或添加预设规则</span>
                    </div>`;
                return;
            }

            // 保存的表单
            if (formsList.length) {
                const groupTitle = document.createElement('div');
                groupTitle.className = 'eaf-group-title';
                groupTitle.innerHTML = `<input type="checkbox" class="select-group-forms" style="margin-right:8px;">保存的表单 (${formsList.length})`;
                container.appendChild(groupTitle);

                const sortedForms = [...formsList].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                sortedForms.forEach((form) => {
                    const card = document.createElement('div');
                    card.className = 'eaf-field-row';
                    card.innerHTML = `
                        <div class="eaf-field-row-header">
                            <label style="display:flex;align-items:center;gap:8px;flex:1;cursor:pointer;">
                                <input type="checkbox" class="select-form" data-id="${form.id}">
                                <span class="eaf-field-row-title">${escapeHtml(form.title)}</span>
                            </label>
                            <div style="display:flex;gap:6px;">
                                <button class="eaf-small-btn danger del-form" data-id="${form.id}">删除</button>
                                <button class="eaf-small-btn use-form" data-id="${form.id}">填充</button>
                            </div>
                        </div>
                        <div style="font-size:12px; color:var(--eaf-text-secondary);margin-left:24px;">${form.fields.length} 个字段</div>
                    `;
                    container.appendChild(card);
                });
            }

            // 预设规则
            if (presetsList.length) {
                const groupTitle = document.createElement('div');
                groupTitle.className = 'eaf-group-title';
                groupTitle.innerHTML = `<input type="checkbox" class="select-group-presets" style="margin-right:8px;">预设规则 (${presetsList.length})`;
                container.appendChild(groupTitle);

                const sortedPresets = [...presetsList].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                sortedPresets.forEach((preset) => {
                    const card = document.createElement('div');
                    card.className = 'eaf-field-row';
                    card.innerHTML = `
                        <div class="eaf-field-row-header">
                            <label style="display:flex;align-items:center;gap:8px;flex:1;cursor:pointer;">
                                <input type="checkbox" class="select-preset" data-id="${preset.id}">
                                <span class="eaf-field-row-title">${escapeHtml(preset.name)}</span>
                            </label>
                            <div style="display:flex;gap:6px;">
                                <button class="eaf-small-btn danger del-preset" data-id="${preset.id}">删除</button>
                                <button class="eaf-small-btn use-preset" data-id="${preset.id}">填充</button>
                            </div>
                        </div>
                        <div style="font-size:12px; color:var(--eaf-text-secondary);margin-left:24px;">${preset.fields.length} 个字段</div>
                    `;
                    container.appendChild(card);
                });
            }

            // 绑定复选框事件
            container.querySelectorAll('.select-form').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const id = cb.getAttribute('data-id');
                    if (cb.checked) {
                        selectedForms.add(id);
                    } else {
                        selectedForms.delete(id);
                    }
                    updateSelectAllBtn();
                    updateDeleteBtn();
                });
            });

            container.querySelectorAll('.select-preset').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const id = cb.getAttribute('data-id');
                    if (cb.checked) {
                        selectedPresets.add(id);
                    } else {
                        selectedPresets.delete(id);
                    }
                    updateSelectAllBtn();
                    updateDeleteBtn();
                });
            });

            // 分组全选
            container.querySelector('.select-group-forms')?.addEventListener('change', (e) => {
                const checked = e.target.checked;
                container.querySelectorAll('.select-form').forEach(cb => {
                    cb.checked = checked;
                    const id = cb.getAttribute('data-id');
                    if (checked) {
                        selectedForms.add(id);
                    } else {
                        selectedForms.delete(id);
                    }
                });
                updateSelectAllBtn();
                updateDeleteBtn();
            });

            container.querySelector('.select-group-presets')?.addEventListener('change', (e) => {
                const checked = e.target.checked;
                container.querySelectorAll('.select-preset').forEach(cb => {
                    cb.checked = checked;
                    const id = cb.getAttribute('data-id');
                    if (checked) {
                        selectedPresets.add(id);
                    } else {
                        selectedPresets.delete(id);
                    }
                });
                updateSelectAllBtn();
                updateDeleteBtn();
            });

            // 绑定事件
            container.querySelectorAll('.use-form').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.getAttribute('data-id');
                    const form = savedForms.find(f => f.id === id);
                    if (form) {
                        fillFormWithFields(form.fields);
                        showToast('填充完成', 'success');
                    }
                });
            });

            container.querySelectorAll('.use-preset').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.getAttribute('data-id');
                    const preset = presets.find(p => p.id === id);
                    if (preset) {
                        fillFormWithFields(preset.fields);
                        showToast('填充完成', 'success');
                    }
                });
            });

            container.querySelectorAll('.del-form').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.getAttribute('data-id');
                    if (confirm('确定删除此表单？')) {
                        deletedIds.push({ id, type: 'form', deletedAt: Date.now() });
                        GM_setValue(STORAGE_DELETED_IDS, deletedIds);
                        savedForms = savedForms.filter(f => f.id !== id);
                        saveForms();
                        renderSaved();
                        showToast('已删除', 'success');
                    }
                });
            });

            container.querySelectorAll('.del-preset').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.getAttribute('data-id');
                    if (confirm('确定删除此预设？')) {
                        deletedIds.push({ id, type: 'preset', deletedAt: Date.now() });
                        GM_setValue(STORAGE_DELETED_IDS, deletedIds);
                        presets = presets.filter(p => p.id !== id);
                        savePresets();
                        renderSaved();
                        showToast('已删除', 'success');
                    }
                });
            });
        }

        // 全选/取消全选
        selectAllBtn.addEventListener('click', () => {
            const totalItems = savedForms.length + presets.length;
            const selectedItems = selectedForms.size + selectedPresets.size;
            const selectAll = selectedItems < totalItems;

            selectedForms.clear();
            selectedPresets.clear();

            if (selectAll) {
                savedForms.forEach(f => selectedForms.add(f.id));
                presets.forEach(p => selectedPresets.add(p.id));
            }

            container.querySelectorAll('.select-form').forEach(cb => {
                cb.checked = selectAll;
            });
            container.querySelectorAll('.select-preset').forEach(cb => {
                cb.checked = selectAll;
            });
            container.querySelector('.select-group-forms').checked = selectAll && savedForms.length > 0;
            container.querySelector('.select-group-presets').checked = selectAll && presets.length > 0;

            updateSelectAllBtn();
            updateDeleteBtn();
        });

        // 删除选中项
        deleteSelectedBtn.addEventListener('click', () => {
            const totalSelected = selectedForms.size + selectedPresets.size;
            if (totalSelected === 0) return;

            if (confirm(`确定删除选中的 ${totalSelected} 项？`)) {
                if (selectedForms.size > 0) {
                    selectedForms.forEach(id => deletedIds.push({ id, type: 'form', deletedAt: Date.now() }));
                    GM_setValue(STORAGE_DELETED_IDS, deletedIds);
                    savedForms = savedForms.filter(f => !selectedForms.has(f.id));
                    saveForms();
                }
                if (selectedPresets.size > 0) {
                    selectedPresets.forEach(id => deletedIds.push({ id, type: 'preset', deletedAt: Date.now() }));
                    GM_setValue(STORAGE_DELETED_IDS, deletedIds);
                    presets = presets.filter(p => !selectedPresets.has(p.id));
                    savePresets();
                }
                renderSaved();
                showToast(`已删除 ${totalSelected} 项`, 'success');
            }
        });

        // 搜索功能
        searchInput.addEventListener('input', (e) => {
            const keyword = e.target.value.toLowerCase();
            if (!keyword) {
                renderSaved();
                return;
            }
            const filteredForms = savedForms.filter(f => f.title.toLowerCase().includes(keyword));
            const filteredPresets = presets.filter(p => p.name.toLowerCase().includes(keyword));
            renderSaved(filteredForms, filteredPresets);
        });

        renderSaved();
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    // ---------- 侧边栏管理 ----------
    let currentSidebar = null;

    function openSidebar(title, content) {
        if (currentSidebar) {
            currentSidebar.remove();
        }

        const sidebar = document.createElement('div');
        sidebar.className = 'eaf-sidebar';
        sidebar.innerHTML = `
            <div class="eaf-sidebar-header">
                <h3>${title}</h3>
                <button class="eaf-sidebar-close">✕</button>
            </div>
            <div class="eaf-sidebar-body">${content}</div>
        `;
        document.body.appendChild(sidebar);
        currentSidebar = sidebar;

        requestAnimationFrame(() => {
            sidebar.classList.add('visible');
        });

        const closeBtn = sidebar.querySelector('.eaf-sidebar-close');
        closeBtn.onclick = closeSidebar;

        document.addEventListener('keydown', function onEsc(e) {
            if (e.key === 'Escape') {
                closeSidebar();
                document.removeEventListener('keydown', onEsc);
            }
        });

        return sidebar;
    }

    function closeSidebar() {
        if (currentSidebar) {
            currentSidebar.classList.remove('visible');
            setTimeout(() => {
                if (currentSidebar) {
                    currentSidebar.remove();
                    currentSidebar = null;
                }
            }, 300);
        }
    }

    // ---------- 构建悬浮UI ----------
    function buildWidget() {
        const container = document.createElement('div');
        container.id = 'enhanced-autofill-widget';
        const btn = document.createElement('button');
        btn.className = 'eaf-btn';
        btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`;
        btn.setAttribute('aria-label', '智能填充助手');
        container.appendChild(btn);
        document.body.appendChild(container);

        let menuPanel = null;
        function closeMenu() {
            if (menuPanel) menuPanel.remove();
            menuPanel = null;
        }

        btn.addEventListener('click', (e) => {
            e.stopPropagation();

            // 检查用户是否已同意
            if (!checkUserAgreement()) {
                return;
            }

            if (menuPanel) {
                closeMenu();
                return;
            }

            // 检查是否有智能推荐
            const recommended = getRecommendedForms();

            menuPanel = document.createElement('div');
            menuPanel.className = 'eaf-panel';

            let menuHTML = '';

            // 智能推荐（如果有）
            if (recommended.length > 0) {
                menuHTML += `<div class="eaf-group-title">智能推荐</div>`;
                recommended.forEach(form => {
                    menuHTML += `<div class="eaf-menu-item eaf-recommended" data-action="quick-fill" data-id="${form.id}">⚡ ${escapeHtml(form.title)}</div>`;
                });
            }

            // 主菜单
            menuHTML += `
                <div class="eaf-menu-item" data-action="save">💾 保存当前数据</div>
                <div class="eaf-menu-item" data-action="fill">📂 填充数据</div>
                <div class="eaf-menu-item" data-action="undo">↩️ 撤销填充</div>
                <div class="eaf-menu-item" data-action="preset">⚙️ 预设规则</div>
                <div class="eaf-menu-item" data-action="manage">🗄️ 数据管理</div>
                <div class="eaf-menu-item" data-action="sync">☁️ 云端同步</div>
                <div class="eaf-menu-item" data-action="more">📦 更多功能</div>
                <div class="eaf-menu-item" data-action="disclaimer" style="color:#e74c3c;">⚠️ 重要说明</div>
            `;

            menuPanel.innerHTML = menuHTML;
            container.appendChild(menuPanel);

            const handleAction = (action, id) => {
                closeMenu();
                if (action === 'save') saveCurrentForm();
                if (action === 'fill') showFillList();
                if (action === 'preset') managePresets();
                if (action === 'manage') manageSavedForms();
                if (action === 'undo') undoLastFill();
                if (action === 'disclaimer') showDisclaimerPanel();
                if (action === 'sync') showSyncPanel();
                if (action === 'quick-fill' && id) {
                    const form = savedForms.find(f => f.id === id);
                    if (form) {
                        saveFillHistory();
                        fillFormWithFields(form.fields);
                        stats.fillCount++;
                        stats.lastUsed = Date.now();
                        saveStats();
                    }
                }
                if (action === 'more') showMorePanel();
            };

            menuPanel.querySelectorAll('.eaf-menu-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    const action = item.getAttribute('data-action');
                    const id = item.getAttribute('data-id');
                    handleAction(action, id);
                });
            });
            document.addEventListener('click', function onDocClick(ev) {
                if (!menuPanel || menuPanel.contains(ev.target) || ev.target === btn) return;
                closeMenu();
                document.removeEventListener('click', onDocClick);
            });
        });
    }

    // ---------- 云端同步面板 ----------
    function showSyncPanel() {
        const isConfigured = SUPABASE_CONFIG.isEnabled;
        const lastSync = syncState.lastSyncTime ? new Date(syncState.lastSyncTime).toLocaleString() : '从未';
        const statusColor = isConfigured ? (syncState.lastError ? '#dc3545' : '#28a745') : '#6c757d';
        const statusText = isConfigured ? (syncState.lastError ? '连接异常' : '已连接') : '未配置';

        let content = `
            <div style="padding:16px 0;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
                    <span style="width:10px;height:10px;border-radius:50%;background:${statusColor};display:inline-block;"></span>
                    <span style="font-size:14px;font-weight:500;color:var(--eaf-text);">Supabase ${statusText}</span>
                </div>

                <div style="margin-bottom:16px;">
                    <div style="font-size:13px;color:var(--eaf-text-secondary);margin-bottom:8px;">Anon Key 配置</div>
                    <div style="display:flex;gap:8px;">
                        <input type="password" id="supabase-key-input" class="eaf-input" 
                            placeholder="请粘贴你的 Supabase Anon Key"
                            value="${isConfigured ? '••••••••••••••••' : ''}"
                            style="flex:1;">
                        <button id="save-key-btn" class="eaf-button eaf-button-primary" style="white-space:nowrap;">保存</button>
                    </div>
                    <div style="font-size:11px;color:var(--eaf-text-secondary);margin-top:4px;">
                        在 Supabase 控制台 → Settings → API 中获取
                    </div>
                </div>

                <div style="margin-bottom:16px;">
                    <div style="font-size:13px;color:var(--eaf-text-secondary);margin-bottom:8px;">数据同步</div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <button id="full-sync-btn" class="eaf-button eaf-button-primary" style="flex:1;" ${!isConfigured ? 'disabled style="flex:1;opacity:0.5;cursor:not-allowed;"' : ''}>
                            🔄 双向同步
                        </button>
                        <button id="upload-btn" class="eaf-button" style="flex:1;" ${!isConfigured ? 'disabled style="flex:1;opacity:0.5;cursor:not-allowed;"' : ''}>
                            ⬆️ 上传到云端
                        </button>
                        <button id="download-btn" class="eaf-button" style="flex:1;" ${!isConfigured ? 'disabled style="flex:1;opacity:0.5;cursor:not-allowed;"' : ''}>
                            ⬇️ 从云端拉取
                        </button>
                    </div>
                </div>

                <div style="padding:12px;background:var(--eaf-surface);border-radius:8px;">
                    <div style="font-size:13px;color:var(--eaf-text-secondary);margin-bottom:8px;">同步状态</div>
                    <div style="font-size:12px;color:var(--eaf-text);line-height:1.8;">
                        <div>上次同步: ${lastSync}</div>
                        <div>本地表单: <strong>${savedForms.length}</strong> 个</div>
                        <div>本地预设: <strong>${presets.length}</strong> 个</div>
                        ${syncState.lastError ? `<div style="color:#dc3545;">错误: ${escapeHtml(syncState.lastError)}</div>` : ''}
                    </div>
                </div>

                <div style="margin-top:16px;padding:12px;background:#fff3cd;border:1px solid #ffc107;border-radius:8px;">
                    <div style="font-size:12px;color:#856404;line-height:1.6;">
                        💡 <strong>使用说明：</strong><br>
                        1. 先在 Supabase SQL Editor 中执行建表语句<br>
                        2. 粘贴 Anon Key 并保存<br>
                        3. 点击"双向同步"即可
                    </div>
                </div>
            </div>
        `;

        const sidebar = openSidebar('☁️ 云端同步', content);

        const keyInput = sidebar.querySelector('#supabase-key-input');
        const saveKeyBtn = sidebar.querySelector('#save-key-btn');
        const fullSyncBtn = sidebar.querySelector('#full-sync-btn');
        const uploadBtn = sidebar.querySelector('#upload-btn');
        const downloadBtn = sidebar.querySelector('#download-btn');

        saveKeyBtn.onclick = () => {
            const key = keyInput.value.trim();
            if (!key || key === '••••••••••••••••') {
                showToast('请输入有效的 Anon Key', 'error');
                return;
            }
            SUPABASE_CONFIG.anonKey = key;
            showToast('Anon Key 已保存', 'success');
            showSyncPanel();
        };

        fullSyncBtn.onclick = async () => {
            if (!SUPABASE_CONFIG.isEnabled) return;
            fullSyncBtn.disabled = true;
            fullSyncBtn.textContent = '⏳ 同步中...';
            await fullSync();
            fullSyncBtn.textContent = '🔄 双向同步';
            fullSyncBtn.disabled = false;
            showSyncPanel();
        };

        uploadBtn.onclick = async () => {
            if (!SUPABASE_CONFIG.isEnabled) return;
            uploadBtn.disabled = true;
            uploadBtn.textContent = '⏳ 上传中...';
            await syncToRemote();
            uploadBtn.textContent = '⬆️ 上传到云端';
            uploadBtn.disabled = false;
        };

        downloadBtn.onclick = async () => {
            if (!SUPABASE_CONFIG.isEnabled) return;
            downloadBtn.disabled = true;
            downloadBtn.textContent = '⏳ 下载中...';
            await syncFromRemote();
            downloadBtn.textContent = '⬇️ 从云端拉取';
            downloadBtn.disabled = false;
        };
    }

    // ---------- 更多功能面板 ----------
    function showMorePanel() {
        const s = getStats();
        const syncStatus = SUPABASE_CONFIG.isEnabled
            ? `<span style="color:#28a745;">● 已连接</span>`
            : `<span style="color:#6c757d;">○ 未配置</span>`;
        let content = `
            <div style="margin-bottom:16px;">
                <div style="font-size:13px;color:var(--eaf-text-secondary);margin-bottom:8px;">云端同步 ${syncStatus}</div>
                <div style="display:flex;gap:8px;">
                    <button id="open-sync-btn" class="eaf-button eaf-button-primary" style="flex:1;">☁️ 云端同步设置</button>
                </div>
            </div>
            <div style="margin-bottom:16px;">
                <div style="font-size:13px;color:var(--eaf-text-secondary);margin-bottom:8px;">数据操作</div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button id="export-btn" class="eaf-button" style="flex:1;">📤 导出数据</button>
                    <button id="import-btn" class="eaf-button" style="flex:1;">📥 导入数据</button>
                </div>
                <input type="file" id="import-file" accept=".json" style="display:none;">
            </div>
            <div style="margin-bottom:16px;">
                <div style="font-size:13px;color:var(--eaf-text-secondary);margin-bottom:8px;">快捷键说明</div>
                <div style="font-size:12px;color:var(--eaf-text);line-height:1.8;">
                    <div><kbd style="background:#f0f0f0;padding:2px 6px;border-radius:3px;">Ctrl+Shift+F</kbd> 快速填充</div>
                    <div><kbd style="background:#f0f0f0;padding:2px 6px;border-radius:3px;">Ctrl+Shift+S</kbd> 快速保存</div>
                    <div><kbd style="background:#f0f0f0;padding:2px 6px;border-radius:3px;">Ctrl+Shift+Z</kbd> 撤销填充</div>
                </div>
            </div>
            <div style="padding:12px;background:var(--eaf-surface);border-radius:8px;">
                <div style="font-size:13px;color:var(--eaf-text-secondary);margin-bottom:8px;">使用统计</div>
                <div style="font-size:12px;color:var(--eaf-text);line-height:1.8;">
                    <div>保存的表单: <strong>${s.totalForms}</strong> 个</div>
                    <div>预设规则: <strong>${s.totalPresets}</strong> 个</div>
                    <div>累计填充: <strong>${s.fillCount}</strong> 次</div>
                    <div>上次使用: ${s.lastUsed}</div>
                </div>
            </div>
        `;

        const sidebar = openSidebar('更多功能', content);

        // 云端同步按钮
        sidebar.querySelector('#open-sync-btn').onclick = () => {
            closeSidebar();
            showSyncPanel();
        };

        // 导出按钮
        sidebar.querySelector('#export-btn').onclick = exportData;

        // 导入按钮
        const importBtn = sidebar.querySelector('#import-btn');
        const importFile = sidebar.querySelector('#import-file');
        importBtn.onclick = () => importFile.click();
        importFile.onchange = (e) => {
            if (e.target.files[0]) {
                importData(e.target.files[0]);
            }
        };
    }

    // ---------- 重要说明与免责声明面板 ----------
    function showDisclaimerPanel() {
        let content = `
            <div style="padding:16px 0;">
                <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:16px;margin-bottom:16px;">
                    <div style="font-size:15px;font-weight:600;color:#856404;margin-bottom:12px;">⚠️ 重要警告</div>
                    <div style="font-size:13px;color:#856404;line-height:1.8;">
                        <p style="margin:0 0 8px 0;"><strong>请勿在重要场合使用本插件进行自动填充！</strong></p>
                        <p style="margin:0 0 8px 0;">• 考试、银行、医疗、法律等重要数据填写请手动操作</p>
                        <p style="margin:0 0 8px 0;">• 提交前请务必仔细检查填充的数据是否正确</p>
                        <p style="margin:0;">• 因使用本插件导致的数据错误，开发者不承担任何责任</p>
                    </div>
                </div>

                <div style="background:#f8d7da;border:1px solid #f5c6cb;border-radius:8px;padding:16px;margin-bottom:16px;">
                    <div style="font-size:15px;font-weight:600;color:#721c24;margin-bottom:12px;">📋 免责声明</div>
                    <div style="font-size:12px;color:#721c24;line-height:1.8;">
                        <p style="margin:0 0 8px 0;">1. 本插件为免费开源工具，按"现状"提供，不提供任何明示或暗示的保证。</p>
                        <p style="margin:0 0 8px 0;">2. 开发者不对因使用或无法使用本插件而产生的任何直接或间接损失负责。</p>
                        <p style="margin:0 0 8px 0;">3. 用户需自行承担使用本插件的风险，开发者不承担任何法律责任。</p>
                        <p style="margin:0;">4. 继续使用本插件即表示您已阅读并同意以上条款。</p>
                    </div>
                </div>



                <div style="background:var(--eaf-surface);border-radius:8px;padding:16px;">
                    <div style="font-size:15px;font-weight:600;color:var(--eaf-text);margin-bottom:12px;">💡 使用建议</div>
                    <div style="font-size:12px;color:var(--eaf-text);line-height:1.8;">
                        <p style="margin:0 0 8px 0;">1. 首次使用时，先保存数据，然后测试填充是否正确</p>
                        <p style="margin:0 0 8px 0;">2. 填充后请逐一检查每个字段是否正确</p>
                        <p style="margin:0 0 8px 0;">3. 重要表单建议手动填写，确保数据准确</p>
                        <p style="margin:0;">4. 如发现问题，请及时反馈以便改进</p>
                    </div>
                </div>
            </div>
        `;

        openSidebar('重要说明', content);
    }
    // ---------- 首次使用确认对话框 ----------
    function checkUserAgreement() {
        // 尝试从 GM 存储读取
        let agreed = false;
        try {
            agreed = GM_getValue('eaf_user_agreed', false);
        } catch (e) {
            // GM 存储不可用，尝试 localStorage
            try {
                agreed = localStorage.getItem('eaf_user_agreed') === 'true';
            } catch (e2) {
                agreed = false;
            }
        }
        if (agreed === true || agreed === 'true') {
            return true;
        }
        showUserAgreementDialog();
        return false;
    }

    function showUserAgreementDialog() {
        const overlay = document.createElement('div');
        overlay.id = 'eaf-agreement-overlay';
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.7);
            z-index: 2147483647;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.3);
            max-width: 500px;
            width: 90%;
            max-height: 85vh;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        dialog.innerHTML = `
            <div style="padding:20px;border-bottom:1px solid #eee;background:#f8f9fa;">
                <div style="font-size:18px;font-weight:600;color:#333;display:flex;align-items:center;gap:8px;">
                    <span style="color:#e74c3c;">⚠️</span> 使用前请仔细阅读
                </div>
            </div>
            <div style="padding:20px;max-height:400px;overflow-y:auto;">
                <div style="background:#f8d7da;border:1px solid #f5c6cb;border-radius:8px;padding:16px;margin-bottom:16px;">
                    <div style="font-size:15px;font-weight:600;color:#721c24;margin-bottom:12px;">🚨 重要警告</div>
                    <div style="font-size:13px;color:#721c24;line-height:1.8;">
                        <p style="margin:0 0 8px 0;"><strong>请勿在重要场合使用本插件进行自动填充！</strong></p>
                        <p style="margin:0 0 8px 0;">• 考试、银行、医疗、法律等重要数据填写请手动操作</p>
                        <p style="margin:0 0 8px 0;">• 提交前请务必仔细检查填充的数据是否正确</p>
                        <p style="margin:0;">• 因使用本插件导致的数据错误，开发者不承担任何责任</p>
                    </div>
                </div>

                <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:16px;margin-bottom:16px;">
                    <div style="font-size:15px;font-weight:600;color:#856404;margin-bottom:12px;">📋 免责声明</div>
                    <div style="font-size:12px;color:#856404;line-height:1.8;">
                        <p style="margin:0 0 8px 0;">1. 本插件为免费开源工具，按"现状"提供，不提供任何明示或暗示的保证。</p>
                        <p style="margin:0 0 8px 0;">2. 开发者不对因使用或无法使用本插件而产生的任何直接或间接损失负责。</p>
                        <p style="margin:0 0 8px 0;">3. 用户需自行承担使用本插件的风险，开发者不承担任何法律责任。</p>
                        <p style="margin:0;">4. 继续使用本插件即表示您已阅读并同意以上条款。</p>
                    </div>
                </div>



                <div style="background:#f8f9fa;border-radius:8px;padding:16px;">
                    <div style="font-size:15px;font-weight:600;color:#333;margin-bottom:12px;">💡 使用建议</div>
                    <div style="font-size:12px;color:#333;line-height:1.8;">
                        <p style="margin:0 0 8px 0;">1. 首次使用时，先保存数据，然后测试填充是否正确</p>
                        <p style="margin:0 0 8px 0;">2. 填充后请逐一检查每个字段是否正确</p>
                        <p style="margin:0 0 8px 0;">3. 重要表单建议手动填写，确保数据准确</p>
                        <p style="margin:0;">4. 如发现问题，请及时反馈以便改进</p>
                    </div>
                </div>
            </div>
            <div style="padding:16px;display:flex;gap:12px;justify-content:center;border-top:1px solid #eee;background:#f8f9fa;">
                <button id="eaf-disagree-btn" style="padding:12px 30px;border:1px solid #ddd;background:white;color:#666;border-radius:8px;cursor:pointer;font-size:14px;">
                    不同意
                </button>
                <button id="eaf-agree-btn" disabled style="padding:12px 40px;border:none;background:#ccc;color:white;border-radius:8px;cursor:not-allowed;font-size:14px;font-weight:500;transition:all 0.3s;">
                    请阅读 (<span id="eaf-countdown">10</span>秒)
                </button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // 10秒倒计时
        let countdown = 10;
        const countdownEl = dialog.querySelector('#eaf-countdown');
        const agreeBtn = dialog.querySelector('#eaf-agree-btn');
        const disagreeBtn = dialog.querySelector('#eaf-disagree-btn');

        const timer = setInterval(() => {
            countdown--;
            countdownEl.textContent = countdown;

            if (countdown <= 0) {
                clearInterval(timer);
                agreeBtn.disabled = false;
                agreeBtn.style.background = '#4a90d9';
                agreeBtn.style.cursor = 'pointer';
                agreeBtn.innerHTML = '我已阅读并同意';
            }
        }, 1000);

        // 同意按钮
        agreeBtn.onclick = () => {
            if (agreeBtn.disabled) return;
            // 使用 GM 存储优先
            try {
                GM_setValue('eaf_user_agreed', true);
            } catch (e) {
                // GM 存储不可用，使用 localStorage
                try {
                    localStorage.setItem('eaf_user_agreed', 'true');
                } catch (e2) {
                    // 都不可用，使用内存标记
                    window._eaf_user_agreed = true;
                }
            }
            overlay.remove();
        };

        // 不同意按钮
        disagreeBtn.onclick = () => {
            overlay.remove();
            showToast('您已拒绝使用本插件', 'error');
        };
    }

    // 自动填充功能：页面加载后自动检测并提示
    function initAutoFill() {
        // 检查是否有匹配的保存表单
        const recommended = getRecommendedForms();
        if (recommended.length === 0) return;

        // 检查当前页面是否有表单
        const currentFields = getCachedFormFields();
        if (currentFields.length === 0) return;

        // 过滤验证码字段
        const filteredFields = filterCaptchaFields(currentFields);
        if (filteredFields.length === 0) return;

        // 延迟显示自动填充提示
        setTimeout(() => {
            showAutoFillPrompt(recommended[0]);
        }, 1500);
    }

    // 显示自动填充提示
    function showAutoFillPrompt(form) {
        // 检查是否已经显示过本次会话的提示
        if (window._eaf_autofill_shown) return;
        window._eaf_autofill_shown = true;

        const prompt = document.createElement('div');
        prompt.id = 'eaf-autofill-prompt';
        prompt.style.cssText = `
            position: fixed;
            bottom: 90px;
            right: 24px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            padding: 16px 20px;
            z-index: 2147483646;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            color: #333;
            max-width: 280px;
            border: 1px solid #e1e4e8;
            animation: eaf-slide-in 0.3s ease;
        `;

        // 添加动画样式
        if (!document.getElementById('eaf-autofill-anim')) {
            const style = document.createElement('style');
            style.id = 'eaf-autofill-anim';
            style.textContent = `
                @keyframes eaf-slide-in {
                    from { transform: translateX(100px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        prompt.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 8px; color: #4a90d9;">
                💡 发现保存的表单
            </div>
            <div style="margin-bottom: 12px; color: #586069; font-size: 13px;">
                检测到 "${escapeHtml(form.title)}" 可填充此页面
            </div>
            <div style="display: flex; gap: 8px;">
                <button id="eaf-autofill-yes" style="
                    flex: 1;
                    padding: 8px 16px;
                    background: #4a90d9;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                ">立即填充</button>
                <button id="eaf-autofill-no" style="
                    flex: 1;
                    padding: 8px 16px;
                    background: #f5f7fa;
                    color: #586069;
                    border: 1px solid #e1e4e8;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                ">取消</button>
            </div>
        `;

        document.body.appendChild(prompt);

        // 立即填充
        prompt.querySelector('#eaf-autofill-yes').onclick = () => {
            saveFillHistory();
            fillFormWithFields(form.fields);
            stats.fillCount++;
            stats.lastUsed = Date.now();
            saveStats();
            prompt.remove();
        };

        // 取消
        prompt.querySelector('#eaf-autofill-no').onclick = () => {
            prompt.remove();
        };

        // 5秒后自动消失
        setTimeout(() => {
            if (prompt.parentNode) {
                prompt.style.opacity = '0';
                prompt.style.transform = 'translateX(100px)';
                prompt.style.transition = 'all 0.3s ease';
                setTimeout(() => prompt.remove(), 300);
            }
        }, 5000);
    }

    // 初始化加载数据 & 注入界面
    loadData();
    buildWidget();
    setupShortcuts();
    startAutoSave();

    // 自动从云端拉取最新数据（静默，不弹成功提示）
    if (SUPABASE_CONFIG.isEnabled) {
        (async () => {
            try {
                await syncFromRemote(true);
            } catch (e) {
                console.debug('[Autofill] 启动时自动拉取失败:', e);
            }
        })();
    }

    // 页面加载完成后尝试自动填充
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAutoFill);
    } else {
        initAutoFill();
    }
})();