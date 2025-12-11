const svg = `<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3B82F6;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="24" cy="24" r="22" fill="url(#grad)"/>
  <polygon points="18,14 18,34 34,24" fill="white"/>
  <rect x="28" y="16" width="8" height="2" fill="white" opacity="0.9"/>
  <rect x="28" y="23" width="8" height="2" fill="white" opacity="0.9"/>
  <rect x="28" y="30" width="8" height="2" fill="white" opacity="0.9"/>
</svg>`;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const img = new Image();
const blob = new Blob([svg], { type: 'image/svg+xml' });
const url = URL.createObjectURL(blob);

img.onload = function () {
    ctx.drawImage(img, 0, 0);
    canvas.toBlob(function (blob) {
        const a = document.createElement('a');
        a.download = 'icon-48.png';
        a.href = URL.createObjectURL(blob);
        a.click();
    });
};
img.src = url;
