const fs = require('fs');

const svgPath = 'c:\\0-Music Fun\\Backups\\backup for firestore\\public\\assets\\Lobby.svg';

// Read SVG
let svgContent = fs.readFileSync(svgPath, 'utf8');

// 1. Remove the gray rectangle
const grayRectPattern = /<rect x="572" y="1757\.32" width="1030" height="873" fill="#D9D9D9"\/>\s*/;
svgContent = svgContent.replace(grayRectPattern, '');

// 2. Wrap text path (line 4) and star path (line 5) in a transform group
// First, find the paths.
// The Welcome path starts with <path d="M858.396
// The Star path starts with <path d="M1434.37
const welcomePathRegex = /<path d="M858\.396[\s\S]*?fill="white"\/>/;
const starPathRegex = /<path d="M1434\.37[\s\S]*?stroke-width="20"\/>/;

const welcomeMatch = svgContent.match(welcomePathRegex);
const starMatch = svgContent.match(starPathRegex);

if (welcomeMatch && starMatch) {
  const welcomePath = welcomeMatch[0];
  const starPath = starMatch[0];
  
  // Replace them with the wrapped version
  const groupWrap = `
<g transform="translate(0, -40)">
  ${welcomePath}
  ${starPath}
</g>
`;
  
  // Replace the original paths with the wrapped group
  // We can remove the old ones and insert the group
  svgContent = svgContent.replace(welcomePath, '').replace(starPath, '');
  // Insert the group right after the first rect
  const rectPattern = '<rect width="5208" height="2817" fill="#1745B9"/>';
  svgContent = svgContent.replace(rectPattern, `${rectPattern}\n${groupWrap}`);
  
  fs.writeFileSync(svgPath, svgContent, 'utf8');
  console.log('Successfully updated Lobby.svg: removed gray rect and shifted text/star up 40px!');
} else {
  console.error('Could not find welcome or star path in Lobby.svg');
}
