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

        // Crop the bottom 4% of the image to remove the DALL-E watermark
        const cropHeight = Math.floor(metadata.height * 0.96);

        const processedBuffer = await sharp(inputBuffer)
            .extract({
                left: 0,
                top: 0,
                width: metadata.width,
                height: cropHeight
            })
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
