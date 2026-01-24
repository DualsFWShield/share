/**
 * AetherChat - P2P Public Lobby
 * Uses a Star Topology where the first user becomes the Host.
 */

class AetherChat {
    constructor() {
        this.LOBBY_ID = 'dualsfwshield-lobby-v1';
        this.peer = null;
        this.connections = {}; // Host: all clients. Client: host conn.
        this.isHost = false;
        this.nickname = localStorage.getItem('aether_nick') || 'Anon';

        this.dom = {
            btn: document.getElementById('chat-fab'),
            panel: document.getElementById('chat-panel'),
            close: document.getElementById('chat-close'),
            msgs: document.getElementById('chat-messages'),
            input: document.getElementById('chat-input'),
            send: document.getElementById('chat-send'),
            status: document.getElementById('chat-status'),
            count: document.getElementById('chat-count')
        };

        if (this.dom.btn) this.initUI();
    }

    initUI() {
        this.dom.btn.addEventListener('click', () => {
            this.dom.panel.classList.remove('hidden');
            this.dom.btn.classList.add('hidden');
            this.connect(); // Connect only when opened to save resources? Or auto? Let's connect on open.
        });

        this.dom.close.addEventListener('click', () => {
            this.dom.panel.classList.add('hidden');
            this.dom.btn.classList.remove('hidden');
        });

        this.dom.send.addEventListener('click', () => this.sendMessage());
        this.dom.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Set nick if first time
        if (localStorage.getItem('aether_nick') === null) {
            const nick = prompt("Choose a nickname for the lobby:", this.nickname);
            if (nick) {
                this.nickname = nick;
                localStorage.setItem('aether_nick', nick);
            }
        }
    }

    async connect() {
        if (this.peer) return; // Already connected logic could be added here

        this.dom.status.innerText = "Connecting...";

        // Try to be Host first
        try {
            // We try to instantiate using the specific LOBBY_ID
            const potentialHost = new Peer(this.LOBBY_ID);

            potentialHost.on('open', (id) => {
                // Success! We are the Host.
                this.isHost = true;
                this.peer = potentialHost;
                this.dom.status.innerText = "Hosting Lobby";
                this.setupHostEvents();
                this.addSystemMessage("You are the Host. Anyone can join.");
            });

            potentialHost.on('error', (err) => {
                if (err.type === 'unavailable-id') {
                    // ID taken, so Host exists. Join as Client.
                    console.log("Lobby ID taken, joining as Client...");
                    this.joinAsClient();
                } else {
                    console.error("Chat Error:", err);
                    this.dom.status.innerText = "Error";
                }
            });

        } catch (e) {
            console.error(e);
        }
    }

    joinAsClient() {
        this.peer = new Peer(); // Random ID
        this.isHost = false;

        this.peer.on('open', (id) => {
            this.dom.status.innerText = "Joining...";
            const conn = this.peer.connect(this.LOBBY_ID);

            conn.on('open', () => {
                this.connections['host'] = conn;
                this.dom.status.innerText = "Connected to Lobby";
                this.addSystemMessage("Joined the lobby.");

                // Send "Join" packet
                conn.send({ type: 'join', nick: this.nickname });
            });

            conn.on('data', (data) => this.handleData(data));

            conn.on('close', () => {
                this.dom.status.innerText = "Disconnected";
                this.addSystemMessage("Host disconnected. Reload to claim Host.");
                this.peer.destroy();
                this.peer = null;
            });
        });
    }

    setupHostEvents() {
        this.peer.on('connection', (conn) => {
            conn.on('open', () => {
                // Wait for 'join' msg to register nick
            });

            conn.on('data', (data) => {
                if (data.type === 'join') {
                    conn.nick = data.nick || 'Anon';
                    this.connections[conn.peer] = conn;
                    this.broadcast({ type: 'system', text: `${conn.nick} joined.` });
                    this.updateCount();
                } else if (data.type === 'chat') {
                    // Relay to everyone including sender (to confirm receipt/order)
                    // Actually usually sender shows immediately, but for consistency let's broadcast.
                    // Or echoing back.
                    this.broadcast(data); // Simple relay
                }
            });

            conn.on('close', () => {
                const nick = conn.nick || 'Anon';
                delete this.connections[conn.peer];
                this.broadcast({ type: 'system', text: `${nick} left.` });
                this.updateCount();
            });
        });
    }

    handleData(data) {
        if (data.type === 'chat') {
            this.addMessage(data.sender, data.text, data.sender === this.nickname);
        } else if (data.type === 'system') {
            this.addSystemMessage(data.text);
        } else if (data.type === 'count') {
            this.dom.count.innerText = `${data.count} Online`;
        }
    }

    sendMessage() {
        const text = this.dom.input.value.trim();
        if (!text) return;

        const msgPacket = {
            type: 'chat',
            sender: this.nickname,
            text: text,
            timestamp: Date.now()
        };

        if (this.isHost) {
            // I am host, broadcast my own message
            this.activeBroadcast(msgPacket); // Don't send back to connection list, I am source
            this.addMessage("Me", text, true);
        } else {
            // Client, send to host
            if (this.connections['host']) {
                this.connections['host'].send(msgPacket);
                // Optimistic UI? Or wait for echo?
                // Let's optimistic for better feel, but handle dupes if echoed? 
                // Host logic above "broadcast(data)" sends to *everyone* in connection list. 
                // Since I am a client, I am in that list. The host will reflect my message back to me.
                // So I should effectively wait for echo OR filter my own ID?
                // Simplest: Host sends to All-Except-Sender? 
                // Let's do: Host sends to ALL. Client ignores message if sender === self.
            }
        }
        this.dom.input.value = '';
    }

    // Host: Send to ALL clients
    broadcast(data) {
        Object.values(this.connections).forEach(conn => {
            if (conn.open) conn.send(data);
        });
        // If I am host, I also process it
        if (data.type === 'chat' && data.sender !== this.nickname) {
            this.addMessage(data.sender, data.text, false);
        }
    }

    // Host: Broadcast my own message to others
    activeBroadcast(data) {
        Object.values(this.connections).forEach(conn => {
            if (conn.open) conn.send(data);
        });
    }

    updateCount() {
        // Host only
        const count = Object.keys(this.connections).length + 1; // Clients + Host
        this.dom.count.innerText = `${count} Online`;
        this.broadcast({ type: 'count', count: count });
    }

    addMessage(sender, text, isMe) {
        if (isMe === false && sender === this.nickname) return; // Ignore echo if I already showed it

        const div = document.createElement('div');
        div.className = `chat-msg ${isMe ? 'me' : 'other'}`;
        div.innerHTML = `<strong>${isMe ? 'Me' : sender}:</strong> ${this.escapeHtml(text)}`;
        this.dom.msgs.appendChild(div);
        this.dom.msgs.scrollTop = this.dom.msgs.scrollHeight;
    }

    addSystemMessage(text) {
        const div = document.createElement('div');
        div.className = 'chat-msg system';
        div.innerText = text;
        this.dom.msgs.appendChild(div);
        this.dom.msgs.scrollTop = this.dom.msgs.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.innerText = text;
        return div.innerHTML;
    }
}

// Init when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for other scripts?
    setTimeout(() => {
        window.chat = new AetherChat();
    }, 1000);
});
