const sharp = require('sharp');
const ImageLog = require('../models/ImageLog');

const processImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        // Process the image in-memory using the buffer (no disk writes needed for Render)
        const inputBuffer = req.file.buffer;

        // Get image metadata
        const metadata = await sharp(inputBuffer).metadata();

        // DALL-E watermark is very small in the bottom right corner.
        // Using precise dimensions (approx 5.5% width, 1.8% height) to avoid cutting off text.
        const watermarkWidth = Math.floor(metadata.width * 0.055);
        const watermarkHeight = Math.floor(metadata.height * 0.018);
        
        const topBoundary = Math.max(0, metadata.height - (watermarkHeight * 2));
        
        // Extract a patch directly above the watermark
        const patch = await sharp(inputBuffer)
            .extract({
                left: metadata.width - watermarkWidth,
                top: topBoundary,
                width: watermarkWidth,
                height: watermarkHeight
            })
            .blur(3) // Stronger blur to blend out any copied text into a solid color
            .toBuffer();

        const processedBuffer = await sharp(inputBuffer)
            .composite([
                {
                    input: patch,
                    top: metadata.height - watermarkHeight,
                    left: metadata.width - watermarkWidth
                }
            ])
            .withMetadata() // Preserve original DPI, EXIF, and orientation
            .toFormat(metadata.format || 'png')
            .toBuffer();

        // Save log to MongoDB gracefully
        try {
            const newLog = new ImageLog({
                originalName: req.file.originalname,
                processedPath: 'in-memory'
            });
            await newLog.save();
        } catch (dbError) {
            console.log('Could not save to MongoDB, skipping log:', dbError.message);
        }

        // Send processed image directly as binary response
        const mimeType = `image/${metadata.format || 'png'}`;
        res.set('Content-Type', mimeType);
        res.set('Content-Disposition', `attachment; filename="watermark-removed-${req.file.originalname}"`);
        res.send(processedBuffer);

    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({ error: 'Failed to process image' });
    }
};

module.exports = {
    processImage
};
