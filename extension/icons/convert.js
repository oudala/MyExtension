const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const sharp = require('sharp');

async function convertSvgToPng(svgPath, pngPath) {
  try {
    await sharp(svgPath)
      .resize(24, 24)
      .png()
      .toFile(pngPath);
    console.log(`Converted ${svgPath} to ${pngPath}`);
  } catch (error) {
    console.error(`Failed to convert ${svgPath}:`, error);
  }
}

async function main() {
  const icons = ['bell', 'logout', 'refresh', 'search'];
  
  for (const icon of icons) {
    await convertSvgToPng(
      path.join(__dirname, `${icon}.svg`),
      path.join(__dirname, `${icon}.png`)
    );
  }
}

main().catch(console.error); 