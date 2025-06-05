const fs = require('fs');
const sharp = require('sharp');

// Create a simple icon with text
const createIcon = (size) => {
    const width = size;
    const height = size;
    
    // Create a canvas with a white background
    const buffer = Buffer.alloc(width * height * 4);
    
    // Fill with blue background
    for (let i = 0; i < buffer.length; i += 4) {
        buffer[i] = 0;    // R
        buffer[i + 1] = 120; // G
        buffer[i + 2] = 255; // B
        buffer[i + 3] = 255; // A
    }
    
    // Add white LD text
    const text = 'LD';
    const fontSize = Math.min(width, height) * 0.5;
    
    // Use sharp to create the image with text
    return sharp(buffer, { raw: { width, height, channels: 4 } })
        .png()
        .toFile(`icons/icon${size}.png`);
};

// Create icons in different sizes
const sizes = [16, 32, 48, 128];
sizes.forEach(size => createIcon(size));
