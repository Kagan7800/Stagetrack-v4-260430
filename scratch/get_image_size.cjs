const fs = require('fs');
const path = 'C:\\Users\\richa\\.gemini\\antigravity\\brain\\47f4adcb-9832-4b16-a95a-02ea0445e566\\media__1779800916876.png';
const buffer = fs.readFileSync(path);
const width = buffer.readUInt32BE(16);
const height = buffer.readUInt32BE(20);
console.log(`PNG Dimensions: ${width}x${height}`);
