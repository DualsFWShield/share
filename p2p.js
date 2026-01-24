/**
 * AetherShare - Infinity Beam (WebRTC P2P)
 * Uses PeerJS for limitless file transfer.
 */

class P2P {
    constructor() {
        this.peer = null;
        this.conn = null;
        this.peerId = null;
    }

    // Initialize PeerJS (CDN required in index.html)
    async init() {
        if (this.peer) return this.peerId; // Return ID if already init

        return new Promise((resolve, reject) => {
            // Using default PeerJS cloud server (free tier)
            this.peer = new Peer();

            this.peer.on('open', (id) => {
                this.peerId = id;
                console.log('My peer ID is: ' + id);
                resolve(id);
            });

            this.peer.on('error', (err) => {
                console.error("PeerJS Error:", err);
                // Dont reject immediately if it's just a disconnect, try to recover or let UI handle
                if (err.type === 'peer-unavailable') {
                    reject(new Error("Peer unavailable. Try refreshing."));
                } else if (err.type !== 'disconnected') {
                    reject(err);
                }
            });

            this.peer.on('disconnected', () => {
                console.log("Peer Disconnected. Attempting reconnect...");
                this.peer.reconnect();
            });
        });
    }

    // SENDER: Wait for connection
    waitForReceiver(onConnection) {
        if (!this.peer) return;

        // cleanup previous listeners to avoid duplicates if button clicked multiple times
        this.peer.off('connection');

        this.peer.on('connection', (conn) => {
            this.conn = conn;
            console.log("Receiver connected!");

            conn.on('open', () => {
                onConnection();
                // Send metadata first?
            });
        });
    }

    // SENDER: Send file with Chunking (V3)
    async sendFile(file, extraMeta = {}, onProgress) {
        if (!this.conn) return;

        const CHUNK_SIZE = 16 * 1024; // 16KB (Safe for WebRTC)
        const totalSize = file.size;
        const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);

        console.log(`SEND: Starting Chunked Transfer. Size: ${totalSize}, Chunks: ${totalChunks}`);

        // 1. Send Metadata
        this.conn.send({
            type: 'meta',
            filename: file.name,
            size: file.size,
            fileType: file.type,
            totalChunks: totalChunks,
            ...extraMeta
        });

        // 2. Send Chunks
        let offset = 0;
        let chunkIndex = 0;

        while (offset < totalSize) {
            const chunk = file.slice(offset, offset + CHUNK_SIZE);

            this.conn.send({
                type: 'chunk',
                offset: offset,
                data: chunk
            });

            offset += CHUNK_SIZE;
            chunkIndex++;

            // Update Progress
            if (onProgress) {
                const percent = Math.min(100, Math.round((offset / totalSize) * 100));
                onProgress(percent, offset, totalSize);
            }

            // Yield to event loop regularly to prevent UI freeze and allow buffer clear
            // Mobile devices need this to avoid crashing the WebRTC thread
            if (chunkIndex % 50 === 0) await new Promise(r => setTimeout(r, 10));
        }

        console.log("SEND: Transfer Complete.");
    }

    // RECEIVER: Connect to sender
    connect(hostId, onData) {
        if (!this.peer) return;

        this.conn = this.peer.connect(hostId);

        this.conn.on('open', () => {
            console.log("Connected to Sender");
        });

        this.conn.on('data', (data) => {
            onData(data);
        });
    }
}

window.p2p = new P2P();
