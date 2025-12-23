#!/usr/bin/env node

/**
 * Enhance emoji database with better names, keywords, and missing emojis
 */

const fs = require('fs');
const path = require('path');
const emojilib = require('./emoj/node_modules/emojilib');
const unicodeEmojiJson = require('./emoj/node_modules/unicode-emoji-json');

// Common aliases and additional keywords for popular emojis
const ENHANCED_KEYWORDS = {
  '🔥': ['lit', 'hot', 'flame', 'burn', 'trending', 'fire', 'blaze'],
  '💯': ['hundred', 'perfect', '100', 'score', 'full', 'complete', 'points'],
  '👍': ['thumbsup', 'thumbs', 'up', 'good', 'like', 'yes', 'approve', 'agree', 'ok', 'okay', '+1', 'plus one'],
  '👎': ['thumbsdown', 'thumbs', 'down', 'bad', 'dislike', 'no', 'disapprove', 'disagree', '-1', 'minus one'],
  '❤️': ['heart', 'love', 'like', 'valentine', 'red'],
  '💔': ['broken', 'heart', 'sad', 'heartbreak', 'breakup'],
  '😂': ['lol', 'laugh', 'crying', 'tears', 'joy', 'funny', 'haha', 'lmao', 'rofl'],
  '😭': ['crying', 'sad', 'tears', 'sob', 'bawling', 'weep'],
  '😍': ['heart', 'eyes', 'love', 'crush', 'adore', 'loving'],
  '🤔': ['thinking', 'think', 'hmm', 'wonder', 'ponder', 'consider'],
  '🙏': ['pray', 'prayer', 'please', 'thanks', 'thank', 'you', 'namaste', 'high', 'five'],
  '🎉': ['party', 'celebrate', 'celebration', 'tada', 'confetti', 'hooray'],
  '🚀': ['rocket', 'launch', 'ship', 'space', 'fast', 'speed', 'boost'],
  '✨': ['sparkles', 'shine', 'shiny', 'glitter', 'stars', 'magic', 'new', 'clean'],
  '🔴': ['red', 'circle', 'dot', 'live', 'record', 'recording'],
  '🟢': ['green', 'circle', 'dot', 'online', 'available', 'go'],
  '🟡': ['yellow', 'circle', 'dot', 'away', 'idle'],
  '⚡': ['lightning', 'bolt', 'fast', 'speed', 'power', 'energy', 'zap'],
  '💀': ['skull', 'dead', 'death', 'die', 'dying', 'lmao'],
  '🤣': ['rofl', 'lol', 'laugh', 'rolling', 'floor', 'lmao', 'haha'],
  '😅': ['sweat', 'nervous', 'laugh', 'phew', 'relief'],
  '🙃': ['upside', 'down', 'sarcasm', 'silly', 'irony'],
  '🤷': ['shrug', 'idk', 'dunno', 'whatever', 'meh'],
  '🤦': ['facepalm', 'palm', 'embarrassed', 'doh', 'fail'],
  '👀': ['eyes', 'looking', 'watch', 'watching', 'see', 'peek'],
  '💪': ['muscle', 'strong', 'strength', 'flex', 'bicep', 'power'],
  '🧠': ['brain', 'smart', 'think', 'intelligence', 'clever'],
  '🦄': ['unicorn', 'mythical', 'magical', 'fantasy', 'rainbow', 'rare'],
  '🎯': ['target', 'bullseye', 'goal', 'aim', 'direct', 'hit'],
  '💡': ['idea', 'light', 'bulb', 'think', 'thinking', 'bright'],
  '🔔': ['bell', 'notification', 'notify', 'alert', 'ring'],
  '🔕': ['mute', 'silent', 'no', 'bell', 'quiet', 'silence'],
  '⭐': ['star', 'favorite', 'fav', 'favourite'],
  '🌟': ['star', 'glowing', 'shine', 'sparkle'],
  '💩': ['poop', 'shit', 'crap', 'pile'],
  '🤖': ['robot', 'bot', 'ai', 'artificial', 'intelligence', 'machine'],
  '👋': ['wave', 'hello', 'hi', 'bye', 'goodbye', 'greeting', 'hey'],
  '✅': ['check', 'yes', 'correct', 'done', 'complete', 'approved', 'tick', 'checkmark'],
  '❌': ['x', 'cross', 'no', 'wrong', 'incorrect', 'cancel', 'delete', 'remove'],
  '⚠️': ['warning', 'caution', 'alert', 'danger'],
  '📝': ['memo', 'note', 'write', 'document', 'pencil'],
  '📌': ['pin', 'pinned', 'pushpin', 'important'],
  '🔗': ['link', 'chain', 'url', 'hyperlink'],
  '📱': ['phone', 'mobile', 'cell', 'smartphone', 'iphone'],
  '💻': ['laptop', 'computer', 'pc', 'macbook', 'code', 'programming'],
  '⌨️': ['keyboard', 'typing', 'type', 'keys'],
  '🖱️': ['mouse', 'click', 'pointer'],
  '🎮': ['game', 'gaming', 'controller', 'video', 'games', 'xbox', 'playstation'],
  '🎵': ['music', 'note', 'song', 'melody'],
  '🎶': ['music', 'notes', 'song', 'melody'],
  '📷': ['camera', 'photo', 'picture', 'snapshot'],
  '📸': ['camera', 'flash', 'photo', 'picture', 'selfie'],
  '🍕': ['pizza', 'slice', 'food', 'italian'],
  '🍔': ['burger', 'hamburger', 'food', 'fast', 'food'],
  '🍟': ['fries', 'french', 'fries', 'chips', 'food'],
  '☕': ['coffee', 'cafe', 'espresso', 'java', 'hot'],
  '🍺': ['beer', 'drink', 'alcohol', 'pub', 'cheers'],
  '🍷': ['wine', 'drink', 'alcohol', 'glass'],
  '🎂': ['cake', 'birthday', 'party', 'dessert'],
  '🏠': ['home', 'house', 'building'],
  '🏢': ['office', 'building', 'work', 'business'],
  '🏥': ['hospital', 'medical', 'health', 'doctor'],
  '🚗': ['car', 'auto', 'vehicle', 'drive'],
  '✈️': ['airplane', 'plane', 'flight', 'travel', 'fly'],
  '🚁': ['helicopter', 'chopper', 'heli'],
  '🌍': ['earth', 'world', 'globe', 'planet'],
  '🌎': ['earth', 'world', 'globe', 'planet', 'america'],
  '🌏': ['earth', 'world', 'globe', 'planet', 'asia'],
  '🌈': ['rainbow', 'pride', 'colors', 'colours'],
  '☀️': ['sun', 'sunny', 'bright', 'day', 'weather'],
  '🌙': ['moon', 'night', 'crescent'],
  '⚽': ['soccer', 'football', 'ball', 'sport'],
  '🏀': ['basketball', 'ball', 'sport', 'hoops'],
  '⚾': ['baseball', 'ball', 'sport'],
  '🎾': ['tennis', 'ball', 'sport'],
  '🏈': ['football', 'american', 'ball', 'sport'],
};

// Build unicode map
const unicodeMap = {};
Object.entries(unicodeEmojiJson).forEach(([key, value]) => {
  if (value.emoji) {
    unicodeMap[value.emoji] = {
      name: value.name || key,
      unicode: key,
      category: value.category || 'other'
    };
  }
});

// Process and enhance emojis
const emojis = [];
const seenEmojis = new Set();

Object.entries(emojilib).forEach(([emoji, keywords]) => {
  if (seenEmojis.has(emoji)) return;
  seenEmojis.add(emoji);

  const unicodeData = unicodeMap[emoji] || {};

  // Merge keywords from emojilib and enhanced keywords
  let allKeywords = Array.isArray(keywords) ? [...keywords] : [];
  if (ENHANCED_KEYWORDS[emoji]) {
    allKeywords = [...new Set([...allKeywords, ...ENHANCED_KEYWORDS[emoji]])];
  }

  // Determine skin tone support
  const supportsSkinTone =
    allKeywords.some(k => ['hand', 'person', 'people', 'body', 'gesture', 'man', 'woman'].includes(k.toLowerCase())) ||
    unicodeData.category?.includes('people') ||
    unicodeData.category?.includes('person') ||
    unicodeData.name?.toLowerCase().includes('hand') ||
    unicodeData.name?.toLowerCase().includes('person') ||
    false;

  // Extract tags
  const tags = [];
  if (unicodeData.category) {
    tags.push(unicodeData.category);
  }

  // Add semantic tags based on keywords
  if (allKeywords.some(k => ['animal', 'cat', 'dog', 'bird', 'fish'].includes(k.toLowerCase()))) {
    if (!tags.includes('animal')) tags.push('animal');
  }
  if (allKeywords.some(k => ['happy', 'sad', 'angry', 'love', 'joy', 'cry'].includes(k.toLowerCase()))) {
    if (!tags.includes('emotion')) tags.push('emotion');
  }
  if (allKeywords.some(k => ['food', 'fruit', 'drink', 'eat'].includes(k.toLowerCase()))) {
    if (!tags.includes('food')) tags.push('food');
  }
  if (allKeywords.some(k => ['game', 'sport', 'play'].includes(k.toLowerCase()))) {
    if (!tags.includes('activity')) tags.push('activity');
  }

  emojis.push({
    char: emoji,
    name: unicodeData.name || emoji,
    keywords: allKeywords,
    tags: tags.length > 0 ? tags : ['other'],
    unicode: unicodeData.unicode || '',
    supports_skin_tone: supportsSkinTone
  });
});

// Sort by name
emojis.sort((a, b) => a.name.localeCompare(b.name));

console.log(`Enhanced ${emojis.length} emojis with improved keywords`);

// Generate enhanced TOML
let tomlContent = '# Enhanced emoji database for emosh\n';
tomlContent += `# Generated from emojilib with enhanced keywords\n`;
tomlContent += `# Total emojis: ${emojis.length}\n\n`;

emojis.forEach(emoji => {
  tomlContent += '[[emoji]]\n';
  tomlContent += `char = "${emoji.char}"\n`;
  tomlContent += `name = ${JSON.stringify(emoji.name)}\n`;
  tomlContent += `keywords = ${JSON.stringify(emoji.keywords)}\n`;
  tomlContent += `tags = ${JSON.stringify(emoji.tags)}\n`;
  tomlContent += `unicode = ${JSON.stringify(emoji.unicode)}\n`;
  tomlContent += `supports_skin_tone = ${emoji.supports_skin_tone}\n`;
  tomlContent += '\n';
});

// Write to file
fs.writeFileSync('emojis.toml', tomlContent, 'utf-8');
console.log('✓ Generated enhanced emojis.toml');
console.log(`✓ File size: ${(fs.statSync('emojis.toml').size / 1024).toFixed(2)} KB`);

// Show some examples of enhanced emojis
console.log('\nSample enhancements:');
const samples = ['🔥', '💯', '👍', '😂', '🚀'];
samples.forEach(char => {
  const emoji = emojis.find(e => e.char === char);
  if (emoji) {
    console.log(`${char}: ${emoji.keywords.join(', ')}`);
  }
});
