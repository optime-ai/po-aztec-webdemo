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
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Camera controls
        document.getElementById('startCamera').addEventListener('click', () => this.startCamera());
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
            
        } catch (error) {
            console.error('Błąd dostępu do kamery:', error);
            alert('Nie można uzyskać dostępu do kamery. Upewnij się, że zezwoliłeś na dostęp do kamery.');
            
            const startBtn = document.getElementById('startCamera');
            startBtn.innerHTML = 'Włącz kamerę';
            startBtn.disabled = false;
        }
    }

    async switchCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        
        this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
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
        // Hide photo section and show camera section
        document.querySelector('.photo-section').style.display = 'none';
        document.querySelector('.camera-section').style.display = 'block';
        
        // Reset camera controls
        document.getElementById('startCamera').style.display = 'inline-block';
        document.getElementById('takePhoto').style.display = 'none';
        document.getElementById('switchCamera').style.display = 'none';
        
        // Clear photo description
        document.getElementById('photoDescription').value = '';
        
        // Reset transformations
        this.rotation = 0;
        this.flipH = false;
        this.flipV = false;
        this.currentFilter = 'none';
        
        // Reset filter buttons
        document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
        document.getElementById('filterNone').classList.add('active');
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