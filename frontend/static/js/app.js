/**
 * app.js — YTLens UI Controller
 *
 * Manages screen transitions, message rendering, streaming display,
 * auto-scrolling, and all user interactions.
 */

document.addEventListener('DOMContentLoaded', () => {

    // =============================
    // Configure marked.js
    // =============================
    marked.setOptions({
        highlight: (code, lang) => {
            if (lang && hljs.getLanguage(lang)) {
                return hljs.highlight(code, { language: lang }).value;
            }
            return hljs.highlightAuto(code).value;
        },
        breaks: true,
        gfm: true
    });

    // =============================
    // DOM References
    // =============================
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // Screens
    const screenLogin = $('#screen-login');
    const screenVideo = $('#screen-video');
    const screenChat  = $('#screen-chat');

    // Login
    const loginForm     = $('#login-form');
    const loginUsername  = $('#login-username');
    const loginPassword  = $('#login-password');
    const loginBtn       = $('#login-btn');

    // Video
    const videoForm     = $('#video-form');
    const videoInput    = $('#video-input');
    const analyzeBtn    = $('#analyze-btn');
    const fallbackSection = $('#fallback-section');
    const fallbackTextarea = $('#fallback-textarea');
    const fallbackBtn   = $('#fallback-btn');
    const videoLogoutBtn = $('#video-logout-btn');

    // Chat
    const sidebar         = $('#sidebar');
    const sidebarToggle   = $('#sidebar-toggle');
    const sidebarClose    = $('#sidebar-close');
    const sidebarOverlay  = $('#sidebar-overlay');
    const sidebarThumbnail = $('#sidebar-thumbnail');
    const sidebarTitle    = $('#sidebar-title');
    const sidebarYTLink   = $('#sidebar-youtube-link');
    const switchVideoBtn  = $('#switch-video-btn');
    const logoutBtn       = $('#logout-btn');
    const messagesArea    = $('#messages-area');
    const messagesContainer = $('#messages-container');
    const welcomeState    = $('#welcome-state');
    const inputForm       = $('#input-form');
    const chatInput       = $('#chat-input');
    const sendBtn         = $('#send-btn');
    const stopBtn         = $('#stop-btn');

    // State
    let messages = [];
    let isStreaming = false;
    let abortController = null;
    let pendingFallbackVideoId = '';

    // ============================================
    // Studio Particles & Dynamic Card Spotlight
    // ============================================
    const particlesManager = (() => {
        const canvas = $('#studio-particles-canvas');
        const consoleCard = $('#studio-console-card');
        const viewport = $('#studio-viewport');
        if (!canvas) return { start: () => {}, stop: () => {} };

        const ctx = canvas.getContext('2d');
        let animationFrameId = null;
        let isRunning = false;
        let width = 0;
        let height = 0;
        let dpr = window.devicePixelRatio || 1;

        // Mouse tracking
        const mouse = { x: -9999, y: -9999, active: false };

        function onMouseMove(e) {
            const rect = viewport ? viewport.getBoundingClientRect() : { left: 0, top: 0 };
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
            mouse.active = true;

            // Update card spotlight
            if (consoleCard) {
                const cardRect = consoleCard.getBoundingClientRect();
                const relX = ((e.clientX - cardRect.left) / cardRect.width) * 100;
                const relY = ((e.clientY - cardRect.top) / cardRect.height) * 100;
                consoleCard.style.setProperty('--mouse-x', `${relX.toFixed(2)}%`);
                consoleCard.style.setProperty('--mouse-y', `${relY.toFixed(2)}%`);
            }
        }

        function onMouseLeave() {
            mouse.active = false;
            mouse.x = -9999;
            mouse.y = -9999;
            if (consoleCard) {
                consoleCard.style.setProperty('--mouse-x', '50%');
                consoleCard.style.setProperty('--mouse-y', '50%');
            }
        }

        // Particle definitions - Dynamic Cinema Atmosphere
        const BOKEH_COUNT = 22;
        const DUST_COUNT = 55;
        let particles = [];

        function resize() {
            if (!canvas) return;
            width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
            height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
            dpr = window.devicePixelRatio || 1;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);
        }

        function createParticles() {
            particles = [];
            // 1. Soft-focus Bokeh Orbs (Theatrical Crimson, Rose Coral & Sunset Gold Atmosphere)
            const bokehHues = [
                { r: 255, g: 26, b: 53, a: 0.22 },    // Pure Cinema Red (#FF1A35)
                { r: 255, g: 77, b: 109, a: 0.20 },   // Rose Coral (#FF4D6D)
                { r: 225, g: 29, b: 72, a: 0.18 },    // Deep Crimson (#E11D48)
                { r: 255, g: 159, b: 10, a: 0.14 }    // Sunset Ember Gold (#FF9F0A)
            ];
            for (let i = 0; i < BOKEH_COUNT; i++) {
                const color = bokehHues[i % bokehHues.length];
                particles.push({
                    type: 'bokeh',
                    x: Math.random() * width,
                    y: Math.random() * height,
                    radius: Math.random() * 28 + 18,
                    vx: (Math.random() - 0.5) * 0.45,
                    vy: (Math.random() - 0.5) * 0.45,
                    color: color,
                    pulse: Math.random() * Math.PI * 2,
                    pulseSpeed: 0.016 + Math.random() * 0.015
                });
            }

            // 2. Fine Projector Dust Motes (Crystalline starlight, gold embers, ruby sparks)
            for (let i = 0; i < DUST_COUNT; i++) {
                const rand = Math.random();
                let color, alpha;
                if (rand > 0.6) {
                    color = 'rgba(255, 245, 245,';  // Crisp crystalline starlight
                    alpha = Math.random() * 0.5 + 0.35;
                } else if (rand > 0.28) {
                    color = 'rgba(255, 175, 80,';   // Warm golden ember
                    alpha = Math.random() * 0.45 + 0.3;
                } else {
                    color = 'rgba(255, 77, 109,';   // Rose coral & cinema ruby spark
                    alpha = Math.random() * 0.45 + 0.3;
                }
                particles.push({
                    type: 'dust',
                    x: Math.random() * width,
                    y: Math.random() * height,
                    radius: Math.random() * 2.0 + 0.9,
                    vx: (Math.random() - 0.5) * 0.7,
                    vy: (Math.random() - 0.5) * 0.5 - 0.22, // Upward buoyant draft
                    alpha: alpha,
                    color: color
                });
            }
        }

        function updateAndDraw() {
            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];

                if (p.type === 'bokeh') {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.pulse += p.pulseSpeed;

                    // Mouse gentle attraction/swirl for bokeh
                    if (mouse.active) {
                        const dx = mouse.x - p.x;
                        const dy = mouse.y - p.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < 320 && dist > 0) {
                            p.x += (dx / dist) * 0.35;
                            p.y += (dy / dist) * 0.35;
                        }
                    }

                    // Wrap edges
                    if (p.x < -p.radius * 2) p.x = width + p.radius * 2;
                    if (p.x > width + p.radius * 2) p.x = -p.radius * 2;
                    if (p.y < -p.radius * 2) p.y = height + p.radius * 2;
                    if (p.y > height + p.radius * 2) p.y = -p.radius * 2;

                    const curRadius = p.radius + Math.sin(p.pulse) * 5;
                    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, curRadius);
                    grad.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.color.a * 1.5})`);
                    grad.addColorStop(0.5, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.color.a})`);
                    grad.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`);

                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, curRadius, 0, Math.PI * 2);
                    ctx.fill();

                } else if (p.type === 'dust') {
                    // Standard drift
                    p.x += p.vx;
                    p.y += p.vy;

                    // Interactive mouse repulsion & fluid swirl
                    if (mouse.active) {
                        const dx = p.x - mouse.x;
                        const dy = p.y - mouse.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const maxDist = 180;

                        if (dist < maxDist && dist > 0) {
                            const force = (1 - dist / maxDist) * 3.0;
                            p.x += (dx / dist) * force * 2.4;
                            p.y += (dy / dist) * force * 2.4;
                            p.x += (-dy / dist) * force * 1.4;
                            p.y += (dx / dist) * force * 1.4;
                        }
                    }

                    // Wrap boundaries
                    if (p.x < -10) p.x = width + 10;
                    if (p.x > width + 10) p.x = -10;
                    if (p.y < -10) p.y = height + 10;
                    if (p.y > height + 10) p.y = -10;

                    ctx.fillStyle = `${p.color} ${p.alpha})`;
                    ctx.shadowColor = 'rgba(255, 30, 30, 0.6)';
                    ctx.shadowBlur = 6;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }

            if (isRunning) {
                animationFrameId = requestAnimationFrame(updateAndDraw);
            }
        }

        function start() {
            if (isRunning) return;
            isRunning = true;
            resize();
            createParticles();
            window.addEventListener('resize', resize);
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseleave', onMouseLeave);
            animationFrameId = requestAnimationFrame(updateAndDraw);
        }

        function stop() {
            if (!isRunning) return;
            isRunning = false;
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseleave', onMouseLeave);
        }

        return { start, stop };
    })();

    // ============================================
    // Studio Monitor: Live Video Timecode & Ticker
    // ============================================
    const monitorManager = (() => {
        const timecodeEl = $('#monitor-timecode');
        const scrubProgress = $('#scrub-progress');
        const scrubHandle = $('#scrub-handle');
        const tickerTextEl = $('#ticker-text');

        let timerId = null;
        let tickerId = null;
        let currentSeconds = 258; // Starts at 04:18
        const totalSeconds = 1122; // 18:42
        let tickerIndex = 0;

        const transcriptSnippets = [
            "Grounding video transcripts with 1536-dim vector indexing…",
            "Cross-Encoder reranking top-k semantic passages (score 0.94)…",
            "Audio transcript aligned to timecode segments with millisecond precision…",
            "Pinecone hybrid index ready: dense vectors + BM25 keyword matching…",
            "Streaming contextual synthesis via FastAPI asynchronous SSE channel…"
        ];

        function formatTime(s) {
            const m = Math.floor(s / 60).toString().padStart(2, '0');
            const sec = (s % 60).toString().padStart(2, '0');
            return `${m}:${sec}`;
        }

        function tick() {
            currentSeconds = (currentSeconds + 1) % totalSeconds;
            if (timecodeEl) {
                timecodeEl.textContent = `${formatTime(currentSeconds)} / ${formatTime(totalSeconds)}`;
            }
            const pct = ((currentSeconds / totalSeconds) * 100).toFixed(2);
            if (scrubProgress) scrubProgress.style.width = `${pct}%`;
            if (scrubHandle) scrubHandle.style.left = `${pct}%`;
        }

        function rotateTicker() {
            if (!tickerTextEl) return;
            tickerIndex = (tickerIndex + 1) % transcriptSnippets.length;
            tickerTextEl.style.opacity = '0';
            setTimeout(() => {
                tickerTextEl.textContent = transcriptSnippets[tickerIndex];
                tickerTextEl.style.opacity = '1';
            }, 300);
        }

        function start() {
            if (timerId) return;
            tick();
            timerId = setInterval(tick, 1000);
            tickerId = setInterval(rotateTicker, 4500);
        }

        function stop() {
            if (timerId) {
                clearInterval(timerId);
                timerId = null;
            }
            if (tickerId) {
                clearInterval(tickerId);
                tickerId = null;
            }
        }

        return { start, stop };
    })();

    // =============================
    // Screen Management
    // =============================
    function showScreen(name) {
        screenLogin.classList.remove('screen--active');
        screenVideo.classList.remove('screen--active');
        screenChat.classList.remove('screen--active');

        if (name === 'login') {
            screenLogin.classList.add('screen--active');
            particlesManager.start();
            monitorManager.start();
        } else {
            particlesManager.stop();
            monitorManager.stop();
            if (name === 'video') {
                screenVideo.classList.add('screen--active');
            } else if (name === 'chat') {
                screenChat.classList.add('screen--active');
                chatInput.focus();
            }
        }
    }

    // =============================
    // Initialization
    // =============================
    function init() {
        const token = API.getToken();
        if (!token) {
            showScreen('login');
            return;
        }

        const videoId = API.getVideoId();
        if (videoId) {
            // Restore chat session
            loadChatScreen(videoId, API.getVideoTitle() || 'YouTube Video');
        } else {
            showScreen('video');
        }
    }

    // =============================
    // Toast Notifications
    // =============================
    function showToast(message, type = 'error') {
        const container = $('#toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // =============================
    // Loading Button States
    // =============================
    function setButtonLoading(btn, loading) {
        const textEl   = btn.querySelector('.video__btn-text, .login__btn-text');
        const loaderEl = btn.querySelector('.video__btn-loader, .login__btn-loader');
        if (textEl) textEl.hidden = loading;
        if (loaderEl) loaderEl.hidden = !loading;
        btn.disabled = loading;
    }

    // =============================
    // LOGIN
    // =============================
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = loginUsername.value.trim();
        const password = loginPassword.value.trim();

        if (!username || !password) {
            showToast('Please enter both username and password.');
            return;
        }

        setButtonLoading(loginBtn, true);

        try {
            const data = await API.login(username, password);
            API.setToken(data.access_token);
            showScreen('video');
        } catch (err) {
            showToast(err.message || 'Login failed. Please try again.');
        } finally {
            setButtonLoading(loginBtn, false);
        }
    });

    // Password visibility toggle
    const togglePasswordBtn = $('#toggle-password-btn');
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = loginPassword.type === 'password';
            loginPassword.type = isPassword ? 'text' : 'password';
            const eyeOpen = togglePasswordBtn.querySelector('.eye-open');
            const eyeClosed = togglePasswordBtn.querySelector('.eye-closed');
            if (eyeOpen && eyeClosed) {
                eyeOpen.style.display = isPassword ? 'none' : '';
                eyeClosed.style.display = isPassword ? '' : 'none';
            }
        });
    }


    // =============================
    // VIDEO PROCESSING
    // =============================
    videoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const raw = videoInput.value.trim();
        if (!raw) {
            showToast('Please enter a video URL or ID.');
            return;
        }

        const videoId = API.extractVideoId(raw);
        setButtonLoading(analyzeBtn, true);
        fallbackSection.hidden = true;

        try {
            const data = await API.processVideo(videoId);

            if (data.error === 'fallback') {
                pendingFallbackVideoId = videoId;
                fallbackSection.hidden = false;
                return;
            }

            if (data.error || data.detail) {
                showToast(data.error || data.detail);
                return;
            }

            // Fetch title and transition to chat
            const title = await API.fetchVideoTitle(videoId);
            API.setVideoId(videoId);
            API.setVideoTitle(title);
            messages = [];
            loadChatScreen(videoId, title);
        } catch (err) {
            handleApiError(err);
        } finally {
            setButtonLoading(analyzeBtn, false);
        }
    });

    // Fallback manual transcript
    fallbackBtn.addEventListener('click', async () => {
        const transcript = fallbackTextarea.value.trim();
        if (!transcript) {
            showToast('Please paste the transcript first.');
            return;
        }

        setButtonLoading(fallbackBtn, true);

        try {
            const data = await API.processVideoManual(pendingFallbackVideoId, transcript);

            if (data.error || data.detail) {
                showToast(data.error || data.detail);
                return;
            }

            const title = await API.fetchVideoTitle(pendingFallbackVideoId);
            API.setVideoId(pendingFallbackVideoId);
            API.setVideoTitle(title);
            messages = [];
            fallbackSection.hidden = true;
            fallbackTextarea.value = '';
            loadChatScreen(pendingFallbackVideoId, title);
        } catch (err) {
            handleApiError(err);
        } finally {
            setButtonLoading(fallbackBtn, false);
        }
    });

    // =============================
    // CHAT SCREEN SETUP
    // =============================
    function loadChatScreen(videoId, title) {
        sidebarThumbnail.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        sidebarTitle.textContent = title;
        sidebarYTLink.href = `https://www.youtube.com/watch?v=${videoId}`;

        renderMessages();
        showScreen('chat');
    }

    // =============================
    // MESSAGE RENDERING
    // =============================
    function renderMessages() {
        // Clear everything except welcome
        const existing = messagesContainer.querySelectorAll('.message');
        existing.forEach(el => el.remove());

        if (messages.length === 0) {
            welcomeState.style.display = '';
        } else {
            welcomeState.style.display = 'none';
            messages.forEach(msg => {
                appendMessageElement(msg.role, msg.content);
            });
        }
    }

    function appendMessageElement(role, content) {
        welcomeState.style.display = 'none';

        const msg = document.createElement('div');
        msg.className = `message message--${role}`;

        const avatarIcon = role === 'user' ? '#icon-user' : '#icon-bot';
        const roleName = role === 'user' ? 'You' : 'YTLens';

        msg.innerHTML = `
            <div class="message__avatar">
                <svg width="18" height="18"><use href="${avatarIcon}"/></svg>
            </div>
            <div class="message__body">
                <div class="message__role">${roleName}</div>
                <div class="message__content"></div>
                <div class="message__actions">
                    <button class="message__copy-btn" title="Copy to clipboard">
                        <svg width="14" height="14"><use href="#icon-copy"/></svg>
                        Copy
                    </button>
                </div>
            </div>
        `;

        const contentEl = msg.querySelector('.message__content');

        if (role === 'assistant') {
            contentEl.innerHTML = renderMarkdown(content);
            addCodeCopyButtons(contentEl);
        } else {
            contentEl.textContent = content;
        }

        // Copy button
        const copyBtn = msg.querySelector('.message__copy-btn');
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(content).then(() => {
                copyBtn.innerHTML = '<svg width="14" height="14"><use href="#icon-check"/></svg> Copied!';
                setTimeout(() => {
                    copyBtn.innerHTML = '<svg width="14" height="14"><use href="#icon-copy"/></svg> Copy';
                }, 2000);
            });
        });

        messagesContainer.appendChild(msg);
        return contentEl;
    }

    function renderMarkdown(text) {
        let html = marked.parse(text);
        return html;
    }

    function addCodeCopyButtons(container) {
        container.querySelectorAll('pre').forEach(pre => {
            const codeEl = pre.querySelector('code');
            if (!codeEl) return;

            // Detect language from class
            const langClass = [...codeEl.classList].find(c => c.startsWith('language-'));
            const lang = langClass ? langClass.replace('language-', '') : '';

            // Create header
            const header = document.createElement('div');
            header.className = 'code-header';
            header.innerHTML = `
                <span class="code-lang">${lang || 'code'}</span>
                <button class="code-copy-btn" type="button">
                    <svg width="12" height="12"><use href="#icon-copy"/></svg>
                    Copy
                </button>
            `;

            pre.insertBefore(header, pre.firstChild);

            const copyBtn = header.querySelector('.code-copy-btn');
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(codeEl.textContent).then(() => {
                    copyBtn.innerHTML = '<svg width="12" height="12"><use href="#icon-check"/></svg> Copied!';
                    setTimeout(() => {
                        copyBtn.innerHTML = '<svg width="12" height="12"><use href="#icon-copy"/></svg> Copy';
                    }, 2000);
                });
            });
        });
    }

    // =============================
    // CHAT INPUT & STREAMING
    // =============================

    // Auto-resize textarea (fallback for browsers without field-sizing)
    chatInput.addEventListener('input', () => {
        if (!CSS.supports('field-sizing', 'content')) {
            chatInput.style.height = 'auto';
            chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
        }
        sendBtn.disabled = !chatInput.value.trim();
    });

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!isStreaming && chatInput.value.trim()) {
                submitQuestion();
            }
        }
    });

    inputForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!isStreaming && chatInput.value.trim()) {
            submitQuestion();
        }
    });

    // Suggestion chips
    $$('.welcome__chip').forEach(chip => {
        chip.addEventListener('click', () => {
            chatInput.value = chip.dataset.question;
            sendBtn.disabled = false;
            submitQuestion();
        });
    });

    function submitQuestion() {
        const question = chatInput.value.trim();
        if (!question) return;

        // Add user message
        messages.push({ role: 'user', content: question });
        appendMessageElement('user', question);

        // Clear input
        chatInput.value = '';
        sendBtn.disabled = true;
        if (!CSS.supports('field-sizing', 'content')) {
            chatInput.style.height = 'auto';
        }

        // Start streaming
        streamResponse(question);
    }

    function streamResponse(question) {
        isStreaming = true;
        sendBtn.hidden = true;
        stopBtn.hidden = false;
        chatInput.disabled = true;

        abortController = new AbortController();

        // Add empty assistant message with cursor
        const contentEl = appendMessageElement('assistant', '');
        contentEl.classList.add('typing-cursor');
        let fullText = '';

        scrollToBottom();

        API.streamAsk(
            API.getVideoId(),
            question,
            // onToken
            (token) => {
                fullText += token;
                contentEl.innerHTML = renderMarkdown(fullText);
                addCodeCopyButtons(contentEl);
                contentEl.classList.add('typing-cursor');
                autoScroll();
            },
            // onDone
            () => {
                contentEl.classList.remove('typing-cursor');
                if (fullText) {
                    contentEl.innerHTML = renderMarkdown(fullText);
                    addCodeCopyButtons(contentEl);
                }
                messages.push({ role: 'assistant', content: fullText });
                finishStreaming();
            },
            // onError
            (err) => {
                contentEl.classList.remove('typing-cursor');
                if (err.message === 'SESSION_EXPIRED') {
                    showToast('Your session has expired. Please sign in again.');
                    logout();
                    return;
                }
                contentEl.innerHTML = `<p style="color: var(--accent);">Error: ${err.message}</p>`;
                messages.push({ role: 'assistant', content: `Error: ${err.message}` });
                finishStreaming();
            },
            abortController.signal
        );
    }

    function finishStreaming() {
        isStreaming = false;
        sendBtn.hidden = false;
        stopBtn.hidden = true;
        chatInput.disabled = false;
        chatInput.focus();
        abortController = null;
        autoScroll();
    }

    stopBtn.addEventListener('click', () => {
        if (abortController) {
            abortController.abort();
        }
    });

    // =============================
    // AUTO-SCROLL
    // =============================
    let userScrolledUp = false;

    messagesArea.addEventListener('scroll', () => {
        const { scrollTop, scrollHeight, clientHeight } = messagesArea;
        userScrolledUp = (scrollHeight - scrollTop - clientHeight) > 80;
    });

    function autoScroll() {
        if (!userScrolledUp) {
            scrollToBottom();
        }
    }

    function scrollToBottom() {
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    // =============================
    // SIDEBAR
    // =============================
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.add('sidebar--open');
        sidebarOverlay.classList.add('sidebar-overlay--visible');
    });

    sidebarClose.addEventListener('click', closeSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);

    function closeSidebar() {
        sidebar.classList.remove('sidebar--open');
        sidebarOverlay.classList.remove('sidebar-overlay--visible');
    }

    // =============================
    // NAVIGATION ACTIONS
    // =============================
    switchVideoBtn.addEventListener('click', () => {
        API.clearVideo();
        messages = [];
        closeSidebar();
        videoInput.value = '';
        fallbackSection.hidden = true;
        showScreen('video');
    });

    function logout() {
        API.clearToken();
        API.clearVideo();
        messages = [];
        closeSidebar();
        loginUsername.value = '';
        loginPassword.value = '';
        showScreen('login');
    }

    logoutBtn.addEventListener('click', logout);
    videoLogoutBtn.addEventListener('click', logout);

    // =============================
    // ERROR HANDLING
    // =============================
    function handleApiError(err) {
        if (err.message === 'SESSION_EXPIRED') {
            showToast('Your session has expired. Please sign in again.');
            logout();
        } else {
            showToast(err.message || 'Something went wrong. Please try again.');
        }
    }

    // =============================
    // Start
    // =============================
    init();
});
