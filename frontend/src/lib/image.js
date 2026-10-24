// Shrinks a photo in the browser before it is uploaded.
// Phone cameras make 3 to 8 MB photos; a 1200px JPEG is about 200 KB, which saves
// people's mobile data and keeps uploads quick on slow connections.

const MAX_WIDTH = 1200;

export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function shrinkImage(file, maxWidth = MAX_WIDTH, quality = 0.82) {
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
    throw new Error('That file type is not supported. Choose a JPG, PNG or WebP photo.');
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("We couldn't read that photo. Try a different one."));
      el.src = url;
    });
    const scale = Math.min(1, maxWidth / img.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) throw new Error("We couldn't prepare that photo. Try a different one.");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}
