const express = require('express');
const axios = require('axios');
const PImage = require('pureimage');
const fs = require('fs');
// const font = PImage.registerFont(__dirname + '/arial.ttf', 'Arial');
// font.loadSync();
// console.log('Font loaded:', font.loaded);
const fetch = require('node-fetch'); // Make sure this is at the top of your file

const app = express();
app.use(express.json());

function drawText(ctx, text, x, y, size, color, weight = 'normal') {
    console.log('Drawing text:', text, x, y, size, color, weight);
    ctx.font = `${weight} ${size || 12}pt Arial`;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
}

// Helper: Draw a circular avatar
function drawCircularImage(ctx, img, x, y, size) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, x, y, size, size);
    ctx.restore();
}

// Helper: Draw rounded rectangle
function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// Helper: Draw rounded rectangle with different corner radii
function drawRoundedRectCustom(ctx, x, y, width, height, radii) {
    const [topLeft, topRight, bottomRight, bottomLeft] = radii;
    
    ctx.beginPath();
    ctx.moveTo(x + topLeft, y);
    ctx.lineTo(x + width - topRight, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + topRight);
    ctx.lineTo(x + width, y + height - bottomRight);
    ctx.quadraticCurveTo(x + width, y + height, x + width - bottomRight, y + height);
    ctx.lineTo(x + bottomLeft, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - bottomLeft);
    ctx.lineTo(x, y + topLeft);
    ctx.quadraticCurveTo(x, y, x + topLeft, y);
    ctx.closePath();
}

app.post('/frame', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).send('Missing username');
  }

  try {
    console.log(`Fetching data for username: ${username}`);
    const url = `https://api.ethos.network/api/v2/user/by/farcaster/username/${username}`;
    console.log(`API URL: ${url}`);
    
    const resp = await axios.get(url);
    console.log(`API Response status: ${resp.status}`);
    console.log(`API Response data:`, JSON.stringify(resp.data, null, 2));
    
    const { user } = resp.data;

    const width = 600, height = 400;
    const img = PImage.make(width, height);
    const ctx = img.getContext('2d');
    drawText(ctx, 'TEST', 50, 50, 32, '#f00', 'bold');

    // Background
    ctx.fillStyle = '#f5f6fa';
    ctx.fillRect(0, 0, width, height);

    // Card
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, 30, 30, 540, 340, 24);
    ctx.fill();
    ctx.stroke();

    // Header bar
    ctx.fillStyle = '#1a73e8';
    drawRoundedRectCustom(ctx, 30, 30, 540, 60, [24, 24, 0, 0]);
    ctx.fill();

    // Avatar
    let avatarImg = null;
    try {
        console.log('Avatar URL:', user.avatarUrl);
        const avatarRes = await fetch(user.avatarUrl);
        const contentType = avatarRes.headers.get('content-type') || '';
        if (contentType.includes('png')) {
            avatarImg = await PImage.decodePNGFromStream(avatarRes.body);
        } else if (contentType.includes('jpeg') || contentType.includes('jpg')) {
            avatarImg = await PImage.decodeJPEGFromStream(avatarRes.body);
        } else {
            throw new Error('Unsupported image type: ' + contentType);
        }
        console.log('Avatar loaded successfully');
    } catch (error) {
        console.log('Avatar error:', error.message);
        // Create a placeholder avatar if loading fails
        avatarImg = PImage.make(80, 80);
        const placeholderCtx = avatarImg.getContext('2d');
        placeholderCtx.fillStyle = '#e0e0e0';
        placeholderCtx.fillRect(0, 0, 80, 80);
        placeholderCtx.fillStyle = '#999';
        placeholderCtx.font = '24px Arial';
        placeholderCtx.fillText('?', 35, 50);
    }
    drawCircularImage(ctx, avatarImg, 50, 45, 64);

    // Display name and username
    drawText(ctx, user.displayName, 130, 75, 24, '#fff', 'bold');
    drawText(ctx, '@' + user.username, 130, 100, 16, '#cce0fa');

    // Ethos Score (big)
    drawText(ctx, `${user.score}`, 480, 80, 40, '#fff', 'bold');
    drawText(ctx, 'Ethos Score', 480, 110, 16, '#cce0fa');

    // XP and streak
    drawText(ctx, `XP: ${user.xpTotal} | Streak: ${user.xpStreakDays} days`, 50, 150, 16, '#222');

    // Status
    drawText(ctx, `Status: ${user.status}`, 50, 180, 16, '#666');

    // Reviews
    const reviews = user.stats?.review?.received || {};
    drawText(ctx, `Reviews: +${reviews.positive || 0} / ~${reviews.neutral || 0} / -${reviews.negative || 0}`, 50, 210, 16, '#222');

    // Vouches
    const vouchesGiven = user.stats?.vouch?.given?.count || 0;
    const vouchesReceived = user.stats?.vouch?.received?.count || 0;
    drawText(ctx, `Vouches: Given ${vouchesGiven} | Received ${vouchesReceived}`, 50, 240, 16, '#222');

    // Profile and score links
    drawText(ctx, `Profile:`, 50, 270, 14, '#1a73e8', 'bold');
    drawText(ctx, user.links?.profile || '', 120, 270, 14, '#1a73e8');
    drawText(ctx, `Score Details:`, 50, 290, 14, '#1a73e8', 'bold');
    drawText(ctx, user.links?.scoreBreakdown || '', 170, 290, 14, '#1a73e8');

    // Bio/description
    if (user.description) {
      drawText(ctx, user.description, 50, 320, 14, '#444');
    }

    console.log('Image generation completed successfully');
    res.set('Content-Type', 'image/png');
    PImage.encodePNGToStream(img, res);
  } catch (e) {
    console.error('Error in frame generation:', e);
    const width = 600, height = 400;
    const img = PImage.make(width, height);
    const ctx = img.getContext('2d');
    ctx.fillStyle = '#fff0f0';
    ctx.fillRect(0, 0, width, height);
    drawText(ctx, 'Error fetching data.', 30, 60, 24, '#c00');
    drawText(ctx, e.message || 'Unknown error', 30, 100, 18, '#c00');
    res.set('Content-Type', 'image/png');
    PImage.encodePNGToStream(img, res);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Frame backend running on port ${PORT}`);
}); 