/**
 * Web Bluetooth Engine for AetherShare
 * Allows discovery and connection to nearby BLE devices to send/receive small payloads.
 * Note: Browser-to-browser BLE is limited because browsers typically cannot act as GATT servers.
 * This implementation acts as a GATT Client, expecting a compatible GATT Server peer (e.g., a native app).
 */

class BluetoothEngine {
    constructor() {
        this.serviceUuid = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
        this.characteristicUuid = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
        
        this.device = null;
        this.server = null;
        this.characteristic = null;
        
        this.onMessage = null;
        this.onError = null;
        this.onStatus = null;
    }

    _status(msg) {
        if (this.onStatus) this.onStatus(msg);
        console.log('[Bluetooth]', msg);
    }

    _error(err) {
        if (this.onError) this.onError(err);
        console.error('[Bluetooth Error]', err);
    }

    async connectAndSend(text) {
        try {
            if (!navigator.bluetooth) {
                throw new Error("Web Bluetooth API is not supported in this browser.");
            }

            this._status('Requesting Bluetooth Device...');
            this.device = await navigator.bluetooth.requestDevice({
                filters: [{ services: [this.serviceUuid] }],
                optionalServices: [this.serviceUuid]
            });

            this.device.addEventListener('gattserverdisconnected', () => {
                this._status('Device disconnected');
            });

            this._status('Connecting to GATT Server...');
            this.server = await this.device.gatt.connect();

            this._status('Getting Service...');
            const service = await this.server.getPrimaryService(this.serviceUuid);

            this._status('Getting Characteristic...');
            this.characteristic = await service.getCharacteristic(this.characteristicUuid);

            this._status('Sending Data...');
            const encoder = new TextEncoder();
            const data = encoder.encode(text);
            
            // Send in chunks if payload is large (BLE MTU limits)
            const chunkSize = 20; 
            for (let i = 0; i < data.length; i += chunkSize) {
                const chunk = data.slice(i, i + chunkSize);
                await this.characteristic.writeValue(chunk);
            }

            this._status('Message sent successfully!');
            
        } catch (error) {
            this._error(error.message);
        }
    }

    async startListening() {
        try {
            if (!navigator.bluetooth) {
                throw new Error("Web Bluetooth API is not supported in this browser.");
            }

            this._status('Requesting Bluetooth Device to listen...');
            this.device = await navigator.bluetooth.requestDevice({
                filters: [{ services: [this.serviceUuid] }]
            });

            this._status('Connecting to GATT Server...');
            this.server = await this.device.gatt.connect();

            this._status('Getting Service...');
            const service = await this.server.getPrimaryService(this.serviceUuid);

            this._status('Getting Characteristic...');
            this.characteristic = await service.getCharacteristic(this.characteristicUuid);

            this._status('Starting Notifications...');
            await this.characteristic.startNotifications();

            let buffer = '';
            this.characteristic.addEventListener('characteristicvaluechanged', (event) => {
                const decoder = new TextDecoder();
                const value = decoder.decode(event.target.value);
                buffer += value;
                
                // Assuming newline delimited or simple streaming for now
                if (this.onMessage) {
                    this.onMessage(buffer);
                    // Reset buffer if needed based on protocol
                }
            });

            this._status('Listening for incoming messages...');
            
        } catch (error) {
            this._error(error.message);
        }
    }

    disconnect() {
        if (this.device && this.device.gatt.connected) {
            this.device.gatt.disconnect();
            this._status('Disconnected');
        }
    }
}

window.bluetoothEngine = new BluetoothEngine();
