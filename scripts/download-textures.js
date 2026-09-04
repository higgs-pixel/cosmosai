const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const targetDir = path.join(__dirname, '../public/textures/planets');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const textures = [
  { name: '2k_sun.jpg', url: 'https://fcm4102009923.netlify.app/2k_sun.jpg' },
  { name: '2k_mercury.jpg', url: 'https://fcm4102009923.netlify.app/2k_mercury.jpg' },
  { name: '2k_venus_atmosphere.jpg', url: 'https://fcm4102009923.netlify.app/2k_venus_atmosphere.jpg' },
  { name: '2k_earth_daymap.jpg', url: 'https://fcm4102009923.netlify.app/2k_earth_daymap.jpg' },
  { name: '2k_mars.jpg', url: 'https://fcm4102009923.netlify.app/2k_mars.jpg' },
  { name: '2k_jupiter.jpg', url: 'https://fcm4102009923.netlify.app/2k_jupiter.jpg' },
  { name: '2k_saturn.jpg', url: 'https://fcm4102009923.netlify.app/2k_saturn.jpg' },
  { name: '2k_saturn_ring_alpha.png', url: 'https://fcm4102009923.netlify.app/2k_saturn_ring_alpha.png' },
  { name: '2k_uranus.jpg', url: 'https://fcm4102009923.netlify.app/2k_uranus.jpg' },
  { name: '2k_neptune.jpg', url: 'https://fcm4102009923.netlify.app/2k_neptune.jpg' },
  { name: '2k_moon.jpg', url: 'https://fcm4102009923.netlify.app/2k_moon.jpg' }
];

function downloadFile(url, dest, callback) {
  const parsedUrl = new URL(url);
  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
  };

  const client = parsedUrl.protocol === 'https:' ? https : http;

  client.get(url, options, (res) => {
    // Handle redirect
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      console.log(`Redirecting to ${res.headers.location}`);
      return downloadFile(res.headers.location, dest, callback);
    }

    if (res.statusCode !== 200) {
      callback(new Error(`Failed to get '${url}' (status code: ${res.statusCode})`));
      return;
    }

    const file = fs.createWriteStream(dest);
    res.pipe(file);

    file.on('finish', () => {
      file.close();
      callback(null);
    });

    file.on('error', (err) => {
      fs.unlink(dest, () => {}); // Clean up partial file
      callback(err);
    });
  }).on('error', (err) => {
    callback(err);
  });
}

function downloadSequentially(index) {
  if (index >= textures.length) {
    console.log('All textures downloaded successfully!');
    return;
  }

  const texture = textures[index];
  const destPath = path.join(targetDir, texture.name);

  // If file already exists and is not empty, skip downloading to save time/bandwidth
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1024) {
    console.log(`[SKIP] Already exists: ${texture.name}`);
    downloadSequentially(index + 1);
    return;
  }

  console.log(`Downloading ${texture.name} from ${texture.url}...`);
  downloadFile(texture.url, destPath, (err) => {
    if (err) {
      console.error(`Error downloading ${texture.name}:`, err.message);
      downloadSequentially(index + 1);
    } else {
      console.log(`[OK] Saved: ${texture.name}`);
      downloadSequentially(index + 1);
    }
  });
}

downloadSequentially(0);
