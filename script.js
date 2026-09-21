/**
 * AetherShare — Main Application Controller
 * Orchestrates all transport modes, routing, and UI state.
 */

class App {
    constructor() {
        this.currentFile = null;
        this.selectedP2PFiles = [];
        this.sessionPassword = null;
        this.sessionReceivedFiles = [];
        this.receivedBlob = null;
        this.receivedHeader = null;
        this._pendingReceiverPeerId = null;

        this._bindDom();
        this._setupP2PEngineListeners();
        this._bindEvents();
        this._handleRouting();

        window.addEventListener('hashchange', () => this._handleRouting());
    }

    // ============================================================
    // DOM References
    // ============================================================

    _bindDom() {
        this.dom = {
            // Views
            senderView: document.getElementById('sender-view'),
            receiverView: document.getElementById('receiver-view'),

            // Tab bar
            tabBar: document.getElementById('tab-bar'),
            tabPanes: document.querySelectorAll('.tab-pane'),

            // --- URL Mode ---
            url: {
                dropZone: document.getElementById('drop-zone-url'),
                fileInput: document.getElementById('file-input-url'),
                options: document.getElementById('url-options'),
                filename: document.getElementById('url-filename'),
                filesize: document.getElementById('url-filesize'),
                lossyToggle: document.getElementById('url-lossy-toggle'),
                encryptToggle: document.getElementById('url-encrypt-toggle'),
                passwordGroup: document.getElementById('url-password-group'),
                password: document.getElementById('url-password'),
                advToggle: document.getElementById('url-advanced-toggle'),
                advPanel: document.getElementById('url-advanced-panel'),
                timebomb: document.getElementById('url-timebomb'),
                vibe: document.getElementById('url-vibe'),
                geoToggle: document.getElementById('url-geo-toggle'),
                camoBtn: document.getElementById('url-camo-btn'),
                generateBtn: document.getElementById('url-generate-btn'),
                result: document.getElementById('url-result'),
                shareUrl: document.getElementById('url-share-url'),
                copyBtn: document.getElementById('url-copy-btn'),
                qrBtn: document.getElementById('url-qr-btn'),
                previewLink: document.getElementById('url-preview-link'),
                qrContainer: document.getElementById('url-qr-container'),
                qrcode: document.getElementById('url-qrcode'),
                status: document.getElementById('url-status'),
                progress: document.getElementById('url-progress'),
                progressFill: document.getElementById('url-progress-fill'),
                progressText: document.getElementById('url-progress-text'),
            },

            // --- P2P Mode ---
            p2p: {
                modeSelector: document.getElementById('p2p-mode-selector'),
                sendView: document.getElementById('p2p-send-view'),
                recvView: document.getElementById('p2p-recv-view'),
                sessionBanner: document.getElementById('p2p-session-banner'),
                connectedPeerName: document.getElementById('p2p-connected-peer-name'),
                disconnectBtn: document.getElementById('p2p-disconnect-btn'),
                connectBox: document.getElementById('p2p-send-connect-box'),
                remotePeerInput: document.getElementById('p2p-remote-peer-input'),
                scanQrBtn: document.getElementById('p2p-scan-qr-btn'),
                connectBtn: document.getElementById('p2p-connect-btn'),
                showSenderQrBtn: document.getElementById('p2p-show-sender-qr-btn'),
                dropZone: document.getElementById('drop-zone-p2p'),
                fileInput: document.getElementById('file-input-p2p'),
                sendOptions: document.getElementById('p2p-send-options'),
                filename: document.getElementById('p2p-filename'),
                filesize: document.getElementById('p2p-filesize'),
                fileChips: document.getElementById('p2p-file-chips'),
                encryptToggle: document.getElementById('p2p-encrypt-toggle'),
                passwordGroup: document.getElementById('p2p-password-group'),
                password: document.getElementById('p2p-password'),
                startSendBtn: document.getElementById('p2p-start-send-btn'),
                sendWaiting: document.getElementById('p2p-send-waiting'),
                sendQrcode: document.getElementById('p2p-send-qrcode'),
                sendUrl: document.getElementById('p2p-send-url'),
                sendCopyBtn: document.getElementById('p2p-send-copy-btn'),
                sendProgress: document.getElementById('p2p-send-progress'),
                sendProgressFill: document.getElementById('p2p-send-progress-fill'),
                sendProgressText: document.getElementById('p2p-send-progress-text'),
                sendSpeed: document.getElementById('p2p-send-speed'),
                sendPercent: document.getElementById('p2p-send-percent'),
                // Recv
                autoDownload: document.getElementById('p2p-auto-download'),
                recvWaitBox: document.getElementById('p2p-recv-wait-box'),
                recvWaiting: document.getElementById('p2p-recv-waiting'),
                recvStatus: document.getElementById('p2p-recv-status'),
                recvQr: document.getElementById('p2p-recv-qr'),
                recvQrcode: document.getElementById('p2p-recv-qrcode'),
                recvIdDisplay: document.getElementById('p2p-recv-id-display'),
                recvScanBtn: document.getElementById('p2p-recv-scan-btn'),
                recvTransfer: document.getElementById('p2p-recv-transfer'),
                recvProgressFill: document.getElementById('p2p-recv-progress-fill'),
                recvProgressText: document.getElementById('p2p-recv-progress-text'),
                recvSpeed: document.getElementById('p2p-recv-speed'),
                recvPercent: document.getElementById('p2p-recv-percent'),
                receivedContainer: document.getElementById('p2p-received-container'),
                receivedCount: document.getElementById('p2p-received-count'),
                receivedItems: document.getElementById('p2p-received-items'),
                noFilesMsg: document.getElementById('p2p-no-files-msg'),
            },

            // --- QR Stream Mode ---
            qrs: {
                sendView: document.getElementById('qrs-send-view'),
                recvView: document.getElementById('qrs-recv-view'),
                dropZone: document.getElementById('drop-zone-qrs'),
                fileInput: document.getElementById('file-input-qrs'),
                sendOptions: document.getElementById('qrs-send-options'),
                filename: document.getElementById('qrs-filename'),
                filesize: document.getElementById('qrs-filesize'),
                encryptToggle: document.getElementById('qrs-encrypt-toggle'),
                passwordGroup: document.getElementById('qrs-password-group'),
                password: document.getElementById('qrs-password'),
                fps: document.getElementById('qrs-fps'),
                startBtn: document.getElementById('qrs-start-btn'),
                broadcasting: document.getElementById('qrs-broadcasting'),
                canvas: document.getElementById('qrs-canvas'),
                currentChunk: document.getElementById('qrs-current-chunk'),
                totalChunks: document.getElementById('qrs-total-chunks'),
                stopBtn: document.getElementById('qrs-stop-btn'),
                // Recv
                autoDownload: document.getElementById('qrs-auto-download'),
                cameraVideo: document.getElementById('qrs-camera-video'),
                recvProgressFill: document.getElementById('qrs-recv-progress-fill'),
                recvProgressText: document.getElementById('qrs-recv-progress-text'),
                recvDownloadBtn: document.getElementById('qrs-recv-download-btn'),
            },

            // --- Audio Mode ---
            audio: {
                sendView: document.getElementById('audio-send-view'),
                recvView: document.getElementById('audio-recv-view'),
                sendText: document.getElementById('audio-send-text'),
                sendCanvas: document.getElementById('audio-send-canvas'),
                encryptToggle: document.getElementById('audio-encrypt-toggle'),
                passwordGroup: document.getElementById('audio-password-group'),
                password: document.getElementById('audio-password'),
                protocol: document.getElementById('audio-protocol'),
                sendBtn: document.getElementById('audio-send-btn'),
                sendStatus: document.getElementById('audio-send-status'),
                recvCanvas: document.getElementById('audio-recv-canvas'),
                recvOutput: document.getElementById('audio-recv-output'),
                startListenBtn: document.getElementById('audio-start-listen-btn'),
                stopListenBtn: document.getElementById('audio-stop-listen-btn'),
            },

            // --- Color Mode ---
            color: {
                sendView: document.getElementById('color-send-view'),
                recvView: document.getElementById('color-recv-view'),
                sendText: document.getElementById('color-send-text'),
                sendCanvas: document.getElementById('color-send-canvas'),
                encryptToggle: document.getElementById('color-encrypt-toggle'),
                passwordGroup: document.getElementById('color-password-group'),
                password: document.getElementById('color-password'),
                speed: document.getElementById('color-speed'),
                sendBtn: document.getElementById('color-send-btn'),
                stopBtn: document.getElementById('color-stop-btn'),
                cameraVideo: document.getElementById('color-camera-video'),
                recvOutput: document.getElementById('color-recv-output'),
                startScanBtn: document.getElementById('color-start-scan-btn'),
                stopScanBtn: document.getElementById('color-stop-scan-btn'),
            },

            // --- Receiver View ---
            recv: {
                filename: document.getElementById('recv-filename'),
                filesize: document.getElementById('recv-filesize'),
                decryptPanel: document.getElementById('decrypt-panel'),
                decryptPassword: document.getElementById('decrypt-password'),
                decryptBtn: document.getElementById('decrypt-btn'),
                progress: document.getElementById('recv-progress'),
                progressFill: document.getElementById('recv-progress-fill'),
                progressText: document.getElementById('recv-progress-text'),
                autoDownload: document.getElementById('recv-auto-download'),
                downloadBtn: document.getElementById('download-btn'),
            },

            // --- Scanner Modal ---
            modal: {
                qrModal: document.getElementById('qr-scanner-modal'),
                qrCloseBtn: document.getElementById('qr-scanner-close-btn'),
                qrVideo: document.getElementById('qr-scanner-video'),
                qrStatus: document.getElementById('qr-scanner-status'),
            },

            toast: document.getElementById('toast-container'),
        };
    }

    // ============================================================
    // Event Binding
    // ============================================================

    _bindEvents() {
        // ---- Tab Navigation ----
        this.dom.tabBar.addEventListener('click', (e) => {
            const btn = e.target.closest('.tab-btn');
            if (!btn) return;
            this._switchTab(btn.dataset.tab);
        });

        // ---- Sub-mode selectors (P2P, QRS, Audio, Color) ----
        this._bindModeSwitcher(this.dom.p2p.modeSelector, 'data-p2p-mode', {
            send: () => { this.dom.p2p.sendView.classList.remove('hidden'); this.dom.p2p.recvView.classList.add('hidden'); },
            receive: () => { this.dom.p2p.sendView.classList.add('hidden'); this.dom.p2p.recvView.classList.remove('hidden'); this._initP2PReceiver(); }
        });

        document.querySelectorAll('[data-qrs-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-qrs-mode]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (btn.dataset.qrsMode === 'send') {
                    this.dom.qrs.sendView.classList.remove('hidden'); this.dom.qrs.recvView.classList.add('hidden');
                    window.qrStreamEngine.stopReceiving();
                } else {
                    this.dom.qrs.sendView.classList.add('hidden'); this.dom.qrs.recvView.classList.remove('hidden');
                    this._initQRSReceiver();
                }
            });
        });

        document.querySelectorAll('[data-audio-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-audio-mode]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (btn.dataset.audioMode === 'send') {
                    this.dom.audio.sendView.classList.remove('hidden'); this.dom.audio.recvView.classList.add('hidden');
                    window.audioEngine.stopListening();
                } else {
                    this.dom.audio.sendView.classList.add('hidden'); this.dom.audio.recvView.classList.remove('hidden');
                }
            });
        });

        document.querySelectorAll('[data-color-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-color-mode]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (btn.dataset.colorMode === 'send') {
                    this.dom.color.sendView.classList.remove('hidden'); this.dom.color.recvView.classList.add('hidden');
                    window.colorStreamEngine.stopReceiving();
                } else {
                    this.dom.color.sendView.classList.add('hidden'); this.dom.color.recvView.classList.remove('hidden');
                }
            });
        });

        // ---- URL Mode ----
        this._setupDropZone(this.dom.url.dropZone, this.dom.url.fileInput, (file) => this._onFileSelectedURL(file));
        this.dom.url.encryptToggle.addEventListener('change', (e) => {
            this.dom.url.passwordGroup.classList.toggle('hidden', !e.target.checked);
            if (e.target.checked) this.dom.url.password.focus();
        });
        this.dom.url.advToggle.addEventListener('click', () => {
            this.dom.url.advPanel.classList.toggle('hidden');
            this.dom.url.advToggle.classList.toggle('open');
        });
        this.dom.url.generateBtn.addEventListener('click', () => this._generateURLLink());
        this.dom.url.copyBtn.addEventListener('click', () => this._copyToClipboard(this.dom.url.shareUrl.value));
        this.dom.url.qrBtn.addEventListener('click', () => this._toggleURLQR());
        this.dom.url.camoBtn?.addEventListener('click', () => Features.toggleCamouflage(true));

        // ---- P2P Mode ----
        this._setupDropZone(this.dom.p2p.dropZone, this.dom.p2p.fileInput, null, (files) => this._onFilesSelectedP2P(files));
        this.dom.p2p.encryptToggle.addEventListener('change', (e) => {
            this.dom.p2p.passwordGroup.classList.toggle('hidden', !e.target.checked);
        });
        this.dom.p2p.connectBtn?.addEventListener('click', () => {
            const raw = this.dom.p2p.remotePeerInput.value.trim();
            const id = this._parsePeerIdFromScanned(raw);
            this._connectP2PToPeer(id);
        });
        this.dom.p2p.scanQrBtn?.addEventListener('click', () => {
            this._openQRScanner((text) => {
                const id = this._parsePeerIdFromScanned(text);
                if (id) {
                    this.dom.p2p.remotePeerInput.value = id;
                    this._connectP2PToPeer(id);
                }
            });
        });
        this.dom.p2p.showSenderQrBtn?.addEventListener('click', () => this._showSenderQRWaiting());
        this.dom.p2p.startSendBtn.addEventListener('click', () => this._startP2PSend());
        this.dom.p2p.sendCopyBtn.addEventListener('click', () => this._copyToClipboard(this.dom.p2p.sendUrl.value));
        this.dom.p2p.disconnectBtn?.addEventListener('click', () => window.p2pEngine.disconnect());
        this.dom.p2p.recvScanBtn?.addEventListener('click', () => {
            this._openQRScanner((text) => {
                const id = this._parsePeerIdFromScanned(text);
                if (id) {
                    this._connectP2PToPeer(id);
                }
            });
        });

        // ---- QR Stream Mode ----
        this._setupDropZone(this.dom.qrs.dropZone, this.dom.qrs.fileInput, (file, isZip, count) => this._onFileSelectedQRS(file, isZip, count));
        this.dom.qrs.encryptToggle.addEventListener('change', (e) => {
            this.dom.qrs.passwordGroup.classList.toggle('hidden', !e.target.checked);
        });
        this.dom.qrs.startBtn.addEventListener('click', () => this._startQRStream());
        this.dom.qrs.stopBtn.addEventListener('click', () => this._stopQRStream());
        this.dom.qrs.recvDownloadBtn?.addEventListener('click', () => this._downloadBlob(this.receivedBlob, this.receivedHeader?.filename));

        // ---- Audio Mode ----
        this.dom.audio.sendText.addEventListener('input', () => {
            this.dom.audio.sendBtn.disabled = !this.dom.audio.sendText.value.trim();
        });
        this.dom.audio.encryptToggle.addEventListener('change', (e) => {
            this.dom.audio.passwordGroup.classList.toggle('hidden', !e.target.checked);
        });
        this.dom.audio.sendBtn.addEventListener('click', () => this._audioTransmit());
        this.dom.audio.startListenBtn.addEventListener('click', () => this._audioStartListen());
        this.dom.audio.stopListenBtn.addEventListener('click', () => this._audioStopListen());

        // ---- Color Mode ----
        this.dom.color.encryptToggle.addEventListener('change', (e) => {
            this.dom.color.passwordGroup.classList.toggle('hidden', !e.target.checked);
        });
        this.dom.color.sendBtn.addEventListener('click', () => this._colorStartTransmit());
        this.dom.color.stopBtn.addEventListener('click', () => this._colorStopTransmit());
        this.dom.color.startScanBtn.addEventListener('click', () => this._colorStartScan());
        this.dom.color.stopScanBtn.addEventListener('click', () => this._colorStopScan());

        // ---- Receiver View ----
        this.dom.recv.downloadBtn.addEventListener('click', () => this._downloadBlob(this.receivedBlob, this.receivedHeader?.filename));
        this.dom.recv.decryptBtn.addEventListener('click', () => this._attemptDecryption());
    }

    _bindModeSwitcher(container, attr, actions) {
        container.addEventListener('click', (e) => {
            const btn = e.target.closest('.mode-btn');
            if (!btn) return;
            container.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const mode = btn.getAttribute(attr);
            actions[mode]?.();
        });
    }

    // ============================================================
    // Tab Navigation
    // ============================================================

    _switchTab(tabId) {
        this.dom.tabBar.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        this.dom.tabPanes.forEach(pane => {
            pane.classList.toggle('active', pane.id === tabId);
        });
    }

    // ============================================================
    // Drop Zone Helper
    // ============================================================

    _setupDropZone(zone, input, onFile, onFiles) {
        zone.addEventListener('click', () => input.click());
        input.addEventListener('change', (e) => this._processFileInput(e.target.files, onFile, onFiles));

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
            zone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); });
        });
        zone.addEventListener('dragover', () => zone.classList.add('drag-over'));
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone.addEventListener('drop', (e) => {
            zone.classList.remove('drag-over');
            this._processFileInput(e.dataTransfer.files, onFile, onFiles);
        });
    }

    async _processFileInput(fileList, onFile, onFiles) {
        if (!fileList || fileList.length === 0) return;

        if (onFiles) {
            onFiles(Array.from(fileList));
            return;
        }

        if (fileList.length > 1) {
            // Zip multiple files for modes requiring single payload
            const zip = new JSZip();
            for (let i = 0; i < fileList.length; i++) {
                zip.file(fileList[i].name, fileList[i]);
            }
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const zipFile = new File([zipBlob], `archive_${fileList.length}_files.zip`, { type: 'application/zip' });
            onFile(zipFile, true, fileList.length);
        } else {
            onFile(fileList[0], false, 1);
        }
    }

    // ============================================================
    // ROUTING (hash-based)
    // ============================================================

    _handleRouting() {
        const hash = window.location.hash.substring(1);
        if (!hash || hash.length < 5) {
            this._showSender();
            return;
        }

        // P2P Sender-first link
        if (hash.startsWith('BEAM|')) {
            this._showReceiver();
            this._handleBeamReceive(hash);
            return;
        }

        // P2P Receiver-first link
        if (hash.startsWith('P2P_RECV|')) {
            // Sender connecting to receiver
            this._showSender();
            this._switchTab('tab-p2p');
            const peerId = hash.split('|')[1];
            this._showToast(`Receiver detected: ${peerId.substring(0, 8)}...`, 'info');
            // Auto-set in P2P send mode — user picks file then sends
            this._pendingReceiverPeerId = peerId;
            return;
        }

        // URL mode (AETHER or legacy)
        if (hash.includes('|')) {
            this._showReceiver();
            this._handleURLReceive(hash);
            return;
        }

        this._showSender();
    }

    _showSender() {
        this.dom.senderView.classList.remove('hidden');
        this.dom.receiverView.classList.add('hidden');
    }

    _showReceiver() {
        this.dom.senderView.classList.add('hidden');
        this.dom.receiverView.classList.remove('hidden');
    }

    // ============================================================
    // URL MODE
    // ============================================================

    _onFileSelectedURL(file, isZip) {
        this.currentFile = file;
        this.dom.url.filename.textContent = isZip ? `📦 ${file.name}` : file.name;
        this.dom.url.filesize.textContent = this._formatSize(file.size);
        this.dom.url.options.classList.remove('hidden');
        this.dom.url.result.classList.add('hidden');

        // Lossy toggle only for images
        const isImage = file.type.startsWith('image/');
        this.dom.url.lossyToggle.closest('.toggle-switch').classList.toggle('hidden', !isImage);
        this.dom.url.lossyToggle.checked = isImage;
    }

    async _generateURLLink() {
        if (!this.currentFile) return;

        this._setURLProgress(true, 'Processing...');

        try {
            let blob = this.currentFile;

            // Lossy image compression
            if (this.dom.url.lossyToggle.checked && this.currentFile.type.startsWith('image/')) {
                this._setURLProgress(true, 'Optimizing image...');
                blob = await Compress.compressImage(this.currentFile);
            }

            // Gzip compression
            this._setURLProgress(true, 'Compressing...');
            const compressed = await Compress.gzip(blob.stream());

            // Build header
            const header = {
                filename: this.currentFile.name,
                encrypted: this.dom.url.encryptToggle.checked,
            };

            const vibeVal = this.dom.url.vibe.value;
            if (vibeVal !== 'default') header.vibe = vibeVal;

            const expiryMin = parseInt(this.dom.url.timebomb.value);
            if (expiryMin > 0) header.expiry = Features.getExpiryTimestamp(expiryMin);

            if (this.dom.url.geoToggle.checked) {
                this._setURLProgress(true, 'Getting location...');
                header.geo = await Features.getCurrentPosition();
            }

            let payloadBase64;

            if (header.encrypted) {
                const pw = this.dom.url.password.value;
                if (!pw) throw new Error('Password required');
                this._setURLProgress(true, 'Encrypting...');
                const enc = await Crypto.encryptBase64(compressed, pw);
                header.salt = enc.salt;
                header.iv = enc.iv;
                payloadBase64 = enc.data;
            } else {
                this._setURLProgress(true, 'Encoding...');
                payloadBase64 = await Compress.blobToBase64(compressed);
            }

            const headerBase64 = Crypto.stringToBase64(JSON.stringify(header));
            const hashData = `AETHER|${headerBase64}|${payloadBase64}`;
            const fullUrl = `${location.origin}${location.pathname}#${hashData}`;

            this.dom.url.shareUrl.value = fullUrl;
            this.dom.url.previewLink.href = fullUrl;
            this.dom.url.result.classList.remove('hidden');
            this.dom.url.qrContainer.classList.add('hidden');
            this.dom.url.qrcode.innerHTML = '';
            this.dom.url.status.textContent = 'Link generated!';
            this.dom.url.status.className = 'status-msg success';

        } catch (err) {
            console.error('URL generate failed:', err);
            this._showToast('Error: ' + err.message, 'error');
        } finally {
            this._setURLProgress(false);
        }
    }

    _setURLProgress(show, text = 'Processing...') {
        this.dom.url.progress.classList.toggle('hidden', !show);
        this.dom.url.generateBtn.disabled = show;
        if (show) {
            this.dom.url.progressText.textContent = text;
            this.dom.url.progressFill.style.width = '70%';
        } else {
            this.dom.url.progressFill.style.width = '0%';
        }
    }

    _toggleURLQR() {
        const url = this.dom.url.shareUrl.value;
        if (!url) return;

        this.dom.url.qrContainer.classList.toggle('hidden');
        if (!this.dom.url.qrContainer.classList.contains('hidden')) {
            this.dom.url.qrcode.innerHTML = '';
            try {
                const qr = qrcode(0, 'L');
                qr.addData(url);
                qr.make();
                this.dom.url.qrcode.innerHTML = qr.createImgTag(4, 10);
                const img = this.dom.url.qrcode.querySelector('img');
                if (img) { img.style.width = '100%'; img.style.height = 'auto'; img.style.imageRendering = 'pixelated'; }
            } catch (e) {
                this._showToast('Data too large for QR code. Try P2P or QR Stream.', 'error');
                this.dom.url.qrContainer.classList.add('hidden');
            }
        }
    }

    async _handleURLReceive(hash) {
        this.dom.recv.downloadBtn.disabled = true;
        this.dom.recv.decryptPanel.classList.add('hidden');
        this.receivedBlob = null;
        this.receivedHeader = null;

        try {
            let header, payload;

            if (hash.startsWith('AETHER|')) {
                const parts = hash.split('|');
                header = JSON.parse(Crypto.base64ToString(parts[1]));
                payload = parts[2];
            } else if (hash.startsWith('SECURE|')) {
                const parts = hash.split('|');
                header = { filename: decodeURIComponent(parts[1]), encrypted: true, salt: parts[2], iv: parts[3] };
                payload = parts[4];
            } else {
                const parts = hash.split('|');
                header = { filename: decodeURIComponent(parts[0]), encrypted: false };
                payload = parts[1];
            }

            this.receivedHeader = header;
            this.dom.recv.filename.textContent = (header.encrypted ? '🔒 ' : '') + header.filename;

            // Check expiry
            if (header.expiry) {
                const status = Features.checkExpiry(header.expiry);
                if (status.expired) {
                    this.dom.recv.filename.textContent = '💥 Link Expired';
                    this.dom.recv.filesize.textContent = 'Self-destructed.';
                    return;
                }
            }

            // Geo check
            if (header.geo) {
                this.dom.recv.filesize.textContent = 'Checking location...';
                const geo = await Features.verifyLocation(header.geo.lat, header.geo.lng);
                if (!geo.allowed) {
                    this.dom.recv.filename.textContent = '📍 Access Denied';
                    this.dom.recv.filesize.textContent = geo.error || 'Wrong location.';
                    return;
                }
            }

            // Apply vibe
            if (header.vibe) Features.applyVibe(header.vibe);

            if (header.encrypted) {
                this.dom.recv.filesize.textContent = 'Encrypted — Enter password';
                this.dom.recv.decryptPanel.classList.remove('hidden');
                this.receivedHeader._payload = payload;
            } else {
                this.dom.recv.filesize.textContent = 'Decompressing...';
                const compressed = Compress.base64ToBlob(payload);
                const original = await Compress.gunzip(compressed);
                this.receivedBlob = original;
                this.dom.recv.filesize.textContent = this._formatSize(original.size);
                this.dom.recv.downloadBtn.disabled = false;

                if (this.dom.recv.autoDownload?.checked) {
                    this._downloadBlob(original, header.filename);
                    this._showToast(`Auto-downloaded: ${header.filename}`, 'success');
                }
            }

        } catch (e) {
            console.error('URL receive error:', e);
            this.dom.recv.filename.textContent = 'Error parsing link';
            this.dom.recv.filesize.textContent = 'Invalid format';
        }
    }

    async _attemptDecryption() {
        if (!this.receivedHeader?.encrypted) return;
        const pw = this.dom.recv.decryptPassword.value;
        if (!pw) { this._showToast('Enter password', 'error'); return; }

        this.dom.recv.decryptBtn.disabled = true;
        this.dom.recv.decryptBtn.textContent = 'Decrypting...';

        try {
            let blob;
            if (this.receivedHeader.beam) {
                blob = await Crypto.decryptBlob(this.receivedBlob, pw, this.receivedHeader.salt, this.receivedHeader.iv);
            } else {
                blob = await Crypto.decryptBase64(this.receivedHeader._payload, pw, this.receivedHeader.salt, this.receivedHeader.iv);
                blob = await Compress.gunzip(blob);
            }

            this.receivedBlob = blob;
            this.dom.recv.filesize.textContent = this._formatSize(blob.size);
            this.dom.recv.downloadBtn.disabled = false;
            this.dom.recv.decryptPanel.classList.add('hidden');
            this.dom.recv.filename.textContent = this.receivedHeader.filename;

            if (this.dom.recv.autoDownload?.checked) {
                this._downloadBlob(blob, this.receivedHeader.filename);
                this._showToast(`Auto-downloaded: ${this.receivedHeader.filename}`, 'success');
            }
        } catch (e) {
            console.error('Decrypt failed:', e);
            this._showToast('Decryption failed — wrong password?', 'error');
            this.dom.recv.decryptBtn.disabled = false;
            this.dom.recv.decryptBtn.textContent = 'Unlock File';
        }
    }

    // ============================================================
    // UNIVERSAL QR SCANNER
    // ============================================================

    _openQRScanner(onScanned) {
        const modal = this.dom.modal.qrModal;
        const video = this.dom.modal.qrVideo;
        const status = this.dom.modal.qrStatus;
        if (!modal || !video) return;

        modal.classList.remove('hidden');
        status.textContent = 'Starting camera...';

        let activeStream = null;
        let animFrame = null;
        const scanCanvas = document.createElement('canvas');
        const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });

        const cleanup = () => {
            if (animFrame) {
                cancelAnimationFrame(animFrame);
                animFrame = null;
            }
            if (activeStream) {
                activeStream.getTracks().forEach(t => t.stop());
                activeStream = null;
            }
            video.srcObject = null;
            modal.classList.add('hidden');
        };

        this.dom.modal.qrCloseBtn.onclick = () => cleanup();

        navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        }).then(stream => {
            activeStream = stream;
            video.srcObject = stream;
            status.textContent = 'Point camera at QR code...';

            const scanLoop = () => {
                if (!activeStream) return;
                if (video.readyState >= video.HAVE_CURRENT_DATA) {
                    scanCanvas.width = video.videoWidth;
                    scanCanvas.height = video.videoHeight;
                    scanCtx.drawImage(video, 0, 0);

                    if (window.jsQR) {
                        const imgData = scanCtx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
                        const code = jsQR(imgData.data, imgData.width, imgData.height, {
                            inversionAttempts: 'dontInvert'
                        });
                        if (code && code.data) {
                            const raw = code.data.trim();
                            cleanup();
                            onScanned(raw);
                            return;
                        }
                    }
                }
                animFrame = requestAnimationFrame(scanLoop);
            };

            animFrame = requestAnimationFrame(scanLoop);
        }).catch(err => {
            console.error('QR Scanner error:', err);
            status.textContent = 'Camera error: ' + (err.message || 'Permission denied');
            this._showToast('Camera error: ' + (err.message || 'Permission denied'), 'error');
        });
    }

    _parsePeerIdFromScanned(text) {
        if (!text) return '';
        let str = text.trim();
        if (str.includes('#')) {
            str = str.split('#')[1];
        }
        if (str.startsWith('P2P_RECV|')) {
            return str.split('|')[1];
        }
        if (str.startsWith('BEAM|')) {
            return str.split('|')[1];
        }
        return str;
    }

    // ============================================================
    // P2P MODE (Continuous Channel + Multi-File + Auto-Download)
    // ============================================================

    _setupP2PEngineListeners() {
        window.p2pEngine.on('connected', (peerId) => {
            this._updateP2PConnectionUI(true, peerId);
            this._showToast(`Connected to peer: ${peerId.substring(0, 8)}...`, 'success');
        });

        window.p2pEngine.on('disconnected', () => {
            this._updateP2PConnectionUI(false);
            this._showToast('Peer disconnected', 'info');
        });

        window.p2pEngine.on('meta', (meta) => {
            this._onP2PMetaReceived(meta);
        });

        window.p2pEngine.on('progress', (percent, received, total, speed) => {
            this._onP2PProgressReceived(percent, received, total, speed);
        });

        window.p2pEngine.on('complete', (blob, meta) => {
            this._onP2PFileReceived(blob, meta);
        });

        window.p2pEngine.on('error', (err) => {
            this._showToast('P2P: ' + (err.message || err), 'error');
        });
    }

    _updateP2PConnectionUI(isConnected, peerId = null) {
        if (isConnected) {
            this.dom.p2p.sessionBanner?.classList.remove('hidden');
            if (this.dom.p2p.connectedPeerName) {
                this.dom.p2p.connectedPeerName.textContent = peerId ? `${peerId.substring(0, 8)}...` : 'Active';
            }
            this.dom.p2p.connectBox?.classList.add('hidden');
            this.dom.p2p.sendWaiting?.classList.add('hidden');
            this.dom.p2p.recvWaitBox?.classList.add('hidden');
        } else {
            this.dom.p2p.sessionBanner?.classList.add('hidden');
            this.dom.p2p.connectBox?.classList.remove('hidden');
            this.dom.p2p.recvWaitBox?.classList.remove('hidden');
            if (this.dom.p2p.recvStatus) {
                this.dom.p2p.recvStatus.textContent = 'Waiting for sender...';
            }
        }
    }

    async _connectP2PToPeer(peerId) {
        if (!peerId) {
            this._showToast('Please enter or scan a Peer ID', 'error');
            return;
        }

        try {
            if (this.dom.p2p.connectBtn) {
                this.dom.p2p.connectBtn.disabled = true;
                this.dom.p2p.connectBtn.textContent = 'Connecting...';
            }
            this._showToast(`Connecting to ${peerId.substring(0, 8)}...`, 'info');
            await window.p2pEngine.connectTo(peerId);
        } catch (err) {
            console.error('P2P Connect error:', err);
            this._showToast('Connection failed: ' + err.message, 'error');
        } finally {
            if (this.dom.p2p.connectBtn) {
                this.dom.p2p.connectBtn.disabled = false;
                this.dom.p2p.connectBtn.textContent = 'Connect';
            }
        }
    }

    async _showSenderQRWaiting() {
        try {
            const peerId = await window.p2pEngine.init();
            const hash = window.p2pEngine.getSenderHash();
            const fullUrl = `${location.origin}${location.pathname}#${hash}`;

            this.dom.p2p.sendWaiting.classList.remove('hidden');
            this.dom.p2p.sendUrl.value = fullUrl;

            this.dom.p2p.sendQrcode.innerHTML = '';
            try {
                const qr = qrcode(0, 'L');
                qr.addData(fullUrl);
                qr.make();
                this.dom.p2p.sendQrcode.innerHTML = qr.createImgTag(4, 8);
                const img = this.dom.p2p.sendQrcode.querySelector('img');
                if (img) { img.style.width = '100%'; img.style.height = 'auto'; img.style.imageRendering = 'pixelated'; }
            } catch (e) {
                console.warn('QR render error:', e);
            }
        } catch (err) {
            this._showToast('Failed to initialize sender: ' + err.message, 'error');
        }
    }

    _onFilesSelectedP2P(files) {
        this.selectedP2PFiles = files;
        if (!files || files.length === 0) return;

        if (files.length === 1) {
            const file = files[0];
            this.dom.p2p.filename.textContent = file.name;
            this.dom.p2p.filesize.textContent = this._formatSize(file.size);
            this.dom.p2p.fileChips.classList.add('hidden');
            this.dom.p2p.startSendBtn.textContent = '🚀 Send File';
        } else {
            const totalSize = files.reduce((acc, f) => acc + f.size, 0);
            this.dom.p2p.filename.textContent = `📁 ${files.length} files selected`;
            this.dom.p2p.filesize.textContent = `Total: ${this._formatSize(totalSize)}`;

            this.dom.p2p.fileChips.innerHTML = '';
            files.forEach(f => {
                const chip = document.createElement('div');
                chip.className = 'file-chip';
                chip.innerHTML = `<span class="chip-name">${f.name}</span><span class="chip-size">${this._formatSize(f.size)}</span>`;
                this.dom.p2p.fileChips.appendChild(chip);
            });
            this.dom.p2p.fileChips.classList.remove('hidden');
            this.dom.p2p.startSendBtn.textContent = `🚀 Send ${files.length} Files`;
        }

        this.dom.p2p.sendOptions.classList.remove('hidden');
    }

    async _startP2PSend() {
        if (!this.selectedP2PFiles || this.selectedP2PFiles.length === 0) {
            this._showToast('Select file(s) to send', 'info');
            return;
        }

        // Check if connection is active
        if (!window.p2pEngine.isConnected()) {
            const remoteInput = this.dom.p2p.remotePeerInput.value.trim();
            if (remoteInput) {
                await this._connectP2PToPeer(this._parsePeerIdFromScanned(remoteInput));
            } else {
                this._showToast('Please connect to receiver or scan receiver QR code first', 'info');
                return;
            }
        }

        if (!window.p2pEngine.isConnected()) {
            this._showToast('Not connected to peer', 'error');
            return;
        }

        const files = this.selectedP2PFiles;
        const isEncrypted = this.dom.p2p.encryptToggle.checked;
        const password = this.dom.p2p.password.value;
        if (isEncrypted && !password) {
            this._showToast('Password required for encrypted beam', 'error');
            return;
        }

        this.dom.p2p.startSendBtn.disabled = true;
        this.dom.p2p.sendProgress.classList.remove('hidden');
        this.dom.p2p.sendOptions.classList.add('hidden');

        try {
            await window.p2pEngine.sendFiles(
                files,
                async (file, index, count) => {
                    if (isEncrypted) {
                        const enc = await Crypto.encryptBlob(file, password);
                        return {
                            filename: file.name,
                            encrypted: true,
                            salt: enc.salt,
                            iv: enc.iv,
                            blob: enc.blob
                        };
                    }
                    return { filename: file.name, encrypted: false };
                },
                (file, index, count) => {
                    this.dom.p2p.sendProgressText.textContent = `[${index}/${count}] Sending: ${file.name}`;
                    this.dom.p2p.sendProgressFill.style.width = '0%';
                },
                (percent, sent, total, speed, index, count) => {
                    this.dom.p2p.sendProgressFill.style.width = `${percent}%`;
                    this.dom.p2p.sendProgressText.textContent = `[${index}/${count}] ${percent}% — ${this._formatSize(sent)} / ${this._formatSize(total)}`;
                    this.dom.p2p.sendSpeed.textContent = `${speed} MB/s`;
                    this.dom.p2p.sendPercent.textContent = `${percent}%`;
                },
                (file, index, count) => {
                    this._showToast(`Sent [${index}/${count}]: ${file.name}`, 'success');
                }
            );

            this.dom.p2p.sendProgressText.textContent = `✅ All ${files.length} file(s) sent! Channel remains open.`;
            this._showToast(`All ${files.length} file(s) transferred! Channel open for more.`, 'success');

            setTimeout(() => {
                this.selectedP2PFiles = [];
                this.dom.p2p.sendProgress.classList.add('hidden');
                this.dom.p2p.sendOptions.classList.add('hidden');
                this.dom.p2p.startSendBtn.disabled = false;
            }, 3000);

        } catch (err) {
            console.error('Send error:', err);
            this._showToast('Transfer failed: ' + err.message, 'error');
            this.dom.p2p.sendProgressText.textContent = 'Transfer interrupted.';
            this.dom.p2p.startSendBtn.disabled = false;
        }
    }

    async _initP2PReceiver() {
        this.dom.p2p.recvStatus.textContent = 'Initializing Room...';
        this.dom.p2p.recvQr.classList.add('hidden');
        this.dom.p2p.recvIdDisplay.classList.add('hidden');
        this.dom.p2p.recvTransfer.classList.add('hidden');

        try {
            const peerId = await window.p2pEngine.init();
            const hash = window.p2pEngine.getReceiverHash();
            const fullUrl = `${location.origin}${location.pathname}#${hash}`;

            if (window.p2pEngine.isConnected()) {
                this.dom.p2p.recvStatus.textContent = 'Connected — ready for incoming files!';
                this.dom.p2p.recvWaitBox.classList.add('hidden');
                return;
            }

            this.dom.p2p.recvStatus.textContent = 'Waiting for sender to connect or scan...';

            this.dom.p2p.recvQr.classList.remove('hidden');
            this.dom.p2p.recvQrcode.innerHTML = '';
            try {
                const qr = qrcode(0, 'L');
                qr.addData(fullUrl);
                qr.make();
                this.dom.p2p.recvQrcode.innerHTML = qr.createImgTag(4, 8);
                const img = this.dom.p2p.recvQrcode.querySelector('img');
                if (img) { img.style.width = '100%'; img.style.height = 'auto'; img.style.imageRendering = 'pixelated'; }
            } catch (e) { /* ignore */ }

            this.dom.p2p.recvIdDisplay.classList.remove('hidden');
            this.dom.p2p.recvIdDisplay.textContent = `Room ID: ${peerId}`;

        } catch (err) {
            this._showToast('P2P Init failed: ' + err.message, 'error');
            this.dom.p2p.recvStatus.textContent = 'Initialization failed.';
        }
    }

    _onP2PMetaReceived(meta) {
        this.dom.p2p.recvTransfer.classList.remove('hidden');
        const countLabel = meta.totalFiles > 1 ? `[${meta.fileIndex}/${meta.totalFiles}] ` : '';
        this.dom.p2p.recvProgressText.textContent = `Receiving ${countLabel}${meta.filename}...`;
        this.dom.p2p.recvProgressFill.style.width = '0%';
    }

    _onP2PProgressReceived(percent, received, total, speed) {
        this.dom.p2p.recvProgressFill.style.width = `${percent}%`;
        this.dom.p2p.recvProgressText.textContent = `${percent}% — ${this._formatSize(received)} / ${this._formatSize(total)}`;
        this.dom.p2p.recvSpeed.textContent = `${speed} MB/s`;
        this.dom.p2p.recvPercent.textContent = `${percent}%`;
    }

    async _onP2PFileReceived(blob, meta) {
        this.dom.p2p.recvTransfer.classList.add('hidden');

        const autoDownload = this.dom.p2p.autoDownload ? this.dom.p2p.autoDownload.checked : true;
        const fileId = 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

        const fileRecord = {
            id: fileId,
            filename: meta.filename,
            size: meta.size,
            encrypted: meta.encrypted,
            salt: meta.salt,
            iv: meta.iv,
            blob: blob,
            decryptedBlob: null,
            downloaded: false,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        if (meta.encrypted) {
            let decrypted = false;
            if (this.sessionPassword) {
                try {
                    const decBlob = await Crypto.decryptBlob(blob, this.sessionPassword, meta.salt, meta.iv);
                    fileRecord.decryptedBlob = decBlob;
                    decrypted = true;
                    if (autoDownload) {
                        this._downloadBlob(decBlob, meta.filename);
                        fileRecord.downloaded = true;
                        this._showToast(`Decrypted & Auto-downloaded: ${meta.filename}`, 'success');
                    } else {
                        this._showToast(`Decrypted: ${meta.filename}`, 'success');
                    }
                } catch (e) {
                    // Session password wrong for this file
                }
            }

            if (!decrypted) {
                this._showToast(`Received encrypted file: ${meta.filename}. Click Unlock in list.`, 'info');
            }
        } else {
            fileRecord.decryptedBlob = blob;
            if (autoDownload) {
                this._downloadBlob(blob, meta.filename);
                fileRecord.downloaded = true;
                this._showToast(`Auto-downloaded: ${meta.filename}`, 'success');
            } else {
                this._showToast(`Received: ${meta.filename}`, 'success');
            }
        }

        this.sessionReceivedFiles.unshift(fileRecord);
        this._renderP2PReceivedList();
    }

    _renderP2PReceivedList() {
        const list = this.dom.p2p.receivedItems;
        const countEl = this.dom.p2p.receivedCount;
        if (!list) return;

        countEl.textContent = this.sessionReceivedFiles.length;
        if (this.sessionReceivedFiles.length === 0) {
            list.innerHTML = '<p class="text-muted" style="text-align:center; font-size:0.85rem; padding:0.8rem 0;">Ready for incoming files. Channel stays open!</p>';
            return;
        }

        list.innerHTML = '';
        this.sessionReceivedFiles.forEach(item => {
            const el = document.createElement('div');
            el.className = 'received-item';

            const isReady = Boolean(item.decryptedBlob);
            const icon = item.encrypted && !isReady ? '🔒' : '📄';

            el.innerHTML = `
                <div class="received-item-info">
                    <span style="font-size:1.2rem;">${icon}</span>
                    <div>
                        <div class="item-name">${item.filename}</div>
                        <div class="item-size">${this._formatSize(item.size)} · ${item.time}</div>
                    </div>
                </div>
                <div class="received-item-actions">
                    ${!isReady && item.encrypted ? `
                        <button class="btn secondary small item-unlock-btn" data-id="${item.id}">Unlock</button>
                    ` : `
                        <button class="btn primary small item-download-btn" data-id="${item.id}">
                            ${item.downloaded ? 'Downloaded ✓' : 'Download'}
                        </button>
                    `}
                </div>
            `;

            el.querySelector('.item-download-btn')?.addEventListener('click', () => {
                this._downloadBlob(item.decryptedBlob, item.filename);
            });

            el.querySelector('.item-unlock-btn')?.addEventListener('click', async () => {
                const pw = prompt(`Enter password to decrypt "${item.filename}":`);
                if (!pw) return;
                try {
                    const decBlob = await Crypto.decryptBlob(item.blob, pw, item.salt, item.iv);
                    item.decryptedBlob = decBlob;
                    this.sessionPassword = pw;
                    this._downloadBlob(decBlob, item.filename);
                    item.downloaded = true;
                    this._renderP2PReceivedList();
                    this._showToast(`Decrypted & downloaded ${item.filename}`, 'success');
                } catch (e) {
                    this._showToast('Decryption failed — incorrect password', 'error');
                }
            });

            list.appendChild(el);
        });
    }

    async _handleBeamReceive(hash) {
        const parts = hash.split('|');
        const peerId = parts[1];
        const filename = parts[2] ? decodeURIComponent(parts[2]) : 'file.bin';
        const fileSize = parts[3] ? parseInt(parts[3]) : 0;

        this.receivedHeader = { filename, size: fileSize, beam: true };
        this.dom.recv.filename.textContent = '📡 ' + filename;
        this.dom.recv.filesize.textContent = 'Connecting to sender...';
        this.dom.recv.progress.classList.remove('hidden');
        this.dom.recv.progressFill.style.width = '0%';
        this.dom.recv.progressText.textContent = 'Connecting...';

        try {
            await window.p2pEngine.init();

            window.p2pEngine.connectAndReceive(peerId, {
                onMeta: (meta) => {
                    this.receivedHeader = { ...meta, beam: true };
                    this.dom.recv.filename.textContent = (meta.encrypted ? '🔒 ' : '📡 ') + meta.filename;
                    this.dom.recv.filesize.textContent = 'Receiving...';
                },
                onProgress: (percent, received, total, speed) => {
                    this.dom.recv.progressFill.style.width = `${percent}%`;
                    this.dom.recv.progressText.textContent = `${percent}% — ${speed} MB/s`;
                },
                onComplete: (blob, meta) => {
                    this.dom.recv.progress.classList.add('hidden');

                    if (meta.encrypted) {
                        this.receivedBlob = blob;
                        this.dom.recv.filesize.textContent = 'Encrypted — Enter password';
                        this.dom.recv.decryptPanel.classList.remove('hidden');
                    } else {
                        this.receivedBlob = blob;
                        this.dom.recv.filesize.textContent = this._formatSize(blob.size);
                        this.dom.recv.downloadBtn.disabled = false;

                        if (this.dom.recv.autoDownload?.checked) {
                            this._downloadBlob(blob, meta.filename);
                            this._showToast(`Auto-downloaded: ${meta.filename}`, 'success');
                        }
                    }
                },
                onError: (err) => {
                    this.dom.recv.filesize.textContent = 'Connection failed.';
                    this._showToast('P2P Error: ' + (err.message || err), 'error');
                }
            });

        } catch (err) {
            this.dom.recv.filesize.textContent = 'Connection failed.';
            this._showToast('P2P Error: ' + err.message, 'error');
        }
    }

    // ============================================================
    // QR STREAM MODE
    // ============================================================

    _onFileSelectedQRS(file, isZip = false, count = 1) {
        this.currentFile = file;
        this.dom.qrs.filename.textContent = isZip ? `📦 ${count} files (archive.zip)` : file.name;
        this.dom.qrs.filesize.textContent = this._formatSize(file.size);
        this.dom.qrs.sendOptions.classList.remove('hidden');
    }

    async _startQRStream() {
        if (!this.currentFile) return;

        try {
            // Compress file
            let blob = await Compress.gzip(this.currentFile.stream());

            // Encrypt if enabled
            let encMeta = null;
            if (this.dom.qrs.encryptToggle.checked) {
                const pw = this.dom.qrs.password.value;
                if (!pw) { this._showToast('Password required', 'error'); return; }
                const enc = await Crypto.encryptBlob(blob, pw);
                blob = enc.blob;
                encMeta = { salt: enc.salt, iv: enc.iv };
            }

            const arrayBuffer = await blob.arrayBuffer();
            const payload = new Uint8Array(arrayBuffer);

            // Embed encryption metadata in filename marker so receiver knows
            const filename = encMeta
                ? `ENC|${encMeta.salt}|${encMeta.iv}|${this.currentFile.name}`
                : this.currentFile.name;

            const { totalChunks } = window.qrStreamEngine.prepareFrames(payload, filename);

            this.dom.qrs.sendOptions.classList.add('hidden');
            this.dom.qrs.broadcasting.classList.remove('hidden');
            this.dom.qrs.totalChunks.textContent = totalChunks;

            const fps = parseInt(this.dom.qrs.fps.value);

            window.qrStreamEngine.startTransmitting(this.dom.qrs.canvas, fps, (current, total) => {
                this.dom.qrs.currentChunk.textContent = current + 1;
            });

        } catch (err) {
            this._showToast('QR Stream error: ' + err.message, 'error');
        }
    }

    _stopQRStream() {
        window.qrStreamEngine.stopTransmitting();
        this.dom.qrs.broadcasting.classList.add('hidden');
        this.dom.qrs.sendOptions.classList.remove('hidden');
    }

    _initQRSReceiver() {
        this.dom.qrs.recvProgressText.textContent = 'Scanning for QR stream...';
        this.dom.qrs.recvProgressFill.style.width = '0%';
        this.dom.qrs.recvDownloadBtn.classList.add('hidden');

        window.qrStreamEngine.startReceiving(this.dom.qrs.cameraVideo, {
            onProgress: (received, total) => {
                const pct = Math.round((received / total) * 100);
                this.dom.qrs.recvProgressFill.style.width = `${pct}%`;
                this.dom.qrs.recvProgressText.textContent = `${received} / ${total} chunks (${pct}%)`;
            },
            onComplete: async (payload, rawFilename) => {
                try {
                    let filename = rawFilename;
                    let decompressed = await Compress.gunzip(new Blob([payload]));
                    let finalBlob = decompressed;

                    if (rawFilename.startsWith('ENC|')) {
                        const parts = rawFilename.split('|');
                        const salt = parts[1];
                        const iv = parts[2];
                        filename = parts.slice(3).join('|');
                        const pw = prompt(`Enter password to decrypt "${filename}":`);
                        if (pw) {
                            finalBlob = await Crypto.decryptBlob(decompressed, pw, salt, iv);
                        } else {
                            this._showToast('Decryption cancelled', 'info');
                            return;
                        }
                    }

                    this.receivedBlob = finalBlob;
                    this.receivedHeader = { filename };
                    this.dom.qrs.recvProgressText.textContent = '✅ Transfer complete!';
                    this.dom.qrs.recvDownloadBtn.classList.remove('hidden');
                    this._showToast('QR Stream received!', 'success');

                    if (this.dom.qrs.autoDownload?.checked) {
                        this._downloadBlob(finalBlob, filename);
                        this._showToast(`Auto-downloaded: ${filename}`, 'success');
                    }
                } catch (err) {
                    this._showToast('Decompression/Decryption failed: ' + err.message, 'error');
                }
            },
            onError: (err) => {
                this._showToast('QR Scan error: ' + err.message, 'error');
            }
        });
    }

    // ============================================================
    // AUDIO MODE
    // ============================================================

    async _audioTransmit() {
        let text = this.dom.audio.sendText.value.trim();
        if (!text) return;

        this.dom.audio.sendBtn.disabled = true;
        this.dom.audio.sendBtn.textContent = 'Transmitting...';
        this.dom.audio.sendStatus.classList.remove('hidden');
        this.dom.audio.sendStatus.textContent = 'Initializing ggwave...';

        try {
            // Encrypt text if enabled
            if (this.dom.audio.encryptToggle.checked) {
                const pw = this.dom.audio.password.value;
                if (!pw) { this._showToast('Password required', 'error'); return; }
                this.dom.audio.sendStatus.textContent = 'Encrypting...';
                const blob = new Blob([new TextEncoder().encode(text)]);
                const enc = await Crypto.encryptBlob(blob, pw);
                const encB64 = await Compress.blobToBase64(enc.blob);
                // Prefix with encryption marker so receiver can detect and decrypt
                text = `AENC|${enc.salt}|${enc.iv}|${encB64}`;
            }

            const protocol = this.dom.audio.protocol.value;
            this.dom.audio.sendStatus.textContent = `Transmitting via ${protocol}...`;
            await window.audioEngine.transmit(text, protocol);
            this.dom.audio.sendStatus.textContent = '✅ Transmission complete!';
            this.dom.audio.sendStatus.className = 'status-msg success';
            this._showToast('Audio transmitted!', 'success');
        } catch (err) {
            console.error('Audio transmit error:', err);
            this.dom.audio.sendStatus.textContent = '❌ ' + err.message;
            this.dom.audio.sendStatus.className = 'status-msg error';
            this._showToast('Audio error: ' + err.message, 'error');
        } finally {
            this.dom.audio.sendBtn.disabled = false;
            this.dom.audio.sendBtn.textContent = 'Transmit via Sound';
        }
    }

    async _audioStartListen() {
        this.dom.audio.startListenBtn.classList.add('hidden');
        this.dom.audio.stopListenBtn.classList.remove('hidden');
        this.dom.audio.recvOutput.textContent = 'Listening...';

        try {
            await window.audioEngine.startListening(
                (decoded) => {
                    const line = document.createElement('div');
                    line.textContent = `[${new Date().toLocaleTimeString()}] ${decoded}`;
                    this.dom.audio.recvOutput.appendChild(line);
                    this.dom.audio.recvOutput.scrollTop = this.dom.audio.recvOutput.scrollHeight;
                    this._showToast('Audio data received!', 'success');
                },
                (spectrum) => {
                    this._drawSpectrum(this.dom.audio.recvCanvas, spectrum);
                }
            );
        } catch (err) {
            this._showToast('Microphone error: ' + err.message, 'error');
            this._audioStopListen();
        }
    }

    _audioStopListen() {
        window.audioEngine.stopListening();
        this.dom.audio.startListenBtn.classList.remove('hidden');
        this.dom.audio.stopListenBtn.classList.add('hidden');
    }

    // ============================================================
    // COLOR STREAM MODE
    // ============================================================

    async _colorStartTransmit() {
        let text = this.dom.color.sendText.value.trim();
        if (!text) { this._showToast('Enter text to transmit', 'error'); return; }

        // Encrypt text if enabled
        if (this.dom.color.encryptToggle.checked) {
            const pw = this.dom.color.password.value;
            if (!pw) { this._showToast('Password required', 'error'); return; }
            const blob = new Blob([new TextEncoder().encode(text)]);
            const enc = await Crypto.encryptBlob(blob, pw);
            const encB64 = await Compress.blobToBase64(enc.blob);
            text = `CENC|${enc.salt}|${enc.iv}|${encB64}`;
        }

        const frames = window.colorStreamEngine.encodeText(text);
        const intervalMs = parseInt(this.dom.color.speed.value);

        this.dom.color.sendBtn.classList.add('hidden');
        this.dom.color.stopBtn.classList.remove('hidden');

        window.colorStreamEngine.startTransmitting(this.dom.color.sendCanvas, frames, intervalMs);
    }

    _colorStopTransmit() {
        window.colorStreamEngine.stopTransmitting();
        this.dom.color.sendBtn.classList.remove('hidden');
        this.dom.color.stopBtn.classList.add('hidden');
    }

    async _colorStartScan() {
        this.dom.color.startScanBtn.classList.add('hidden');
        this.dom.color.stopScanBtn.classList.remove('hidden');
        this.dom.color.recvOutput.textContent = 'Starting camera...';

        await window.colorStreamEngine.startReceiving(this.dom.color.cameraVideo, {
            onData: (text) => {
                this.dom.color.recvOutput.textContent += `\n✅ Received: ${text}`;
                this._showToast('Color data received!', 'success');
            },
            onStatus: (msg) => {
                this.dom.color.recvOutput.textContent = msg;
            },
            onError: (err) => {
                this._showToast('Camera error: ' + err.message, 'error');
                this._colorStopScan();
            }
        });
    }

    _colorStopScan() {
        window.colorStreamEngine.stopReceiving();
        this.dom.color.startScanBtn.classList.remove('hidden');
        this.dom.color.stopScanBtn.classList.add('hidden');
    }

    // ============================================================
    // UTILITIES
    // ============================================================

    _drawSpectrum(canvas, dataArray) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);

        const barWidth = (width / dataArray.length) * 2.5;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
            const v = dataArray[i] / 255;
            const barHeight = v * height;

            // Gradient from cyan to purple based on frequency
            const r = Math.floor(v * 168);
            const g = Math.floor(v * 229 * (1 - i / dataArray.length));
            const b = Math.floor(200 + v * 55);

            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(x, height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }

    _downloadBlob(blob, filename = 'download') {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async _copyToClipboard(text) {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            this._showToast('Copied!', 'success');
        } catch (e) {
            // Fallback
            const input = document.createElement('textarea');
            input.value = text;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            this._showToast('Copied!', 'success');
        }
    }

    _showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = { info: 'ℹ️', success: '✅', error: '❌' };
        toast.innerHTML = `<span>${icons[type] || '💬'}</span> <span>${message}</span>`;

        this.dom.toast.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('visible'));

        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    _formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Boot
document.addEventListener('DOMContentLoaded', () => { window.app = new App(); });
