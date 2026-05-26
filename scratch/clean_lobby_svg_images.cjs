const fs = require('fs');

const svgPath = 'c:\\0-Music Fun\\Backups\\backup for firestore\\public\\assets\\Lobby.svg';

// Read current SVG content
let svgContent = fs.readFileSync(svgPath, 'utf8');

// The embedded images we added
const rectPattern = '<rect width="5208" height="2817" fill="#1745B9"/>';
const imageElementsPattern = /<image x="572" y="651\.32"[\s\S]*?\/>\s*<image x="1602" y="651\.32"[\s\S]*?\/>/;

// Strip any <image> tags from Lobby.svg
svgContent = svgContent.replace(/<image[\s\S]*?\/>\s*/g, '');

fs.writeFileSync(svgPath, svgContent, 'utf8');
console.log('Cleaned up Lobby.svg successfully!');
