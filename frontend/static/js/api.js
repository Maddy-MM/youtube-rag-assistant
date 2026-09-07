/**
 * api.js — YTLens API Communication Module
 *
 * Handles all backend communication: auth, video processing, and SSE streaming.
 * Stores JWT token and active video metadata in localStorage.
 */

const API = (() => {
    // Keys for localStorage
    const TOKEN_KEY = 'ytlens_token';
    const VIDEO_ID_KEY = 'ytlens_video_id';
    const VIDEO_TITLE_KEY = 'ytlens_video_title';

    // -------------------------
    // Token / Session Helpers
    // -------------------------
    function getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    function setToken(token) {
        localStorage.setItem(TOKEN_KEY, token);
    }

    function clearToken() {
        localStorage.removeItem(TOKEN_KEY);
    }

    function getVideoId() {
        return localStorage.getItem(VIDEO_ID_KEY);
    }

    function setVideoId(id) {
        localStorage.setItem(VIDEO_ID_KEY, id);
    }

    function getVideoTitle() {
        return localStorage.getItem(VIDEO_TITLE_KEY);
    }

    function setVideoTitle(title) {
        localStorage.setItem(VIDEO_TITLE_KEY, title);
    }

    function clearVideo() {
        localStorage.removeItem(VIDEO_ID_KEY);
        localStorage.removeItem(VIDEO_TITLE_KEY);
    }

    function authHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        };
    }

    // -------------------------
    // Video ID Extraction
    // -------------------------
    function extractVideoId(url) {
        url = url.trim();
        if (url.includes('v=')) {
            return url.split('v=').pop().split('&')[0];
        } else if (url.includes('youtu.be/')) {
            return url.split('youtu.be/').pop().split('?')[0];
        } else if (url.includes('shorts/')) {
            return url.split('shorts/').pop().split('?')[0].split('/')[0];
        }
        return url;
    }

    // -------------------------
    // Video Title (oEmbed)
    // -------------------------
    async function fetchVideoTitle(videoId) {
        try {
            const res = await fetch(
                `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
            );
            if (!res.ok) return 'YouTube Video';
            const data = await res.json();
            return data.title || 'YouTube Video';
        } catch {
            return 'YouTube Video';
        }
    }

    // -------------------------
    // API Calls
    // -------------------------

    /**
     * POST /login
     * @returns {{ access_token: string }} on success
     * @throws {Error} on failure
     */
    async function login(username, password) {
        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.detail || 'Login failed');
        }

        return data;
    }

    /**
     * POST /process_video
     * @returns {{ message?: string, error?: string }}
     */
    async function processVideo(videoId) {
        const res = await fetch('/process_video', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ video_id: videoId })
        });

        if (res.status === 401) {
            clearToken();
            throw new Error('SESSION_EXPIRED');
        }

        return await res.json();
    }

    /**
     * POST /process_video_manual
     * @returns {{ message?: string, error?: string }}
     */
    async function processVideoManual(videoId, transcript) {
        const res = await fetch('/process_video_manual', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ video_id: videoId, transcript })
        });

        if (res.status === 401) {
            clearToken();
            throw new Error('SESSION_EXPIRED');
        }

        return await res.json();
    }

    /**
     * POST /ask — streaming SSE via fetch ReadableStream
     *
     * @param {string} videoId
     * @param {string} question
     * @param {(token: string) => void} onToken  — called with each text token
     * @param {() => void} onDone               — called when stream finishes
     * @param {(err: Error) => void} onError     — called on failure
     * @param {AbortSignal} signal               — AbortController signal for cancellation
     */
    async function streamAsk(videoId, question, onToken, onDone, onError, signal) {
        try {
            const res = await fetch('/ask', {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ video_id: videoId, question }),
                signal
            });

            if (res.status === 401) {
                clearToken();
                onError(new Error('SESSION_EXPIRED'));
                return;
            }

            const contentType = res.headers.get('content-type') || '';

            if (!contentType.includes('text/event-stream')) {
                // Non-streaming response — extract error
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || data.detail || `Server error (${res.status})`);
            }

            // Read SSE stream
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let eventType = null;
            let dataLines = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // keep any incomplete trailing line

                for (const line of lines) {
                    if (line === '') {
                        // Blank line = end of SSE event
                        if (eventType === 'done') {
                            onDone();
                            return;
                        }
                        if (dataLines.length > 0) {
                            onToken(dataLines.join('\n'));
                        }
                        dataLines = [];
                        eventType = null;
                    } else if (line.startsWith('event:')) {
                        eventType = line.slice(6).trim();
                    } else if (line.startsWith('data:')) {
                        const val = line.slice(5);
                        dataLines.push(val.startsWith(' ') ? val.slice(1) : val);
                    }
                }
            }

            onDone();
        } catch (err) {
            if (err.name === 'AbortError') {
                onDone();
            } else {
                onError(err);
            }
        }
    }

    // -------------------------
    // Public Interface
    // -------------------------
    return {
        getToken,
        setToken,
        clearToken,
        getVideoId,
        setVideoId,
        getVideoTitle,
        setVideoTitle,
        clearVideo,
        extractVideoId,
        fetchVideoTitle,
        login,
        processVideo,
        processVideoManual,
        streamAsk
    };
})();
