# 🌌 AetherShare | Serverless Omnishare

> **Air-gapped, Peer-to-Peer & Acoustic Multi-Vector Data Transfer Engine**  
> 100% Client-Side • Zero Backend • End-to-End Encrypted • Static GitHub Pages Ready

---

## ⚡ Overview

**AetherShare** is a zero-infrastructure, multi-modal data transmission platform operating entirely within the browser. It enables secure, serverless data exchange across physical and network air-gaps using five independent transmission vectors: **URL Hash Encoding**, **Direct WebRTC P2P (Receiver-First & Sender-First)**, **Animated QR Code Streams (TXQR)**, **Acoustic Modem (ggwave WASM)**, and **High-Frequency Color Streams**.

Every single transmission mode includes native **AES-256-GCM End-to-End Encryption** with client-side PBKDF2 key derivation.

---

## 🚀 The 5 Transmission Vectors

### 1. 🔗 URL Hash Mode
* **Mechanism**: Compresses (Gzip) and encodes files directly into the URL hash fragment (`#AETHER|...`).
* **Serverless Guarantee**: The hash fragment is never sent to the server in HTTP requests.
* **Payload**: Ideal for documents, keys, credentials, and small files up to ~2 MB.
* **Security**: Optional AES-256-GCM encryption where the password never leaves the browser.

### 2. ⚡ P2P Beam (WebRTC)
* **Mechanism**: Direct browser-to-browser WebRTC data pipe powered by PeerJS.
* **Integrated In-Browser QR Scanner**:
  * Scan the Receiver's QR code or Sender's QR code directly with your device's camera inside the web app.
* **Persistent Open Channel**:
  * The WebRTC data connection remains open indefinitely. Send as many files as you want consecutively without reconnecting or renegotiating.
* **Multi-File Batch Transfer**:
  * Drop or select multiple files simultaneously; they stream sequentially with per-file progress, speed metrics, and completion notifications.
* **Default Auto-Download & Session History**:
  * Incoming files trigger automated browser downloads by default (toggleable).
  * Session history lists every received file with re-download and password unlock options.
* **Receiver-First & Sender-First Handshake**:
  * Instant room QR pairing with full AES-256-GCM chunk-level encryption.

### 3. 📱 Animated QR Stream (TXQR)
* **Mechanism**: Air-gapped optical transfer via high-speed animated QR code sequences.
* **Protocol**: `TXQ1` chunked protocol with frame index, total count, and checksum verification.
* **Air-Gap Capability**: Transmit files between two devices without Wi-Fi, Bluetooth, or cellular networks.
* **Features**:
  * Configurable frame rate (5 to 30 FPS).
  * Real-time camera scanner (`jsQR`) showing received chunk map, remaining frames, and missing segment recovery.
  * Encrypted payload support (`ENC|salt|iv|filename`).

### 4. 🔊 Audio Modem (ggwave)
* **Mechanism**: Acoustic data transmission over sound waves using the **ggwave** WebAssembly DSP library.
* **Frequencies**: Audible (standard acoustic tones) or inaudible Ultrasound (15-20 kHz).
* **Capabilities**:
  * Send text messages, passwords, or tokens across rooms through device speakers.
  * Real-time spectrum audio visualizer and microphone audio processing.
  * Encrypted transmission format (`AENC|salt|iv|payload`) decoded on reception.

### 5. 🌈 Color Stream
* **Mechanism**: High-speed visual data transmission modulating RGB color frames on screen.
* **Encoding**: 4-color palette (2 bits per frame) with alternating synchronization pulses.
* **Receiver**: Live camera-based color detector with state machine for frame capture and packet reconstruction.
* **Security**: Encrypted payload support (`CENC|salt|iv|payload`).

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
