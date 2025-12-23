const fs = require('fs');

// Load emoji.json (Signal Desktop's source)
const emojiData = JSON.parse(fs.readFileSync('emoji.json', 'utf8'));

// Load current emojis.toml
const tomlContent = fs.readFileSync('emojis.toml', 'utf8');

// Create a map of Unicode -> emoji data from emoji.json
const emojiMap = new Map();

for (const emoji of emojiData) {
  if (!emoji.has_img_apple) continue; // Skip emojis without Apple images

  // Convert Unicode notation (e.g., "1F601") to actual emoji character
  const char = emoji.unified
    .split('-')
    .map(hex => String.fromCodePoint(parseInt(hex, 16)))
    .join('');

  emojiMap.set(char, {
    char,
    shortName: emoji.short_name,
    shortNames: emoji.short_names || [emoji.short_name],
    name: emoji.name,
    category: emoji.category,
  });
}

console.log(`Loaded ${emojiMap.size} emojis from emoji.json`);

// Parse and update emojis.toml
const emojiEntries = tomlContent.split('\n\n[[emoji]]');
let updatedCount = 0;
let notFoundCount = 0;

const updatedEntries = emojiEntries.map((entry, index) => {
  if (index === 0) return entry; // Keep header

  // Extract the emoji character
  const charMatch = entry.match(/char = "(.+?)"/);
  if (!charMatch) return entry;

  const char = charMatch[1];
  const signalData = emojiMap.get(char);

  if (!signalData) {
    notFoundCount++;
    return '[[emoji]]' + entry;
  }

  // Extract existing keywords
  const keywordsMatch = entry.match(/keywords = \[(.*?)\]/s);
  let existingKeywords = [];
  if (keywordsMatch) {
    existingKeywords = keywordsMatch[1]
      .split(',')
      .map(k => k.trim().replace(/^"|"$/g, ''))
      .filter(k => k.length > 0);
  }

  // Build new keywords list with Signal Desktop's short_names first
  const signalKeywords = signalData.shortNames;

  // Create a set of ALL short_names from Signal Desktop for conflict detection
  const allSignalShortNames = new Set();
  for (const [, data] of emojiMap) {
    data.shortNames.forEach(name => allSignalShortNames.add(name));
  }

  // Add existing keywords that:
  // 1. Aren't already in THIS emoji's Signal short_names
  // 2. Aren't a PRIMARY short_name for ANY other emoji (to avoid conflicts)
  const uniqueExistingKeywords = existingKeywords.filter(
    k => !signalKeywords.includes(k) && !allSignalShortNames.has(k)
  );

  // Combine: Signal keywords first (exact matches), then safe existing keywords
  const newKeywords = [...signalKeywords, ...uniqueExistingKeywords];

  // Format keywords for TOML
  const keywordsStr = newKeywords.map(k => `"${k}"`).join(',');

  // Replace the keywords line
  const updatedEntry = entry.replace(
    /keywords = \[.*?\]/s,
    `keywords = [${keywordsStr}]`
  );

  updatedCount++;

  return '[[emoji]]' + updatedEntry;
});

// Join everything back together
const updatedToml = updatedEntries.join('\n');

// Write to a new file first for safety
fs.writeFileSync('emojis.toml.new', updatedToml, 'utf8');

console.log(`✓ Updated ${updatedCount} emojis`);
console.log(`  ${notFoundCount} emojis not found in emoji.json (kept original)`);
console.log(`\nNew file written to: emojis.toml.new`);
console.log('Review the changes, then run: mv emojis.toml.new emojis.toml');

// Show some examples of changes
console.log('\n--- Sample Changes ---');
const sampleChars = ['😁', '😄', '😃', '😀', '❤️', '👍'];
for (const char of sampleChars) {
  const data = emojiMap.get(char);
  if (data) {
    console.log(`${char}  ->  Primary keywords: ${data.shortNames.slice(0, 3).join(', ')}`);
  }
}
