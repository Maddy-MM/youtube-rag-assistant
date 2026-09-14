/**
 * app.js — YTLens UI Controller
 *
 * Manages screen transitions, message rendering, streaming display,
 * auto-scrolling, and all user interactions.
 */

// ============================================
// Prevent Pinch & Pinch-Out Zoom (Desktop Trackpad & Mobile Touch)
// ============================================

// 1. Disable desktop trackpad pinch-to-zoom (dispatches ctrlKey + wheel)
document.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
        e.preventDefault();
    }
}, { passive: false });

// 2. Disable iOS Safari pinch-to-zoom gesture events
document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
}, { passive: false });

document.addEventListener('gesturechange', (e) => {
    e.preventDefault();
}, { passive: false });

document.addEventListener('gestureend', (e) => {
    e.preventDefault();
}, { passive: false });

// 3. Disable multi-touch pinch gestures on mobile touchscreens
document.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });

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
    const videoForm          = $('#video-form');
    const videoInput         = $('#video-input');
    const videoInputClear    = $('#video-input-clear');
    const analyzeBtn         = $('#analyze-btn');
    const ingestViewUrl      = $('#ingest-view-url');
    const videoDetectHud     = $('#video-detect-hud');
    const detectThumb        = $('#detect-thumb');
    const detectId           = $('#detect-id');
    const detectTitle        = $('#detect-title');
    const ingestTelemetry    = $('#ingest-telemetry');
    const fallbackSection    = $('#fallback-section');
    const fallbackTextarea   = $('#fallback-textarea');
    const fallbackBtn        = $('#fallback-btn');
    const fallbackCancelBtn  = $('#fallback-cancel-btn');
    const fallbackReturnBtn  = $('#fallback-return-btn');
    const fallbackCharCount  = $('#fallback-char-count');
    const videoLogoutBtn     = $('#video-logout-btn');
    const libraryCountBadge  = $('#library-count-badge');
    const librarySearchInput = $('#library-search-input');
    const librarySearchClear = $('#library-search-clear');
    const sidebarIngestQuickBtn = $('#sidebar-ingest-quick-btn');
    const sampleVideosDeck   = $('#sample-videos-deck');
    const sampleCards        = $$('.sample-card');

    // Video Library Modal & Sidebar Library Action
    const sidebarLibraryBtn       = $('#sidebar-library-btn');
    const sidebarLibraryCount     = $('#sidebar-library-count');
    const videoLibraryModal       = $('#video-library-modal');
    const libraryModalBackdrop    = $('#library-modal-backdrop');
    const libraryModalClose       = $('#library-modal-close');
    const modalLibrarySearch      = $('#modal-library-search');
    const modalLibrarySearchClear = $('#modal-library-search-clear');
    const modalLibraryCountBadge  = $('#modal-library-count-badge');
    const modalVideoGrid          = $('#modal-video-grid');
    const modalLibraryEmpty       = $('#modal-library-empty');
    const modalEmptyTitle         = $('#modal-empty-title');
    const modalEmptyDesc          = $('#modal-empty-desc');
    const modalEmptyActionBtn     = $('#modal-empty-action-btn');
    const libraryViewList         = $('#library-view-list');
    const libraryViewGrid         = $('#library-view-grid');
    const modalQuickIngestBtn     = $('#modal-quick-ingest-btn');

    // Video Ingest Modal
    const videoIngestModal        = $('#video-ingest-modal');
    const ingestModalBackdrop     = $('#ingest-modal-backdrop');
    const ingestModalClose        = $('#ingest-modal-close');
    const modalSwitchToLibraryBtn = $('#modal-switch-to-library-btn');
    const emptyOpenIngestBtn      = $('#empty-open-ingest-btn');
    const emptyOpenLibraryBtn     = $('#empty-open-library-btn');

    // Chat & Dual-Mode Sidebar
    const sidebar         = $('#sidebar');
    const sidebarToggle   = $('#sidebar-toggle');
    const sidebarToggleBtn = $('#sidebar-toggle-btn');
    const sidebarQuickNewBtn = $('#sidebar-quick-new-btn');
    const sidebarClose    = $('#sidebar-close');
    const sidebarOverlay  = $('#sidebar-overlay');
    const sidebarActiveVideo = $('#sidebar-active-video');
    const sidebarNoVideo  = $('#sidebar-no-video');
    const sidebarThumbnail = $('#sidebar-thumbnail');
    const sidebarTitle    = $('#sidebar-title');
    const sidebarYTLink   = $('#sidebar-youtube-link');
    const switchVideoBtn  = $('#switch-video-btn');
    const sidebarIngestBtn = $('#sidebar-ingest-btn');
    const logoutBtn       = $('#logout-btn');
    const topbarLogoutBtn = $('#topbar-logout-btn');
    const topbarActiveTitle = $('#topbar-active-title');
    const topbarContextDot = $('#topbar-context-dot');

    // Collapsed Rail Action Buttons
    const railNewChatBtn     = $('#rail-new-chat-btn');
    const railLibraryBtn     = $('#rail-library-btn');
    const railLibraryDot     = $('#rail-library-dot');
    const railIngestBtn      = $('#rail-ingest-btn');
    const railActiveVideoBtn = $('#rail-active-video-btn');
    const railThumbnail      = $('#rail-thumbnail');
    const railChatsBtn       = $('#rail-chats-btn');
    const railAvatarBtn      = $('#rail-avatar-btn');
    const railUserInitials   = $('#rail-user-initials');
    const messagesArea    = $('#messages-area');
    const messagesContainer = $('#messages-container');
    const welcomeState    = $('#welcome-state');
    const chatInputBar    = $('#chat-input-bar');
    const inputForm       = $('#input-form');
    const dockSwitchBtn   = $('#dock-switch-btn');
    const chatInput       = $('#chat-input');
    const sendBtn         = $('#send-btn');
    const stopBtn         = $('#stop-btn');
    const newChatBtn      = $('#new-chat-btn');
    const topbarNewChatBtn = $('#topbar-new-chat-btn');
    const sidebarClearChatsBtn = $('#sidebar-clear-chats-btn');
    const chatsList       = $('#chats-list');
    const tvChips         = $$('.tv-chip');

    // State
    let messages = [];
    let isStreaming = false;
    let abortController = null;
    let pendingFallbackVideoId = '';
    let currentChatId = null;

    // ============================================
    // Studio & Neural Vector Atmospheric Particles
    // ============================================
    const particlesManager = (() => {
        let activeCanvas = null;
        let activeCard = null;
        let activeViewport = null;
        let ctx = null;
        let animationFrameId = null;
        let isRunning = false;
        let currentMode = 'studio'; // 'studio' or 'chat'
        let width = 0;
        let height = 0;
        let dpr = window.devicePixelRatio || 1;

        // Mouse tracking
        const mouse = { x: -9999, y: -9999, active: false };

        function onMouseMove(e) {
            const rect = activeViewport ? activeViewport.getBoundingClientRect() : { left: 0, top: 0 };
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
            mouse.active = true;

            // Update card spotlight (Studio mode)
            if (activeCard) {
                const cardRect = activeCard.getBoundingClientRect();
                const relX = ((e.clientX - cardRect.left) / cardRect.width) * 100;
                const relY = ((e.clientY - cardRect.top) / cardRect.height) * 100;
                activeCard.style.setProperty('--mouse-x', `${relX.toFixed(2)}%`);
                activeCard.style.setProperty('--mouse-y', `${relY.toFixed(2)}%`);
            }
        }

        function onMouseLeave() {
            mouse.active = false;
            mouse.x = -9999;
            mouse.y = -9999;
            if (activeCard) {
                activeCard.style.setProperty('--mouse-x', '50%');
                activeCard.style.setProperty('--mouse-y', '50%');
            }
        }

        // Particle definitions
        const BOKEH_COUNT = 22;
        const DUST_COUNT = 55;
        const VECTOR_NODE_COUNT = 48;
        let particles = [];

        function resize() {
            if (!activeCanvas) return;
            const parent = activeCanvas.parentElement;
            width = parent ? parent.clientWidth : window.innerWidth;
            height = parent ? parent.clientHeight : window.innerHeight;
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            activeCanvas.width = width * dpr;
            activeCanvas.height = height * dpr;
            if (ctx) {
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.scale(dpr, dpr);
            }
        }

        function createParticles() {
            particles = [];
            if (currentMode === 'studio') {
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

                // 2. Fine Project Dust Motes
                for (let i = 0; i < DUST_COUNT; i++) {
                    const rand = Math.random();
                    let color, alpha;
                    if (rand > 0.6) {
                        color = 'rgba(255, 245, 245,';
                        alpha = Math.random() * 0.5 + 0.35;
                    } else if (rand > 0.28) {
                        color = 'rgba(255, 175, 80,';
                        alpha = Math.random() * 0.45 + 0.3;
                    } else {
                        color = 'rgba(255, 77, 109,';
                        alpha = Math.random() * 0.45 + 0.3;
                    }
                    particles.push({
                        type: 'dust',
                        x: Math.random() * width,
                        y: Math.random() * height,
                        radius: Math.random() * 2.0 + 0.9,
                        vx: (Math.random() - 0.5) * 0.7,
                        vy: (Math.random() - 0.5) * 0.5 - 0.22,
                        alpha: alpha,
                        color: color
                    });
                }
            } else if (currentMode === 'chat') {
                // High-Tech Neural Vector Embedding Nodes & Cosine Synapse Matrix
                const nodePalettes = [
                    { r: 244, g: 63, b: 94 },    // Crimson Node
                    { r: 225, g: 29, b: 72 },    // Ruby Synapse
                    { r: 129, g: 140, b: 248 },  // Electric Indigo Node
                    { r: 99, g: 102, b: 241 },   // Quantum Violet
                    { r: 56, g: 189, b: 248 },   // Cyan Vector
                    { r: 248, g: 250, b: 252 }   // Coordinate Star
                ];

                for (let i = 0; i < VECTOR_NODE_COUNT; i++) {
                    const palette = nodePalettes[i % nodePalettes.length];
                    const isAnchor = (i % 6 === 0);
                    particles.push({
                        type: 'vector_node',
                        x: Math.random() * width,
                        y: Math.random() * height,
                        radius: isAnchor ? 2.4 : (Math.random() * 1.1 + 1.1),
                        vx: (Math.random() - 0.5) * 0.30,
                        vy: (Math.random() - 0.5) * 0.30,
                        isAnchor: isAnchor,
                        color: palette,
                        pulse: Math.random() * Math.PI * 2,
                        pulseSpeed: 0.018 + Math.random() * 0.016,
                        baseAlpha: isAnchor ? 0.65 : (Math.random() * 0.32 + 0.25)
                    });
                }
            }
        }

        function updateAndDraw() {
            if (!ctx) return;
            ctx.clearRect(0, 0, width, height);

            if (currentMode === 'studio') {
                for (let i = 0; i < particles.length; i++) {
                    const p = particles[i];

                    if (p.type === 'bokeh') {
                        p.x += p.vx;
                        p.y += p.vy;
                        p.pulse += p.pulseSpeed;

                        if (mouse.active) {
                            const dx = mouse.x - p.x;
                            const dy = mouse.y - p.y;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            if (dist < 320 && dist > 0) {
                                p.x += (dx / dist) * 0.35;
                                p.y += (dy / dist) * 0.35;
                            }
                        }

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
                        p.x += p.vx;
                        p.y += p.vy;

                        if (mouse.active) {
                            const dx = p.x - mouse.x;
                            const dy = p.y - mouse.y;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            const maxDist = 180;

                            if (dist < maxDist && dist > 0) {
                                const force = (1 - dist / maxDist) * 3.0;
                                p.x += (dx / dist) * force * 2.4;
                                p.y += (dy / dist) * force * 2.4;
                            }
                        }

                        if (p.x < -10) p.x = width + 10;
                        if (p.x > width + 10) p.x = -10;
                        if (p.y < -10) p.y = height + 10;
                        if (p.y > height + 10) p.y = -10;

                        ctx.fillStyle = `${p.color} ${p.alpha})`;
                        ctx.shadowColor = p.color === 'rgba(255, 245, 245,' ? 'rgba(255,255,255,0.8)' : 'rgba(255,100,100,0.6)';
                        ctx.shadowBlur = 6;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.shadowBlur = 0;
                    }
                }

                // Draw Neural Constellation Network between nearby dust particles
                const dustList = [];
                for (let i = 0; i < particles.length; i++) {
                    if (particles[i].type === 'dust') dustList.push(particles[i]);
                }
                const maxLinkDist = 95;
                for (let i = 0; i < dustList.length; i++) {
                    for (let j = i + 1; j < dustList.length; j++) {
                        const p1 = dustList[i];
                        const p2 = dustList[j];
                        const dx = p1.x - p2.x;
                        const dy = p1.y - p2.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < maxLinkDist) {
                            const alpha = (1 - dist / maxLinkDist) * 0.18;
                            ctx.strokeStyle = `rgba(255, 77, 109, ${alpha})`;
                            ctx.lineWidth = 0.75;
                            ctx.beginPath();
                            ctx.moveTo(p1.x, p1.y);
                            ctx.lineTo(p2.x, p2.y);
                            ctx.stroke();
                        }
                    }
                }
            } else if (currentMode === 'chat') {
                const len = particles.length;

                // 1. Draw Cosine Synapse Proximity Links (underneath nodes)
                const maxSynapseDist = 90;
                const maxSynapseDistSq = maxSynapseDist * maxSynapseDist;

                for (let i = 0; i < len; i++) {
                    const p1 = particles[i];
                    for (let j = i + 1; j < len; j++) {
                        const p2 = particles[j];
                        const dx = p1.x - p2.x;
                        const dy = p1.y - p2.y;
                        const distSq = dx * dx + dy * dy;

                        if (distSq < maxSynapseDistSq) {
                            const dist = Math.sqrt(distSq);
                            const proximity = 1 - (dist / maxSynapseDist);
                            const alpha = proximity * 0.13;

                            ctx.strokeStyle = `rgba(${p1.color.r}, ${p1.color.g}, ${p1.color.b}, ${alpha})`;
                            ctx.lineWidth = 0.65;
                            ctx.beginPath();
                            ctx.moveTo(p1.x, p1.y);
                            ctx.lineTo(p2.x, p2.y);
                            ctx.stroke();
                        }
                    }
                }

                // 2. Update and Draw Vector Nodes
                for (let i = 0; i < len; i++) {
                    const p = particles[i];
                    p.x += p.vx;
                    p.y += p.vy;
                    p.pulse += p.pulseSpeed;

                    // Subtle magnetic repulsion around cursor
                    if (mouse.active) {
                        const dx = p.x - mouse.x;
                        const dy = p.y - mouse.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const maxDist = 135;

                        if (dist < maxDist && dist > 0) {
                            const force = (1 - dist / maxDist) * 1.5;
                            p.x += (dx / dist) * force * 1.4;
                            p.y += (dy / dist) * force * 1.4;
                        }
                    }

                    // Boundary wrap
                    if (p.x < -15) p.x = width + 15;
                    if (p.x > width + 15) p.x = -15;
                    if (p.y < -15) p.y = height + 15;
                    if (p.y > height + 15) p.y = -15;

                    const alpha = p.baseAlpha + Math.sin(p.pulse) * 0.12;

                    // Centroid Anchor Halo
                    if (p.isAnchor) {
                        const haloRadius = 12 + Math.sin(p.pulse) * 3;
                        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, haloRadius);
                        grad.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha * 0.4})`);
                        grad.addColorStop(0.6, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha * 0.12})`);
                        grad.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`);
                        ctx.fillStyle = grad;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, haloRadius, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    // Node Core
                    ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${Math.max(0.1, alpha)})`;
                    ctx.shadowColor = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0.55)`;
                    ctx.shadowBlur = p.isAnchor ? 8 : 4;
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

        function start(target = 'studio') {
            if (isRunning && currentMode === target && activeCanvas && activeCanvas.isConnected) {
                return;
            }
            stop();
            currentMode = target;
            if (target === 'studio') {
                activeCanvas = $('#studio-particles-canvas');
                activeCard = $('#studio-console-card');
                activeViewport = $('#studio-viewport');
            } else if (target === 'chat') {
                activeCanvas = $('#chat-neural-canvas');
                activeCard = null;
                activeViewport = $('#chat-main-viewport');
            } else if (target === 'video') {
                activeCanvas = $('#video-particles-canvas');
                activeCard = document.querySelector('.studio-tv-chassis');
                activeViewport = $('#chat-main-viewport');
            }
            if (!activeCanvas) return;

            ctx = activeCanvas.getContext('2d');
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

    // ============================================
    // Screen 0: Keyboard Typing-Reactive Equalizer Waveform
    // ============================================
    const visualizerTypingReactor = (() => {
        const visualizerBars = $('.visualizer-bars');
        const vbars = $$('.vbar');
        const tickerDotEl = $('.ticker-dot');
        let typingPulseTimer = null;

        function onKeystroke(e) {
            if (!visualizerBars || !vbars.length) return;

            // Illuminate container with typing glow
            visualizerBars.classList.add('is-typing');
            clearTimeout(typingPulseTimer);
            typingPulseTimer = setTimeout(() => {
                visualizerBars.classList.remove('is-typing');
            }, 550);

            // Flash the live recording telemetry dot
            if (tickerDotEl) {
                tickerDotEl.classList.add('is-active-pulse');
                setTimeout(() => tickerDotEl.classList.remove('is-active-pulse'), 280);
            }

            // Ripple audio energy burst outward across the 28 bars
            const charCode = e.key && e.key.length === 1 ? e.key.charCodeAt(0) : (e.data ? e.data.charCodeAt(0) : 75);
            const centerIdx = 13.5;
            vbars.forEach((bar, idx) => {
                const distFromCenter = Math.abs(idx - centerIdx);
                const delay = distFromCenter * 13; // 13ms harmonic propagation

                setTimeout(() => {
                    const harmonic = Math.sin((idx * 0.75) + (charCode * 0.22));
                    const scaleBoost = 1.35 + Math.abs(harmonic) * 0.75;
                    bar.style.transform = `scaleY(${scaleBoost.toFixed(2)})`;
                    bar.style.filter = 'brightness(1.6) drop-shadow(0 0 16px rgba(255, 77, 109, 0.9))';

                    setTimeout(() => {
                        bar.style.transform = '';
                        bar.style.filter = '';
                    }, 190);
                }, delay);
            });
        }

        function init() {
            if (loginUsername) {
                loginUsername.addEventListener('input', onKeystroke);
                loginUsername.addEventListener('keydown', onKeystroke);
            }
            if (loginPassword) {
                loginPassword.addEventListener('input', onKeystroke);
                loginPassword.addEventListener('keydown', onKeystroke);
            }
        }

        return { init };
    })();
    visualizerTypingReactor.init();

    // ============================================
    // Studio TV Broadcast Monitor Ticker (Screen 1)
    // ============================================
    const tvTickerManager = (() => {
        const tvTickerTextEl = $('#tv-ticker-text');
        let tickerId = null;
        let tickerIndex = 0;

        const tvTickerSnippets = [
            "Grounding video transcripts with 1536-dim vector indexing…",
            "MiniLM neural cross-encoder reranking standby (precision 94%)…",
            "Paste a YouTube link below to awaken conversational intelligence…",
            "Pinecone dense vector store synchronized & ready for queries…",
            "Timecode citations sync to exact video timestamps…",
            "Zero-latency FastAPI async SSE token streaming engine active…"
        ];

        function rotateTicker() {
            if (!tvTickerTextEl) return;
            tickerIndex = (tickerIndex + 1) % tvTickerSnippets.length;
            tvTickerTextEl.style.opacity = '0';
            setTimeout(() => {
                tvTickerTextEl.textContent = tvTickerSnippets[tickerIndex];
                tvTickerTextEl.style.opacity = '1';
            }, 300);
        }

        function start() {
            if (tickerId) return;
            tickerId = setInterval(rotateTicker, 4200);
        }

        function stop() {
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
            particlesManager.start('studio');
            monitorManager.start();
            tvTickerManager.stop();
        } else {
            monitorManager.stop();
            if (name === 'video') {
                particlesManager.stop();
                // Direct-to-Chat fallback
                showWelcomeChatStage();
            } else if (name === 'chat') {
                screenChat.classList.add('screen--active');
                particlesManager.start('chat');
            }
        }
    }

    function updateWelcomeStageUI() {
        if (!welcomeState) return;
        const hasVideo = !!API.getVideoId();
        const emptyTitle = $('#empty-stage-title');
        const emptyDesc = $('#empty-stage-desc');
        const emptySuggestions = $('#chat-empty-suggestions');
        const emptyActions = $('#chat-empty-actions');

        if (hasVideo) {
            const vid = API.getVideoId();
            let vTitle = API.getVideoTitle();
            if (!vTitle || vTitle === 'YouTube Video') {
                const match = allSavedVideos.find(v => v.video_id === vid);
                if (match && match.title && match.title !== 'YouTube Video') {
                    vTitle = match.title;
                    API.setVideoTitle(vTitle);
                } else {
                    API.fetchVideoTitle(vid).then(resolved => {
                        if (resolved && resolved !== 'YouTube Video') {
                            API.setVideoTitle(resolved);
                            if (topbarActiveTitle) topbarActiveTitle.textContent = resolved;
                            if (sidebarTitle) sidebarTitle.textContent = resolved;
                            if (railActiveVideoBtn) railActiveVideoBtn.title = `Active Video: ${resolved}`;
                            const ed = $('#empty-stage-desc');
                            if (ed) ed.textContent = `Ask questions, extract key takeaways, or create quizzes for: ${resolved}`;
                        }
                    }).catch(() => {});
                }
            }
            vTitle = vTitle || 'YouTube Video';
            if (sidebarActiveVideo) sidebarActiveVideo.style.display = 'block';
            if (sidebarNoVideo) sidebarNoVideo.style.display = 'none';
            if (railActiveVideoBtn) {
                railActiveVideoBtn.style.display = 'inline-flex';
                railActiveVideoBtn.title = `Active Video: ${vTitle}`;
            }
            if (railThumbnail) railThumbnail.src = `https://img.youtube.com/vi/${vid}/hqdefault.jpg`;
            if (emptyTitle) emptyTitle.textContent = 'What would you like to explore?';
            if (emptyDesc) emptyDesc.textContent = `Ask questions, extract key takeaways, or create quizzes for: ${vTitle}`;
            if (emptySuggestions) emptySuggestions.style.display = 'flex';
            if (emptyActions) emptyActions.style.display = 'none';
            if (topbarActiveTitle) topbarActiveTitle.textContent = vTitle;
            if (topbarContextDot) {
                topbarContextDot.style.background = '#10b981';
                topbarContextDot.style.boxShadow = '0 0 8px #10b981';
            }
        } else {
            if (sidebarActiveVideo) sidebarActiveVideo.style.display = 'none';
            if (sidebarNoVideo) sidebarNoVideo.style.display = 'block';
            if (railActiveVideoBtn) railActiveVideoBtn.style.display = 'none';
            if (emptyTitle) emptyTitle.textContent = 'Welcome to YTLens Intelligence';
            if (emptyDesc) emptyDesc.textContent = 'Ingest a YouTube video or choose one from your knowledge base to begin exploring.';
            if (emptySuggestions) emptySuggestions.style.display = 'none';
            if (emptyActions) emptyActions.style.display = 'flex';
            if (topbarActiveTitle) topbarActiveTitle.textContent = 'Intelligence Studio';
            if (topbarContextDot) {
                topbarContextDot.style.background = '#64748b';
                topbarContextDot.style.boxShadow = 'none';
            }
        }
    }

    // Clean Empty Chat State (Always keeps chat input dock active)
    function showWelcomeChatStage() {
        showScreen('chat');
        if (welcomeState) welcomeState.style.display = 'flex';
        updateWelcomeStageUI();

        if (chatInputBar) chatInputBar.style.display = 'block';

        // Clear previous conversation bubbles & placeholders
        const existing = messagesContainer.querySelectorAll('.message, .chat-loading-placeholder');
        existing.forEach(el => el.remove());

        loadChats();
        loadLibrary();

        if (chatInput) {
            chatInput.value = '';
            setTimeout(() => chatInput.focus(), 150);
        }
    }

    // Helper: Relative time formatting (e.g. "Just now", "5m ago", "2h ago", "Yesterday")
    function formatRelativeTime(dateStr) {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffSec = Math.floor((now - date) / 1000);
            if (isNaN(diffSec) || diffSec < 0) return 'Recently';
            if (diffSec < 60) return 'Just now';
            const diffMin = Math.floor(diffSec / 60);
            if (diffMin < 60) return `${diffMin}m ago`;
            const diffHour = Math.floor(diffMin / 60);
            if (diffHour < 24) return `${diffHour}h ago`;
            const diffDay = Math.floor(diffHour / 24);
            if (diffDay === 1) return 'Yesterday';
            if (diffDay < 7) return `${diffDay}d ago`;
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        } catch {
            return '';
        }
    }

    // ============================================
    // Video Knowledge Base (Centered Modal Dialog)
    // ============================================
    let allSavedVideos = [];
    let currentLibraryView = localStorage.getItem('ytlens_library_view') || 'list';

    function formatRelativeTime(isoStr) {
        if (!isoStr) return 'Indexed';
        try {
            const date = new Date(isoStr);
            if (isNaN(date.getTime())) return 'Indexed';
            const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
            if (diffSec < 60) return 'Just now';
            const diffMin = Math.floor(diffSec / 60);
            if (diffMin < 60) return `${diffMin}m ago`;
            const diffHours = Math.floor(diffMin / 60);
            if (diffHours < 24) return `${diffHours}h ago`;
            const diffDays = Math.floor(diffHours / 24);
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays}d ago`;
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        } catch {
            return 'Indexed';
        }
    }

    function setLibraryView(mode) {
        currentLibraryView = (mode === 'grid') ? 'grid' : 'list';
        localStorage.setItem('ytlens_library_view', currentLibraryView);
        if (libraryViewList) libraryViewList.classList.toggle('is-active', currentLibraryView === 'list');
        if (libraryViewGrid) libraryViewGrid.classList.toggle('is-active', currentLibraryView === 'grid');
        if (modalVideoGrid) {
            modalVideoGrid.classList.toggle('is-list-view', currentLibraryView === 'list');
            modalVideoGrid.classList.toggle('is-grid-view', currentLibraryView === 'grid');
        }
        renderModalVideoGrid();
    }

    function renderModalVideoGrid() {
        if (!modalVideoGrid) return;

        // Ensure container has correct view mode class
        modalVideoGrid.classList.toggle('is-list-view', currentLibraryView === 'list');
        modalVideoGrid.classList.toggle('is-grid-view', currentLibraryView === 'grid');

        const query = (modalLibrarySearch ? modalLibrarySearch.value.trim().toLowerCase() : '');

        if (modalLibrarySearchClear) {
            modalLibrarySearchClear.style.display = query ? 'flex' : 'none';
        }

        const filtered = query
            ? allSavedVideos.filter(v => 
                (v.title && v.title.toLowerCase().includes(query)) || 
                (v.video_id && v.video_id.toLowerCase().includes(query))
              )
            : allSavedVideos;

        if (filtered.length === 0) {
            modalVideoGrid.innerHTML = '';
            if (modalLibraryEmpty) {
                modalLibraryEmpty.style.display = 'flex';
                if (allSavedVideos.length === 0) {
                    if (modalEmptyTitle) modalEmptyTitle.textContent = 'Knowledge Base is Empty';
                    if (modalEmptyDesc) modalEmptyDesc.textContent = 'Index your first YouTube video to build your personal RAG vector intelligence store.';
                    if (modalEmptyActionBtn) {
                        modalEmptyActionBtn.style.display = 'inline-flex';
                        modalEmptyActionBtn.onclick = () => {
                            closeLibraryModal();
                            openIngestModal();
                        };
                    }
                } else {
                    if (modalEmptyTitle) modalEmptyTitle.textContent = 'No matching videos found';
                    if (modalEmptyDesc) modalEmptyDesc.textContent = `No indexed videos matched "${query}". Try searching by another title or YouTube video ID.`;
                    if (modalEmptyActionBtn) modalEmptyActionBtn.style.display = 'none';
                }
            }
            return;
        }

        if (modalLibraryEmpty) modalLibraryEmpty.style.display = 'none';
        modalVideoGrid.innerHTML = '';

        const activeVideoId = API.getVideoId();

        filtered.forEach(v => {
            const isCurrent = activeVideoId === v.video_id;
            const timeAgo = formatRelativeTime(v.created_at);
            const videoTitle = v.title || 'YouTube Video';
            const ytUrl = `https://youtu.be/${v.video_id}`;

            const item = document.createElement('div');
            item.setAttribute('data-id', v.video_id);

            if (currentLibraryView === 'list') {
                item.className = `library-row ${isCurrent ? 'library-row--active' : ''}`;
                item.innerHTML = `
                    <div class="library-row__media" title="Start chat with this video">
                        <img class="library-row__thumb" src="https://img.youtube.com/vi/${v.video_id}/hqdefault.jpg" alt="${videoTitle}" loading="lazy">
                        <div class="library-row__play-overlay">
                            <svg width="18" height="18" fill="currentColor"><use href="#icon-play"/></svg>
                        </div>
                        <span class="library-row__id-chip">${v.video_id}</span>
                    </div>
                    <div class="library-row__details">
                        <h3 class="library-row__title" title="${videoTitle}">${videoTitle}</h3>
                        <div class="library-row__meta">
                            ${isCurrent 
                                ? '<span class="library-tag library-tag--active"><span class="status-dot-mini status-dot-mini--pulse"></span> Active Session</span>' 
                                : '<span class="library-tag library-tag--synced"><span class="status-dot-mini"></span> Vector Synchronized</span>'}
                            <span class="library-tag library-tag--dim">1536-dim RAG</span>
                            <span class="library-row__time"><svg width="11" height="11"><use href="#icon-waveform"/></svg> ${timeAgo}</span>
                        </div>
                    </div>
                    <div class="library-row__actions">
                        <button type="button" class="library-btn-primary ${isCurrent ? 'is-active' : 'is-inactive'} modal-video-card__start-btn" title="${isCurrent ? 'Current active chat' : 'Start chat session'}">
                            <svg width="12" height="12"><use href="#icon-message"/></svg>
                            <span>${isCurrent ? 'Continue Chat' : 'Chat'}</span>
                        </button>
                        <a href="${ytUrl}" target="_blank" rel="noopener noreferrer" class="library-icon-btn" title="Open on YouTube (new tab)">
                            <svg width="13" height="13"><use href="#icon-external"/></svg>
                        </a>
                        <button type="button" class="library-icon-btn library-icon-btn--danger modal-video-card__del-btn" title="Delete from Pinecone vector store">
                            <svg width="13" height="13"><use href="#icon-trash"/></svg>
                        </button>
                    </div>
                `;
            } else {
                item.className = `library-card ${isCurrent ? 'library-card--active' : ''}`;
                item.innerHTML = `
                    <div class="library-card__media" title="Start chat with this video">
                        <img class="library-card__thumb" src="https://img.youtube.com/vi/${v.video_id}/hqdefault.jpg" alt="${videoTitle}" loading="lazy">
                        <div class="library-card__play-overlay">
                            <svg width="18" height="18" fill="currentColor"><use href="#icon-play"/></svg>
                        </div>
                        ${isCurrent ? '<span class="library-card__badge-active"><span class="status-dot-mini status-dot-mini--pulse"></span> ACTIVE</span>' : ''}
                        <span class="library-card__id-pill">${v.video_id}</span>
                    </div>
                    <div class="library-card__body">
                        <h3 class="library-card__title" title="${videoTitle}">${videoTitle}</h3>
                        <div class="library-card__meta">
                            <span class="library-tag library-tag--dim" style="padding: 0.1rem 0.35rem; font-size: 0.6rem;">1536d</span>
                            <span>${timeAgo}</span>
                        </div>
                        <div class="library-card__actions">
                            <button type="button" class="library-btn-primary ${isCurrent ? 'is-active' : 'is-inactive'} modal-video-card__start-btn" title="${isCurrent ? 'Current active chat' : 'Start chat session'}">
                                <svg width="11" height="11"><use href="#icon-message"/></svg>
                                <span>${isCurrent ? 'Continue' : 'Chat'}</span>
                            </button>
                            <div class="library-card__actions-right">
                                <a href="${ytUrl}" target="_blank" rel="noopener noreferrer" class="library-icon-btn" title="Open on YouTube (new tab)">
                                    <svg width="12" height="12"><use href="#icon-external"/></svg>
                                </a>
                                <button type="button" class="library-icon-btn library-icon-btn--danger modal-video-card__del-btn" title="Delete from Pinecone vector store">
                                    <svg width="12" height="12"><use href="#icon-trash"/></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }

            // Auto-resolve title asynchronously if it's currently a placeholder
            if (!v.title || v.title === 'YouTube Video') {
                API.fetchVideoTitle(v.video_id).then(resolved => {
                    if (resolved && resolved !== 'YouTube Video') {
                        v.title = resolved;
                        const titleEl = item.querySelector('.library-row__title, .library-card__title');
                        if (titleEl) {
                            titleEl.textContent = resolved;
                            titleEl.title = resolved;
                        }
                    }
                }).catch(() => {});
            }

            // Launch Chat helper
            const launchChat = () => {
                let targetTitle = v.title || videoTitle;
                if (!targetTitle || targetTitle === 'YouTube Video') {
                    const match = allSavedVideos.find(sv => sv.video_id === v.video_id);
                    if (match && match.title && match.title !== 'YouTube Video') {
                        targetTitle = match.title;
                    }
                }
                API.setVideoId(v.video_id);
                API.setVideoTitle(targetTitle);
                messages = [];
                currentChatId = 'chat-' + Date.now();
                closeLibraryModal();
                loadChatScreen(v.video_id, targetTitle, currentChatId);
                if (window.innerWidth <= 768) closeSidebar();
            };

            // Start Chat button
            const startBtn = item.querySelector('.modal-video-card__start-btn');
            if (startBtn) startBtn.addEventListener('click', launchChat);

            // Thumbnail click launches chat
            const mediaWrap = item.querySelector('.library-row__media, .library-card__media');
            if (mediaWrap) mediaWrap.addEventListener('click', launchChat);

            // Title click launches chat
            const titleEl = item.querySelector('.library-row__title, .library-card__title');
            if (titleEl) titleEl.addEventListener('click', launchChat);

            // Delete video button
            const delBtn = item.querySelector('.modal-video-card__del-btn');
            if (delBtn) {
                delBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (!confirm(`Remove "${videoTitle}" from your library and delete all vectors from Pinecone?`)) {
                        return;
                    }
                    try {
                        await API.deleteVideo(v.video_id);
                        showToast('Video removed from vector database', 'success');
                        if (API.getVideoId() === v.video_id) {
                            API.clearVideo();
                            messages = [];
                            showWelcomeChatStage();
                        }
                        await loadLibrary();
                    } catch (err) {
                        handleApiError(err);
                    }
                });
            }

            modalVideoGrid.appendChild(item);
        });
    }

    function openLibraryModal() {
        if (!videoLibraryModal) return;
        if (window.innerWidth <= 768) closeSidebar();
        videoLibraryModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        document.body.classList.add('modal-is-open');
        if (libraryViewList) libraryViewList.classList.toggle('is-active', currentLibraryView === 'list');
        if (libraryViewGrid) libraryViewGrid.classList.toggle('is-active', currentLibraryView === 'grid');
        renderModalVideoGrid();
        loadLibrary();
        if (modalLibrarySearch) {
            modalLibrarySearch.value = '';
            if (modalLibrarySearchClear) modalLibrarySearchClear.style.display = 'none';
            if (window.innerWidth > 768) {
                setTimeout(() => modalLibrarySearch.focus(), 100);
            }
        }
    }

    function closeLibraryModal() {
        if (!videoLibraryModal) return;
        videoLibraryModal.style.display = 'none';
        if (!videoIngestModal || videoIngestModal.style.display === 'none') {
            document.body.style.overflow = '';
            document.body.classList.remove('modal-is-open');
        }
    }

    function openIngestModal() {
        if (!videoIngestModal) return;
        if (window.innerWidth <= 768) closeSidebar();
        videoIngestModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        document.body.classList.add('modal-is-open');
        hideFallbackProtocol();
        if (videoInput) {
            videoInput.value = '';
            updateVideoDetection();
            if (window.innerWidth > 768) {
                setTimeout(() => videoInput.focus(), 120);
            }
        }
    }

    function closeIngestModal() {
        if (!videoIngestModal) return;
        videoIngestModal.style.display = 'none';
        if (!videoLibraryModal || videoLibraryModal.style.display === 'none') {
            document.body.style.overflow = '';
            document.body.classList.remove('modal-is-open');
        }
        hideFallbackProtocol();
    }

    // Modal Search and Action Listeners
    if (sidebarLibraryBtn) sidebarLibraryBtn.addEventListener('click', openLibraryModal);
    if (libraryModalClose) libraryModalClose.addEventListener('click', closeLibraryModal);
    if (libraryModalBackdrop) libraryModalBackdrop.addEventListener('click', closeLibraryModal);

    if (libraryViewList) {
        libraryViewList.addEventListener('click', () => setLibraryView('list'));
    }
    if (libraryViewGrid) {
        libraryViewGrid.addEventListener('click', () => setLibraryView('grid'));
    }

    if (ingestModalClose) ingestModalClose.addEventListener('click', closeIngestModal);
    if (ingestModalBackdrop) ingestModalBackdrop.addEventListener('click', closeIngestModal);
    if (modalSwitchToLibraryBtn) {
        modalSwitchToLibraryBtn.addEventListener('click', () => {
            closeIngestModal();
            openLibraryModal();
        });
    }
    if (emptyOpenIngestBtn) emptyOpenIngestBtn.addEventListener('click', openIngestModal);
    if (emptyOpenLibraryBtn) emptyOpenLibraryBtn.addEventListener('click', openLibraryModal);

    if (modalLibrarySearch) {
        modalLibrarySearch.addEventListener('input', renderModalVideoGrid);
    }
    if (modalLibrarySearchClear) {
        modalLibrarySearchClear.addEventListener('click', () => {
            modalLibrarySearch.value = '';
            renderModalVideoGrid();
            modalLibrarySearch.focus();
        });
    }

    if (modalQuickIngestBtn) {
        modalQuickIngestBtn.addEventListener('click', () => {
            closeLibraryModal();
            openIngestModal();
        });
    }

    // User Profile Display (Claude-Style Footer & Rail Avatar)
    function updateUserProfileUI() {
        const username = localStorage.getItem('ytlens_username') || 'Intelligence Studio';
        const initials = username.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'YT';
        const usernameEl = $('#sidebar-username');
        const initialsEl = $('#sidebar-user-initials');
        if (usernameEl) usernameEl.textContent = username;
        if (initialsEl) initialsEl.textContent = initials;
        if (railUserInitials) railUserInitials.textContent = initials;
    }

    // =============================
    // Initialization
    // =============================
    function init() {
        updateUserProfileUI();

        // Responsive Sidebar State: Collapsed drawer on mobile; persistent preference on desktop
        const savedSidebarState = localStorage.getItem('ytlens_sidebar_state') || (localStorage.getItem('ytlens_sidebar_collapsed') === 'true' ? 'collapsed' : null);
        if (window.innerWidth <= 768) {
            closeSidebar();
        } else if (savedSidebarState === 'collapsed') {
            closeSidebar();
        } else {
            openSidebar();
        }

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
            showWelcomeChatStage();
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
        if (!btn) return;
        const textEl   = btn.querySelector('.video__btn-text, .login__btn-text, .fallback__btn-text');
        const loaderEl = btn.querySelector('.video__btn-loader, .login__btn-loader, .fallback__btn-loader');
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
            localStorage.setItem('ytlens_username', username);
            updateUserProfileUI();

            if (window.innerWidth <= 768) {
                closeSidebar();
            } else {
                openSidebar();
            }

            const videoId = API.getVideoId();
            if (videoId) {
                loadChatScreen(videoId, API.getVideoTitle() || 'YouTube Video');
            } else {
                showWelcomeChatStage();
            }
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
    // VIDEO PROCESSING & HUD DETECTION
    // =============================

    // Real-Time Live Detection HUD
    function updateVideoDetection() {
        const val = videoInput.value.trim();
        if (videoInputClear) {
            videoInputClear.style.display = val ? 'flex' : 'none';
        }

        if (!val) {
            if (videoDetectHud) videoDetectHud.style.display = 'none';
            return;
        }

        const detectedId = API.extractVideoId(val);
        if (detectedId && detectedId.length === 11) {
            if (detectThumb) detectThumb.src = `https://img.youtube.com/vi/${detectedId}/hqdefault.jpg`;
            if (detectId) detectId.textContent = `ID: ${detectedId}`;
            if (detectTitle) detectTitle.textContent = 'YouTube Target Detected · Ready for RAG Ingestion';
            if (videoDetectHud) videoDetectHud.style.display = 'flex';
        } else {
            if (videoDetectHud) videoDetectHud.style.display = 'none';
        }
    }

    videoInput.addEventListener('input', updateVideoDetection);
    videoInput.addEventListener('paste', () => {
        setTimeout(updateVideoDetection, 50);
    });

    if (videoInputClear) {
        videoInputClear.addEventListener('click', () => {
            videoInput.value = '';
            updateVideoDetection();
            videoInput.focus();
        });
    }

    // Synchronized Neural RAG Graph Step Illuminator
    function setRagGraphStep(step) {
        const nodes = $$('.graph-node');
        nodes.forEach(n => {
            const s = parseInt(n.dataset.step, 10);
            n.classList.remove('graph-node--active', 'graph-node--done');
            if (step > 0) {
                if (s < step) {
                    n.classList.add('graph-node--done');
                } else if (s === step) {
                    n.classList.add('graph-node--active');
                }
            }
        });
    }

    // Sample Video 1-Click Auto-Fill
    sampleCards.forEach(card => {
        card.addEventListener('click', () => {
            const url = card.getAttribute('data-url');
            if (!url) return;
            hideFallbackProtocol();
            videoInput.value = url;
            updateVideoDetection();
            videoInput.focus();
        });
    });

    // Sidebar Quick-Ingest Action
    if (sidebarIngestQuickBtn) {
        sidebarIngestQuickBtn.addEventListener('click', () => {
            openIngestModal();
        });
    }

    // Phased Ingestion Telemetry Animation
    let telemetryInterval = null;

    function startTelemetryAnimation() {
        setRagGraphStep(1);
        if (!ingestTelemetry) return;
        ingestTelemetry.style.display = 'flex';
        const steps = ingestTelemetry.querySelectorAll('.telemetry-step');
        steps.forEach((s, idx) => {
            s.removeAttribute('data-state');
            if (idx === 0) s.setAttribute('data-state', 'active');
        });

        let currentStep = 1;
        if (telemetryInterval) clearInterval(telemetryInterval);
        telemetryInterval = setInterval(() => {
            currentStep++;
            if (currentStep <= 4) {
                setRagGraphStep(currentStep);
            }
            if (currentStep <= 3) {
                steps.forEach((s) => {
                    const sNum = parseInt(s.getAttribute('data-step'), 10);
                    if (sNum < currentStep) {
                        s.setAttribute('data-state', 'done');
                    } else if (sNum === currentStep) {
                        s.setAttribute('data-state', 'active');
                    }
                });
            }
        }, 1600);
    }

    function stopTelemetryAnimation(success = false) {
        if (telemetryInterval) {
            clearInterval(telemetryInterval);
            telemetryInterval = null;
        }
        if (ingestTelemetry) {
            ingestTelemetry.style.display = 'none';
            const steps = ingestTelemetry.querySelectorAll('.telemetry-step');
            steps.forEach(s => s.removeAttribute('data-state'));
        }
        if (success) {
            setRagGraphStep(5);
        } else {
            setRagGraphStep(0);
        }
    }

    // Video form submission (Integrated TV Lower Bezel Dock)
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
            let title = await API.fetchVideoTitle(videoId);
            const data = await API.processVideo(videoId, title);

            if (data && data.title && data.title !== 'YouTube Video') {
                title = data.title;
            }

            if (data.error === 'fallback') {
                pendingFallbackVideoId = videoId;
                if (fallbackSection) {
                    fallbackSection.hidden = false;
                    fallbackSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
                if (fallbackTextarea) {
                    fallbackTextarea.focus();
                }
                showToast('Automatic captions unavailable for this video. Please paste transcript manually.', 'info');
                return;
            }

            if (data.error || data.detail) {
                showToast(data.error || data.detail);
                return;
            }

            // Set video and transition to chat
            API.setVideoId(videoId);
            API.setVideoTitle(title);
            messages = [];
            closeIngestModal();
            loadChatScreen(videoId, title);
            showToast('Video indexed and ready for intelligence queries!', 'success');
        } catch (err) {
            handleApiError(err);
        } finally {
            setButtonLoading(analyzeBtn, false);
        }
    });

    // Fallback manual transcript handlers
    const fallbackToggleBtn = $('#fallback-toggle-btn');
    if (fallbackToggleBtn) {
        fallbackToggleBtn.addEventListener('click', () => {
            if (!fallbackSection) return;
            const willShow = fallbackSection.hidden;
            fallbackSection.hidden = !willShow;
            if (willShow) {
                fallbackSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                if (fallbackTextarea) fallbackTextarea.focus();
            }
        });
    }

    if (fallbackTextarea && fallbackCharCount) {
        fallbackTextarea.addEventListener('input', () => {
            const count = fallbackTextarea.value.length;
            fallbackCharCount.textContent = `${count.toLocaleString()} characters entered`;
        });
    }

    function hideFallbackProtocol() {
        if (fallbackSection) fallbackSection.hidden = true;
        if (fallbackTextarea) fallbackTextarea.value = '';
        if (fallbackCharCount) fallbackCharCount.textContent = '0 characters entered';
    }

    if (fallbackCancelBtn) fallbackCancelBtn.addEventListener('click', hideFallbackProtocol);
    if (fallbackReturnBtn) fallbackReturnBtn.addEventListener('click', hideFallbackProtocol);

    const fallbackExternalBtn = $('#fallback-external-btn');
    if (fallbackExternalBtn) {
        fallbackExternalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const raw = videoInput ? videoInput.value.trim() : '';
            const vidId = pendingFallbackVideoId || (raw ? API.extractVideoId(raw) : '');
            if (vidId) {
                pendingFallbackVideoId = vidId;
                const fullYtUrl = `https://www.youtube.com/watch?v=${vidId}`;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(fullYtUrl).then(() => {
                        showToast('Video link copied to clipboard! Paste it on youtubetotranscript.com', 'success');
                    }).catch(() => {
                        showToast('Opening youtubetotranscript.com...', 'info');
                    });
                } else {
                    showToast('Opening youtubetotranscript.com...', 'info');
                }
            } else {
                showToast('Opening youtubetotranscript.com... Paste your video link there.', 'info');
            }
            window.open('https://youtubetotranscript.com/', '_blank', 'noopener,noreferrer');
        });
    }

    fallbackBtn.addEventListener('click', async () => {
        const transcript = fallbackTextarea.value.trim();
        if (!transcript) {
            showToast('Please paste a transcript before submitting.');
            return;
        }

        if (!pendingFallbackVideoId) {
            const raw = videoInput ? videoInput.value.trim() : '';
            if (raw) {
                pendingFallbackVideoId = API.extractVideoId(raw);
            }
        }

        if (!pendingFallbackVideoId) {
            showToast('Please enter a YouTube video URL or ID above first.', 'error');
            return;
        }

        setButtonLoading(fallbackBtn, true);

        try {
            let title = await API.fetchVideoTitle(pendingFallbackVideoId);
            const data = await API.processVideoManual(pendingFallbackVideoId, transcript, title);

            if (data && data.title && data.title !== 'YouTube Video') {
                title = data.title;
            }

            if (data.error || data.detail) {
                showToast(data.error || data.detail);
                return;
            }

            API.setVideoId(pendingFallbackVideoId);
            API.setVideoTitle(title);
            messages = [];
            hideFallbackProtocol();
            closeIngestModal();
            loadChatScreen(pendingFallbackVideoId, title);
            showToast('Manual transcript indexed and ready for chat!', 'success');
        } catch (err) {
            handleApiError(err);
        } finally {
            setButtonLoading(fallbackBtn, false);
        }
    });

    // =============================
    // CHAT SCREEN SETUP & SIDEBAR DATA
    // =============================
    async function loadChatScreen(videoId, title, chatId = null) {
        if (!chatId) {
            currentChatId = 'chat-' + Date.now();
        } else {
            currentChatId = chatId;
        }

        closeIngestModal();
        closeLibraryModal();

        tvTickerManager.stop();

        // Auto-resolve video title if empty or placeholder
        let activeTitle = title;
        if (!activeTitle || activeTitle === 'YouTube Video') {
            const match = allSavedVideos.find(v => v.video_id === videoId);
            if (match && match.title && match.title !== 'YouTube Video') {
                activeTitle = match.title;
            } else {
                API.fetchVideoTitle(videoId).then(resolved => {
                    if (resolved && resolved !== 'YouTube Video') {
                        API.setVideoTitle(resolved);
                        if (sidebarTitle) sidebarTitle.textContent = resolved;
                        if (topbarActiveTitle) topbarActiveTitle.textContent = resolved;
                        if (railActiveVideoBtn) railActiveVideoBtn.title = `Current Video: ${resolved}`;
                    }
                }).catch(() => {});
            }
        }
        if (activeTitle && activeTitle !== 'YouTube Video') {
            API.setVideoTitle(activeTitle);
        }

        const displayTitle = activeTitle || 'YouTube Video';
        if (sidebarThumbnail) sidebarThumbnail.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        if (sidebarTitle) sidebarTitle.textContent = displayTitle;
        if (sidebarYTLink) sidebarYTLink.href = `https://www.youtube.com/watch?v=${videoId}`;
        if (sidebarActiveVideo) sidebarActiveVideo.style.display = 'block';
        if (sidebarNoVideo) sidebarNoVideo.style.display = 'none';
        if (railThumbnail) railThumbnail.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        if (railActiveVideoBtn) {
            railActiveVideoBtn.style.display = 'inline-flex';
            railActiveVideoBtn.title = `Current Video: ${displayTitle}`;
        }
        if (chatInputBar) chatInputBar.style.display = 'block';
        if (topbarActiveTitle) topbarActiveTitle.textContent = displayTitle;
        if (topbarContextDot) {
            topbarContextDot.style.background = '#10b981';
            topbarContextDot.style.boxShadow = '0 0 8px #10b981';
        }

        renderMessages();
        showScreen('chat');
        if (chatInput) chatInput.focus();

        // Refresh sidebar lists
        await Promise.all([loadChats(), loadLibrary()]);
    }

    let cachedChatsJson = '';

    // Load recent chats into sidebar (Clean ChatGPT / Claude single-line style)
    async function loadChats() {
        if (!chatsList || !API.getToken()) return;
        try {
            const chats = await API.getChats();
            const sidebarChatsCount = $('#sidebar-chats-count');
            if (!chats || chats.length === 0) {
                cachedChatsJson = '[]';
                if (sidebarChatsCount) sidebarChatsCount.style.display = 'none';
                if (sidebarClearChatsBtn) sidebarClearChatsBtn.style.display = 'none';
                chatsList.innerHTML = `
                    <div class="sidebar__chats-empty">
                        <div class="sidebar__chats-empty-icon">
                            <svg width="15" height="15"><use href="#icon-message"/></svg>
                        </div>
                        <span class="sidebar__chats-empty-text">No conversations yet</span>
                        <button type="button" class="sidebar__chats-empty-btn" id="sidebar-empty-new-btn">+ Start a chat</button>
                    </div>`;
                const emptyNewBtn = $('#sidebar-empty-new-btn');
                if (emptyNewBtn) emptyNewBtn.addEventListener('click', startNewChat);
                return;
            }

            if (sidebarClearChatsBtn) {
                sidebarClearChatsBtn.style.display = 'inline-flex';
            }

            if (sidebarChatsCount) {
                sidebarChatsCount.textContent = chats.length.toString();
                sidebarChatsCount.style.display = 'inline-block';
            }

            const newJson = JSON.stringify(chats.map(c => ({ id: c.id, title: c.title, updated_at: c.updated_at })));
            if (newJson === cachedChatsJson && chatsList.querySelectorAll('.sidebar__chat-item').length === chats.length) {
                chatsList.querySelectorAll('.sidebar__chat-item').forEach(el => {
                    el.classList.toggle('sidebar__chat-item--active', el.getAttribute('data-id') === currentChatId);
                });
                return;
            }
            cachedChatsJson = newJson;

            chatsList.innerHTML = '';
            chats.forEach(c => {
                const item = document.createElement('div');
                const isActive = c.id === currentChatId;
                item.className = `sidebar__chat-item ${isActive ? 'sidebar__chat-item--active' : ''}`;
                item.setAttribute('data-id', c.id);

                const iconWrap = document.createElement('span');
                iconWrap.className = 'sidebar__chat-item-icon';
                iconWrap.innerHTML = '<svg width="13" height="13"><use href="#icon-message"/></svg>';

                const titleSpan = document.createElement('span');
                titleSpan.className = 'sidebar__chat-item-title';
                titleSpan.textContent = c.title || c.video_title || 'New Chat';
                titleSpan.title = `${c.title || 'New Chat'} (${c.video_title || 'Video'})`;

                const delBtn = document.createElement('button');
                delBtn.className = 'sidebar__chat-item-del';
                delBtn.title = 'Delete chat';
                delBtn.innerHTML = '<svg width="12" height="12"><use href="#icon-trash"/></svg>';

                item.appendChild(iconWrap);
                item.appendChild(titleSpan);
                item.appendChild(delBtn);

                // Switch to this chat (Instant feedback + drawer close on mobile)
                item.addEventListener('click', async (e) => {
                    if (e.target.closest('.sidebar__chat-item-del')) return;
                    if (currentChatId === c.id && messages.length > 0) {
                        if (window.innerWidth <= 768) closeSidebar();
                        showScreen('chat');
                        return;
                    }

                    const targetChatId = c.id;
                    const prevChatId = currentChatId;
                    currentChatId = targetChatId;

                    // Immediately update active highlighter on click so user gets instant visual response
                    if (chatsList) {
                        chatsList.querySelectorAll('.sidebar__chat-item').forEach(el => {
                            el.classList.toggle('sidebar__chat-item--active', el.getAttribute('data-id') === targetChatId);
                        });
                    }

                    if (window.innerWidth <= 768) {
                        closeSidebar();
                    }
                    showScreen('chat');

                    messages = [];
                    if (welcomeState) welcomeState.style.display = 'none';
                    if (chatInputBar) chatInputBar.style.display = 'block';
                    const existingMsg = messagesContainer.querySelectorAll('.message, .chat-loading-placeholder');
                    existingMsg.forEach(el => el.remove());

                    const placeholder = document.createElement('div');
                    placeholder.className = 'chat-loading-placeholder';
                    placeholder.innerHTML = `
                        <div class="stream-spinner"></div>
                        <span>Loading conversation...</span>`;
                    messagesContainer.appendChild(placeholder);

                    try {
                        const fullChat = await API.getChat(targetChatId);
                        let vTitle = fullChat.video_title;
                        if (!vTitle || vTitle === 'YouTube Video') {
                            const match = allSavedVideos.find(v => v.video_id === fullChat.video_id);
                            if (match && match.title && match.title !== 'YouTube Video') {
                                vTitle = match.title;
                            }
                        }
                        vTitle = vTitle || 'YouTube Video';
                        API.setVideoId(fullChat.video_id);
                        API.setVideoTitle(vTitle);
                        currentChatId = fullChat.id;
                        messages = JSON.parse(fullChat.messages_json || '[]');

                        if (sidebarThumbnail) sidebarThumbnail.src = `https://img.youtube.com/vi/${fullChat.video_id}/hqdefault.jpg`;
                        if (sidebarTitle) sidebarTitle.textContent = vTitle;
                        if (sidebarYTLink) sidebarYTLink.href = `https://www.youtube.com/watch?v=${fullChat.video_id}`;
                        if (sidebarActiveVideo) sidebarActiveVideo.style.display = 'block';
                        if (sidebarNoVideo) sidebarNoVideo.style.display = 'none';
                        if (railThumbnail) railThumbnail.src = `https://img.youtube.com/vi/${fullChat.video_id}/hqdefault.jpg`;
                        if (railActiveVideoBtn) {
                            railActiveVideoBtn.style.display = 'inline-flex';
                            railActiveVideoBtn.title = `Current Video: ${vTitle}`;
                        }
                        if (topbarActiveTitle) topbarActiveTitle.textContent = vTitle;
                        if (topbarContextDot) {
                            topbarContextDot.style.background = '#10b981';
                            topbarContextDot.style.boxShadow = '0 0 8px #10b981';
                        }

                        renderMessages();

                        // Keep active highlighter in exact sync with rendered chat without extra network roundtrips
                        if (chatsList) {
                            chatsList.querySelectorAll('.sidebar__chat-item').forEach(el => {
                                el.classList.toggle('sidebar__chat-item--active', el.getAttribute('data-id') === fullChat.id);
                            });
                        }
                    } catch (err) {
                        currentChatId = prevChatId;
                        messagesContainer.querySelectorAll('.chat-loading-placeholder').forEach(el => el.remove());
                        if (chatsList) {
                            chatsList.querySelectorAll('.sidebar__chat-item').forEach(el => {
                                el.classList.toggle('sidebar__chat-item--active', el.getAttribute('data-id') === prevChatId);
                            });
                        }
                        handleApiError(err);
                    }
                });

                // Delete this chat
                delBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    try {
                        await API.deleteChat(c.id);
                        if (currentChatId === c.id) {
                            startNewChat();
                        } else {
                            loadChats();
                        }
                        showToast('Chat deleted', 'success');
                    } catch (err) {
                        handleApiError(err);
                    }
                });

                chatsList.appendChild(item);
            });
        } catch (err) {
            console.error('Error loading chats:', err);
        }
    }

    // Load saved video library (updates badges & modal grid)
    async function loadLibrary() {
        if (!API.getToken()) return;
        try {
            const videos = await API.getVideos().catch(() => []);
            allSavedVideos = Array.isArray(videos) ? videos : [];

            if (sidebarLibraryCount) {
                sidebarLibraryCount.textContent = allSavedVideos.length.toString();
            }
            if (railLibraryDot) {
                railLibraryDot.style.display = allSavedVideos.length > 0 ? 'block' : 'none';
            }
            if (modalLibraryCountBadge) {
                const count = allSavedVideos.length;
                modalLibraryCountBadge.textContent = `${count} ${count === 1 ? 'video' : 'videos'} indexed`;
            }
            const welcomeLibCountBadge = $('#welcome-library-count-badge');
            if (welcomeLibCountBadge) {
                const count = allSavedVideos.length;
                welcomeLibCountBadge.textContent = count ? `${count} ${count === 1 ? 'Video' : 'Videos'} Saved` : 'Knowledge Base';
            }
            const welcomeLibCtaText = $('#welcome-library-cta-text');
            if (welcomeLibCtaText) {
                const count = allSavedVideos.length;
                welcomeLibCtaText.textContent = count ? `Explore Library (${count})` : 'Open Library';
            }

            renderModalVideoGrid();

            // Synchronize active video title if it is currently placeholder
            const activeVidId = API.getVideoId();
            if (activeVidId) {
                const activeMatch = allSavedVideos.find(v => v.video_id === activeVidId);
                if (activeMatch && activeMatch.title && activeMatch.title !== 'YouTube Video') {
                    const currentStored = API.getVideoTitle();
                    if (!currentStored || currentStored === 'YouTube Video') {
                        API.setVideoTitle(activeMatch.title);
                        if (topbarActiveTitle) topbarActiveTitle.textContent = activeMatch.title;
                        if (sidebarTitle) sidebarTitle.textContent = activeMatch.title;
                        if (railActiveVideoBtn) railActiveVideoBtn.title = `Current Video: ${activeMatch.title}`;
                    }
                }
            }
        } catch (err) {
            console.error('Error loading library:', err);
        }
    }

    // =============================
    // MESSAGE RENDERING & CITATIONS
    // =============================
    function timestampToSeconds(timeStr) {
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        return 0;
    }

    // Parses timestamps into interactive YouTube jump-links
    function decorateCitations(container, videoId) {
        if (!container || !videoId) return;

        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                if (node.parentElement && (
                    node.parentElement.closest('pre') ||
                    node.parentElement.closest('code') ||
                    node.parentElement.closest('a') ||
                    node.parentElement.closest('.citation-pill')
                )) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        const textNodes = [];
        let current;
        while ((current = walker.nextNode())) {
            if (/\b(?:\d{1,2}:)?\d{1,2}:\d{2}\b/.test(current.nodeValue)) {
                textNodes.push(current);
            }
        }

        const timeRegex = /(?:\[?\b((?:\d{1,2}:)?\d{1,2}:\d{2})\b\]?)/g;

        textNodes.forEach(node => {
            const text = node.nodeValue;
            if (!timeRegex.test(text)) return;
            timeRegex.lastIndex = 0;

            const frag = document.createDocumentFragment();
            let lastIdx = 0;
            let match;

            while ((match = timeRegex.exec(text)) !== null) {
                const matchStart = match.index;
                const matchEnd = timeRegex.lastIndex;
                const timeStr = match[1];

                if (matchStart > lastIdx) {
                    frag.appendChild(document.createTextNode(text.slice(lastIdx, matchStart)));
                }

                const sec = timestampToSeconds(timeStr);
                const a = document.createElement('a');
                a.className = 'citation-pill';
                a.href = `https://www.youtube.com/watch?v=${videoId}&t=${sec}s`;
                a.target = '_blank';
                a.rel = 'noopener';
                a.title = `Jump to ${timeStr} in YouTube video`;
                a.innerHTML = `<svg width="10" height="10" fill="currentColor" class="citation-pill__icon"><use href="#icon-play"/></svg> ${timeStr}`;
                frag.appendChild(a);

                lastIdx = matchEnd;
            }

            if (lastIdx < text.length) {
                frag.appendChild(document.createTextNode(text.slice(lastIdx)));
            }

            if (node.parentNode) {
                node.parentNode.replaceChild(frag, node);
            }
        });
    }

    function renderMessages() {
        // Clear loading placeholders & existing messages
        const placeholders = messagesContainer.querySelectorAll('.chat-loading-placeholder');
        placeholders.forEach(el => el.remove());

        const existing = messagesContainer.querySelectorAll('.message');
        existing.forEach(el => el.remove());

        if (messages.length === 0) {
            if (welcomeState) {
                welcomeState.style.display = 'flex';
                updateWelcomeStageUI();
            }
            if (chatInputBar) chatInputBar.style.display = 'block';
        } else {
            if (welcomeState) welcomeState.style.display = 'none';
            if (chatInputBar) chatInputBar.style.display = 'block';
            messages.forEach(msg => {
                appendMessageElement(msg.role, msg.content, msg.groundDurationSec);
            });
        }
    }

    function updateTelemetryDrawer(drawerEl, labelEl, durationSec, textContent) {
        if (!drawerEl || !labelEl) return;
        if (durationSec !== null && durationSec !== undefined && !isNaN(durationSec)) {
            labelEl.textContent = `Grounded in ${durationSec}s`;
        } else {
            labelEl.textContent = 'Grounded in transcript';
        }

        // Extract unique timestamps from textContent (e.g. 01:24, 04:18)
        const timeRegex = /(?:\[?\b((?:\d{1,2}:)?\d{1,2}:\d{2})\b\]?)/g;
        const matches = [];
        let m;
        while ((m = timeRegex.exec(textContent || '')) !== null) {
            if (!matches.includes(m[1])) {
                matches.push(m[1]);
            }
        }

        const videoIdClean = API.getVideoId() || '';
        const videoTitle = API.getVideoTitle() || 'Current Video';

        let citationsHtml = '';
        if (matches.length > 0) {
            citationsHtml = `
                <div class="telemetry-row">
                    <span class="telemetry-row-label">Cited Timestamps:</span>
                    <div class="telemetry-citations-wrap">
                        ${matches.map(ts => {
                            const sec = timestampToSeconds(ts);
                            return `<a class="citation-pill citation-pill--mini" href="https://www.youtube.com/watch?v=${videoIdClean}&t=${sec}s" target="_blank" rel="noopener">▶ ${ts}</a>`;
                        }).join('')}
                    </div>
                </div>
            `;
        } else {
            citationsHtml = `
                <div class="telemetry-row">
                    <span class="telemetry-row-label">Grounding Scope:</span>
                    <span class="telemetry-row-val">Full video transcript context</span>
                </div>
            `;
        }

        const latencyText = (durationSec !== null && durationSec !== undefined && !isNaN(durationSec))
            ? `${durationSec}s (Pinecone dense search + MiniLM cross-encoder rerank)`
            : 'Neural reranker active (ms-marco-MiniLM-L-2-v2)';

        drawerEl.innerHTML = `
            <div class="telemetry-row">
                <span class="telemetry-row-label">Retrieval Latency:</span>
                <span class="telemetry-row-val">${latencyText}</span>
            </div>
            ${citationsHtml}
            <div class="telemetry-row">
                <span class="telemetry-row-label">Source Target:</span>
                <span class="telemetry-row-val">${videoTitle} (${videoIdClean})</span>
            </div>
        `;
    }

    function appendMessageElement(role, content, durationSec = null) {
        if (welcomeState) welcomeState.style.display = 'none';
        if (chatInputBar) chatInputBar.style.display = 'block';

        // ChatGPT-Style User Pill Bubble (Right-Aligned Slate Blue)
        if (role === 'user') {
            const msg = document.createElement('div');
            msg.className = 'message message--user';

            const bubble = document.createElement('div');
            bubble.className = 'message__bubble';
            bubble.textContent = content;

            msg.appendChild(bubble);
            messagesContainer.appendChild(msg);
            return bubble;
        }

        // Assistant Message: Elevated Studio Card Vessel with Identity Header and Real Telemetry
        const msg = document.createElement('div');
        msg.className = 'message message--assistant';

        const body = document.createElement('div');
        body.className = 'message__body';

        // Assistant Identity Header (Top of the vessel card)
        const header = document.createElement('div');
        header.className = 'assistant-vessel__header';

        const identity = document.createElement('div');
        identity.className = 'assistant-vessel__identity';
        identity.innerHTML = `
            <div class="assistant-vessel__avatar" title="YTLens Assistant">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                </svg>
            </div>
            <div class="assistant-vessel__meta">
                <span class="assistant-vessel__name">YTLens Assistant</span>
                <span class="assistant-vessel__tag">PINECONE · MINILM</span>
            </div>
        `;

        // Collapsible Grounding Disclosure Pill (Live measured time & real cited timestamps)
        const telemetryPill = document.createElement('div');
        telemetryPill.className = 'message__telemetry';
        telemetryPill.title = 'View real RAG neural retrieval & timestamp citations';
        telemetryPill.innerHTML = `
            <span class="telemetry-icon-bolt">
                <svg width="12" height="12" fill="currentColor"><use href="#icon-sparkle"/></svg>
            </span>
            <span class="telemetry-label">${content ? (durationSec ? `Grounded in ${durationSec}s` : 'Grounded in transcript') : 'Retrieving context…'}</span>
            <span class="telemetry-chevron">
                <svg width="12" height="12"><use href="#icon-chevron-right"/></svg>
            </span>
        `;

        header.appendChild(identity);
        header.appendChild(telemetryPill);

        const telemetryDrawerWrap = document.createElement('div');
        telemetryDrawerWrap.className = 'telemetry-drawer-wrapper';

        const telemetryDrawer = document.createElement('div');
        telemetryDrawer.className = 'telemetry-drawer';
        telemetryDrawerWrap.appendChild(telemetryDrawer);

        const telemetryLabel = telemetryPill.querySelector('.telemetry-label');
        msg._telemetryPill = telemetryPill;
        msg._telemetryDrawer = telemetryDrawer;
        msg._telemetryDrawerWrap = telemetryDrawerWrap;
        msg._telemetryLabel = telemetryLabel;

        telemetryPill.addEventListener('click', () => {
            const isOpen = telemetryPill.classList.toggle('is-open');
            telemetryDrawerWrap.classList.toggle('is-open', isOpen);
        });

        // Assistant Content Container
        const contentEl = document.createElement('div');
        contentEl.className = 'message__content';

        if (content) {
            contentEl.innerHTML = renderMarkdown(content);
            addCodeCopyButtons(contentEl);
            decorateCitations(contentEl, API.getVideoId());
            updateTelemetryDrawer(telemetryDrawer, telemetryLabel, durationSec, content);
        } else {
            telemetryDrawer.innerHTML = `
                <div class="telemetry-row">
                    <span class="telemetry-row-val">Fetching semantic chunks from Pinecone & reranking…</span>
                </div>
            `;
        }

        // ChatGPT-style Action Toolbar (Copy, Thumbs Up, Thumbs Down, Retry)
        const toolbar = document.createElement('div');
        toolbar.className = 'message__action-toolbar';
        toolbar.innerHTML = `
            <button type="button" class="action-tool-btn action-copy-btn" title="Copy response">
                <svg width="14" height="14"><use href="#icon-copy"/></svg>
            </button>
            <button type="button" class="action-tool-btn action-thumb-up" title="Helpful response">
                <svg width="14" height="14"><use href="#icon-thumbs-up"/></svg>
            </button>
            <button type="button" class="action-tool-btn action-thumb-down" title="Needs improvement">
                <svg width="14" height="14"><use href="#icon-thumbs-down"/></svg>
            </button>
            <button type="button" class="action-tool-btn action-retry-btn" title="Regenerate response">
                <svg width="14" height="14"><use href="#icon-refresh"/></svg>
            </button>
        `;

        const copyBtn = toolbar.querySelector('.action-copy-btn');
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(contentEl.innerText || content).then(() => {
                copyBtn.innerHTML = '<svg width="14" height="14"><use href="#icon-check"/></svg>';
                setTimeout(() => {
                    copyBtn.innerHTML = '<svg width="14" height="14"><use href="#icon-copy"/></svg>';
                }, 2000);
            });
        });

        const thumbUp = toolbar.querySelector('.action-thumb-up');
        thumbUp.addEventListener('click', () => {
            const isActive = thumbUp.classList.toggle('action-tool-btn--active');
            toolbar.querySelector('.action-thumb-down').classList.remove('action-tool-btn--active-down');
            if (isActive) {
                showToast('Feedback recorded: Helpful response', 'success');
            }
        });

        const thumbDown = toolbar.querySelector('.action-thumb-down');
        thumbDown.addEventListener('click', () => {
            const isActive = thumbDown.classList.toggle('action-tool-btn--active-down');
            toolbar.querySelector('.action-thumb-up').classList.remove('action-tool-btn--active');
            if (isActive) {
                showToast('Feedback recorded: Response flagged for improvement');
            }
        });

        const retryBtn = toolbar.querySelector('.action-retry-btn');
        retryBtn.addEventListener('click', () => {
            if (isStreaming) return;

            // 1. Locate the preceding user prompt bubble in the DOM
            let prev = msg.previousElementSibling;
            while (prev && !prev.classList.contains('message--user')) {
                prev = prev.previousElementSibling;
            }
            const promptText = prev ? prev.querySelector('.message__bubble')?.textContent?.trim() : null;

            // 2. Locate index in messages array
            const allAssistants = Array.from(messagesContainer.querySelectorAll('.message--assistant'));
            const elIndex = allAssistants.indexOf(msg);
            let assistantCount = -1;
            let targetMsgIdx = -1;
            for (let i = 0; i < messages.length; i++) {
                if (messages[i].role === 'assistant') {
                    assistantCount++;
                    if (assistantCount === elIndex) {
                        targetMsgIdx = i;
                        break;
                    }
                }
            }

            // Fallback question from messages array if needed
            let questionToRetry = promptText;
            if (!questionToRetry && targetMsgIdx > 0 && messages[targetMsgIdx - 1]?.role === 'user') {
                questionToRetry = messages[targetMsgIdx - 1].content;
            }
            if (!questionToRetry) {
                questionToRetry = messages.slice().reverse().find(m => m.role === 'user')?.content;
            }
            if (!questionToRetry) return;

            // Reset action button states
            toolbar.querySelector('.action-thumb-up').classList.remove('action-tool-btn--active');
            toolbar.querySelector('.action-thumb-down').classList.remove('action-tool-btn--active-down');
            retryBtn.classList.add('action-tool-btn--spinning');

            // Regenerate in place!
            streamResponse(questionToRetry, contentEl, targetMsgIdx, () => {
                retryBtn.classList.remove('action-tool-btn--spinning');
            });
        });

        body.appendChild(header);
        body.appendChild(telemetryDrawerWrap);
        body.appendChild(contentEl);
        body.appendChild(toolbar);
        msg.appendChild(body);

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
    $$('.welcome__chip, .suggestion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            chatInput.value = chip.dataset.question;
            sendBtn.disabled = false;
            submitQuestion();
        });
    });

    function submitQuestion(overrideQuestion = null) {
        const question = (typeof overrideQuestion === 'string' ? overrideQuestion : chatInput.value).trim();
        if (!question) return;

        if (!API.getVideoId()) {
            openIngestModal();
            return;
        }

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

    let activeStreamFinishCallback = null;

    function streamResponse(question, targetContentEl = null, targetMessageIndex = null, onFinish = null) {
        isStreaming = true;
        sendBtn.hidden = true;
        stopBtn.hidden = false;
        chatInput.disabled = true;
        activeStreamFinishCallback = onFinish;

        abortController = new AbortController();

        const requestStartTime = performance.now();
        let firstTokenReceived = false;
        let groundDurationSec = null;

        let contentEl, telemetryPill, telemetryDrawer, telemetryDrawerWrap, telemetryLabel;
        if (targetContentEl) {
            contentEl = targetContentEl;
            contentEl.innerHTML = '';
            const msgEl = contentEl.closest('.message--assistant');
            telemetryPill = msgEl?._telemetryPill || msgEl?.querySelector('.message__telemetry');
            telemetryDrawer = msgEl?._telemetryDrawer || msgEl?.querySelector('.telemetry-drawer');
            telemetryDrawerWrap = msgEl?._telemetryDrawerWrap || msgEl?.querySelector('.telemetry-drawer-wrapper');
            telemetryLabel = msgEl?._telemetryLabel || telemetryPill?.querySelector('.telemetry-label');
            if (telemetryPill) {
                telemetryPill.classList.remove('is-open', 'message__telemetry--resolved');
                telemetryPill.classList.add('message__telemetry--retrieving');
            }
            if (telemetryDrawerWrap) {
                telemetryDrawerWrap.classList.remove('is-open');
            }
            if (telemetryLabel) {
                telemetryLabel.innerHTML = 'Retrieving context <span class="telemetry-live-timer">0.0s</span>';
            }
            if (telemetryDrawer) {
                telemetryDrawer.innerHTML = `
                    <div class="telemetry-row">
                        <span class="telemetry-row-val">Searching Pinecone embeddings & neural reranking…</span>
                    </div>
                `;
            }
        } else {
            contentEl = appendMessageElement('assistant', '');
            const msgEl = contentEl.closest('.message--assistant');
            telemetryPill = msgEl?._telemetryPill || msgEl?.querySelector('.message__telemetry');
            telemetryDrawer = msgEl?._telemetryDrawer || msgEl?.querySelector('.telemetry-drawer');
            telemetryDrawerWrap = msgEl?._telemetryDrawerWrap || msgEl?.querySelector('.telemetry-drawer-wrapper');
            telemetryLabel = msgEl?._telemetryLabel || telemetryPill?.querySelector('.telemetry-label');
            if (telemetryPill) {
                telemetryPill.classList.add('message__telemetry--retrieving');
            }
            if (telemetryLabel) {
                telemetryLabel.innerHTML = 'Retrieving context <span class="telemetry-live-timer">0.0s</span>';
            }
            scrollToBottom();
        }
        contentEl.classList.add('typing-cursor');
        let fullText = '';

        // Live Dynamic Ticking Timer
        const retrievalTimer = setInterval(() => {
            if (!isStreaming || firstTokenReceived) {
                clearInterval(retrievalTimer);
                return;
            }
            const elapsedSec = ((performance.now() - requestStartTime) / 1000).toFixed(1);
            if (telemetryLabel && telemetryPill && telemetryPill.classList.contains('message__telemetry--retrieving')) {
                telemetryLabel.innerHTML = `Retrieving context <span class="telemetry-live-timer">${elapsedSec}s</span>`;
            }
        }, 100);

        API.streamAsk(
            API.getVideoId(),
            question,
            // onToken
            (token) => {
                if (!firstTokenReceived) {
                    firstTokenReceived = true;
                    clearInterval(retrievalTimer);
                    const elapsedMs = performance.now() - requestStartTime;
                    groundDurationSec = (elapsedMs / 1000).toFixed(2);
                    if (telemetryPill) {
                        telemetryPill.classList.remove('message__telemetry--retrieving');
                        telemetryPill.classList.add('message__telemetry--resolved');
                        setTimeout(() => telemetryPill.classList.remove('message__telemetry--resolved'), 400);
                    }
                    if (telemetryLabel) {
                        telemetryLabel.textContent = `Grounded in ${groundDurationSec}s`;
                    }
                }
                fullText += token;
                contentEl.innerHTML = renderMarkdown(fullText);
                addCodeCopyButtons(contentEl);
                contentEl.classList.add('typing-cursor');
                autoScroll();
            },
            // onDone
            () => {
                clearInterval(retrievalTimer);
                contentEl.classList.remove('typing-cursor');
                if (!firstTokenReceived) {
                    const elapsedMs = performance.now() - requestStartTime;
                    groundDurationSec = (elapsedMs / 1000).toFixed(2);
                }
                if (fullText) {
                    contentEl.innerHTML = renderMarkdown(fullText);
                    addCodeCopyButtons(contentEl);
                    decorateCitations(contentEl, API.getVideoId());
                }
                if (telemetryDrawer && telemetryLabel) {
                    updateTelemetryDrawer(telemetryDrawer, telemetryLabel, groundDurationSec, fullText);
                }
                const savedObj = {
                    role: 'assistant',
                    content: fullText,
                    groundDurationSec: groundDurationSec
                };
                if (targetMessageIndex !== null && targetMessageIndex >= 0 && targetMessageIndex < messages.length) {
                    messages[targetMessageIndex] = savedObj;
                } else if (targetContentEl) {
                    for (let i = messages.length - 1; i >= 0; i--) {
                        if (messages[i].role === 'assistant') {
                            messages[i] = savedObj;
                            break;
                        }
                    }
                } else {
                    messages.push(savedObj);
                }
                finishStreaming();
                persistChatSession();
            },
            // onError
            (err) => {
                clearInterval(retrievalTimer);
                contentEl.classList.remove('typing-cursor');
                if (telemetryPill) {
                    telemetryPill.classList.remove('message__telemetry--retrieving');
                }
                if (err.message === 'SESSION_EXPIRED') {
                    showToast('Your session has expired. Please sign in again.');
                    logout();
                    return;
                }
                contentEl.innerHTML = `<p style="color: var(--accent);">Error: ${err.message}</p>`;
                if (telemetryLabel) telemetryLabel.textContent = 'Retrieval error';
                const errObj = { role: 'assistant', content: `Error: ${err.message}` };
                if (targetMessageIndex !== null && targetMessageIndex >= 0 && targetMessageIndex < messages.length) {
                    messages[targetMessageIndex] = errObj;
                } else {
                    messages.push(errObj);
                }
                finishStreaming();
                persistChatSession();
            },
            abortController.signal
        );
    }

    async function persistChatSession() {
        if (!currentChatId) {
            currentChatId = 'chat-' + Date.now();
        }
        const firstUserMsg = messages.find(m => m.role === 'user');
        const chatTitle = firstUserMsg ? firstUserMsg.content.slice(0, 36) + (firstUserMsg.content.length > 36 ? '...' : '') : 'New Chat';

        try {
            await API.saveChat({
                id: currentChatId,
                video_id: API.getVideoId(),
                video_title: API.getVideoTitle() || 'YouTube Video',
                title: chatTitle,
                messages_json: JSON.stringify(messages)
            });
            loadChats();
            loadLibrary();
        } catch (err) {
            console.error('Failed to auto-save chat session:', err);
        }
    }

    function finishStreaming() {
        isStreaming = false;
        sendBtn.hidden = false;
        stopBtn.hidden = true;
        chatInput.disabled = false;
        chatInput.focus();
        abortController = null;
        if (activeStreamFinishCallback) {
            try { activeStreamFinishCallback(); } catch (_) {}
            activeStreamFinishCallback = null;
        }
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
    // SIDEBAR & DRAWER MANAGEMENT
    // =============================
    function toggleSidebar() {
        const isCollapsed = sidebar.classList.contains('sidebar--collapsed');
        if (isCollapsed) {
            openSidebar();
        } else {
            closeSidebar();
        }
    }

    function openSidebar() {
        sidebar.classList.remove('sidebar--collapsed');
        sidebar.classList.add('sidebar--open');
        if (sidebarToggleBtn) {
            sidebarToggleBtn.setAttribute('title', 'Collapse sidebar (Ctrl+B)');
        }
        localStorage.setItem('ytlens_sidebar_state', 'expanded');
        localStorage.setItem('ytlens_sidebar_collapsed', 'false');
        if (window.innerWidth <= 768) {
            sidebarOverlay.classList.add('sidebar-overlay--visible');
        }
        loadChats();
        loadLibrary();
    }

    function closeSidebar() {
        sidebar.classList.add('sidebar--collapsed');
        sidebar.classList.remove('sidebar--open');
        if (sidebarToggleBtn) {
            sidebarToggleBtn.setAttribute('title', 'Expand sidebar (Ctrl+B)');
        }
        if (window.innerWidth > 768) {
            localStorage.setItem('ytlens_sidebar_state', 'collapsed');
            localStorage.setItem('ytlens_sidebar_collapsed', 'true');
        }
        sidebarOverlay.classList.remove('sidebar-overlay--visible');
    }

    if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);
    if (sidebarToggleBtn) sidebarToggleBtn.addEventListener('click', toggleSidebar);
    if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
    if (sidebarQuickNewBtn) sidebarQuickNewBtn.addEventListener('click', startNewChat);

    // Collapsed Rail Action Buttons (ChatGPT Style)
    if (railNewChatBtn) railNewChatBtn.addEventListener('click', startNewChat);
    if (railLibraryBtn) railLibraryBtn.addEventListener('click', openLibraryModal);
    if (railIngestBtn) railIngestBtn.addEventListener('click', openIngestModal);
    if (railActiveVideoBtn) railActiveVideoBtn.addEventListener('click', openIngestModal);
    if (railChatsBtn) railChatsBtn.addEventListener('click', openSidebar);
    if (railAvatarBtn) railAvatarBtn.addEventListener('click', openSidebar);

    // Global Keyboard Shortcuts (Ctrl+B, Ctrl+K, Escape)
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
            if (screenChat.classList.contains('screen--active')) {
                e.preventDefault();
                toggleSidebar();
            }
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            if (screenChat.classList.contains('screen--active')) {
                e.preventDefault();
                startNewChat();
            }
        } else if (e.key === 'Escape') {
            if (videoIngestModal && videoIngestModal.style.display !== 'none') {
                closeIngestModal();
                return;
            }
            if (videoLibraryModal && videoLibraryModal.style.display !== 'none') {
                closeLibraryModal();
                return;
            }
            if (sidebar && !sidebar.classList.contains('sidebar--collapsed')) {
                closeSidebar();
            }
            if (fallbackSection && !fallbackSection.hidden) {
                hideFallbackProtocol();
            }
        }
    });

    // Suggestion Chips (1-Click Sample Ingestion inside Ingest Modal)
    tvChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const url = chip.getAttribute('data-url');
            if (!url) return;
            hideFallbackProtocol();
            videoInput.value = url;
            updateVideoDetection();
            videoInput.focus();
        });
    });

    // Welcome Stage 1-Click Sample Starters
    $$('.sample-starter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const url = chip.getAttribute('data-url');
            if (!url) return;
            openIngestModal();
            if (videoInput) {
                videoInput.value = url;
                updateVideoDetection();
                videoInput.focus();
            }
        });
    });

    // Welcome Stage Hero Action Cards Keyboard Navigation
    if (emptyOpenIngestBtn) {
        emptyOpenIngestBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openIngestModal();
            }
        });
    }
    if (emptyOpenLibraryBtn) {
        emptyOpenLibraryBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openLibraryModal();
            }
        });
    }

    // =============================
    // NAVIGATION ACTIONS
    // =============================
    function startNewChat() {
        if (window.innerWidth <= 768) closeSidebar();
        if (API.getVideoId()) {
            messages = [];
            currentChatId = 'chat-' + Date.now();
            // Deselect any active item in chat list
            document.querySelectorAll('.sidebar__chat-item--active').forEach(el => el.classList.remove('sidebar__chat-item--active'));
            showWelcomeChatStage();
            if (chatInput) {
                chatInput.value = '';
                if (window.innerWidth > 768) chatInput.focus();
            }
        } else {
            openIngestModal();
        }
    }

    if (newChatBtn) {
        newChatBtn.addEventListener('click', startNewChat);
    }

    if (topbarNewChatBtn) {
        topbarNewChatBtn.addEventListener('click', startNewChat);
    }

    if (sidebarClearChatsBtn) {
        sidebarClearChatsBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!confirm('Are you sure you want to clear all chat history? This will permanently delete all your chats from the database.')) {
                return;
            }
            try {
                sidebarClearChatsBtn.disabled = true;
                await API.clearAllChats();
                messages = [];
                currentChatId = null;
                showWelcomeChatStage();
                await loadChats();
                showToast('All chat history cleared', 'success');
            } catch (err) {
                handleApiError(err);
            } finally {
                sidebarClearChatsBtn.disabled = false;
            }
        });
    }

    if (switchVideoBtn) {
        switchVideoBtn.addEventListener('click', openIngestModal);
    }

    if (sidebarIngestBtn) {
        sidebarIngestBtn.addEventListener('click', openIngestModal);
    }

    if (sidebarNoVideo) {
        sidebarNoVideo.addEventListener('click', openIngestModal);
    }

    if (dockSwitchBtn) {
        dockSwitchBtn.addEventListener('click', openIngestModal);
    }

    function logout() {
        API.clearToken();
        API.clearVideo();
        messages = [];
        currentChatId = null;
        closeSidebar();
        tvTickerManager.stop();
        if (loginUsername) loginUsername.value = '';
        if (loginPassword) loginPassword.value = '';
        showScreen('login');
    }

    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    if (topbarLogoutBtn) topbarLogoutBtn.addEventListener('click', logout);
    if (videoLogoutBtn) videoLogoutBtn.addEventListener('click', logout);

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

