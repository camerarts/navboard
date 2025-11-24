import { useState, useEffect, useCallback, useRef } from 'react';
import { GITHUB_TOKEN } from '../constants';

const GIST_FILENAME = 'flatnav_backup.json';

export interface SyncStatus {
    state: 'idle' | 'loading' | 'success' | 'error';
    message: string;
    lastSynced?: string;
}

export const useGitHubSync = () => {
    // Lazy initialization for immediate availability
    const [token, setTokenState] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('flatnav_github_token') || GITHUB_TOKEN || '';
        }
        return GITHUB_TOKEN || '';
    });

    const [gistId, setGistIdState] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('flatnav_gist_id') || '';
        }
        return '';
    });

    const [autoSync, setAutoSyncState] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('flatnav_auto_sync') === 'true';
        }
        return false;
    });

    const [status, setStatus] = useState<SyncStatus>({ state: 'idle', message: '就绪' });
    
    const [lastSuccessTime, setLastSuccessTime] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('flatnav_last_sync_time') || '';
        }
        return '';
    });

    const setToken = (newToken: string) => {
        const clean = newToken.trim().replace(/^Bearer\s+/i, '');
        setTokenState(clean);
        localStorage.setItem('flatnav_github_token', clean);
        // Reset status when token changes
        if (clean) setStatus({ state: 'idle', message: 'Token 已更新' });
    };

    const setAutoSync = (enabled: boolean) => {
        setAutoSyncState(enabled);
        localStorage.setItem('flatnav_auto_sync', String(enabled));
    };

    // Helper to find Gist ID if missing
    const findGistId = async (authToken: string): Promise<string | null> => {
        try {
            const res = await fetch('https://api.github.com/gists', {
                headers: { 
                    'Authorization': `Bearer ${authToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            if (!res.ok) return null;
            const gists = await res.json();
            if (Array.isArray(gists)) {
                const found = gists.find((g: any) => g.files && g.files[GIST_FILENAME]);
                return found ? found.id : null;
            }
            return null;
        } catch (e) {
            return null;
        }
    };

    const pushData = useCallback(async (data: any, silent = false) => {
        if (!token) {
            setStatus({ state: 'error', message: '未配置 Token' });
            return;
        }

        if (!silent) setStatus({ state: 'loading', message: '正在同步到云端...' });

        try {
            // 1. Ensure we have a Gist ID
            let targetId = gistId;
            if (!targetId) {
                targetId = await findGistId(token) || '';
            }

            const url = targetId ? `https://api.github.com/gists/${targetId}` : 'https://api.github.com/gists';
            const method = targetId ? 'PATCH' : 'POST';

            const body = {
                description: "FlatNav Dashboard Backup (Auto-Sync)",
                public: false,
                files: {
                    [GIST_FILENAME]: {
                        content: JSON.stringify(data, null, 2)
                    }
                }
            };

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                if (res.status === 401) throw new Error('Token 无效或过期');
                if (res.status === 403) throw new Error('API 访问受限 (403)');
                if (res.status === 404) throw new Error('Gist 未找到 (404)');
                throw new Error(`同步失败 (${res.status})`);
            }

            const result = await res.json();
            
            // Save new ID if created
            if (result.id && result.id !== gistId) {
                setGistIdState(result.id);
                localStorage.setItem('flatnav_gist_id', result.id);
            }

            const now = new Date().toLocaleString();
            setLastSuccessTime(now);
            localStorage.setItem('flatnav_last_sync_time', now);
            setStatus({ state: 'success', message: '云端同步成功' });

        } catch (err: any) {
            console.error('Sync Error:', err);
            setStatus({ state: 'error', message: err.message || '同步发生错误' });
            
            // If auth failed, disable auto-sync to stop loop
            if (err.message.includes('Token') || err.message.includes('401')) {
                setAutoSync(false);
            }
        }
    }, [token, gistId]);

    const pullData = useCallback(async () => {
        if (!token) throw new Error('请先配置 Token');
        
        setStatus({ state: 'loading', message: '正在检查云端备份...' });

        try {
            let targetId = gistId;
            if (!targetId) {
                targetId = await findGistId(token) || '';
            }

            if (!targetId) {
                // If no Gist found, we can't pull. But maybe we don't treat it as a hard error if it's an auto-pull on fresh start?
                // For now, let's just return null or throw.
                throw new Error('云端未找到备份文件');
            }

            // Save ID if we found it
            if (targetId !== gistId) {
                setGistIdState(targetId);
                localStorage.setItem('flatnav_gist_id', targetId);
            }

            const res = await fetch(`https://api.github.com/gists/${targetId}?t=${Date.now()}`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!res.ok) throw new Error(`下载失败 (${res.status})`);

            const result = await res.json();
            const file = result.files[GIST_FILENAME];
            
            if (!file || !file.content) throw new Error('备份文件内容为空');

            setStatus({ state: 'success', message: '下载成功' });
            return JSON.parse(file.content);

        } catch (err: any) {
            setStatus({ state: 'error', message: err.message });
            throw err;
        }
    }, [token, gistId]);

    return {
        token,
        setToken,
        autoSync,
        setAutoSync,
        status,
        lastSuccessTime,
        pushData,
        pullData
    };
};
