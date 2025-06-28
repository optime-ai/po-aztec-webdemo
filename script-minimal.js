class MinimalScanner {
    constructor() {
        this.video = document.getElementById('video');
        this.cvRouter = null;
        this.autoScanInterval = null;
        this.isScanning = false;
        
        this.initializeDynamsoft();
        this.initializeEventListeners();
    }

    async initializeDynamsoft() {
        try {
            await Dynamsoft.License.LicenseManager.initLicense("DLS2eyJoYW5kc2hha2VDb2RlIjoiMTA0MjAxNjI2LU1UQTBNakF4TmpJMkxYZGxZaTFVY21saGJGQnliMm8iLCJtYWluU2VydmVyVVJMIjoiaHR0cHM6Ly9tZGxzLmR5bmFtc29mdG9ubGluZS5jb20iLCJvcmdhbml6YXRpb25JRCI6IjEwNDIwMTYyNiIsInN0YW5kYnlTZXJ2ZXJVUkwiOiJodHRwczovL3NkbHMuZHluYW1zb2Z0b25saW5lLmNvbSIsImNoZWNrQ29kZSI6OTY0MDI1ODU3fQ==");
            this.cvRouter = await Dynamsoft.CVR.CaptureVisionRouter.createInstance();
            console.log('Scanner initialized');
        } catch (error) {
            console.error('Initialization error:', error);
        }
    }

    initializeEventListeners() {
        document.getElementById('startCamera').addEventListener('click', () => this.startScanning());
    }

    async startScanning() {
        try {
            const startBtn = document.getElementById('startCamera');
            startBtn.style.display = 'none';

            // Start camera
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            this.video.srcObject = stream;
            
            // Show overlay
            document.getElementById('scanOverlay').style.display = 'block';
            
            // Start auto scanning after 1 second
            setTimeout(() => {
                this.isScanning = true;
                this.autoScanInterval = setInterval(() => {
                    this.scanFrame();
                }, 500); // Scan every 0.5 seconds
            }, 1000);
            
        } catch (error) {
            console.error('Camera error:', error);
            alert('Nie można uruchomić kamery');
        }
    }

    async scanFrame() {
        if (!this.cvRouter || !this.video.readyState === 4) return;

        try {
            const canvas = document.createElement('canvas');
            canvas.width = this.video.videoWidth;
            canvas.height = this.video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(this.video, 0, 0);
            
            const results = await this.cvRouter.capture(canvas, 'ReadSingleBarcode');
            this.displayResults(results);
            
        } catch (error) {
            console.error('Scan error:', error);
        }
    }

    displayResults(results) {
        const liveResultsContainer = document.getElementById('liveResults');
        
        if (!results || !results.items || results.items.length === 0) {
            liveResultsContainer.innerHTML = '<div style="color: #ccc;">Skanowanie...</div>';
            return;
        }

        // Found code!
        const item = results.items[0];
        const confidence = Math.round(item.confidence || 0);
        
        // Check if it's a vehicle code
        if (item.text && item.text.startsWith('uQQAA')) {
            // Stop scanning
            if (this.autoScanInterval) {
                clearInterval(this.autoScanInterval);
                this.autoScanInterval = null;
            }
            
            // Display success
            liveResultsContainer.innerHTML = `
                <div style="background: #28a745; color: white; padding: 20px; border-radius: 8px; text-align: center;">
                    <h2 style="margin: 0;">✅ ODCZYTANO POMYŚLNIE!</h2>
                    <p style="margin: 10px 0 0 0;">Kod Aztec został zeskanowany</p>
                    <p style="margin: 5px 0; font-size: 12px;">Pewność: ${confidence}%</p>
                </div>
            `;
            
            // Optional: show raw code
            console.log('Scanned code:', item.text);
            
        } else {
            // Show what was scanned
            liveResultsContainer.innerHTML = `
                <div class="live-result">
                    <div>Format: ${item.formatString || 'Unknown'}</div>
                    <div style="font-size: 10px;">${item.text?.substring(0, 50)}...</div>
                </div>
            `;
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new MinimalScanner();
});