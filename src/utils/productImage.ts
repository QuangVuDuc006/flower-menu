const maxImageBytes = 150 * 1024;
const maxInputBytes = 15 * 1024 * 1024;
const maxDimension = 12000;

export async function prepareProductImage(file: File): Promise<string> {
  if (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    /\.(heic|heif)$/i.test(file.name)
  ) {
    throw new Error(
      'Định dạng ảnh HEIC từ iPhone chưa được hỗ trợ trực tiếp. Trên iPhone, bạn hãy vào Cài đặt > Camera > Định dạng và chọn "Tương thích nhất" (JPG), hoặc chia sẻ ảnh dưới dạng JPG/WebP trước khi tải lên.'
    );
  }

  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size > maxInputBytes
  ) {
    throw new Error('Chọn ảnh JPG, PNG hoặc WebP dung lượng tối đa 15 MB.');
  }

  const bitmap = await createImageBitmap(file);
  try {
    if (
      bitmap.width > maxDimension ||
      bitmap.height > maxDimension ||
      bitmap.width <= 0 ||
      bitmap.height <= 0
    ) {
      throw new Error(
        `Kích thước ảnh quá lớn (${bitmap.width}x${bitmap.height}px, tối đa 12.000 pixel). Vui lòng chọn ảnh có kích thước nhỏ hơn.`
      );
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh.');

    for (const [maxSide, quality] of [
      [1000, 0.82],
      [800, 0.76],
      [640, 0.68],
      [480, 0.6],
    ]) {
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const encoded = canvas.toDataURL('image/webp', quality);
      if (!encoded.startsWith('data:image/webp;base64,')) {
        throw new Error('Trình duyệt chưa hỗ trợ lưu WebP. Hãy thử Chrome, Edge hoặc Safari mới hơn.');
      }
      const base64 = encoded.slice(encoded.indexOf(',') + 1);
      const padding = base64.endsWith('==') ? 2 : Number(base64.endsWith('='));
      if ((base64.length * 3) / 4 - padding <= maxImageBytes) return encoded;
    }
    throw new Error('Ảnh vẫn quá lớn sau khi nén. Hãy thử ảnh khác.');
  } finally {
    bitmap.close();
  }
}
