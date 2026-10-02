# 🌌 AetherShare | Serverless Omnishare

> **Peer-to-Peer, NFC & Optical Multi-Vector Data Transfer Engine**  
> 100% Client-Side • Zero Backend • End-to-End Encrypted • Static GitHub Pages Ready

---

## ⚡ Overview

**AetherShare** is a zero-infrastructure, multi-modal data transmission platform operating entirely within the browser. It enables secure, serverless data exchange across physical and network vectors using: **Direct WebRTC P2P (Multi-Peer Mesh + NFC Tap-to-Share)**, **Web NFC (Direct Messages, URLs, Files & P2P Bridge)**, **URL Hash Encoding**, and **Animated QR Code Streams (TXQR)**.

Every single transmission mode includes native **AES-256-GCM End-to-End Encryption** with client-side PBKDF2 key derivation.

---

## 🚀 The Transmission Vectors

### 1. ⚡ P2P Beam (WebRTC Multi-Peer Mesh)
* **Mechanism**: Direct browser-to-browser WebRTC data pipe powered by PeerJS.
* **📲 Tap to Share & Tap to Connect (NFC)**:
  * Simply touch two NFC-enabled Android devices together to share or join a P2P room instantly.
* **Integrated In-Browser QR Scanner**:
  * Scan the room's QR code directly with your device's camera.
* **Persistent Open Mesh Channel**:
  * The WebRTC data connection remains open indefinitely. Send as many files as you want consecutively without reconnecting or renegotiating.
* **Multi-File Batch Transfer**:
  * Drop or select multiple files simultaneously; they stream sequentially with per-file progress, speed metrics, and completion notifications.
* **Default Auto-Download & Session History**:
  * Incoming files trigger automated browser downloads by default (toggleable).
  * Session history lists every received file with re-download and password unlock options.

### 2. 📲 Web NFC (Tap-to-Share & NDEF Engine)
* **Mechanism**: Browser-native NFC read and write capabilities using the W3C Web NFC API (`NDEFReader`).
* **Tap to Share in P2P**:
  * Broadcast your room code and direct join link via NFC contact.
* **Direct Messages & Notes**:
  * Write encrypted (AES-256-GCM) or plain text records to any physical NFC tag (NTAG213, NTAG215, NTAG216, etc.) or peer smartphone.
* **Universal URLs**:
  * Standard NDEF URL records that any phone (Android or iPhone) opens immediately on tap without even having the app open.
* **Intelligent File Transmission**:
  * **Direct MIME storage**: Small files (vCards, images, tokens, configs <= 2 KB) are written directly into NFC tag memory.
  * **P2P Beam Handshake**: Larger files (PDFs, videos, archives, gigabytes) automatically bridge into an instant P2P Beam transfer on tap.
* **Live NFC Scanner**:
  * Reads NDEF records, displays tag UID, decodes URLs, decrypts secret messages, and extracts binary files.

### 3. 🔗 URL Hash Mode
* **Mechanism**: Compresses (Gzip) and encodes files directly into the URL hash fragment (`#AETHER|...`).
* **Serverless Guarantee**: The hash fragment is never sent to the server in HTTP requests.
* **Payload**: Ideal for documents, keys, credentials, and small files up to ~2 MB.
* **Security**: Optional AES-256-GCM encryption where the password never leaves the browser.

### 4. 📱 Animated QR Stream (TXQR)
* **Mechanism**: Air-gapped optical transfer via high-speed animated QR code sequences.
* **Protocol**: `TXQ1` chunked protocol with frame index, total count, and checksum verification.
* **Air-Gap Capability**: Transmit files between two devices without Wi-Fi, Bluetooth, or cellular networks.
* **Features**:
  * Configurable frame rate (5 to 30 FPS).
  * Real-time camera scanner (`jsQR`) showing received chunk map, remaining frames, and missing segment recovery.
  * Encrypted payload support (`ENC|salt|iv|filename`).

---

## 🔒 End-to-End Encryption (E2EE)

All 5 modes support native client-side AES-GCM encryption:
- **Algorithm**: AES-256-GCM with authenticated tags.
- **Key Derivation**: PBKDF2 (100,000 iterations, SHA-256, random 16-byte salt).
- **Initialization Vector**: Unique cryptographically secure 12-byte IV per transmission.
- **Zero Knowledge**: Passwords and decrypted data are never stored or transmitted over any network unencrypted.

---

## 🧰 Advanced Features

* **💣 Time Bomb**: Ephemeral links with configurable expiration timestamps (5m, 1h, 24h).
* **📍 Geo-Lock**: Restrict decryption strictly to a verified geographic radius (HTML5 Geolocation).
* **🎨 Vibe Share**: Embed visual themes into links (Cyberpunk, Sunset, Matrix, Minimal).
* **🥸 Camouflage Mode**: Instant stealth disguise turning the interface into an interactive corporate spreadsheet (`Shift + Escape` or Camouflage button).

---

## 📖 Quick Start & Usage

### Running Locally
No build step or Node.js server required. Simply open `index.html` in any modern web browser:

```bash
# Using Python (optional local server)
python3 -m http.server 8080

# Or using Node.js npx serve
npx serve .
```

Or open `index.html` directly via the file protocol (`file:///...`).

### Deploying to GitHub Pages
1. Push the repository to GitHub.
2. Go to **Settings > Pages**.
3. Set source branch to `main` (or `master`) and folder to `/ (root)`.
4. Your serverless AetherShare instance is live!

---

## 🛠 Tech Stack & Dependencies

* **Core**: Pure Vanilla HTML5, modern CSS3 (Glassmorphism & Neon HUD), modern ES2025+ JavaScript.
* **Cryptography**: Web Crypto API (`window.crypto.subtle`).
* **Compression**: Native `CompressionStream` (Gzip/Deflate) with `JSZip` fallback.
* **WebRTC**: [PeerJS](https://peerjs.com/) for P2P connection brokering.
* **Acoustic Modem**: [ggwave](https://github.com/ggerganov/ggwave) (WebAssembly audio DSP).
* **Computer Vision & QR**:
  * [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) for dynamic QR rendering.
  * [jsQR](https://github.com/cozmo/jsQR) for real-time camera QR decoding.

---

## ⚠️ Limitations & Best Practices

| Mode | Recommended Max Size | Channel Requirement | Air-Gapped? |
| :--- | :--- | :--- | :--- |
| **URL Hash** | ≤ 2 MB | Browser URL length limit | ❌ (requires sharing link) |
| **P2P Beam** | **Unlimited** (GBs+) | WebRTC (Direct connection) | ❌ (local network or Internet) |
| **QR Stream** | ~100 KB - 500 KB | Optical line-of-sight | ✅ **100% Air-Gapped** |
| **Audio** | Short texts / Keys / Tokens | Audio speakers & microphone | ✅ **100% Air-Gapped** |
| **Color Stream** | Short payloads | Optical line-of-sight | ✅ **100% Air-Gapped** |

---

## 📄 License

MIT License. Open source and free for personal and commercial use.
