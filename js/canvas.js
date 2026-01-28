// Canvas module - handles image display and drawing
const Canvas = {
    canvas: null,
    ctx: null,
    image: null,
    scale: 1,
    baseScale: 1,  // Scale to fit image in container
    zoomLevel: 1,  // User zoom multiplier
    offsetX: 0,
    offsetY: 0,
    panX: 0,       // Pan offset for zoomed view
    panY: 0,

    // Grid settings
    showGrid: false,
    gridSpacingX: 10,  // Grid spacing in data units (e.g., 10 months)
    gridSpacingY: 0.1, // Grid spacing in data units (e.g., 0.1 survival)

    // Digitization mode: 'manual' or 'auto'
    digitizeMode: 'manual',

    // Dragging state
    isDragging: false,
    isPanning: false,
    lastPanX: 0,
    lastPanY: 0,
    dragPoint: null,
    dragCurve: null,

    // Initialize canvas
    init() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Set up event listeners
        this.canvas.addEventListener('click', this.handleClick.bind(this));
        this.canvas.addEventListener('contextmenu', this.handleRightClick.bind(this));
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));

        // Mouse wheel zoom
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });

        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.image) this.fitImage();
        });
    },

    // Load image onto canvas
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.image = img;
                this.fitImage();
                resolve(img);
            };
            img.onerror = reject;
            img.src = src;
        });
    },

    // Fit image to canvas container
    fitImage() {
        if (!this.image) return;

        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        const containerWidth = Math.floor(rect.width);
        const containerHeight = Math.floor(rect.height) || 500; // Fallback height

        // Calculate base scale to fit image
        const scaleX = containerWidth / this.image.width;
        const scaleY = containerHeight / this.image.height;
        this.baseScale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%
        this.scale = this.baseScale * this.zoomLevel;

        // Set canvas internal resolution to match display size exactly
        this.canvas.width = containerWidth;
        this.canvas.height = containerHeight;

        // Set CSS display size to match exactly (1:1 pixel mapping)
        this.canvas.style.width = containerWidth + 'px';
        this.canvas.style.height = containerHeight + 'px';

        // Calculate offset to center image (accounting for pan)
        this.offsetX = (containerWidth - this.image.width * this.scale) / 2 + this.panX;
        this.offsetY = (containerHeight - this.image.height * this.scale) / 2 + this.panY;

        this.draw();
        this.updateZoomDisplay();
    },

    // Zoom methods
    zoomIn() {
        this.setZoom(this.zoomLevel * 1.25);
    },

    zoomOut() {
        this.setZoom(this.zoomLevel / 1.25);
    },

    resetZoom() {
        this.zoomLevel = 1;
        this.panX = 0;
        this.panY = 0;
        this.fitImage();
    },

    setZoom(level) {
        // Clamp zoom between 0.5x and 5x
        this.zoomLevel = Math.max(0.5, Math.min(5, level));
        this.scale = this.baseScale * this.zoomLevel;

        // Recalculate offsets
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        const containerWidth = Math.floor(rect.width);
        const containerHeight = Math.floor(rect.height) || 500;

        this.offsetX = (containerWidth - this.image.width * this.scale) / 2 + this.panX;
        this.offsetY = (containerHeight - this.image.height * this.scale) / 2 + this.panY;

        this.draw();
        this.updateZoomDisplay();
    },

    updateZoomDisplay() {
        const zoomEl = document.getElementById('zoomLevel');
        if (zoomEl) {
            zoomEl.textContent = Math.round(this.zoomLevel * 100) + '%';
        }
    },

    // Handle mouse wheel for zoom
    handleWheel(e) {
        if (!this.image) return;
        e.preventDefault();

        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.setZoom(this.zoomLevel * delta);
    },

    // Draw everything
    draw() {
        if (!this.ctx) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw image
        if (this.image) {
            this.ctx.drawImage(
                this.image,
                this.offsetX,
                this.offsetY,
                this.image.width * this.scale,
                this.image.height * this.scale
            );
        }

        // Draw grid (if enabled and calibrated)
        if (this.showGrid && Calibration.isComplete) {
            this.drawGrid();
        }

        // Draw calibration points
        this.drawCalibrationPoints();

        // Draw curve points
        this.drawCurvePoints();
    },

    // Draw grid overlay
    drawGrid() {
        if (!Calibration.isComplete) return;

        const ctx = this.ctx;
        ctx.save();

        // Grid style
        ctx.strokeStyle = 'rgba(0, 150, 255, 0.3)';
        ctx.lineWidth = 1;

        // Get calibration bounds
        const xMin = Calibration.values.xMin;
        const xMax = Calibration.values.xMax;
        const yMin = Calibration.values.yMin;
        const yMax = Calibration.values.yMax;

        // Draw vertical lines (X axis grid)
        ctx.beginPath();
        for (let x = xMin; x <= xMax; x += this.gridSpacingX) {
            const pixelPos = Calibration.dataToPixel(x, yMin);
            const pixelPosTop = Calibration.dataToPixel(x, yMax);
            if (pixelPos && pixelPosTop) {
                const canvasX = pixelPos.x * this.scale + this.offsetX;
                const canvasYBottom = pixelPos.y * this.scale + this.offsetY;
                const canvasYTop = pixelPosTop.y * this.scale + this.offsetY;
                ctx.moveTo(canvasX, canvasYTop);
                ctx.lineTo(canvasX, canvasYBottom);
            }
        }
        ctx.stroke();

        // Draw horizontal lines (Y axis grid)
        ctx.beginPath();
        for (let y = yMin; y <= yMax; y += this.gridSpacingY) {
            const pixelPos = Calibration.dataToPixel(xMin, y);
            const pixelPosRight = Calibration.dataToPixel(xMax, y);
            if (pixelPos && pixelPosRight) {
                const canvasY = pixelPos.y * this.scale + this.offsetY;
                const canvasXLeft = pixelPos.x * this.scale + this.offsetX;
                const canvasXRight = pixelPosRight.x * this.scale + this.offsetX;
                ctx.moveTo(canvasXLeft, canvasY);
                ctx.lineTo(canvasXRight, canvasY);
            }
        }
        ctx.stroke();

        // Draw grid labels
        ctx.fillStyle = 'rgba(0, 100, 200, 0.7)';
        ctx.font = '10px sans-serif';

        // X axis labels
        for (let x = xMin; x <= xMax; x += this.gridSpacingX) {
            const pixelPos = Calibration.dataToPixel(x, yMin);
            if (pixelPos) {
                const canvasX = pixelPos.x * this.scale + this.offsetX;
                const canvasY = pixelPos.y * this.scale + this.offsetY;
                ctx.fillText(x.toString(), canvasX - 5, canvasY + 12);
            }
        }

        // Y axis labels
        for (let y = yMin; y <= yMax; y += this.gridSpacingY) {
            const pixelPos = Calibration.dataToPixel(xMin, y);
            if (pixelPos) {
                const canvasX = pixelPos.x * this.scale + this.offsetX;
                const canvasY = pixelPos.y * this.scale + this.offsetY;
                ctx.fillText(y.toFixed(1), canvasX - 25, canvasY + 3);
            }
        }

        ctx.restore();
    },

    // Toggle grid visibility
    toggleGrid() {
        this.showGrid = !this.showGrid;
        this.draw();
        return this.showGrid;
    },

    // Set grid spacing
    setGridSpacing(spacingX, spacingY) {
        this.gridSpacingX = spacingX;
        this.gridSpacingY = spacingY;
        if (this.showGrid) this.draw();
    },

    // Draw calibration reference points
    drawCalibrationPoints() {
        const points = Calibration.getCalibrationPoints();

        points.forEach(point => {
            const x = point.x * this.scale + this.offsetX;
            const y = point.y * this.scale + this.offsetY;

            // Draw crosshair
            this.ctx.strokeStyle = '#ff00ff';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x - 10, y);
            this.ctx.lineTo(x + 10, y);
            this.ctx.moveTo(x, y - 10);
            this.ctx.lineTo(x, y + 10);
            this.ctx.stroke();

            // Draw label
            this.ctx.fillStyle = '#ff00ff';
            this.ctx.font = '12px sans-serif';
            this.ctx.fillText(point.key, x + 12, y - 5);
        });
    },

    // Draw all curve points
    drawCurvePoints() {
        const curves = Curves.getAll();

        curves.forEach(curve => {
            const isActive = curve.id === Curves.activeCurveId;

            // Draw points
            curve.points.forEach(point => {
                const x = point.px * this.scale + this.offsetX;
                const y = point.py * this.scale + this.offsetY;

                // Outer circle
                this.ctx.beginPath();
                this.ctx.arc(x, y, isActive ? 7 : 5, 0, Math.PI * 2);
                this.ctx.fillStyle = curve.color;
                this.ctx.fill();

                // Inner dot for active curve
                if (isActive) {
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, 3, 0, Math.PI * 2);
                    this.ctx.fillStyle = 'white';
                    this.ctx.fill();
                }
            });

            // Draw connecting lines (optional, for visualization)
            if (curve.points.length > 1) {
                this.ctx.beginPath();
                this.ctx.strokeStyle = curve.color;
                this.ctx.lineWidth = isActive ? 2 : 1;
                this.ctx.globalAlpha = 0.5;

                curve.points.forEach((point, i) => {
                    const x = point.px * this.scale + this.offsetX;
                    const y = point.py * this.scale + this.offsetY;
                    if (i === 0) {
                        this.ctx.moveTo(x, y);
                    } else {
                        this.ctx.lineTo(x, y);
                    }
                });
                this.ctx.stroke();
                this.ctx.globalAlpha = 1;
            }
        });
    },

    // Convert screen coordinates to image coordinates
    screenToImage(screenX, screenY) {
        const rect = this.canvas.getBoundingClientRect();

        // Get canvas position relative to click
        const canvasX = screenX - rect.left;
        const canvasY = screenY - rect.top;

        // Convert to image coordinates (accounting for scale and offset)
        const imageX = (canvasX - this.offsetX) / this.scale;
        const imageY = (canvasY - this.offsetY) / this.scale;

        return { x: imageX, y: imageY };
    },

    // Handle click
    handleClick(e) {
        if (this.isDragging) return;

        const { x, y } = this.screenToImage(e.clientX, e.clientY);

        // Check if calibrating
        if (Calibration.isCalibrating) {
            Calibration.handleClick(x, y);
            this.draw();
            return;
        }

        // Check if calibration is complete
        if (!Calibration.isComplete) {
            return;
        }

        // Check if clicking on existing point (in manual mode)
        if (this.digitizeMode === 'manual') {
            const found = Curves.findPointAt(x, y, 10 / this.scale);
            if (found) {
                Curves.setActive(found.curve.id);
                this.draw();
                return;
            }
        }

        // Add new point(s) to active curve
        const curve = Curves.getActive();
        if (!curve) {
            alert('Please add a curve first');
            return;
        }

        if (this.digitizeMode === 'auto') {
            // Auto-detect curve
            this.autoDetectCurve(x, y);
        } else {
            // Manual mode - add single point
            const dataCoords = Calibration.pixelToData(x, y);
            if (dataCoords) {
                Curves.addPoint(x, y, dataCoords.x, dataCoords.y);
                App.saveState();
                this.draw();
            }
        }
    },

    // Auto-detect and trace curve from clicked point
    autoDetectCurve(clickX, clickY) {
        if (!this.image) return;

        // Create temporary canvas to get image data
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.image.width;
        tempCanvas.height = this.image.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(this.image, 0, 0);

        const imageData = tempCtx.getImageData(0, 0, this.image.width, this.image.height);

        // Detect curve points
        const detectedPoints = AutoDetect.detectCurve(
            clickX, clickY,
            imageData,
            this.image.width,
            this.image.height
        );

        if (detectedPoints.length === 0) {
            alert('Could not detect curve. Try adjusting color tolerance or click directly on the curve line.');
            return;
        }

        // Simplify to reasonable number of points
        const simplified = AutoDetect.simplifyPoints(detectedPoints, 40);

        // Add all detected points to the active curve
        let addedCount = 0;
        simplified.forEach(point => {
            const dataCoords = Calibration.pixelToData(point.x, point.y);
            if (dataCoords) {
                // Only add points within calibrated range
                if (dataCoords.x >= Calibration.values.xMin &&
                    dataCoords.x <= Calibration.values.xMax &&
                    dataCoords.y >= Calibration.values.yMin &&
                    dataCoords.y <= Calibration.values.yMax) {
                    Curves.addPoint(point.x, point.y, dataCoords.x, dataCoords.y);
                    addedCount++;
                }
            }
        });

        if (addedCount > 0) {
            App.saveState();
            this.draw();
        } else {
            alert('No valid points detected within the calibrated area.');
        }
    },

    // Automatically detect ALL curves in the image
    detectAllCurvesAuto() {
        if (!this.image) {
            alert('Please load an image first.');
            return;
        }

        if (!Calibration.isComplete) {
            alert('Please calibrate the axes first.');
            return;
        }

        // Create temporary canvas to get image data
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.image.width;
        tempCanvas.height = this.image.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(this.image, 0, 0);

        const imageData = tempCtx.getImageData(0, 0, this.image.width, this.image.height);

        // Detect all curves
        const detectedCurves = AutoDetect.detectAllCurves(
            imageData,
            this.image.width,
            this.image.height,
            Calibration
        );

        if (detectedCurves.length === 0) {
            alert('No curves detected. Try adjusting the color tolerance or use manual mode.');
            return;
        }

        // Clear existing curves and add detected ones
        const addCurves = confirm(`Detected ${detectedCurves.length} curve(s). Add them? (This will create new curves)`);

        if (!addCurves) return;

        // Add each detected curve
        detectedCurves.forEach((detected, index) => {
            // Create new curve with detected color
            const curve = Curves.create(`Curve ${index + 1}`, detected.hexColor);

            // Add points to this curve
            detected.points.forEach(point => {
                const dataCoords = Calibration.pixelToData(point.x, point.y);
                if (dataCoords) {
                    if (dataCoords.x >= Calibration.values.xMin &&
                        dataCoords.x <= Calibration.values.xMax &&
                        dataCoords.y >= Calibration.values.yMin &&
                        dataCoords.y <= Calibration.values.yMax) {
                        Curves.addPoint(point.x, point.y, dataCoords.x, dataCoords.y);
                    }
                }
            });
        });

        App.saveState();
        this.draw();

        alert(`Added ${detectedCurves.length} curve(s) with their data points.`);
    },

    // Handle right click (delete point)
    handleRightClick(e) {
        e.preventDefault();

        const { x, y } = this.screenToImage(e.clientX, e.clientY);
        const found = Curves.findPointAt(x, y, 10 / this.scale);

        if (found) {
            // Switch to that curve and delete the point
            Curves.setActive(found.curve.id);
            Curves.deletePoint(found.point.id);
            App.saveState();
            this.draw();
        }
    },

    // Handle mouse down (start drag)
    handleMouseDown(e) {
        if (e.button !== 0) return; // Left click only

        const { x, y } = this.screenToImage(e.clientX, e.clientY);
        const found = Curves.findPointAt(x, y, 10 / this.scale);

        if (found && Calibration.isComplete) {
            this.isDragging = true;
            this.dragPoint = found.point;
            this.dragCurve = found.curve;
            Curves.setActive(found.curve.id);
            this.canvas.style.cursor = 'grabbing';
        } else if (e.shiftKey && this.zoomLevel > 1) {
            // Shift+drag to pan when zoomed
            this.isPanning = true;
            this.lastPanX = e.clientX;
            this.lastPanY = e.clientY;
            this.canvas.style.cursor = 'move';
        }
    },

    // Handle mouse move (drag)
    handleMouseMove(e) {
        const { x, y } = this.screenToImage(e.clientX, e.clientY);

        // Update coordinate display
        this.updateCoordsDisplay(x, y);

        // Handle panning
        if (this.isPanning) {
            const dx = e.clientX - this.lastPanX;
            const dy = e.clientY - this.lastPanY;
            this.panX += dx;
            this.panY += dy;
            this.lastPanX = e.clientX;
            this.lastPanY = e.clientY;

            this.offsetX = (this.canvas.width - this.image.width * this.scale) / 2 + this.panX;
            this.offsetY = (this.canvas.height - this.image.height * this.scale) / 2 + this.panY;

            this.draw();
            return;
        }

        // Handle point dragging
        if (!this.isDragging || !this.dragPoint) return;

        const dataCoords = Calibration.pixelToData(x, y);

        if (dataCoords) {
            Curves.updatePoint(this.dragPoint.id, x, y, dataCoords.x, dataCoords.y);
            this.draw();
        }
    },

    // Update coordinates display
    updateCoordsDisplay(imageX, imageY) {
        const coordsEl = document.getElementById('cursorCoords');
        if (!coordsEl) return;

        if (Calibration.isComplete) {
            const data = Calibration.pixelToData(imageX, imageY);
            if (data) {
                coordsEl.textContent = `X: ${data.x.toFixed(2)} Y: ${data.y.toFixed(3)}`;
            }
        } else {
            coordsEl.textContent = `X: ${Math.round(imageX)} Y: ${Math.round(imageY)}`;
        }
    },

    // Handle mouse up (end drag)
    handleMouseUp() {
        if (this.isDragging) {
            this.isDragging = false;
            this.dragPoint = null;
            this.dragCurve = null;
            this.canvas.style.cursor = 'crosshair';
            App.saveState();
        }
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = 'crosshair';
        }
    },

    // Clear canvas
    clear() {
        this.image = null;
        this.zoomLevel = 1;
        this.panX = 0;
        this.panY = 0;
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        this.updateZoomDisplay();
    }
};
