# AetherShare - Serverless File Sharing

A premium, serverless file sharing application that encodes files directly into the URL. Zero infrastructure, just pure client-side magic.

## 🚀 Features

*   **Serverless**: Files are stored in the URL hash. No database, no backend.
*   **Privacy**: Data never leaves your browser until you share the link.
*   **Compression**:
    *   **Lossless**: Text and binary files are Gzipped automatically.
    *   **Lossy (Optional)**: Images can be optimized (WebP) to fit in smaller URLs.
*   **Security (New!)**:
    *   **Encryption**: Optional AES-GCM encryption. The password protects the file, and the hash contains the salt/IV.
    *   **Client-Side**: Decryption happens entirely in the browser.
*   **Mobile Ready**:
    *   **QR Code**: Generates a QR code instantly for easy sharing to mobile devices.
*   **Advanced Features (Phase 3)**:
    *   **💣 Time Bomb**: Set an expiration time (5m, 1h, 24h). The link becomes invalid after the timer.
    *   **📍 Geo-Lock**: Restrict file access to your current location (5km radius).
    *   **🎨 Vibe Share**: Choose a theme (Cyberpunk, Sunset, Matrix) to style the receiver's experience.
*   **Experimental (Phase 4)**:
    *   **📡 Infinity Beam**: Peer-to-Peer transfer using WebRTC. Unlimited file size, but both sender and receiver must be online.
    *   **🥸 Camouflage Mode**: Disguise the interface as a 'Daily News' blog to hide your activity. Click the article to unlock.
    *   **🎼 Audio Modem**: Transmits the filename via sound waves (FSK Modulation). Includes a basic "Signal Detector" receiver.
*   **Premium UI**: Glassmorphism design with soothing animations.

## 🛠 Usage

### Sending a File
1.  Open `index.html`.
2.  Drag & Drop a file.
3.  (Optional) **Encrypt** or use **Advanced Options**.
4.  Toggle **Infinity Beam** for huge files (P2P).
5.  Click **Generate Link**.

### Camouflage
1.  In Advanced Options, click **Activate Camouflage**.
2.  To reveal the app, click the **News Details** (white box).

### Audio Modem (Listen)
1.  Click **Open Audio Receiver** on the main page.
2.  Allow microphone access.
3.  Click **Start Listening**.  
    *You will see the sound visualizer reacting to frequencies.*
4.  Play the sound from the sender device.
5.  Watch the "Incoming Data Stream" for decoded bits!

### Receiving a File
1.  Open the shared link.
2.  If encrypted, enter the password.
3.  If Geo-Locked, grant location permission.
4.  Click **Download**.

## 🔮 Roadmap (Coming Soon)

*   **💣 Time Bomb**: Links that self-destruct after a set time.
*   **📡 Infinity Beam**: Peer-to-Peer transfer using WebRTC (Unlimited size).
*   **📍 Geo-Lock**: Restrict file access to specific coordinates.
*   **🎨 Vibe Share**: Embed CSS themes into the share link.
*   **📄 Camouflage Mode**: Disguise the UI as a fake news site or blog.
*   **🎼 Audio Modem**: Transmit files via sound waves.

## ⚠️ Limits
*   **URL Length**: Browsers limit URL lengths (approx 2MB safe limit).
*   *Note*: Encryption adds ~30% overhead to the file size in the URL.

## 👨‍💻 Tech Stack
*   **Core**: Vanilla HTML5, CSS3, JavaScript (ES6+).
*   **Crypto**: Web Crypto API (`window.crypto.subtle`).
*   **Libs**: `qrcode.js` (CDN).
