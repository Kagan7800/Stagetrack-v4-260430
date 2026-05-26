const fs = require('fs');
const path = require('path');

const imgPath = 'c:\\0-Music Fun\\Backups\\backup for firestore\\public\\assets\\lobby_rect.png';
const svgPath = 'c:\\0-Music Fun\\Backups\\backup for firestore\\public\\assets\\Lobby.svg';

// Read and base64 encode image
const imgData = fs.readFileSync(imgPath);
const base64Img = imgData.toString('base64');
const dataUrl = `data:image/png;base64,${base64Img}`;

// Read SVG
let svgContent = fs.readFileSync(svgPath, 'utf8');

// Define image elements
const imageElements = `
  <image x="572" y="651.32" width="1030" height="1979" href="${dataUrl}" />
  <image x="1602" y="651.32" width="1030" height="1979" href="${dataUrl}" />
`;

// Insert right after the base background rect
const rectPattern = '<rect width="5208" height="2817" fill="#1745B9"/>';
if (svgContent.includes(rectPattern)) {
  svgContent = svgContent.replace(rectPattern, `${rectPattern}\n${imageElements}`);
  fs.writeFileSync(svgPath, svgContent, 'utf8');
  console.log('Successfully injected box panels into Lobby.svg!');
} else {
  console.error('Could not find the base background rect in Lobby.svg');
}
