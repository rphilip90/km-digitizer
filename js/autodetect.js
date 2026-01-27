// Auto-detection module - automatically traces curves by color
const AutoDetect = {
    // Detection settings
    colorTolerance: 30,      // How similar colors need to be (0-255)
    sampleInterval: 2,       // Pixels between samples when tracing
    minPoints: 5,            // Minimum points to consider valid curve

    // Detect and trace a curve starting from a clicked point
    detectCurve(startX, startY, imageData, width, height) {
        // Get the color at the clicked point
        const targetColor = this.getPixelColor(imageData, startX, startY, width);

        if (!targetColor) return [];

        // Find all pixels matching this color
        const matchingPixels = this.findMatchingPixels(imageData, width, height, targetColor);

        if (matchingPixels.length < this.minPoints) {
            return [];
        }

        // Sort pixels by X coordinate and extract curve points
        const curvePoints = this.extractCurveFromPixels(matchingPixels, width);

        return curvePoints;
    },

    // Get color at a specific pixel
    getPixelColor(imageData, x, y, width) {
        const px = Math.round(x);
        const py = Math.round(y);
        const index = (py * width + px) * 4;

        if (index < 0 || index >= imageData.data.length - 3) {
            return null;
        }

        return {
            r: imageData.data[index],
            g: imageData.data[index + 1],
            b: imageData.data[index + 2]
        };
    },

    // Check if two colors are similar within tolerance
    colorMatch(color1, color2) {
        if (!color1 || !color2) return false;

        const diff = Math.abs(color1.r - color2.r) +
                     Math.abs(color1.g - color2.g) +
                     Math.abs(color1.b - color2.b);

        return diff <= this.colorTolerance * 3;
    },

    // Find all pixels matching the target color
    findMatchingPixels(imageData, width, height, targetColor) {
        const matching = [];

        // Sample every few pixels for performance
        for (let y = 0; y < height; y += this.sampleInterval) {
            for (let x = 0; x < width; x += this.sampleInterval) {
                const color = this.getPixelColor(imageData, x, y, width);
                if (this.colorMatch(color, targetColor)) {
                    matching.push({ x, y });
                }
            }
        }

        return matching;
    },

    // Extract curve points from matching pixels
    // Groups by X and takes the vertical center for each X slice
    extractCurveFromPixels(pixels, imageWidth) {
        // Group pixels by X coordinate (binned)
        const binSize = 3;
        const bins = {};

        pixels.forEach(p => {
            const binX = Math.floor(p.x / binSize) * binSize;
            if (!bins[binX]) {
                bins[binX] = [];
            }
            bins[binX].push(p.y);
        });

        // For each X bin, take the median Y value
        const curvePoints = [];
        const sortedXs = Object.keys(bins).map(Number).sort((a, b) => a - b);

        sortedXs.forEach(x => {
            const yValues = bins[x].sort((a, b) => a - b);
            // Take median Y
            const medianY = yValues[Math.floor(yValues.length / 2)];
            curvePoints.push({ x: x + binSize/2, y: medianY });
        });

        // Smooth the curve by removing outliers
        return this.smoothCurve(curvePoints);
    },

    // Simple smoothing to remove outliers
    smoothCurve(points) {
        if (points.length < 3) return points;

        const smoothed = [points[0]];

        for (let i = 1; i < points.length - 1; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const next = points[i + 1];

            // Check if current point is an outlier (Y jumps too much)
            const avgY = (prev.y + next.y) / 2;
            const maxJump = Math.abs(next.x - prev.x) * 2; // Allow some slope

            if (Math.abs(curr.y - avgY) > maxJump + 20) {
                // Skip outlier, interpolate instead
                smoothed.push({ x: curr.x, y: avgY });
            } else {
                smoothed.push(curr);
            }
        }

        smoothed.push(points[points.length - 1]);

        return smoothed;
    },

    // Reduce number of points while preserving curve shape
    simplifyPoints(points, targetCount = 50) {
        if (points.length <= targetCount) return points;

        const step = Math.floor(points.length / targetCount);
        const simplified = [];

        for (let i = 0; i < points.length; i += step) {
            simplified.push(points[i]);
        }

        // Always include the last point
        if (simplified[simplified.length - 1] !== points[points.length - 1]) {
            simplified.push(points[points.length - 1]);
        }

        return simplified;
    }
};
