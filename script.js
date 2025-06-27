class PhotoApp {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.capturedPhoto = document.getElementById('capturedPhoto');
        this.stream = null;
        this.currentFacingMode = 'environment';
        this.rotation = 0;
        this.flipH = false;
        this.flipV = false;
        this.currentFilter = 'none';
        this.cvRouter = null;
        this.autoScanInterval = null;
        this.isAutoScanning = false;
        
        this.initializeDynamsoft();
        this.initializeEventListeners();
    }

    async initializeDynamsoft() {
        try {
            await Dynamsoft.License.LicenseManager.initLicense("DLS2eyJoYW5kc2hha2VDb2RlIjoiMTA0MjAxNjI2LU1UQTBNakF4TmpJMkxYZGxZaTFVY21saGJGQnliMm8iLCJtYWluU2VydmVyVVJMIjoiaHR0cHM6Ly9tZGxzLmR5bmFtc29mdG9ubGluZS5jb20iLCJvcmdhbml6YXRpb25JRCI6IjEwNDIwMTYyNiIsInN0YW5kYnlTZXJ2ZXJVUkwiOiJodHRwczovL3NkbHMuZHluYW1zb2Z0b25saW5lLmNvbSIsImNoZWNrQ29kZSI6OTY0MDI1ODU3fQ==");
            
            this.cvRouter = await Dynamsoft.CVR.CaptureVisionRouter.createInstance();
            
            console.log('Dynamsoft Barcode Reader initialized successfully');
        } catch (error) {
            console.error('Error initializing Dynamsoft:', error);
        }
    }

    initializeEventListeners() {
        // Camera controls
        document.getElementById('startCamera').addEventListener('click', () => this.startCamera());
        document.getElementById('takePhoto').addEventListener('click', () => this.takePhoto());
        document.getElementById('switchCamera').addEventListener('click', () => this.switchCamera());
        document.getElementById('autoScan').addEventListener('click', () => this.toggleAutoScan());
        
        // Photo operations
        document.getElementById('rotateLeft').addEventListener('click', () => this.rotatePhoto(-90));
        document.getElementById('rotateRight').addEventListener('click', () => this.rotatePhoto(90));
        document.getElementById('flipHorizontal').addEventListener('click', () => this.flipPhoto('horizontal'));
        document.getElementById('flipVertical').addEventListener('click', () => this.flipPhoto('vertical'));
        
        // Filters
        document.getElementById('filterNone').addEventListener('click', () => this.applyFilter('none'));
        document.getElementById('filterGrayscale').addEventListener('click', () => this.applyFilter('grayscale'));
        document.getElementById('filterSepia').addEventListener('click', () => this.applyFilter('sepia'));
        document.getElementById('filterBlur').addEventListener('click', () => this.applyFilter('blur'));
        document.getElementById('filterBright').addEventListener('click', () => this.applyFilter('bright'));
        
        // Actions
        document.getElementById('downloadPhoto').addEventListener('click', () => this.downloadPhoto());
        document.getElementById('newPhoto').addEventListener('click', () => this.newPhoto());
        
        // Barcode scanning
        document.getElementById('scanBarcode').addEventListener('click', () => this.scanBarcode());
        document.getElementById('clearResults').addEventListener('click', () => this.clearBarcodeResults());
    }

    async startCamera() {
        try {
            const startBtn = document.getElementById('startCamera');
            startBtn.innerHTML = '<span class="loading"></span>Łączenie...';
            startBtn.disabled = true;

            const constraints = {
                video: {
                    facingMode: this.currentFacingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            
            this.video.onloadedmetadata = () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
            };

            // Show camera controls
            startBtn.style.display = 'none';
            document.getElementById('takePhoto').style.display = 'inline-block';
            document.getElementById('switchCamera').style.display = 'inline-block';
            document.getElementById('autoScan').style.display = 'inline-block';
            document.getElementById('scanOverlay').style.display = 'block';
            
            // Auto-start scanning
            setTimeout(() => {
                if (!this.isAutoScanning) {
                    this.toggleAutoScan();
                }
            }, 1000);
            
        } catch (error) {
            console.error('Błąd dostępu do kamery:', error);
            alert('Nie można uzyskać dostępu do kamery. Upewnij się, że zezwoliłeś na dostęp do kamery.');
            
            const startBtn = document.getElementById('startCamera');
            startBtn.innerHTML = 'Włącz kamerę';
            startBtn.disabled = false;
        }
    }

    toggleAutoScan() {
        const autoScanBtn = document.getElementById('autoScan');
        
        if (this.isAutoScanning) {
            // Stop auto scanning
            if (this.autoScanInterval) {
                clearInterval(this.autoScanInterval);
                this.autoScanInterval = null;
            }
            this.isAutoScanning = false;
            autoScanBtn.innerHTML = '🔄 Auto-skan: OFF';
            autoScanBtn.className = 'btn btn-warning';
            document.getElementById('liveResults').innerHTML = '';
        } else {
            // Start auto scanning
            this.isAutoScanning = true;
            autoScanBtn.innerHTML = '⏹️ Auto-skan: ON';
            autoScanBtn.className = 'btn btn-success';
            
            this.autoScanInterval = setInterval(() => {
                this.scanCurrentFrame();
            }, 1000); // Skanuj co sekundę
        }
    }

    async scanCurrentFrame() {
        if (!this.cvRouter || !this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
            return;
        }

        try {
            // Capture current frame
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            this.ctx.drawImage(this.video, 0, 0);
            
            // Scan the frame
            const results = await this.cvRouter.capture(this.canvas, 'ReadSingleBarcode');
            this.displayLiveResults(results);
            
        } catch (error) {
            console.error('Błąd auto-skanowania:', error);
        }
    }

    async switchCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        
        this.currentFacingMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';
        await this.startCamera();
    }

    takePhoto() {
        if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            
            this.ctx.drawImage(this.video, 0, 0);
            
            const imageDataUrl = this.canvas.toDataURL('image/jpeg', 0.9);
            this.capturedPhoto.src = imageDataUrl;
            
            // Reset transformations
            this.rotation = 0;
            this.flipH = false;
            this.flipV = false;
            this.currentFilter = 'none';
            this.updatePhotoDisplay();
            
            // Stop auto scanning
            if (this.isAutoScanning) {
                this.toggleAutoScan();
            }
            
            // Show photo section and hide camera
            document.querySelector('.camera-section').style.display = 'none';
            document.querySelector('.photo-section').style.display = 'block';
            
            // Stop camera stream
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
            }
        }
    }

    rotatePhoto(degrees) {
        this.rotation = (this.rotation + degrees) % 360;
        this.updatePhotoDisplay();
    }

    flipPhoto(direction) {
        if (direction === 'horizontal') {
            this.flipH = !this.flipH;
        } else if (direction === 'vertical') {
            this.flipV = !this.flipV;
        }
        this.updatePhotoDisplay();
    }

    applyFilter(filterType) {
        this.currentFilter = filterType;
        
        // Update active filter button
        document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`filter${filterType.charAt(0).toUpperCase() + filterType.slice(1)}`).classList.add('active');
        
        this.updatePhotoDisplay();
    }

    updatePhotoDisplay() {
        let transform = '';
        let filter = '';
        
        // Apply rotation
        if (this.rotation !== 0) {
            transform += `rotate(${this.rotation}deg) `;
        }
        
        // Apply flips
        if (this.flipH) {
            transform += 'scaleX(-1) ';
        }
        if (this.flipV) {
            transform += 'scaleY(-1) ';
        }
        
        // Apply filters
        switch (this.currentFilter) {
            case 'grayscale':
                filter = 'grayscale(100%)';
                break;
            case 'sepia':
                filter = 'sepia(100%)';
                break;
            case 'blur':
                filter = 'blur(2px)';
                break;
            case 'bright':
                filter = 'brightness(150%)';
                break;
            default:
                filter = 'none';
        }
        
        this.capturedPhoto.style.transform = transform;
        this.capturedPhoto.style.filter = filter;
    }

    downloadPhoto() {
        // Create a new canvas to apply all transformations
        const downloadCanvas = document.createElement('canvas');
        const downloadCtx = downloadCanvas.getContext('2d');
        
        // Get original image dimensions
        const img = new Image();
        img.onload = () => {
            downloadCanvas.width = img.width;
            downloadCanvas.height = img.height;
            
            // Apply transformations to context
            downloadCtx.translate(img.width / 2, img.height / 2);
            
            if (this.rotation !== 0) {
                downloadCtx.rotate(this.rotation * Math.PI / 180);
            }
            
            if (this.flipH) {
                downloadCtx.scale(-1, 1);
            }
            
            if (this.flipV) {
                downloadCtx.scale(1, -1);
            }
            
            // Apply filters
            switch (this.currentFilter) {
                case 'grayscale':
                    downloadCtx.filter = 'grayscale(100%)';
                    break;
                case 'sepia':
                    downloadCtx.filter = 'sepia(100%)';
                    break;
                case 'blur':
                    downloadCtx.filter = 'blur(2px)';
                    break;
                case 'bright':
                    downloadCtx.filter = 'brightness(150%)';
                    break;
                default:
                    downloadCtx.filter = 'none';
            }
            
            downloadCtx.drawImage(img, -img.width / 2, -img.height / 2);
            
            // Create download link
            const link = document.createElement('a');
            link.download = `photo_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`;
            link.href = downloadCanvas.toDataURL('image/jpeg', 0.9);
            
            // Add photo description as metadata if available
            const description = document.getElementById('photoDescription').value;
            if (description) {
                // For now, we'll just include it in the filename
                link.download = `photo_${description.slice(0, 20).replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`;
            }
            
            link.click();
        };
        
        img.src = this.capturedPhoto.src;
    }

    newPhoto() {
        // Stop auto scanning if running
        if (this.isAutoScanning) {
            this.toggleAutoScan();
        }
        
        // Hide photo section and show camera section
        document.querySelector('.photo-section').style.display = 'none';
        document.querySelector('.camera-section').style.display = 'block';
        
        // Reset camera controls
        document.getElementById('startCamera').style.display = 'inline-block';
        document.getElementById('takePhoto').style.display = 'none';
        document.getElementById('switchCamera').style.display = 'none';
        document.getElementById('autoScan').style.display = 'none';
        document.getElementById('scanOverlay').style.display = 'none';
        
        // Clear photo description and scan results
        document.getElementById('photoDescription').value = '';
        this.clearBarcodeResults();
        document.getElementById('liveResults').innerHTML = '';
        
        // Reset transformations
        this.rotation = 0;
        this.flipH = false;
        this.flipV = false;
        this.currentFilter = 'none';
        
        // Reset filter buttons
        document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
        document.getElementById('filterNone').classList.add('active');
    }

    async scanBarcode() {
        if (!this.capturedPhoto.src) {
            alert('Najpierw zrób zdjęcie!');
            return;
        }

        if (!this.cvRouter) {
            alert('Barcode Reader nie jest jeszcze gotowy. Spróbuj ponownie za chwilę.');
            return;
        }

        try {
            const scanBtn = document.getElementById('scanBarcode');
            const originalText = scanBtn.innerHTML;
            scanBtn.innerHTML = '<span class="loading"></span>Skanowanie...';
            scanBtn.disabled = true;

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = async () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                try {
                    const results = await this.cvRouter.capture(canvas, 'ReadSingleBarcode');
                    this.displayBarcodeResults(results);
                } catch (error) {
                    console.error('Scanning error:', error);
                    alert('Błąd podczas skanowania: ' + error.message);
                } finally {
                    scanBtn.innerHTML = originalText;
                    scanBtn.disabled = false;
                }
            };
            
            img.onerror = () => {
                alert('Błąd podczas ładowania zdjęcia');
                scanBtn.innerHTML = originalText;
                scanBtn.disabled = false;
            };
            
            img.src = this.capturedPhoto.src;
            
        } catch (error) {
            console.error('Error scanning barcode:', error);
            alert('Błąd podczas skanowania kodu');
            
            const scanBtn = document.getElementById('scanBarcode');
            scanBtn.innerHTML = '🔍 Skanuj kod Aztec';
            scanBtn.disabled = false;
        }
    }

    displayBarcodeResults(results) {
        const resultsContainer = document.getElementById('barcodeResults');
        const scanResults = document.getElementById('scanResults');
        
        if (!results || !results.items || results.items.length === 0) {
            resultsContainer.innerHTML = '<p style="color: #6c757d; font-style: italic; text-align: center; padding: 20px;">Nie znaleziono żadnych kodów na zdjęciu.</p>';
            scanResults.style.display = 'block';
            return;
        }

        let html = '';
        results.items.forEach((item, index) => {
            const confidence = Math.round(item.confidence || 0);
            html += `
                <div class="barcode-result">
                    <div class="confidence">${confidence}%</div>
                    <div class="format">Format: ${item.formatString || 'Unknown'}</div>
                    <div class="text">${this.escapeHtml(item.text || '')}</div>
                </div>
            `;
        });
        
        resultsContainer.innerHTML = html;
        scanResults.style.display = 'block';
        
        document.getElementById('photoDescription').value = results.items[0].text || '';
    }

    clearBarcodeResults() {
        document.getElementById('scanResults').style.display = 'none';
        document.getElementById('barcodeResults').innerHTML = '';
        document.getElementById('vehicleData').style.display = 'none';
        document.getElementById('vehicleInfo').innerHTML = '';
    }

    displayLiveResults(results) {
        const liveResultsContainer = document.getElementById('liveResults');
        
        if (!results || !results.items || results.items.length === 0) {
            liveResultsContainer.innerHTML = '<div style="color: #ccc; font-style: italic;">Skanowanie...</div>';
            return;
        }

        let html = '';
        results.items.forEach((item, index) => {
            if (index < 3) { // Pokazuj maksymalnie 3 wyniki na żywo
                const confidence = Math.round(item.confidence || 0);
                
                // Try to decode Polish vehicle registration data
                const vehicleData = this.tryDecodeVehicleData(item.text);
                
                html += `
                    <div class="live-result">
                        <div class="confidence">${confidence}%</div>
                        <div class="format">${item.formatString || 'Unknown'}</div>
                        <div>${this.escapeHtml(item.text?.substring(0, 50) || '')}${item.text?.length > 50 ? '...' : ''}</div>
                        ${vehicleData ? `<div style="color: #20c997; font-size: 10px; margin-top: 3px;">🚗 ${vehicleData.registrationNumber || 'Pojazd wykryty'}</div>` : ''}
                    </div>
                `;
            }
        });
        
        liveResultsContainer.innerHTML = html;
        
        // Auto-display vehicle data if found
        if (results.items.length > 0) {
            const vehicleData = this.tryDecodeVehicleData(results.items[0].text);
            if (vehicleData) {
                this.displayVehicleData(vehicleData);
            }
        }
    }

    tryDecodeVehicleData(rawText) {
        try {
            // Format DBR result (remove prefix if present)
            let cleanedText = rawText;
            if (cleanedText.includes(' ')) {
                cleanedText = cleanedText.split(' ')[1];
            }
            
            return this.decodePolishVehicleData(cleanedText);
        } catch (error) {
            console.log('Not a Polish vehicle registration code:', error.message);
            return null;
        }
    }

    decodePolishVehicleData(aztecData) {
        try {
            // Step 1: Base64 decode
            const binaryString = atob(aztecData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Step 2: Skip first 4 bytes and try basic decompression
            // Since UCL decompression is complex, we'll try a simpler approach first
            const dataWithoutHeader = bytes.slice(4);
            
            // Try to decompress with pako (fallback)
            let decompressed;
            try {
                decompressed = pako.inflate(dataWithoutHeader, {to: 'string'});
            } catch (e) {
                // If pako fails, try raw interpretation
                decompressed = new TextDecoder('utf-16le').decode(dataWithoutHeader);
            }
            
            // Step 3: Parse the pipe-separated data
            const parts = decompressed.split('|');
            if (parts.length < 66) {
                throw new Error(`Invalid data format: expected at least 66 parts, got ${parts.length}`);
            }
            
            // Step 4: Map to structured data
            return this.mapVehicleFields(parts);
            
        } catch (error) {
            throw new Error(`Failed to decode vehicle data: ${error.message}`);
        }
    }

    mapVehicleFields(parts) {
        const fieldMapping = {
            7: "registrationNumber",
            8: "brand",
            9: "type", 
            10: "variant",
            11: "version",
            12: "model",
            13: "vin",
            14: "certificateReleaseDate",
            15: "validity",
            16: "holderFullName",
            17: "holderFirstName", 
            18: "holderLastName",
            19: "holderName",
            20: "holderPesel",
            21: "holderZipCode",
            22: "holderCity",
            24: "holderStreetName",
            25: "holderHouseNumber",
            26: "holderApartmentNumber",
            27: "ownerFullName",
            28: "ownerFirstName",
            29: "ownerLastName", 
            30: "ownerName",
            31: "ownerPesel",
            32: "ownerZipCode",
            33: "ownerCity",
            35: "ownerStreetName",
            36: "ownerHouseNumber",
            37: "ownerApartmentNumber",
            38: "vehicleMaxTotalWeight",
            39: "vehicleAllowedTotalWeight",
            40: "vehicleCombinationAllowedTotalWeight",
            41: "vehicleWeight",
            42: "vehicleCategory",
            43: "approvalCertificateNumber",
            44: "axlesNumber",
            45: "trailerMaxWeightWithBrakes",
            46: "trailerMaxWeightWithoutBrakes",
            47: "powerToWeightRatio",
            48: "engineCapacity",
            49: "enginePower",
            50: "fuelType",
            51: "firstRegistrationDate",
            52: "numberOfSeats",
            53: "numberOfStandingPlaces",
            54: "vehicleType",
            55: "purpose",
            56: "productionYear",
            57: "allowedPackageWeight",
            58: "maxAllowedAxlePressure",
            59: "vehicleCardNumber"
        };
        
        const mappedData = {};
        for (const [index, fieldName] of Object.entries(fieldMapping)) {
            mappedData[fieldName] = parts[parseInt(index)] || '';
        }
        
        return mappedData;
    }

    displayVehicleData(vehicleData) {
        const vehicleDataSection = document.getElementById('vehicleData');
        const vehicleInfoContainer = document.getElementById('vehicleInfo');
        
        const html = `
            <div class="vehicle-info-grid">
                <div class="vehicle-section">
                    <h5>🚗 Pojazd</h5>
                    <div class="vehicle-field">
                        <span class="label">Nr rejestracyjny:</span>
                        <span class="value">${vehicleData.registrationNumber || '-'}</span>
                    </div>
                    <div class="vehicle-field">
                        <span class="label">Marka:</span>
                        <span class="value">${vehicleData.brand || '-'}</span>
                    </div>
                    <div class="vehicle-field">
                        <span class="label">Model:</span>
                        <span class="value">${vehicleData.model || '-'}</span>
                    </div>
                    <div class="vehicle-field">
                        <span class="label">VIN:</span>
                        <span class="value">${vehicleData.vin || '-'}</span>
                    </div>
                    <div class="vehicle-field">
                        <span class="label">Rok produkcji:</span>
                        <span class="value">${vehicleData.productionYear || '-'}</span>
                    </div>
                </div>
                
                <div class="vehicle-section">
                    <h5>🔧 Dane techniczne</h5>
                    <div class="vehicle-field">
                        <span class="label">Kategoria:</span>
                        <span class="value">${vehicleData.vehicleCategory || '-'}</span>
                    </div>
                    <div class="vehicle-field">
                        <span class="label">Masa pojazdu:</span>
                        <span class="value">${vehicleData.vehicleWeight || '-'} kg</span>
                    </div>
                    <div class="vehicle-field">
                        <span class="label">Pojemność silnika:</span>
                        <span class="value">${vehicleData.engineCapacity || '-'} cm³</span>
                    </div>
                    <div class="vehicle-field">
                        <span class="label">Moc silnika:</span>
                        <span class="value">${vehicleData.enginePower || '-'} kW</span>
                    </div>
                    <div class="vehicle-field">
                        <span class="label">Rodzaj paliwa:</span>
                        <span class="value">${vehicleData.fuelType || '-'}</span>
                    </div>
                </div>
                
                <div class="vehicle-section">
                    <h5>👤 Właściciel</h5>
                    <div class="vehicle-field">
                        <span class="label">Imię i nazwisko:</span>
                        <span class="value">${vehicleData.ownerFullName || '-'}</span>
                    </div>
                    <div class="vehicle-field">
                        <span class="label">PESEL:</span>
                        <span class="value">${vehicleData.ownerPesel || '-'}</span>
                    </div>
                    <div class="vehicle-field">
                        <span class="label">Miasto:</span>
                        <span class="value">${vehicleData.ownerCity || '-'}</span>
                    </div>
                    <div class="vehicle-field">
                        <span class="label">Kod pocztowy:</span>
                        <span class="value">${vehicleData.ownerZipCode || '-'}</span>
                    </div>
                </div>
                
                <div class="vehicle-section">
                    <h5>📋 Posiadacz</h5>
                    <div class="vehicle-field">
                        <span class="label">Imię i nazwisko:</span>
                        <span class="value">${vehicleData.holderFullName || '-'}</span>
                    </div>
                    <div class="vehicle-field">
                        <span class="label">PESEL:</span>
                        <span class="value">${vehicleData.holderPesel || '-'}</span>
                    </div>
                    <div class="vehicle-field">
                        <span class="label">Miasto:</span>
                        <span class="value">${vehicleData.holderCity || '-'}</span>
                    </div>
                    <div class="vehicle-field">
                        <span class="label">Kod pocztowy:</span>
                        <span class="value">${vehicleData.holderZipCode || '-'}</span>
                    </div>
                </div>
            </div>
        `;
        
        vehicleInfoContainer.innerHTML = html;
        vehicleDataSection.style.display = 'block';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new PhotoApp();
});

// Service Worker Registration (for offline functionality)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}