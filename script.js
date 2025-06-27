class PhotoApp {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.capturedPhoto = document.getElementById('capturedPhoto');
        this.stream = null;
        this.currentFacingMode = 'user';
        this.rotation = 0;
        this.flipH = false;
        this.flipV = false;
        this.currentFilter = 'none';
        this.cvRouter = null;
        this.cameraEnhancer = null;
        this.isScanning = false;
        
        this.initializeDynamsoft();
        this.initializeEventListeners();
    }

    async initializeDynamsoft() {
        try {
            await Dynamsoft.License.LicenseManager.initLicense("DLS2eyJoYW5kc2hha2VDb2RlIjoiMTA0MjAxNjI2LU1UQTBNakF4TmpJMkxYZGxZaTFVY21saGJGQnliMm8iLCJtYWluU2VydmVyVVJMIjoiaHR0cHM6Ly9tZGxzLmR5bmFtc29mdG9ubGluZS5jb20iLCJvcmdhbml6YXRpb25JRCI6IjEwNDIwMTYyNiIsInN0YW5kYnlTZXJ2ZXJVUkwiOiJodHRwczovL3NkbHMuZHluYW1zb2Z0b25saW5lLmNvbSIsImNoZWNrQ29kZSI6OTY0MDI1ODU3fQ==");
            
            this.cvRouter = await Dynamsoft.CVR.CaptureVisionRouter.createInstance();
            this.cameraEnhancer = await Dynamsoft.DCE.CameraEnhancer.createInstance();
            
            this.cvRouter.setInput(this.cameraEnhancer);
            
            this.cvRouter.addResultReceiver({
                onCapturedResultReceived: (result) => {
                    this.displayLiveResults(result);
                }
            });
            
            console.log('Dynamsoft Barcode Reader initialized successfully');
        } catch (error) {
            console.error('Error initializing Dynamsoft:', error);
        }
    }

    initializeEventListeners() {
        // Camera controls
        document.getElementById('startCamera').addEventListener('click', () => this.startLiveScanning());
        document.getElementById('stopScanning').addEventListener('click', () => this.stopLiveScanning());
        document.getElementById('takePhoto').addEventListener('click', () => this.takePhoto());
        document.getElementById('switchCamera').addEventListener('click', () => this.switchCamera());
        
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

    async startLiveScanning() {
        if (!this.cvRouter || !this.cameraEnhancer) {
            alert('Skaner nie jest jeszcze gotowy. Spróbuj ponownie za chwilę.');
            return;
        }

        try {
            const startBtn = document.getElementById('startCamera');
            startBtn.innerHTML = '<span class="loading"></span>Uruchamianie...';
            startBtn.disabled = true;

            await this.cameraEnhancer.open();
            
            this.cameraEnhancer.getUIElement().style.width = '100%';
            this.cameraEnhancer.getUIElement().style.height = 'auto';
            this.cameraEnhancer.getUIElement().style.borderRadius = '10px';
            
            document.querySelector('.camera-container').appendChild(this.cameraEnhancer.getUIElement());
            
            this.video.style.display = 'none';
            
            await this.cvRouter.startCapturing('ReadSingleBarcode');
            this.isScanning = true;
            
            document.getElementById('scanOverlay').style.display = 'block';
            
            startBtn.style.display = 'none';
            document.getElementById('stopScanning').style.display = 'inline-block';
            document.getElementById('switchCamera').style.display = 'inline-block';
            document.getElementById('takePhoto').style.display = 'inline-block';
            
        } catch (error) {
            console.error('Błąd uruchamiania skanera:', error);
            alert('Nie można uruchomić skanera. Sprawdź dostęp do kamery.');
            
            const startBtn = document.getElementById('startCamera');
            startBtn.innerHTML = 'Włącz skaner';
            startBtn.disabled = false;
        }
    }

    async stopLiveScanning() {
        try {
            if (this.cvRouter && this.isScanning) {
                await this.cvRouter.stopCapturing();
                this.isScanning = false;
            }
            
            if (this.cameraEnhancer) {
                await this.cameraEnhancer.close();
                const uiElement = this.cameraEnhancer.getUIElement();
                if (uiElement && uiElement.parentNode) {
                    uiElement.parentNode.removeChild(uiElement);
                }
            }
            
            this.video.style.display = 'block';
            document.getElementById('scanOverlay').style.display = 'none';
            document.getElementById('liveResults').innerHTML = '';
            
            document.getElementById('startCamera').style.display = 'inline-block';
            document.getElementById('stopScanning').style.display = 'none';
            document.getElementById('switchCamera').style.display = 'none';
            document.getElementById('takePhoto').style.display = 'none';
            
        } catch (error) {
            console.error('Błąd zatrzymywania skanera:', error);
        }
    }

    async switchCamera() {
        if (this.isScanning && this.cameraEnhancer) {
            try {
                const cameras = await this.cameraEnhancer.getAllCameras();
                if (cameras.length > 1) {
                    const currentCamera = this.cameraEnhancer.getSelectedCamera();
                    const nextCameraIndex = (cameras.findIndex(cam => cam.deviceId === currentCamera.deviceId) + 1) % cameras.length;
                    await this.cameraEnhancer.selectCamera(cameras[nextCameraIndex]);
                }
            } catch (error) {
                console.error('Błąd przełączania kamery:', error);
            }
        }
    }

    async takePhoto() {
        if (this.isScanning && this.cameraEnhancer) {
            try {
                const frame = this.cameraEnhancer.fetchImage();
                this.capturedPhoto.src = frame.toCanvas().toDataURL('image/jpeg', 0.9);
                
                // Reset transformations
                this.rotation = 0;
                this.flipH = false;
                this.flipV = false;
                this.currentFilter = 'none';
                this.updatePhotoDisplay();
                
                // Stop scanning and show photo section
                await this.stopLiveScanning();
                document.querySelector('.camera-section').style.display = 'none';
                document.querySelector('.photo-section').style.display = 'block';
                
            } catch (error) {
                console.error('Błąd robienia zdjęcia:', error);
                alert('Nie można zrobić zdjęcia');
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
        // Hide photo section and show camera section
        document.querySelector('.photo-section').style.display = 'none';
        document.querySelector('.camera-section').style.display = 'block';
        
        // Reset camera controls
        document.getElementById('startCamera').style.display = 'inline-block';
        document.getElementById('stopScanning').style.display = 'none';
        document.getElementById('takePhoto').style.display = 'none';
        document.getElementById('switchCamera').style.display = 'none';
        
        // Clear photo description and scan results
        document.getElementById('photoDescription').value = '';
        this.clearBarcodeResults();
        
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
                html += `
                    <div class="live-result">
                        <div class="confidence">${confidence}%</div>
                        <div class="format">${item.formatString || 'Unknown'}</div>
                        <div>${this.escapeHtml(item.text?.substring(0, 50) || '')}${item.text?.length > 50 ? '...' : ''}</div>
                    </div>
                `;
            }
        });
        
        liveResultsContainer.innerHTML = html;
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