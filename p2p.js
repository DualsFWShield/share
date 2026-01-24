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

    // SENDER: Send file
    sendFile(file, extraMeta = {}) {
        if (!this.conn) return;

        console.log("SEND: Sending File Meta...");

        // 1. Send Metadata (small JSON)
        this.conn.send({
            type: 'meta',
            filename: file.name,
            size: file.size,
            fileType: file.type,
            ...extraMeta
        });

        // 2. Send Raw Data (Binary)
        console.log("SEND: Sending Raw Blob...");
        this.conn.send(file);
        // PeerJS handles simple Blobs efficiently (no serialization if passed directly)
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
