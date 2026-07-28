const sharp = require('sharp');
const ImageLog = require('../models/ImageLog');

/**
 * Diagnose: log watermark region pixel stats for debugging
 */
async function logRegionStats(inputBuffer, left, top, width, height, label) {
    try {
        const meta = await sharp(inputBuffer).metadata();
        const safeL = Math.max(0, Math.min(left, meta.width - 1));
        const safeT = Math.max(0, Math.min(top, meta.height - 1));
        const safeW = Math.min(width, meta.width - safeL);
        const safeH = Math.min(height, meta.height - safeT);
        if (safeW <= 0 || safeH <= 0) return;

        const { data } = await sharp(inputBuffer)
            .extract({ left: safeL, top: safeT, width: safeW, height: safeH })
            .ensureAlpha().raw().toBuffer({ resolveWithObject: true });

        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i+1]; b += data[i+2]; count++; }
        if (count > 0) console.log(`[${label}] region avg color: r=${Math.round(r/count)} g=${Math.round(g/count)} b=${Math.round(b/count)} pixels=${count} area=${safeW}x${safeH} at (${safeL},${safeT})`);
    } catch(e) { console.log(`[${label}] stats error:`, e.message); }
}

/**
 * Fill a region by sampling the adjacent strip ABOVE (or below if at top edge).
 * Uses a gentle Gaussian blur on the sample to smooth any gradient transitions.
 * Result: seamless fill with no hard edges.
 */
async function inpaintRegion(inputBuffer, left, top, width, height) {
    const metadata = await sharp(inputBuffer).metadata();
    const imgW = metadata.width;
    const imgH = metadata.height;

    const safeLeft   = Math.max(0, left);
    const safeTop    = Math.max(0, top);
    const safeRight  = Math.min(imgW, left + width);
    const safeBottom = Math.min(imgH, top + height);
    const safeW = safeRight - safeLeft;
    const safeH = safeBottom - safeTop;

    if (safeW <= 0 || safeH <= 0) return inputBuffer;

    // How many rows to sample for background color
    const sampleRows = Math.max(6, Math.ceil(safeH * 0.5));

    let fillPatch;

    if (safeTop >= sampleRows) {
        // Sample strip ABOVE the watermark
        const sampleY = safeTop - sampleRows;
        const raw = await sharp(inputBuffer)
            .extract({ left: safeLeft, top: sampleY, width: safeW, height: sampleRows })
            .ensureAlpha().raw().toBuffer({ resolveWithObject: true });

        // Average the sampled pixels
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < raw.data.length; i += 4) {
            r += raw.data[i]; g += raw.data[i+1]; b += raw.data[i+2]; count++;
        }
        const avgR = count ? Math.round(r/count) : 128;
        const avgG = count ? Math.round(g/count) : 128;
        const avgB = count ? Math.round(b/count) : 128;

        // Stretch the sample strip to fill the watermark area (natural texture)
        fillPatch = await sharp(inputBuffer)
            .extract({ left: safeLeft, top: sampleY, width: safeW, height: sampleRows })
            .resize(safeW, safeH, { fit: 'fill' })
            .blur(1.5)
            .png()
            .toBuffer();

    } else if (safeBottom + sampleRows <= imgH) {
        // Sample strip BELOW (e.g. watermark at very top)
        const raw = await sharp(inputBuffer)
            .extract({ left: safeLeft, top: safeBottom, width: safeW, height: sampleRows })
            .ensureAlpha().raw().toBuffer({ resolveWithObject: true });

        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < raw.data.length; i += 4) {
            r += raw.data[i]; g += raw.data[i+1]; b += raw.data[i+2]; count++;
        }
        const avgR = count ? Math.round(r/count) : 128;
        const avgG = count ? Math.round(g/count) : 128;
        const avgB = count ? Math.round(b/count) : 128;

        fillPatch = await sharp({
            create: { width: safeW, height: safeH, channels: 3, background: { r: avgR, g: avgG, b: avgB } }
        }).png().toBuffer();

    } else {
        // Fallback: solid gray
        fillPatch = await sharp({
            create: { width: safeW, height: safeH, channels: 3, background: { r: 128, g: 128, b: 128 } }
        }).png().toBuffer();
    }

    return await sharp(inputBuffer)
        .composite([{ input: fillPatch, top: safeTop, left: safeLeft }])
        .toBuffer();
}

/**
 * ChatGPT / DALL-E watermark:
 *   ✦ sparkle icon — BOTTOM-RIGHT corner
 *   Approx 8% width × 6% height (generous margin to definitely cover it)
 */
async function removeChatGPTWatermark(inputBuffer, metadata) {
    // Use percentage-based sizing — covers the small DALL-E ✦ logo
    const wmW = Math.ceil(metadata.width  * 0.12);  // 12% width from right
    const wmH = Math.ceil(metadata.height * 0.08);  // 8% height from bottom

    const left = metadata.width  - wmW;
    const top  = metadata.height - wmH;

    await logRegionStats(inputBuffer, left, top, wmW, wmH, 'ChatGPT');
    return await inpaintRegion(inputBuffer, left, top, wmW, wmH);
}

/**
 * Gemini watermark:
 *   ✦ sparkle icon — BOTTOM-RIGHT corner (same position as DALL-E)
 *   AND sometimes a faint "Generated with Gemini" text — BOTTOM-CENTER or BOTTOM-LEFT
 *   We cover both zones to be safe.
 */
async function removeGeminiWatermark(inputBuffer, metadata) {
    let buf = inputBuffer;

    // Zone 1: Bottom-right sparkle (✦ icon)
    const rightW = Math.ceil(metadata.width  * 0.15);
    const rightH = Math.ceil(metadata.height * 0.10);
    const rightL = metadata.width  - rightW;
    const rightT = metadata.height - rightH;

    await logRegionStats(buf, rightL, rightT, rightW, rightH, 'Gemini-BR');
    buf = await inpaintRegion(buf, rightL, rightT, rightW, rightH);

    // Zone 2: Bottom-left text ("Generated with Gemini")
    const meta2 = await sharp(buf).metadata();
    const leftW = Math.ceil(meta2.width  * 0.35);
    const leftH = Math.ceil(meta2.height * 0.05);
    const leftT = meta2.height - leftH;

    await logRegionStats(buf, 0, leftT, leftW, leftH, 'Gemini-BL');
    buf = await inpaintRegion(buf, 0, leftT, leftW, leftH);

    return buf;
}

/**
 * Auto mode — removes BOTH ChatGPT and Gemini watermarks:
 *   - Bottom-right corner (DALL-E ✦ / Gemini ✦)
 *   - Bottom-left corner (Gemini text, if present)
 */
async function removeAllWatermarks(inputBuffer, metadata) {
    // Remove bottom-right sparkle (covers DALL-E & Gemini icon)
    const rightW = Math.ceil(metadata.width  * 0.15);
    const rightH = Math.ceil(metadata.height * 0.10);
    const rightL = metadata.width  - rightW;
    const rightT = metadata.height - rightH;

    let buf = await inpaintRegion(inputBuffer, rightL, rightT, rightW, rightH);

    // Remove bottom-left text watermark (Gemini text, if present)
    const meta2 = await sharp(buf).metadata();
    const leftW = Math.ceil(meta2.width  * 0.35);
    const leftH = Math.ceil(meta2.height * 0.05);
    const leftT = meta2.height - leftH;

    buf = await inpaintRegion(buf, 0, leftT, leftW, leftH);

    return buf;
}

// ─────────────────────────────────────────────
// Controller
// ─────────────────────────────────────────────
const processImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        const inputBuffer = req.file.buffer;
        const metadata    = await sharp(inputBuffer).metadata();

        console.log(`Processing image: ${req.file.originalname} | ${metadata.width}x${metadata.height} | format: ${metadata.format}`);

        // watermarkType: 'auto' | 'chatgpt' | 'gemini'
        const wmType = (req.body.watermarkType || 'auto').toLowerCase();
        console.log(`Watermark type: ${wmType}`);

        let cleaned;

        if (wmType === 'chatgpt') {
            cleaned = await removeChatGPTWatermark(inputBuffer, metadata);
        } else if (wmType === 'gemini') {
            cleaned = await removeGeminiWatermark(inputBuffer, metadata);
        } else {
            // Auto — remove all known watermark zones
            cleaned = await removeAllWatermarks(inputBuffer, metadata);
        }

        const processedBuffer = await sharp(cleaned)
            .withMetadata()
            .toFormat(metadata.format || 'png')
            .toBuffer();

        // Log to MongoDB gracefully
        try {
            const newLog = new ImageLog({ originalName: req.file.originalname, processedPath: 'in-memory' });
            await newLog.save();
        } catch (dbError) {
            console.log('MongoDB log skipped:', dbError.message);
        }

        const mimeType = `image/${metadata.format || 'png'}`;
        res.set('Content-Type', mimeType);
        res.set('Content-Disposition', `attachment; filename="watermark-removed-${req.file.originalname}"`);
        res.send(processedBuffer);

    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({ error: 'Failed to process image' });
    }
};

module.exports = { processImage };
