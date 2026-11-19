// verify_all_buttons.js
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Check every getElementById and $('...') call in the script to see if all targets exist in HTML!
const regex = /(?:document\.getElementById|\$)\(['"]([^'"]+)['"]\)/g;
let match;
const usedIds = new Set();
while ((match = regex.exec(html)) !== null) {
  usedIds.add(match[1]);
}

console.log('Total unique IDs queried in JS:', usedIds.size);
const missingInHtml = [];
for (const id of usedIds) {
  if (!html.includes(`id="${id}"`)) {
    missingInHtml.push(id);
  }
}

if (missingInHtml.length > 0) {
  console.log('IDs queried by JS but missing in HTML:', missingInHtml);
} else {
  console.log('ALL queried IDs exist in HTML! Perfect match.');
}
