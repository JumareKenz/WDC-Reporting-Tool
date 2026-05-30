/**
 * Real-Time Image Quality Analysis Service
 *
 * Provides real-time feedback during guided capture to ensure optimal photo quality.
 * All checks run on-device using Canvas API (no OCR engine needed for quality checks).
 *
 * Quality checks:
 * - Blur detection (Laplacian variance)
 * - Brightness/exposure analysis
 * - Tilt/skew detection
 * - Form section detection (template matching)
 *
 * @module imageQualityService
 */

// ────────────────────────────────────────────────────────────────────────────
// Quality Thresholds
// ────────────────────────────────────────────────────────────────────────────

const QUALITY_THRESHOLDS = {
  // Blur detection
  blur: {
    sharp: 80, // Laplacian variance > 80 = sharp
    acceptable: 50, // 50-80 = acceptable
    // < 50 = blurry
  },
  // Brightness (0-255 scale)
  brightness: {
    min: 60, // Too dark below this
    max: 220, // Too bright (overexposed) above this
    optimal: [100, 180], // Optimal range
  },
  // Tilt angle (degrees)
  tilt: {
    max: 10, // Warn if tilt > 10°
  },
  // Resolution
  resolution: {
    minPixels: 500000, // 0.5 megapixels minimum
    recommended: 2000000, // 2 megapixels recommended
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Image Loading Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Load image into canvas for analysis.
 * @param {string|HTMLImageElement|Blob} imageSource - Base64, Image element, or Blob
 * @returns {Promise<{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, imageData: ImageData}>}
 */
async function loadImageToCanvas(imageSource) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const processImage = (img) => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resolve({ canvas, ctx, imageData });
    };

    if (imageSource instanceof HTMLImageElement) {
      processImage(imageSource);
    } else if (imageSource instanceof Blob) {
      const img = new Image();
      img.onload = () => processImage(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(imageSource);
    } else if (typeof imageSource === 'string') {
      const img = new Image();
      img.onload = () => processImage(img);
      img.onerror = reject;
      // Handle both data URLs and base64 strings
      img.src = imageSource.startsWith('data:') ? imageSource : `data:image/jpeg;base64,${imageSource}`;
    } else {
      reject(new Error('Unsupported image source type'));
    }
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Blur Detection
// ────────────────────────────────────────────────────────────────────────────

/**
 * Detect image blur using Laplacian variance approximation.
 * Higher score = sharper image.
 *
 * @param {ImageData} imageData - Canvas ImageData
 * @returns {{score: number, status: 'sharp'|'acceptable'|'blurry', message: string}}
 */
export function detectBlur(imageData) {
  const { data, width, height } = imageData;

  // Convert to grayscale and calculate Laplacian
  let varianceSum = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      // Get grayscale value
      const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

      // Get surrounding pixels
      const top = 0.299 * data[idx - width * 4] + 0.587 * data[idx - width * 4 + 1] + 0.114 * data[idx - width * 4 + 2];
      const bottom = 0.299 * data[idx + width * 4] + 0.587 * data[idx + width * 4 + 1] + 0.114 * data[idx + width * 4 + 2];
      const left = 0.299 * data[idx - 4] + 0.587 * data[idx - 3] + 0.114 * data[idx - 2];
      const right = 0.299 * data[idx + 4] + 0.587 * data[idx + 5] + 0.114 * data[idx + 6];

      // Laplacian approximation
      const laplacian = Math.abs(4 * gray - top - bottom - left - right);
      varianceSum += laplacian;
      count++;
    }
  }

  const score = varianceSum / count;

  let status, message;
  if (score >= QUALITY_THRESHOLDS.blur.sharp) {
    status = 'sharp';
    message = 'Image is sharp';
  } else if (score >= QUALITY_THRESHOLDS.blur.acceptable) {
    status = 'acceptable';
    message = 'Sharpness is acceptable';
  } else {
    status = 'blurry';
    message = 'Image is blurry — hold steady and tap to focus';
  }

  return { score: Math.round(score), status, message };
}

// ────────────────────────────────────────────────────────────────────────────
// Brightness Analysis
// ────────────────────────────────────────────────────────────────────────────

/**
 * Analyze image brightness and exposure.
 *
 * @param {ImageData} imageData - Canvas ImageData
 * @returns {{brightness: number, status: 'optimal'|'dark'|'bright'|'overexposed', message: string}}
 */
export function analyzeBrightness(imageData) {
  const { data } = imageData;
  let sum = 0;

  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    sum += avg;
  }

  const brightness = Math.round(sum / (data.length / 4));

  let status, message;
  if (brightness < QUALITY_THRESHOLDS.brightness.min) {
    status = 'dark';
    message = 'Too dark — increase lighting or use flash';
  } else if (brightness > QUALITY_THRESHOLDS.brightness.max) {
    status = 'overexposed';
    message = 'Overexposed — reduce lighting or move away from bright light';
  } else if (brightness >= QUALITY_THRESHOLDS.brightness.optimal[0] && brightness <= QUALITY_THRESHOLDS.brightness.optimal[1]) {
    status = 'optimal';
    message = 'Lighting is optimal';
  } else {
    status = 'acceptable';
    message = 'Lighting is acceptable';
  }

  return { brightness, status, message };
}

// ────────────────────────────────────────────────────────────────────────────
// Tilt/Skew Detection
// ────────────────────────────────────────────────────────────────────────────

/**
 * Detect if form is tilted using edge detection.
 * Approximates Hough line detection using horizontal edge analysis.
 *
 * @param {ImageData} imageData - Canvas ImageData
 * @returns {{angle: number, status: 'straight'|'tilted', message: string}}
 */
export function detectTilt(imageData) {
  const { data, width, height } = imageData;

  // Sample horizontal lines at regular intervals
  const sampleLines = 20;
  const angles = [];

  for (let i = 0; i < sampleLines; i++) {
    const y = Math.floor(height / sampleLines * i);
    if (y >= height - 1) continue;

    // Find edge transitions in this row
    let edgeCount = 0;
    let edgeSum = 0;

    for (let x = 1; x < width; x++) {
      const idx1 = (y * width + (x - 1)) * 4;
      const idx2 = (y * width + x) * 4;

      const gray1 = 0.299 * data[idx1] + 0.587 * data[idx1 + 1] + 0.114 * data[idx1 + 2];
      const gray2 = 0.299 * data[idx2] + 0.587 * data[idx2 + 1] + 0.114 * data[idx2 + 2];

      const diff = Math.abs(gray1 - gray2);
      if (diff > 30) {
        // Strong edge detected
        edgeSum += x;
        edgeCount++;
      }
    }

    if (edgeCount > 3) {
      // Calculate average edge position for this row
      const avgX = edgeSum / edgeCount;
      angles.push({ y, x: avgX });
    }
  }

  // Calculate line slope from edge positions
  if (angles.length < 5) {
    return { angle: 0, status: 'straight', message: 'Cannot detect tilt (insufficient edges)' };
  }

  // Linear regression to find average slope
  const n = angles.length;
  const sumX = angles.reduce((s, p) => s + p.x, 0);
  const sumY = angles.reduce((s, p) => s + p.y, 0);
  const sumXY = angles.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = angles.reduce((s, p) => s + p.x * p.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const angleDeg = Math.abs(Math.atan(slope) * (180 / Math.PI));

  let status, message;
  if (angleDeg <= QUALITY_THRESHOLDS.tilt.max) {
    status = 'straight';
    message = 'Form alignment is good';
  } else {
    status = 'tilted';
    message = `Form is tilted ${angleDeg.toFixed(1)}° — straighten before capturing`;
  }

  return { angle: Math.round(angleDeg * 10) / 10, status, message };
}

// ────────────────────────────────────────────────────────────────────────────
// Resolution Check
// ────────────────────────────────────────────────────────────────────────────

/**
 * Check if image resolution is sufficient for OCR.
 *
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {{pixels: number, status: 'optimal'|'acceptable'|'low', message: string}}
 */
export function checkResolution(width, height) {
  const pixels = width * height;

  let status, message;
  if (pixels >= QUALITY_THRESHOLDS.resolution.recommended) {
    status = 'optimal';
    message = 'Resolution is optimal for OCR';
  } else if (pixels >= QUALITY_THRESHOLDS.resolution.minPixels) {
    status = 'acceptable';
    message = 'Resolution is acceptable';
  } else {
    status = 'low';
    message = 'Resolution too low — move closer to form';
  }

  return { pixels, status, message };
}

// ────────────────────────────────────────────────────────────────────────────
// Section Detection
// ────────────────────────────────────────────────────────────────────────────

/**
 * Detect which form section is in the image using simple template matching.
 * Looks for section header text patterns.
 *
 * @param {ImageData} imageData - Canvas ImageData
 * @param {string} expectedSection - Expected section name (e.g., 'health_data', 'transport')
 * @returns {{detected: boolean, confidence: number, message: string}}
 */
export function detectSection(imageData, expectedSection) {
  // Placeholder: full implementation requires OCR or template matching
  // For now, return optimistic result
  // TODO: Implement lightweight text detection for section headers

  return {
    detected: true,
    confidence: 50, // Neutral confidence until implemented
    message: 'Section detection not yet implemented — proceed to capture',
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Comprehensive Quality Analysis
// ────────────────────────────────────────────────────────────────────────────

/**
 * Perform comprehensive quality analysis on an image.
 * Returns all quality metrics and an overall pass/warn/fail status.
 *
 * @param {string|HTMLImageElement|Blob} imageSource - Image to analyze
 * @param {object} options - Analysis options
 * @param {string} options.expectedSection - Expected form section (optional)
 * @returns {Promise<QualityReport>}
 *
 * @typedef {object} QualityReport
 * @property {number} overallScore - Overall quality score 0-100
 * @property {'pass'|'warn'|'fail'} status - Overall status
 * @property {object} blur - Blur detection results
 * @property {object} brightness - Brightness analysis results
 * @property {object} tilt - Tilt detection results
 * @property {object} resolution - Resolution check results
 * @property {string[]} issues - List of quality issues found
 * @property {string[]} recommendations - List of recommendations to improve quality
 */
export async function analyzeImageQuality(imageSource, options = {}) {
  const { expectedSection } = options;

  try {
    const { imageData, canvas } = await loadImageToCanvas(imageSource);

    // Run all quality checks
    const blur = detectBlur(imageData);
    const brightness = analyzeBrightness(imageData);
    const tilt = detectTilt(imageData);
    const resolution = checkResolution(canvas.width, canvas.height);

    // Calculate overall score
    const scores = {
      blur: blur.status === 'sharp' ? 100 : blur.status === 'acceptable' ? 70 : 40,
      brightness: brightness.status === 'optimal' ? 100 : brightness.status === 'acceptable' ? 70 : brightness.status === 'dark' ? 50 : 40,
      tilt: tilt.status === 'straight' ? 100 : 60,
      resolution: resolution.status === 'optimal' ? 100 : resolution.status === 'acceptable' ? 80 : 50,
    };

    const overallScore = Math.round((scores.blur + scores.brightness + scores.tilt + scores.resolution) / 4);

    // Determine overall status
    let status;
    if (overallScore >= 80) status = 'pass';
    else if (overallScore >= 60) status = 'warn';
    else status = 'fail';

    // Collect issues and recommendations
    const issues = [];
    const recommendations = [];

    if (blur.status === 'blurry') {
      issues.push(blur.message);
      recommendations.push('Hold phone steady and tap to focus before capturing');
    }
    if (brightness.status === 'dark' || brightness.status === 'overexposed') {
      issues.push(brightness.message);
      recommendations.push(brightness.status === 'dark' ? 'Increase lighting or use flash' : 'Reduce lighting');
    }
    if (tilt.status === 'tilted') {
      issues.push(tilt.message);
      recommendations.push('Hold phone parallel to form surface');
    }
    if (resolution.status === 'low') {
      issues.push(resolution.message);
      recommendations.push('Move closer to the form or use a higher resolution camera');
    }

    return {
      overallScore,
      status,
      blur,
      brightness,
      tilt,
      resolution,
      issues,
      recommendations,
    };
  } catch (err) {
    console.error('[ImageQuality] Analysis failed:', err);
    return {
      overallScore: 0,
      status: 'fail',
      blur: { score: 0, status: 'unknown', message: 'Analysis failed' },
      brightness: { brightness: 0, status: 'unknown', message: 'Analysis failed' },
      tilt: { angle: 0, status: 'unknown', message: 'Analysis failed' },
      resolution: { pixels: 0, status: 'unknown', message: 'Analysis failed' },
      issues: ['Failed to analyze image quality'],
      recommendations: ['Ensure image is accessible and try again'],
    };
  }
}

/**
 * Quick real-time quality check (lightweight, suitable for camera preview).
 * Checks only blur and brightness (fastest checks).
 *
 * @param {ImageData} imageData - Canvas ImageData from camera preview
 * @returns {{pass: boolean, issues: string[]}}
 */
export function quickQualityCheck(imageData) {
  const blur = detectBlur(imageData);
  const brightness = analyzeBrightness(imageData);

  const pass = blur.status !== 'blurry' && brightness.status !== 'dark' && brightness.status !== 'overexposed';

  const issues = [];
  if (blur.status === 'blurry') issues.push('Blurry');
  if (brightness.status === 'dark') issues.push('Too dark');
  if (brightness.status === 'overexposed') issues.push('Overexposed');

  return { pass, issues };
}
