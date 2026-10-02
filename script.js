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
        this.activeRoomId = null;
        this.isRoomHost = true;

        // NFC State
        this.nfcHistory = [];
        this.selectedNFCFile = null;
        this.activeNFCType = 'text';
        this._nfcActiveAbort = null;

        this._bindDom();
        this._setupP2PEngineListeners();
        this._bindEvents();
        this._handleRouting();

        // P2P Beam is now the first tab — initialize immediately so the room code is ready tout en haut!
        const currentHash = window.location.hash || '';
        if (!currentHash.includes('BEAM') && !currentHash.includes('P2P_RECV')) {
            this._initP2PConnectionInfo();
        }

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
                // Header Room Pill (tout en haut)
                headerRoomPill: document.getElementById('header-room-pill'),
                headerRoomCode: document.getElementById('header-room-code'),
                headerRoomPersona: document.getElementById('header-room-persona'),

                // Top Room Hero Card (tout en haut)
                topRoomCard: document.getElementById('p2p-top-room-card'),
                topRoomCode: document.getElementById('p2p-top-room-code'),
                roomBadgeTitle: document.getElementById('p2p-room-badge-title'),
                topPersonaTag: document.getElementById('p2p-top-persona-tag'),
                topPersonaEmoji: document.getElementById('p2p-top-persona-emoji'),
                topPersonaName: document.getElementById('p2p-top-persona-name'),
                heroCopyBtn: document.getElementById('p2p-hero-copy-btn'),
                toggleQrBtn: document.getElementById('p2p-toggle-qr-btn'),
                qrCollapsible: document.getElementById('p2p-qr-collapsible'),

                connectView: document.getElementById('p2p-connect-view'),
                dashboardView: document.getElementById('p2p-dashboard-view'),
                sessionBanner: document.getElementById('p2p-session-banner'),
                connectedPeerName: document.getElementById('p2p-connected-peer-name'),
                disconnectBtn: document.getElementById('p2p-disconnect-btn'),
                peersBar: document.getElementById('p2p-connected-peers-bar'),
                peersCount: document.getElementById('p2p-peers-count'),
                peersList: document.getElementById('p2p-peers-list'),
                myIdentityBadge: document.getElementById('p2p-my-identity-badge'),
                connectBox: document.getElementById('p2p-send-connect-box'),
                roomTitle: document.getElementById('p2p-room-info-title'),
                roomBox: document.getElementById('p2p-room-info-box'),
                remotePeerInput: document.getElementById('p2p-remote-peer-input'),
                scanQrBtn: document.getElementById('p2p-scan-qr-btn'),
                scanNfcBtn: document.getElementById('p2p-scan-nfc-btn'),
                nfcShareBtn: document.getElementById('p2p-nfc-share-btn'),
                connectBtn: document.getElementById('p2p-connect-btn'),
                dropZone: document.getElementById('drop-zone-p2p'),
                fileInput: document.getElementById('file-input-p2p'),
                sendOptions: document.getElementById('p2p-send-options'),
                fileChips: document.getElementById('p2p-file-chips'),
                encryptToggle: document.getElementById('p2p-encrypt-toggle'),
                passwordGroup: document.getElementById('p2p-password-group'),
                password: document.getElementById('p2p-password'),
                startSendBtn: document.getElementById('p2p-start-send-btn'),
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
                shareLinkBox: document.getElementById('p2p-share-link-box'),
                sendUrl: document.getElementById('p2p-send-url'),
                sendCopyBtn: document.getElementById('p2p-send-copy-btn'),
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

            // --- NFC Mode ---
            nfc: {
                compatBanner: document.getElementById('nfc-compat-banner'),
                sendView: document.getElementById('nfc-send-view'),
                recvView: document.getElementById('nfc-recv-view'),
                typeBtns: document.querySelectorAll('[data-nfc-type]'),
                panelText: document.getElementById('nfc-panel-text'),
                panelUrl: document.getElementById('nfc-panel-url'),
                panelFile: document.getElementById('nfc-panel-file'),
                sendText: document.getElementById('nfc-send-text'),
                textCapacityLabel: document.getElementById('nfc-text-capacity-label'),
                encryptToggle: document.getElementById('nfc-encrypt-toggle'),
                passwordGroup: document.getElementById('nfc-password-group'),
                password: document.getElementById('nfc-password'),
                sendUrl: document.getElementById('nfc-send-url'),
                insertP2PUrlBtn: document.getElementById('nfc-insert-p2p-url-btn'),
                dropZone: document.getElementById('drop-zone-nfc'),
                fileInput: document.getElementById('file-input-nfc'),
                fileDetails: document.getElementById('nfc-file-details'),
                filename: document.getElementById('nfc-filename'),
                filesize: document.getElementById('nfc-filesize'),
                strategyCard: document.getElementById('nfc-strategy-card'),
                strategyBadge: document.getElementById('nfc-strategy-badge'),
                strategyDesc: document.getElementById('nfc-strategy-desc'),
                writeBtn: document.getElementById('nfc-write-btn'),
                writeBtnText: document.getElementById('nfc-write-btn-text'),
                writeStatus: document.getElementById('nfc-write-status'),
                recvRadar: document.getElementById('nfc-recv-radar'),
                recvStatusTitle: document.getElementById('nfc-recv-status-title'),
                recvStatusDesc: document.getElementById('nfc-recv-status-desc'),
                startScanBtn: document.getElementById('nfc-start-scan-btn'),
                stopScanBtn: document.getElementById('nfc-stop-scan-btn'),
                historySection: document.getElementById('nfc-history-section'),
                recordsCount: document.getElementById('nfc-records-count'),
                clearHistoryBtn: document.getElementById('nfc-clear-history-btn'),
                cardsList: document.getElementById('nfc-cards-list'),
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

            // --- Modals ---
            modal: {
                qrModal: document.getElementById('qr-scanner-modal'),
                qrCloseBtn: document.getElementById('qr-scanner-close-btn'),
                qrVideo: document.getElementById('qr-scanner-video'),
                qrStatus: document.getElementById('qr-scanner-status'),
                // NFC Tap Modal
                nfcModal: document.getElementById('nfc-tap-modal'),
                nfcCloseBtn: document.getElementById('nfc-modal-close-btn'),
                nfcCancelBtn: document.getElementById('nfc-modal-cancel-btn'),
                nfcTitle: document.getElementById('nfc-modal-title'),
                nfcDesc: document.getElementById('nfc-modal-desc'),
                nfcPayloadText: document.getElementById('nfc-modal-payload-text'),
                nfcStatus: document.getElementById('nfc-modal-status'),
                nfcIcon: document.getElementById('nfc-modal-icon'),
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

        // ---- Sub-mode selectors (QRS, Audio, Color) ----

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

        document.querySelectorAll('[data-nfc-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-nfc-mode]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (btn.dataset.nfcMode === 'send') {
                    this.dom.nfc.sendView.classList.remove('hidden');
                    this.dom.nfc.recvView.classList.add('hidden');
                    this._stopNFCScan();
                } else {
                    this.dom.nfc.sendView.classList.add('hidden');
                    this.dom.nfc.recvView.classList.remove('hidden');
                }
            });
        });

        // ---- URL Mode ----
        this._setupDropZone(this.dom.url.dropZone, this.dom.url.fileInput, (file) => this._onFileSelectedURL(file));
        this.dom.url.encryptToggle.addEventListener('change', (e) => {
            this.dom.url.passwordGroup.classList.toggle('hidden', !e.target.checked);
            if (e.target.checked) this.dom.url.password.focus();
        });
        this.dom.url.generateBtn.addEventListener('click', () => this._generateURLLink());
        this.dom.url.copyBtn.addEventListener('click', () => this._copyToClipboard(this.dom.url.shareUrl.value));
        this.dom.url.qrBtn.addEventListener('click', () => this._toggleURLQR());


        // ---- P2P Mode ----
        this._setupDropZone(this.dom.p2p.dropZone, this.dom.p2p.fileInput, null, (files) => this._onFilesSelectedP2P(files));
        this.dom.p2p.encryptToggle.addEventListener('change', (e) => {
            this.dom.p2p.passwordGroup.classList.toggle('hidden', !e.target.checked);
        });
        this.dom.p2p.remotePeerInput?.addEventListener('input', (e) => {
            const val = e.target.value;
            if (val && val.length <= 6 && !val.includes('|') && !val.includes('#')) {
                const upper = val.toUpperCase();
                if (upper !== val) {
                    const pos = e.target.selectionStart;
                    e.target.value = upper;
                    e.target.setSelectionRange(pos, pos);
                }
            }
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
        this.dom.p2p.scanNfcBtn?.addEventListener('click', () => this._startP2PNFCJoin());
        this.dom.p2p.nfcShareBtn?.addEventListener('click', () => this._startP2PNFCShare());
        this.dom.p2p.startSendBtn.addEventListener('click', () => this._startP2PSend());
        this.dom.p2p.sendCopyBtn?.addEventListener('click', () => this._copyToClipboard(this.dom.p2p.sendUrl.value));
        this.dom.p2p.topRoomCode?.addEventListener('click', () => {
            if (this.activeRoomId) this._copyToClipboard(this.activeRoomId);
        });
        this.dom.p2p.heroCopyBtn?.addEventListener('click', () => {
            if (this.activeRoomId) this._copyToClipboard(this.activeRoomId);
        });
        this.dom.p2p.headerRoomPill?.addEventListener('click', () => {
            if (this.activeRoomId) this._copyToClipboard(this.activeRoomId);
        });
        this.dom.p2p.toggleQrBtn?.addEventListener('click', () => {
            this.dom.p2p.qrCollapsible?.classList.toggle('hidden');
        });
        this.dom.p2p.recvIdDisplay?.addEventListener('click', () => {
            if (this.dom.p2p.recvIdDisplay.dataset.peerId) {
                this._copyToClipboard(this.dom.p2p.recvIdDisplay.dataset.peerId);
            }
        });
        this.dom.p2p.disconnectBtn?.addEventListener('click', () => {
            window.p2pEngine.disconnect();
            this.activeRoomId = window.p2pEngine.peerId;
            this.isRoomHost = true;
            this.roomRoster = null;
            this._updateP2PConnectionUI();
        });

        // ---- QR Stream Mode ----
        this._setupDropZone(this.dom.qrs.dropZone, this.dom.qrs.fileInput, (file, isZip, count) => this._onFileSelectedQRS(file, isZip, count));
        this.dom.qrs.encryptToggle.addEventListener('change', (e) => {
            this.dom.qrs.passwordGroup.classList.toggle('hidden', !e.target.checked);
        });
        this.dom.qrs.startBtn.addEventListener('click', () => this._startQRStream());
        this.dom.qrs.stopBtn.addEventListener('click', () => this._stopQRStream());
        this.dom.qrs.recvDownloadBtn?.addEventListener('click', () => this._downloadBlob(this.receivedBlob, this.receivedHeader?.filename));

        // ---- NFC Mode ----
        this._checkNFCCompatibility();

        this.dom.nfc.typeBtns?.forEach(btn => {
            btn.addEventListener('click', () => this._switchNFCPayloadType(btn.dataset.nfcType));
        });

        this.dom.nfc.sendText?.addEventListener('input', () => this._updateNFCTextCapacity());

        this.dom.nfc.encryptToggle?.addEventListener('change', (e) => {
            this.dom.nfc.passwordGroup.classList.toggle('hidden', !e.target.checked);
            if (e.target.checked) this.dom.nfc.password.focus();
        });

        this.dom.nfc.insertP2PUrlBtn?.addEventListener('click', () => {
            const currentRoom = (this.activeRoomId || window.p2pEngine.peerId || '').toUpperCase();
            if (currentRoom) {
                const roomUrl = `${location.origin}${location.pathname}#P2P_RECV|${currentRoom}`;
                this.dom.nfc.sendUrl.value = roomUrl;
                this._showToast('Lien du salon P2P inséré !', 'success');
            } else {
                this._showToast('Salon P2P en cours d\'initialisation...', 'info');
            }
        });

        this._setupDropZone(this.dom.nfc.dropZone, this.dom.nfc.fileInput, (file) => this._onFileSelectedNFC(file));

        this.dom.nfc.writeBtn?.addEventListener('click', () => this._startNFCWrite());
        this.dom.nfc.startScanBtn?.addEventListener('click', () => this._startNFCScan());
        this.dom.nfc.stopScanBtn?.addEventListener('click', () => this._stopNFCScan());
        this.dom.nfc.clearHistoryBtn?.addEventListener('click', () => this._clearNFCHistory());

        // NFC Modal events
        this.dom.modal.nfcCloseBtn?.addEventListener('click', () => this._closeNFCTapModal());
        this.dom.modal.nfcCancelBtn?.addEventListener('click', () => this._closeNFCTapModal());

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

        // Auto-initialize P2P room when entering P2P tab if not connected
        if (tabId === 'tab-p2p' && !window.p2pEngine.isConnected()) {
            this._initP2PConnectionInfo();
        }
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
            this.dom.p2p.remotePeerInput.value = peerId;
            this._connectP2PToPeer(peerId);
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
            str = str.split('|')[1];
        } else if (str.startsWith('BEAM|')) {
            str = str.split('|')[1];
        }
        str = str.trim();
        if (str.length === 6 && /^[a-zA-Z0-9]{6}$/.test(str)) {
            str = str.toUpperCase();
        }
        return str;
    }

    _formatPeerId(id) {
        if (!id) return '';
        return id.length > 8 ? `${id.substring(0, 8)}...` : id;
    }

    _getAnimalPersona(peerId) {
        if (!peerId) {
            return { id: '', name: 'Compagnon Inconnu', animal: 'Compagnon', adjective: 'Inconnu', emoji: '👤', fullName: '👤 Compagnon Inconnu' };
        }

        const cleanId = peerId.trim().toUpperCase();

        const animals = [
            { name: 'Renard', emoji: '🦊' },
            { name: 'Chouette', emoji: '🦉' },
            { name: 'Serpent', emoji: '🐍' },
            { name: 'Loup', emoji: '🐺' },
            { name: 'Faucon', emoji: '🦅' },
            { name: 'Ours', emoji: '🐻' },
            { name: 'Tigre', emoji: '🐯' },
            { name: 'Lion', emoji: '🦁' },
            { name: 'Panda', emoji: '🐼' },
            { name: 'Koala', emoji: '🐨' },
            { name: 'Loutre', emoji: '🦦' },
            { name: 'Hérisson', emoji: '🦔' },
            { name: 'Castor', emoji: '🦫' },
            { name: 'Cerf', emoji: '🦌' },
            { name: 'Dauphin', emoji: '🐬' },
            { name: 'Aigle', emoji: '🦅' },
            { name: 'Lynx', emoji: '🐱' },
            { name: 'Caméléon', emoji: '🦎' },
            { name: 'Écureuil', emoji: '🐿️' },
            { name: 'Corbeau', emoji: '🐦‍⬛' },
            { name: 'Raton', emoji: '🦝' },
            { name: 'Manchot', emoji: '🐧' },
            { name: 'Panthère', emoji: '🐆' },
            { name: 'Gazelle', emoji: '🦌' },
            { name: 'Léopard', emoji: '🐆' },
            { name: 'Hibou', emoji: '🦉' },
            { name: 'Baleine', emoji: '🐋' },
            { name: 'Blaireau', emoji: '🦡' },
            { name: 'Kangourou', emoji: '🦘' },
            { name: 'Flamant', emoji: '🦩' },
            { name: 'Tortue', emoji: '🐢' },
            { name: 'Morse', emoji: '🦭' }
        ];

        const adjectives = [
            'Penseur', 'Sauvage', 'Curieux', 'Malin', 'Audacieux',
            'Rapide', 'Serein', 'Agile', 'Rusé', 'Vaillant',
            'Mystique', 'Silencieux', 'Cosmique', 'Lunaire', 'Solaire',
            'Astral', 'Électrique', 'Patient', 'Invisible', 'Brillant',
            'Noble', 'Vif', 'Éveillé', 'Fidèle', 'Brave',
            'Espiègle', 'Sage', 'Intrépide', 'Flamboyant', 'Zen'
        ];

        let h1 = 5381;
        let h2 = 52711;
        for (let i = 0; i < cleanId.length; i++) {
            const code = cleanId.charCodeAt(i);
            h1 = ((h1 << 5) + h1) ^ code;
            h2 = ((h2 << 5) + h2) ^ (code * (i + 7));
        }

        const animal = animals[Math.abs(h1) % animals.length];
        const adjective = adjectives[Math.abs(h2) % adjectives.length];
        const fullName = `${animal.emoji} ${animal.name} ${adjective}`;

        return {
            id: cleanId,
            name: `${animal.name} ${adjective}`,
            animal: animal.name,
            adjective,
            emoji: animal.emoji,
            fullName
        };
    }

    _renderConnectedPeersList(currentRoom, peers) {
        if (!this.dom.p2p.peersList) return;
        this.dom.p2p.peersList.innerHTML = '';

        const myId = (window.p2pEngine.peerId || '').toUpperCase();
        const roomId = (currentRoom || '').toUpperCase();

        // Unique set of all participants: myself + connected remote peers + room roster
        const allMemberIds = [];
        if (myId) allMemberIds.push(myId);
        peers.forEach(p => {
            const up = (p || '').toUpperCase();
            if (up && !allMemberIds.includes(up)) {
                allMemberIds.push(up);
            }
        });
        if (Array.isArray(this.roomRoster)) {
            this.roomRoster.forEach(r => {
                const up = (r || '').toUpperCase();
                if (up && !allMemberIds.includes(up)) {
                    allMemberIds.push(up);
                }
            });
        }

        // Update count badge
        if (this.dom.p2p.peersCount) {
            this.dom.p2p.peersCount.textContent = allMemberIds.length;
        }

        allMemberIds.forEach(id => {
            const persona = this._getAnimalPersona(id);
            const isSelf = (id === myId);
            const isHost = (id === roomId);

            let badgeText = '';
            if (isSelf && isHost) badgeText = 'Hôte (Vous)';
            else if (isSelf) badgeText = 'Vous';
            else if (isHost) badgeText = 'Hôte';

            const chip = document.createElement('div');
            chip.className = `peer-chip${isSelf ? ' is-self' : ''}${isHost ? ' is-host' : ''}`;

            let topologyBadge = '';
            let latencyBadge = '';
            if (!isSelf) {
                const stats = window.p2pEngine.getPeerStats(id);
                if (stats) {
                    if (stats.isRelay) {
                        topologyBadge = `<span class="peer-topology-badge relay" title="Connexion relayée par TURN (traverse 4G/5G CGNAT, Wi-Fi d'entreprise et pare-feu)">🔄 TURN</span>`;
                    } else if (stats.type === 'host') {
                        topologyBadge = `<span class="peer-topology-badge direct-lan" title="Connexion ultra-rapide sur réseau local (même Wi-Fi ou câble Ethernet)">⚡ LAN</span>`;
                    } else if (stats.type === 'srflx') {
                        topologyBadge = `<span class="peer-topology-badge direct-stun" title="Connexion directe P2P hole-punching (STUN)">🌐 Direct</span>`;
                    } else {
                        topologyBadge = `<span class="peer-topology-badge connecting" title="Négociation du lien réseau...">⏳ ...</span>`;
                    }

                    if (typeof stats.rtt === 'number' && stats.rtt > 0) {
                        latencyBadge = `<span class="peer-latency-badge" title="Latence aller-retour">${stats.rtt}ms</span>`;
                    }
                }
            } else {
                topologyBadge = `<span class="peer-topology-badge self-badge" title="Votre appareil">Local</span>`;
            }

            chip.title = `${persona.fullName} [${id}]${badgeText ? ` • ${badgeText}` : ''}`;
            chip.innerHTML = `
                <span class="peer-emoji">${persona.emoji}</span>
                <span class="peer-name">${persona.name}</span>
                <span class="peer-id-code">${id}</span>
                ${badgeText ? `<span class="peer-badge">${badgeText}</span>` : ''}
                ${topologyBadge}
                ${latencyBadge}
            `;
            this.dom.p2p.peersList.appendChild(chip);
        });
    }

    // ============================================================
    // P2P MODE (Continuous Channel + Multi-File + Auto-Download)
    // ============================================================

    _setupP2PEngineListeners() {
        window.p2pEngine.on('connected', (peerId, isOutbound) => {
            if (isOutbound) {
                this.activeRoomId = peerId;
                this.isRoomHost = false;
            } else if (!this.activeRoomId) {
                this.activeRoomId = window.p2pEngine.peerId;
                this.isRoomHost = true;
            }
            const peerPersona = this._getAnimalPersona(peerId);
            this._updateP2PConnectionUI();
            this._showToast(`${peerPersona.fullName} a rejoint le salon !`, 'success');

            // If we are host, broadcast updated room roster to all connected peers
            if (this.isRoomHost) {
                const roster = [
                    (window.p2pEngine.peerId || '').toUpperCase(),
                    ...window.p2pEngine.getConnectedPeers().map(p => (p || '').toUpperCase())
                ];
                setTimeout(() => {
                    window.p2pEngine.sendMessage({
                        type: '__p2p_room_roster__',
                        roomId: this.activeRoomId,
                        members: roster
                    });
                }, 300);
            }
        });

        window.p2pEngine.on('disconnected', (peerId) => {
            const peerPersona = this._getAnimalPersona(peerId);
            if (!window.p2pEngine.isConnected()) {
                this.activeRoomId = window.p2pEngine.peerId;
                this.isRoomHost = true;
                this.roomRoster = null;
            } else if (this.isRoomHost) {
                const roster = [
                    (window.p2pEngine.peerId || '').toUpperCase(),
                    ...window.p2pEngine.getConnectedPeers().map(p => (p || '').toUpperCase())
                ];
                window.p2pEngine.sendMessage({
                    type: '__p2p_room_roster__',
                    roomId: this.activeRoomId,
                    members: roster
                });
            }
            this._updateP2PConnectionUI();
            this._showToast(`${peerPersona.fullName} a quitté le salon.`, 'info');
        });

        window.p2pEngine.on('topology', (peerId, stats) => {
            // Live update peer topology badge & latency
            const currentRoom = (this.activeRoomId || window.p2pEngine.peerId || '').toUpperCase();
            const peers = window.p2pEngine.getConnectedPeers();
            this._renderConnectedPeersList(currentRoom, peers);
        });

        window.p2pEngine.on('message', (peerId, data) => {
            if (data && data.type === '__p2p_room_roster__') {
                if (Array.isArray(data.members)) {
                    this.roomRoster = data.members;
                    if (data.roomId) this.activeRoomId = data.roomId;
                    this._updateP2PConnectionUI();
                }
            }
        });

        window.p2pEngine.on('meta', (peerId, meta) => {
            this._onP2PMetaReceived(peerId, meta);
        });

        window.p2pEngine.on('progress', (peerId, percent, received, total, speed) => {
            this._onP2PProgressReceived(peerId, percent, received, total, speed);
        });

        window.p2pEngine.on('complete', (peerId, blob, meta) => {
            this._onP2PFileReceived(peerId, blob, meta);
        });

        window.p2pEngine.on('error', (err, peerId) => {
            const idStr = peerId ? ` [${this._getAnimalPersona(peerId).name}]` : '';
            this._showToast(`P2P${idStr}: ` + (err.message || err), 'error');
        });
    }

    _renderRoomQR(url) {
        if (!this.dom.p2p.recvQr || !this.dom.p2p.recvQrcode) return;
        this.dom.p2p.recvQr.classList.remove('hidden');
        this.dom.p2p.recvQrcode.innerHTML = '';
        try {
            const qr = qrcode(0, 'L');
            qr.addData(url);
            qr.make();
            this.dom.p2p.recvQrcode.innerHTML = qr.createImgTag(4, 8);
            const img = this.dom.p2p.recvQrcode.querySelector('img');
            if (img) {
                img.style.width = '100%';
                img.style.height = 'auto';
                img.style.imageRendering = 'pixelated';
            }
        } catch (e) {
            console.error('[P2P] QR render error:', e);
        }
    }

    _updateP2PConnectionUI() {
        const isConnected = window.p2pEngine.isConnected();
        if (isConnected) {
            const peers = window.p2pEngine.getConnectedPeers();
            if (!this.activeRoomId) {
                this.activeRoomId = (!this.isRoomHost && peers.length > 0) ? peers[0] : window.p2pEngine.peerId;
            }

            const currentRoom = (this.activeRoomId || window.p2pEngine.peerId || '').toUpperCase();
            const myId = (window.p2pEngine.peerId || '').toUpperCase();
            const roomUrl = `${location.origin}${location.pathname}#P2P_RECV|${currentRoom}`;
            const hostPersona = this._getAnimalPersona(currentRoom);
            const myPersona = this._getAnimalPersona(myId);

            // 1. Header Room Pill (tout en haut)
            if (this.dom.p2p.headerRoomPill) {
                this.dom.p2p.headerRoomPill.classList.remove('hidden');
                if (this.dom.p2p.headerRoomCode) this.dom.p2p.headerRoomCode.textContent = currentRoom;
                if (this.dom.p2p.headerRoomPersona) this.dom.p2p.headerRoomPersona.textContent = `${myPersona.emoji} ${myPersona.name}`;
            }

            // 2. Top Room Hero Card (tout en haut du tab P2P)
            if (this.dom.p2p.topRoomCode) this.dom.p2p.topRoomCode.textContent = currentRoom;
            if (this.dom.p2p.roomBadgeTitle) this.dom.p2p.roomBadgeTitle.textContent = `SALON EN COURS (${currentRoom})`;
            if (this.dom.p2p.topPersonaEmoji) this.dom.p2p.topPersonaEmoji.textContent = myPersona.emoji;
            if (this.dom.p2p.topPersonaName) this.dom.p2p.topPersonaName.textContent = `${myPersona.name} (Vous)`;
            if (this.dom.p2p.disconnectBtn) this.dom.p2p.disconnectBtn.classList.remove('hidden');

            // Hide the "Rejoindre un salon" input box while connected
            this.dom.p2p.connectBox?.classList.add('hidden');

            const totalParticipants = peers.length + 1;
            const countText = totalParticipants === 1 ? '1 personne connectée' : `${totalParticipants} personnes connectées`;
            if (this.dom.p2p.recvStatus) {
                this.dom.p2p.recvStatus.textContent = `Connecté au salon ${currentRoom} (${hostPersona.name}) — ${countText}`;
            }

            // Render all members of the room as chips with animal avatars
            this._renderConnectedPeersList(currentRoom, peers);

            // Backward compatibility
            if (this.dom.p2p.connectedPeerName) {
                this.dom.p2p.connectedPeerName.textContent = `${currentRoom} (${hostPersona.name})`;
            }
            if (this.dom.p2p.roomTitle) {
                this.dom.p2p.roomTitle.textContent = `Room : ${currentRoom} (${hostPersona.name})`;
            }
            if (this.dom.p2p.recvIdDisplay) {
                this.dom.p2p.recvIdDisplay.textContent = `Room ID: ${currentRoom} (${hostPersona.fullName})`;
                this.dom.p2p.recvIdDisplay.dataset.peerId = currentRoom;
            }
            if (this.dom.p2p.shareLinkBox) {
                this.dom.p2p.shareLinkBox.classList.remove('hidden');
                this.dom.p2p.sendUrl.value = roomUrl;
            }
            this._renderRoomQR(roomUrl);

        } else {
            // Show the "Rejoindre un salon" input box again
            this.dom.p2p.connectBox?.classList.remove('hidden');
            if (this.dom.p2p.disconnectBtn) this.dom.p2p.disconnectBtn.classList.add('hidden');

            // Reset room to our own local peer ID
            this.activeRoomId = (window.p2pEngine.peerId || '').toUpperCase() || null;
            this.isRoomHost = true;

            if (this.activeRoomId) {
                const myUrl = `${location.origin}${location.pathname}#P2P_RECV|${this.activeRoomId}`;
                const myPersona = this._getAnimalPersona(this.activeRoomId);

                // 1. Header Room Pill (tout en haut)
                if (this.dom.p2p.headerRoomPill) {
                    this.dom.p2p.headerRoomPill.classList.remove('hidden');
                    if (this.dom.p2p.headerRoomCode) this.dom.p2p.headerRoomCode.textContent = this.activeRoomId;
                    if (this.dom.p2p.headerRoomPersona) this.dom.p2p.headerRoomPersona.textContent = `${myPersona.emoji} ${myPersona.name}`;
                }

                // 2. Top Room Hero Card (tout en haut du tab P2P)
                if (this.dom.p2p.topRoomCode) this.dom.p2p.topRoomCode.textContent = this.activeRoomId;
                if (this.dom.p2p.roomBadgeTitle) this.dom.p2p.roomBadgeTitle.textContent = 'CODE DE VOTRE SALON P2P';
                if (this.dom.p2p.topPersonaEmoji) this.dom.p2p.topPersonaEmoji.textContent = myPersona.emoji;
                if (this.dom.p2p.topPersonaName) this.dom.p2p.topPersonaName.textContent = `${myPersona.name} (Vous)`;

                if (this.dom.p2p.recvStatus) {
                    this.dom.p2p.recvStatus.textContent = `Vous êtes ${myPersona.fullName} — En attente d'un pair pour se connecter`;
                }

                // Render peers list (which will display self as Hôte)
                this._renderConnectedPeersList(this.activeRoomId, []);

                // Backward compatibility
                if (this.dom.p2p.roomTitle) {
                    this.dom.p2p.roomTitle.textContent = `Votre Salon : ${myPersona.name}`;
                }
                if (this.dom.p2p.recvIdDisplay) {
                    this.dom.p2p.recvIdDisplay.textContent = `Room ID: ${this.activeRoomId} (${myPersona.fullName})`;
                    this.dom.p2p.recvIdDisplay.dataset.peerId = this.activeRoomId;
                }
                if (this.dom.p2p.shareLinkBox) {
                    this.dom.p2p.shareLinkBox.classList.remove('hidden');
                    this.dom.p2p.sendUrl.value = myUrl;
                }
                this._renderRoomQR(myUrl);
            } else if (this.dom.p2p.recvStatus) {
                this.dom.p2p.recvStatus.textContent = 'Initialisation du salon en cours...';
            }
        }
    }

    async _connectP2PToPeer(peerId) {
        if (!peerId) {
            this._showToast('Please enter or scan a Peer ID', 'error');
            return;
        }

        const normalizedId = (peerId.length === 6 && /^[a-zA-Z0-9]{6}$/.test(peerId.trim()))
            ? peerId.trim().toUpperCase()
            : peerId.trim();

        try {
            if (this.dom.p2p.connectBtn) {
                this.dom.p2p.connectBtn.disabled = true;
                this.dom.p2p.connectBtn.textContent = 'Connecting...';
            }
            this._showToast(`Connecting to Room ${this._formatPeerId(normalizedId)}...`, 'info');
            this.activeRoomId = normalizedId;
            this.isRoomHost = false;
            await window.p2pEngine.connectTo(normalizedId);
            this._updateP2PConnectionUI();
        } catch (err) {
            console.error('P2P Connect error:', err);
            this._showToast('Connection failed: ' + err.message, 'error');
            if (!window.p2pEngine.isConnected()) {
                this.activeRoomId = window.p2pEngine.peerId;
                this.isRoomHost = true;
                this._updateP2PConnectionUI();
            }
        } finally {
            if (this.dom.p2p.connectBtn) {
                this.dom.p2p.connectBtn.disabled = false;
                this.dom.p2p.connectBtn.textContent = 'Connect';
            }
        }
    }



    _onFilesSelectedP2P(files) {
        this.selectedP2PFiles = files;
        if (!files || files.length === 0) return;

        this.dom.p2p.fileChips.innerHTML = '';
        let totalSize = 0;
        files.forEach(f => {
            totalSize += f.size;
            const chip = document.createElement('div');
            chip.className = 'file-chip';
            chip.innerHTML = `<span class="chip-name">${f.name}</span><span class="chip-size">${this._formatSize(f.size)}</span>`;
            this.dom.p2p.fileChips.appendChild(chip);
        });

        this.dom.p2p.fileChips.classList.remove('hidden');
        this.dom.p2p.startSendBtn.textContent = files.length === 1 ? '🚀 Send File' : `🚀 Send ${files.length} Files`;

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

    async _initP2PConnectionInfo() {
        if (!this.dom.p2p.recvStatus) return;
        this.dom.p2p.recvStatus.textContent = 'Initialisation du salon...';
        this.dom.p2p.recvQr?.classList.add('hidden');
        this.dom.p2p.recvIdDisplay?.classList.add('hidden');
        this.dom.p2p.shareLinkBox?.classList.add('hidden');

        try {
            const peerId = await window.p2pEngine.init();

            if (!this.activeRoomId || this.isRoomHost) {
                this.activeRoomId = peerId;
                this.isRoomHost = true;
            }

            this._updateP2PConnectionUI();

        } catch (err) {
            this._showToast('Échec initialisation P2P : ' + err.message, 'error');
            if (this.dom.p2p.recvStatus) {
                this.dom.p2p.recvStatus.textContent = 'Échec de l\'initialisation.';
            }
        }
    }

    _onP2PMetaReceived(peerId, meta) {
        this.dom.p2p.recvTransfer.classList.remove('hidden');
        const countLabel = meta.totalFiles > 1 ? `[${meta.fileIndex}/${meta.totalFiles}] ` : '';
        const sender = this._getAnimalPersona(peerId);
        this.dom.p2p.recvProgressText.textContent = `[${sender.name}] Réception ${countLabel}${meta.filename}...`;
        this.dom.p2p.recvProgressFill.style.width = '0%';
    }

    _onP2PProgressReceived(peerId, percent, received, total, speed) {
        const sender = this._getAnimalPersona(peerId);
        this.dom.p2p.recvProgressFill.style.width = `${percent}%`;
        this.dom.p2p.recvProgressText.textContent = `[${sender.name}] ${percent}% — ${this._formatSize(received)} / ${this._formatSize(total)}`;
        this.dom.p2p.recvSpeed.textContent = `${speed} MB/s`;
        this.dom.p2p.recvPercent.textContent = `${percent}%`;
    }

    async _onP2PFileReceived(peerId, blob, meta) {
        this.dom.p2p.recvTransfer.classList.add('hidden');

        const autoDownload = this.dom.p2p.autoDownload ? this.dom.p2p.autoDownload.checked : true;
        const fileId = 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const senderPersona = this._getAnimalPersona(peerId);

        const fileRecord = {
            id: fileId,
            senderId: peerId,
            senderPersona: senderPersona,
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
                        this._showToast(`Déchiffré & téléchargé : ${meta.filename}`, 'success');
                    } else {
                        this._showToast(`Déchiffré : ${meta.filename}`, 'success');
                    }
                } catch (e) {
                    // Session password wrong for this file
                }
            }

            if (!decrypted) {
                this._showToast(`Fichier chiffré reçu de ${senderPersona.name} : ${meta.filename}. Déverrouillez dans la liste.`, 'info');
            }
        } else {
            fileRecord.decryptedBlob = blob;
            if (autoDownload) {
                this._downloadBlob(blob, meta.filename);
                fileRecord.downloaded = true;
                this._showToast(`Téléchargé : ${meta.filename} (de ${senderPersona.name})`, 'success');
            } else {
                this._showToast(`Reçu de ${senderPersona.name} : ${meta.filename}`, 'success');
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
            list.innerHTML = '<p class="text-muted" style="text-align:center; font-size:0.85rem; padding:0.8rem 0;">Salon prêt pour la réception de fichiers.</p>';
            return;
        }

        list.innerHTML = '';
        this.sessionReceivedFiles.forEach(item => {
            const el = document.createElement('div');
            el.className = 'received-item';

            const isReady = Boolean(item.decryptedBlob);
            const icon = item.encrypted && !isReady ? '🔒' : '📄';
            const senderText = item.senderPersona ? ` · Envoyé par ${item.senderPersona.fullName}` : '';

            el.innerHTML = `
                <div class="received-item-info">
                    <span style="font-size:1.2rem;">${icon}</span>
                    <div>
                        <div class="item-name">${item.filename}</div>
                        <div class="item-size">${this._formatSize(item.size)} · ${item.time}${senderText}</div>
                    </div>
                </div>
                <div class="received-item-actions">
                    ${!isReady && item.encrypted ? `
                        <button class="btn secondary small item-unlock-btn" data-id="${item.id}">Déverrouiller</button>
                    ` : `
                        <button class="btn primary small item-download-btn" data-id="${item.id}">
                            ${item.downloaded ? 'Téléchargé ✓' : 'Télécharger'}
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
    // NFC MODE (Tap to Share, Messages, URLs, Files, P2P Bridge)
    // ============================================================

    _checkNFCCompatibility() {
        if (!window.nfcEngine.isSupported()) {
            this.dom.nfc.compatBanner?.classList.remove('hidden');
        } else {
            this.dom.nfc.compatBanner?.classList.add('hidden');
        }
    }

    _switchNFCPayloadType(type) {
        this.activeNFCType = type;
        this.dom.nfc.typeBtns?.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.nfcType === type);
        });

        this.dom.nfc.panelText?.classList.toggle('hidden', type !== 'text');
        this.dom.nfc.panelUrl?.classList.toggle('hidden', type !== 'url');
        this.dom.nfc.panelFile?.classList.toggle('hidden', type !== 'file');

        if (this.dom.nfc.writeBtnText) {
            if (type === 'text') this.dom.nfc.writeBtnText.textContent = 'Écrire le Message sur NFC (Approcher un tag)';
            else if (type === 'url') this.dom.nfc.writeBtnText.textContent = 'Écrire l\'URL sur NFC (Approcher un tag)';
            else if (type === 'file') this.dom.nfc.writeBtnText.textContent = 'Partager le Fichier via NFC (Approcher un tag)';
        }
    }

    _updateNFCTextCapacity() {
        const text = this.dom.nfc.sendText?.value || '';
        const bytes = new TextEncoder().encode(text).length;
        if (this.dom.nfc.textCapacityLabel) {
            this.dom.nfc.textCapacityLabel.textContent = `Taille : ${bytes} octets`;
            if (bytes > 888) {
                this.dom.nfc.textCapacityLabel.style.color = 'var(--accent-red)';
            } else if (bytes > 500) {
                this.dom.nfc.textCapacityLabel.style.color = '#f59e0b';
            } else {
                this.dom.nfc.textCapacityLabel.style.color = 'var(--accent-cyan)';
            }
        }
    }

    _onFileSelectedNFC(file) {
        if (!file) return;
        this.selectedNFCFile = file;

        if (this.dom.nfc.filename) this.dom.nfc.filename.textContent = file.name;
        if (this.dom.nfc.filesize) this.dom.nfc.filesize.textContent = this._formatSize(file.size);
        this.dom.nfc.fileDetails?.classList.remove('hidden');
        this.dom.nfc.strategyCard?.classList.remove('hidden');

        if (file.size <= 2048) {
            if (this.dom.nfc.strategyBadge) {
                this.dom.nfc.strategyBadge.className = 'strategy-badge';
                this.dom.nfc.strategyBadge.textContent = 'Mode Direct NFC (MIME)';
            }
            if (this.dom.nfc.strategyDesc) {
                this.dom.nfc.strategyDesc.textContent = `Ce fichier (${this._formatSize(file.size)}) sera stocké directement dans la mémoire du badge NFC.`;
            }
        } else {
            if (this.dom.nfc.strategyBadge) {
                this.dom.nfc.strategyBadge.className = 'strategy-badge beam';
                this.dom.nfc.strategyBadge.textContent = 'Mode P2P Beam Handshake';
            }
            if (this.dom.nfc.strategyDesc) {
                this.dom.nfc.strategyDesc.textContent = `Ce fichier (${this._formatSize(file.size)}) dépasse la mémoire d'un tag. Le tag servira de clé NFC pour lancer le téléchargement P2P Beam ultra-rapide sans limite de taille !`;
            }
        }
    }

    async _startNFCWrite() {
        if (!window.nfcEngine.isSupported()) {
            this._showToast('Web NFC nécessite Android (Chrome/Edge/Opera via HTTPS).', 'error');
            return;
        }

        const type = this.activeNFCType;
        let payloadPreview = '';

        if (type === 'text') {
            const text = this.dom.nfc.sendText.value.trim();
            if (!text) { this._showToast('Veuillez entrer un message texte.', 'error'); return; }
            if (this.dom.nfc.encryptToggle.checked && !this.dom.nfc.password.value) {
                this._showToast('Veuillez entrer un mot de passe de chiffrement.', 'error');
                return;
            }
            payloadPreview = text.length > 35 ? text.substring(0, 35) + '...' : text;
        } else if (type === 'url') {
            const url = this.dom.nfc.sendUrl.value.trim();
            if (!url) { this._showToast('Veuillez entrer une URL.', 'error'); return; }
            payloadPreview = url;
        } else if (type === 'file') {
            if (!this.selectedNFCFile) { this._showToast('Veuillez choisir un fichier.', 'error'); return; }
            payloadPreview = `${this.selectedNFCFile.name} (${this._formatSize(this.selectedNFCFile.size)})`;
        }

        this._openNFCTapModal({
            title: 'Écrire sur NFC',
            desc: 'Approchez le dos de votre smartphone du badge ou de l\'appareil récepteur...',
            payloadText: payloadPreview,
            icon: '📲',
            statusText: 'Prêt à écrire. Maintenez le contact...'
        });

        try {
            if (type === 'text') {
                const text = this.dom.nfc.sendText.value.trim();
                const encrypt = this.dom.nfc.encryptToggle.checked;
                const password = this.dom.nfc.password.value;
                await window.nfcEngine.writeText(text, { encrypt, password });
            } else if (type === 'url') {
                const url = this.dom.nfc.sendUrl.value.trim();
                await window.nfcEngine.writeUrl(url);
            } else if (type === 'file') {
                const file = this.selectedNFCFile;
                if (file.size <= 2048) {
                    await window.nfcEngine.writeFile(file, { mode: 'direct' });
                } else {
                    const roomId = (this.activeRoomId || window.p2pEngine.peerId || '').toUpperCase();
                    const roomUrl = `${location.origin}${location.pathname}#P2P_RECV|${roomId}`;
                    if (!this.selectedP2PFiles.some(f => f.name === file.name && f.size === file.size)) {
                        this.selectedP2PFiles.push(file);
                        this._renderP2PFileChips();
                        this.dom.p2p.sendOptions?.classList.remove('hidden');
                    }
                    await window.nfcEngine.writeFile(file, { mode: 'beam', beamUrl: roomUrl });
                }
            }

            this._updateNFCTapModalStatus('✅ Données écrites avec succès sur le tag NFC !', 'success');
            this._showToast('Écriture NFC réussie !', 'success');
            setTimeout(() => this._closeNFCTapModal(), 1500);

        } catch (err) {
            if (err.name !== 'AbortError') {
                this._updateNFCTapModalStatus('❌ Erreur d\'écriture : ' + err.message, 'error');
                this._showToast('Erreur NFC: ' + err.message, 'error');
            }
        }
    }

    async _startNFCScan() {
        if (!window.nfcEngine.isSupported()) {
            this._showToast('Web NFC nécessite Android (Chrome/Edge/Opera via HTTPS).', 'error');
            return;
        }

        this.dom.nfc.startScanBtn?.classList.add('hidden');
        this.dom.nfc.stopScanBtn?.classList.remove('hidden');
        if (this.dom.nfc.recvStatusTitle) this.dom.nfc.recvStatusTitle.textContent = 'Lecteur NFC actif';
        if (this.dom.nfc.recvStatusDesc) this.dom.nfc.recvStatusDesc.textContent = 'En attente d\'un tag ou d\'un appareil NFC... Approchez votre smartphone.';

        try {
            await window.nfcEngine.startScan({
                onReading: (data) => this._onNFCReading(data),
                onError: (err) => {
                    this._showToast('Erreur lecture NFC: ' + err.message, 'error');
                    this._stopNFCScan();
                },
                onReadingError: () => {
                    this._showToast('Erreur de lecture du tag NFC (essayez de réapprocher l\'appareil)', 'error');
                }
            });
            this._showToast('Lecteur NFC démarré', 'info');
        } catch (err) {
            this._stopNFCScan();
        }
    }

    _stopNFCScan() {
        window.nfcEngine.stopScan();
        this.dom.nfc.startScanBtn?.classList.remove('hidden');
        this.dom.nfc.stopScanBtn?.classList.add('hidden');
        if (this.dom.nfc.recvStatusTitle) this.dom.nfc.recvStatusTitle.textContent = 'Lecteur NFC en attente';
        if (this.dom.nfc.recvStatusDesc) this.dom.nfc.recvStatusDesc.textContent = 'Cliquez sur Démarrer pour écouter les tags et appareils NFC à proximité.';
    }

    _onNFCReading(data) {
        this._showToast('Données reçues via NFC !', 'success');
        this.nfcHistory.unshift({
            id: 'nfc_' + Date.now(),
            serialNumber: data.serialNumber,
            timestamp: new Date().toLocaleTimeString(),
            records: data.records
        });

        this._renderNFCRecords();
    }

    _renderNFCRecords() {
        const container = this.dom.nfc.cardsList;
        if (!container) return;

        if (this.nfcHistory.length === 0) {
            this.dom.nfc.historySection?.classList.add('hidden');
            container.innerHTML = '';
            return;
        }

        this.dom.nfc.historySection?.classList.remove('hidden');
        if (this.dom.nfc.recordsCount) this.dom.nfc.recordsCount.textContent = this.nfcHistory.length;

        container.innerHTML = '';

        this.nfcHistory.forEach(item => {
            const card = document.createElement('div');
            card.className = 'nfc-record-card';

            let recordsHtml = '';
            item.records.forEach((rec, idx) => {
                if (rec.recordType === 'url') {
                    const isP2P = rec.url.includes('#P2P_RECV|') || rec.url.includes('#BEAM|');
                    recordsHtml += `
                        <div style="margin-top:0.4rem;">
                            <span class="record-badge">🔗 URL NDEF</span>
                            <div class="record-body" style="margin-top:0.3rem;">
                                <a href="${rec.url}" target="_blank" rel="noopener" style="color:var(--accent-cyan); text-decoration:underline;">${rec.url}</a>
                            </div>
                            <div class="record-actions" style="margin-top:0.5rem;">
                                <button class="btn secondary small nfc-copy-url-btn" data-url="${encodeURIComponent(rec.url)}">📋 Copier</button>
                                <a href="${rec.url}" target="_blank" rel="noopener" class="btn primary small">↗ Ouvrir</a>
                                ${isP2P ? `<button class="btn primary small nfc-join-p2p-btn" data-url="${encodeURIComponent(rec.url)}">⚡ Rejoindre le Salon P2P</button>` : ''}
                            </div>
                        </div>
                    `;
                } else if (rec.recordType === 'text') {
                    const isEncrypted = rec.isEncrypted;
                    recordsHtml += `
                        <div style="margin-top:0.4rem;">
                            <span class="record-badge">${isEncrypted ? '🔒 Message Chiffré' : '📝 Texte'}</span>
                            <div class="record-body" id="nfc-text-${item.id}-${idx}" style="margin-top:0.3rem;">${isEncrypted ? 'Contenu chiffré (AES-256-GCM)' : rec.text}</div>
                            <div class="record-actions" style="margin-top:0.5rem;">
                                <button class="btn secondary small nfc-copy-text-btn" data-text="${encodeURIComponent(rec.text)}">📋 Copier</button>
                                ${isEncrypted ? `<button class="btn primary small nfc-decrypt-btn" data-item-id="${item.id}" data-rec-idx="${idx}">🔓 Déchiffrer</button>` : ''}
                            </div>
                        </div>
                    `;
                } else if (rec.recordType === 'mime') {
                    const isJsonMeta = rec.json && rec.json.aether === 'nfc-file';
                    if (isJsonMeta) {
                        recordsHtml += `
                            <div style="margin-top:0.4rem;">
                                <span class="record-badge">📁 Métadonnées Fichier</span>
                                <div class="record-body" style="margin-top:0.3rem;">
                                    <strong>${rec.json.name}</strong> (${this._formatSize(rec.json.size)}) • ${rec.json.type || 'Fichier binaire'}
                                </div>
                            </div>
                        `;
                    } else if (rec.blob) {
                        const fileBlob = rec.blob;
                        recordsHtml += `
                            <div style="margin-top:0.4rem;">
                                <span class="record-badge">📦 Fichier Binaire (MIME)</span>
                                <div class="record-body" style="margin-top:0.3rem;">
                                    Taille: ${this._formatSize(rec.bytes || fileBlob.size)} • Type: ${rec.mediaType || 'application/octet-stream'}
                                </div>
                                <div class="record-actions" style="margin-top:0.5rem;">
                                    <button class="btn primary small nfc-download-blob-btn" data-item-id="${item.id}" data-rec-idx="${idx}">📥 Télécharger le Fichier</button>
                                </div>
                            </div>
                        `;
                    }
                }
            });

            card.innerHTML = `
                <div class="record-header">
                    <span style="font-size:0.75rem; color:var(--text-muted);">Tag UID: <code>${item.serialNumber}</code></span>
                    <span class="record-time">${item.timestamp}</span>
                </div>
                ${recordsHtml}
            `;

            container.appendChild(card);
        });

        // Bind card actions
        container.querySelectorAll('.nfc-copy-url-btn').forEach(btn => {
            btn.onclick = () => this._copyToClipboard(decodeURIComponent(btn.dataset.url));
        });
        container.querySelectorAll('.nfc-copy-text-btn').forEach(btn => {
            btn.onclick = () => this._copyToClipboard(decodeURIComponent(btn.dataset.text));
        });
        container.querySelectorAll('.nfc-join-p2p-btn').forEach(btn => {
            btn.onclick = () => {
                const url = decodeURIComponent(btn.dataset.url);
                const peerId = this._parsePeerIdFromScanned(url);
                if (peerId) {
                    this._switchTab('tab-p2p');
                    this.dom.p2p.remotePeerInput.value = peerId;
                    this._connectP2PToPeer(peerId);
                }
            };
        });
        container.querySelectorAll('.nfc-decrypt-btn').forEach(btn => {
            btn.onclick = () => {
                const itemId = btn.dataset.itemId;
                const recIdx = parseInt(btn.dataset.recIdx);
                const item = this.nfcHistory.find(h => h.id === itemId);
                if (!item || !item.records[recIdx]) return;
                const rec = item.records[recIdx];
                const pw = prompt('Entrez le mot de passe pour déchiffrer le message :');
                if (!pw) return;
                try {
                    const parts = rec.text.split('|');
                    Crypto.decryptBase64(parts[3], pw, parts[1], parts[2]).then(async blob => {
                        const original = await blob.text();
                        const display = document.getElementById(`nfc-text-${itemId}-${recIdx}`);
                        if (display) display.textContent = original;
                        this._showToast('Message déchiffré avec succès !', 'success');
                    }).catch(err => {
                        this._showToast('Échec du déchiffrement — mauvais mot de passe ?', 'error');
                    });
                } catch (e) {
                    this._showToast('Format de chiffrement invalide.', 'error');
                }
            };
        });
        container.querySelectorAll('.nfc-download-blob-btn').forEach(btn => {
            btn.onclick = () => {
                const itemId = btn.dataset.itemId;
                const recIdx = parseInt(btn.dataset.recIdx);
                const item = this.nfcHistory.find(h => h.id === itemId);
                if (!item || !item.records[recIdx]) return;
                const rec = item.records[recIdx];
                // Check if companion meta exists
                const metaRec = item.records.find(r => r.json && r.json.aether === 'nfc-file');
                const filename = metaRec ? metaRec.json.name : `nfc_fichier_${Date.now()}`;
                this._downloadBlob(rec.blob, filename);
                this._showToast(`Téléchargement de ${filename}...`, 'success');
            };
        });
    }

    _clearNFCHistory() {
        this.nfcHistory = [];
        this._renderNFCRecords();
        this._showToast('Historique NFC effacé', 'info');
    }

    // ---- P2P Tap-to-Share and Tap-to-Join ----

    async _startP2PNFCShare() {
        if (!window.nfcEngine.isSupported()) {
            this._showToast('Web NFC nécessite Android (Chrome/Edge/Opera via HTTPS). Utilisez le QR Code !', 'info');
            this.dom.p2p.qrCollapsible?.classList.remove('hidden');
            return;
        }

        const roomId = (this.activeRoomId || window.p2pEngine.peerId || '').toUpperCase();
        if (!roomId) {
            this._showToast('Initialisation du salon P2P en cours...', 'info');
            return;
        }

        const roomUrl = `${location.origin}${location.pathname}#P2P_RECV|${roomId}`;
        const persona = this._getAnimalPersona(roomId);

        this._openNFCTapModal({
            title: 'Tap to Share (NFC)',
            desc: 'Approchez le dos d\'un autre smartphone ou d\'un badge NFC pour transmettre le salon P2P instantanément !',
            payloadText: `Salon ${roomId} (${persona.fullName})`,
            icon: persona.emoji || '🦊',
            statusText: 'En attente du contact NFC...'
        });

        try {
            await window.nfcEngine.writeP2PRoom(roomUrl, roomId);
            this._updateNFCTapModalStatus('✅ Salon P2P partagé par NFC !', 'success');
            this._showToast('Salon partagé via NFC avec succès !', 'success');
            setTimeout(() => this._closeNFCTapModal(), 1500);
        } catch (err) {
            if (err.name !== 'AbortError') {
                this._updateNFCTapModalStatus('❌ Erreur : ' + err.message, 'error');
                this._showToast('Erreur NFC: ' + err.message, 'error');
            }
        }
    }

    async _startP2PNFCJoin() {
        if (!window.nfcEngine.isSupported()) {
            this._showToast('Web NFC nécessite Android (Chrome/Edge/Opera via HTTPS). Utilisez le scanner QR !', 'info');
            this.dom.p2p.scanQrBtn?.click();
            return;
        }

        this._openNFCTapModal({
            title: 'Tap to Join (NFC)',
            desc: 'Approchez votre smartphone de l\'appareil hôte ou d\'un badge NFC pour rejoindre le salon...',
            payloadText: 'Écoute des signaux NFC...',
            icon: '📡',
            statusText: 'En attente de contact NFC...'
        });

        try {
            await window.nfcEngine.startScan({
                onReading: (data) => {
                    let detectedPeerId = null;
                    for (const rec of data.records) {
                        if (rec.recordType === 'url' && rec.url) {
                            const parsed = this._parsePeerIdFromScanned(rec.url);
                            if (parsed) { detectedPeerId = parsed; break; }
                        } else if (rec.recordType === 'text' && rec.text) {
                            if (rec.text.startsWith('AETHER_P2P|')) {
                                detectedPeerId = rec.text.split('|')[1].trim().toUpperCase();
                                break;
                            } else {
                                const parsed = this._parsePeerIdFromScanned(rec.text);
                                if (parsed) { detectedPeerId = parsed; break; }
                            }
                        }
                    }

                    if (detectedPeerId) {
                        window.nfcEngine.stopScan();
                        this._updateNFCTapModalStatus(`🎉 Salon ${detectedPeerId} détecté !`, 'success');
                        this._showToast(`Salon ${detectedPeerId} détecté par NFC !`, 'success');
                        this.dom.p2p.remotePeerInput.value = detectedPeerId;
                        setTimeout(() => {
                            this._closeNFCTapModal();
                            this._connectP2PToPeer(detectedPeerId);
                        }, 800);
                    } else {
                        this._updateNFCTapModalStatus('ℹ️ Tag NFC lu mais aucun salon P2P détecté', 'info');
                    }
                },
                onError: (err) => {
                    if (err.name !== 'AbortError') {
                        this._updateNFCTapModalStatus('❌ Erreur : ' + err.message, 'error');
                    }
                }
            });
        } catch (err) {
            if (err.name !== 'AbortError') {
                this._updateNFCTapModalStatus('❌ Erreur : ' + err.message, 'error');
            }
        }
    }

    // ---- NFC Tap Modal Helpers ----

    _openNFCTapModal({ title, desc, payloadText, icon, statusText }) {
        const m = this.dom.modal;
        if (!m.nfcModal) return;

        if (m.nfcTitle) m.nfcTitle.textContent = title || 'Approchez votre appareil';
        if (m.nfcDesc) m.nfcDesc.textContent = desc || 'Maintenez les appareils proches l\'un de l\'autre...';
        if (m.nfcPayloadText) m.nfcPayloadText.textContent = payloadText || 'Données prêtes';
        if (m.nfcIcon) m.nfcIcon.textContent = icon || '📲';
        if (m.nfcStatus) {
            m.nfcStatus.textContent = statusText || 'En attente de contact NFC...';
            m.nfcStatus.className = 'status-msg info';
        }

        m.nfcModal.classList.remove('hidden');
    }

    _updateNFCTapModalStatus(text, type = 'info') {
        const m = this.dom.modal;
        if (m.nfcStatus) {
            m.nfcStatus.textContent = text;
            m.nfcStatus.className = `status-msg ${type}`;
        }
    }

    _closeNFCTapModal() {
        const m = this.dom.modal;
        if (m.nfcModal) m.nfcModal.classList.add('hidden');
        window.nfcEngine.cancelWrite();
        window.nfcEngine.stopScan();
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
