/**
 * AetherShare — P2P Engine (WebRTC via PeerJS)
 * Supports Sender-first and Receiver-first modes.
 * Chunked binary streaming with backpressure control.
 */

class P2PEngine {
    constructor() {
        this.peer = null;
        this.conn = null;
        this.peerId = null;
        this._initPromise = null;

        // Transfer state
        this.incomingFile = null;
    }

    /**
     * Initialize PeerJS and get a peer ID.
     * @returns {Promise<string>} The assigned peer ID.
     */
    async init() {
        if (this._initPromise) return this._initPromise;

        this._initPromise = new Promise((resolve, reject) => {
            const config = {
                debug: 1,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        { urls: 'stun:stun2.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' },
                        { urls: 'stun:stun.services.mozilla.com' }
                    ]
                }
            };

            this.peer = new Peer(config);

            this.peer.on('open', (id) => {
                this.peerId = id;
                console.log('[P2P] My peer ID:', id);
                resolve(id);
            });

            this.peer.on('error', (err) => {
                console.error('[P2P] PeerJS Error:', err);
                if (err.type === 'browser-incompatible' || err.type === 'invalid-id' || err.type === 'unavailable-id') {
                    this._initPromise = null;
                    reject(err);
                }
            });

            this.peer.on('disconnected', () => {
                console.log('[P2P] Disconnected. Reconnecting...');
                try { this.peer.reconnect(); } catch (e) { console.error(e); }
            });
        });

        return this._initPromise;
    }

    /**
     * Generate a receiver-first URL hash.
     * The receiver waits; the sender connects to this ID.
     * @returns {string} URL hash fragment like P2P_RECV|{peerId}
     */
    getReceiverHash() {
        return `P2P_RECV|${this.peerId}`;
    }

    /**
     * Generate a sender-first URL hash.
     * @param {File} file - The file being sent.
     * @returns {string} URL hash fragment.
     */
    getSenderHash(file) {
        const safeName = encodeURIComponent(file.name);
        return `BEAM|${this.peerId}|${safeName}|${file.size}`;
    }

    // =====================================================
    // RECEIVER-FIRST MODE
    // =====================================================

    /**
     * Wait for an incoming connection (Receiver-first mode).
     * @param {Object} callbacks
     * @param {Function} callbacks.onConnected - Called when sender connects.
     * @param {Function} callbacks.onMeta - Called with file metadata {filename, size, fileType, encrypted, salt, iv}.
     * @param {Function} callbacks.onProgress - Called with (percent, receivedBytes, totalBytes, speedMBps).
     * @param {Function} callbacks.onComplete - Called with final Blob.
     * @param {Function} callbacks.onError - Called with error.
     */
    waitForSender({ onConnected, onMeta, onProgress, onComplete, onError }) {
        if (!this.peer) { onError?.(new Error('Peer not initialized')); return; }

        this.peer.off('connection');
        this.peer.on('connection', (conn) => {
            this.conn = conn;
            console.log('[P2P] Sender connected');

            conn.on('open', () => {
                onConnected?.();
                this._setupReceiver(conn, { onMeta, onProgress, onComplete, onError });
            });

            conn.on('error', (err) => {
                console.error('[P2P] Connection error:', err);
                onError?.(err);
            });
        });
    }

    // =====================================================
    // SENDER-FIRST MODE (Legacy + improved)
    // =====================================================

    /**
     * Wait for a receiver to connect (Sender-first mode).
     * @param {Object} callbacks
     * @param {Function} callbacks.onReceiverConnected - Called when receiver connects.
     * @param {Function} callbacks.onError - Called with error.
     */
    waitForReceiver({ onReceiverConnected, onError }) {
        if (!this.peer) { onError?.(new Error('Peer not initialized')); return; }

        this.peer.off('connection');
        this.peer.on('connection', (conn) => {
            this.conn = conn;
            console.log('[P2P] Receiver connected');

            conn.on('open', () => {
                onReceiverConnected?.();
            });

            conn.on('error', (err) => {
                console.error('[P2P] Sender-mode error:', err);
                onError?.(err);
            });

            conn.on('close', () => {
                console.log('[P2P] Connection closed');
            });
        });
    }

    // =====================================================
    // CONNECT TO PEER (Sender connecting to Receiver's ID)
    // =====================================================

    /**
     * Connect to a remote peer (for sender connecting to receiver-first peer).
     * @param {string} remotePeerId - The remote peer ID.
     * @returns {Promise<void>} Resolves when connection is open.
     */
    async connectTo(remotePeerId) {
        if (!this.peer) throw new Error('Peer not initialized');

        return new Promise((resolve, reject) => {
            console.log('[P2P] Connecting to peer:', remotePeerId);
            this.conn = this.peer.connect(remotePeerId, { reliable: true });

            const timeout = setTimeout(() => {
                reject(new Error('Connection timeout (30s)'));
            }, 30000);

            this.conn.on('open', () => {
                clearTimeout(timeout);
                console.log('[P2P] Connected to receiver');
                resolve();
            });

            this.conn.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }

    /**
     * Connect to a remote peer and listen for data (Receiver connecting to Sender in sender-first mode).
     * @param {string} remotePeerId
     * @param {Object} callbacks - { onMeta, onProgress, onComplete, onError }
     */
    connectAndReceive(remotePeerId, { onMeta, onProgress, onComplete, onError }) {
        if (!this.peer) { onError?.(new Error('Peer not initialized')); return; }

        console.log('[P2P] Connecting to sender:', remotePeerId);
        this.conn = this.peer.connect(remotePeerId, { reliable: true });

        this.conn.on('open', () => {
            console.log('[P2P] Connected to sender');
            this._setupReceiver(this.conn, { onMeta, onProgress, onComplete, onError });
        });

        this.conn.on('error', (err) => {
            console.error('[P2P] Receiver connect error:', err);
            onError?.(err);
        });

        this.conn.on('close', () => {
            console.log('[P2P] Connection closed (receiver)');
        });
    }

    // =====================================================
    // SEND FILE (Chunked with backpressure)
    // =====================================================

    /**
     * Send a file over the established connection.
     * @param {File} file - File to send.
     * @param {Object} meta - Extra metadata (encrypted, salt, iv, etc.).
     * @param {Function} onProgress - Callback (percent, sentBytes, totalBytes, speedMBps).
     * @returns {Promise<void>}
     */
    async sendFile(file, meta = {}, onProgress) {
        if (!this.conn) throw new Error('No connection established');

        const CHUNK_SIZE = 16 * 1024; // 16KB per chunk
        const totalSize = file.size;
        const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
        const startTime = Date.now();

        console.log(`[P2P] SEND: ${file.name} (${totalSize} bytes, ${totalChunks} chunks)`);

        // 1. Send metadata
        this.conn.send({
            type: 'meta',
            filename: file.name,
            size: file.size,
            fileType: file.type || 'application/octet-stream',
            totalChunks,
            ...meta
        });

        // 2. Send chunks with backpressure
        const arrayBuffer = await file.arrayBuffer();
        let offset = 0;
        let chunkIndex = 0;

        while (offset < totalSize) {
            const end = Math.min(offset + CHUNK_SIZE, totalSize);
            const chunk = arrayBuffer.slice(offset, end);

            this.conn.send({
                type: 'chunk',
                index: chunkIndex,
                data: chunk
            });

            offset = end;
            chunkIndex++;

            // Calculate progress & speed
            const elapsed = (Date.now() - startTime) / 1000;
            const percent = Math.min(100, Math.round((offset / totalSize) * 100));
            const speedMBps = elapsed > 0 ? ((offset / (1024 * 1024)) / elapsed).toFixed(2) : '—';

            onProgress?.(percent, offset, totalSize, speedMBps);

            // Backpressure: yield every 30 chunks or if buffer is high
            if (chunkIndex % 30 === 0) {
                // Check bufferedAmount if available (DataChannel)
                const dc = this.conn?.dataChannel;
                if (dc && dc.bufferedAmount > 1024 * 1024) {
                    // Wait for buffer to drain
                    await new Promise(resolve => {
                        const check = () => {
                            if (!dc || dc.bufferedAmount < 256 * 1024) {
                                resolve();
                            } else {
                                setTimeout(check, 20);
                            }
                        };
                        check();
                    });
                } else {
                    await new Promise(r => setTimeout(r, 5));
                }
            }
        }

        console.log('[P2P] SEND: Transfer complete');
    }

    // =====================================================
    // INTERNAL: Setup receiver data handler
    // =====================================================

    /** @private */
    _setupReceiver(conn, { onMeta, onProgress, onComplete, onError }) {
        this.incomingFile = {
            chunks: [],
            receivedSize: 0,
            totalSize: 0,
            meta: null,
            startTime: 0,
            initialized: false
        };

        conn.on('data', (data) => {
            try {
                if (data.type === 'meta') {
                    this.incomingFile.meta = data;
                    this.incomingFile.totalSize = data.size;
                    this.incomingFile.startTime = Date.now();
                    this.incomingFile.initialized = true;

                    console.log('[P2P] RECV META:', data);
                    onMeta?.({
                        filename: data.filename,
                        size: data.size,
                        fileType: data.fileType,
                        encrypted: data.encrypted,
                        salt: data.salt,
                        iv: data.iv
                    });
                }
                else if (data.type === 'chunk') {
                    if (!this.incomingFile.initialized) {
                        console.warn('[P2P] Received chunk before meta');
                        return;
                    }

                    const chunkData = data.data;
                    this.incomingFile.chunks.push(chunkData);

                    const chunkSize = chunkData.byteLength || chunkData.size || 0;
                    this.incomingFile.receivedSize += chunkSize;

                    const elapsed = (Date.now() - this.incomingFile.startTime) / 1000;
                    const percent = Math.min(100, Math.round(
                        (this.incomingFile.receivedSize / this.incomingFile.totalSize) * 100
                    ));
                    const speedMBps = elapsed > 0
                        ? ((this.incomingFile.receivedSize / (1024 * 1024)) / elapsed).toFixed(2)
                        : '—';

                    onProgress?.(percent, this.incomingFile.receivedSize, this.incomingFile.totalSize, speedMBps);

                    // Check completion
                    if (this.incomingFile.receivedSize >= this.incomingFile.totalSize) {
                        console.log('[P2P] RECV: Transfer complete');

                        const finalBlob = new Blob(this.incomingFile.chunks, {
                            type: this.incomingFile.meta.fileType || 'application/octet-stream'
                        });

                        // Cleanup chunks from memory
                        this.incomingFile.chunks = [];

                        onComplete?.(finalBlob, this.incomingFile.meta);
                    }
                }
            } catch (err) {
                console.error('[P2P] Data handler error:', err);
                onError?.(err);
            }
        });

        conn.on('close', () => {
            if (this.incomingFile?.initialized && this.incomingFile.receivedSize < this.incomingFile.totalSize) {
                onError?.(new Error('Connection closed before transfer completed'));
            }
        });
    }

    /**
     * Destroy peer and cleanup.
     */
    destroy() {
        if (this.conn) {
            try { this.conn.close(); } catch (e) { /* ignore */ }
            this.conn = null;
        }
        if (this.peer) {
            try { this.peer.destroy(); } catch (e) { /* ignore */ }
            this.peer = null;
        }
        this.peerId = null;
        this._initPromise = null;
        this.incomingFile = null;
    }
}

window.p2pEngine = new P2PEngine();
