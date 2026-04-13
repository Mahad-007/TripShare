import { Capacitor } from '@capacitor/core';

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

function isShareCanceled(err: unknown): boolean {
  const message = (err as { message?: string } | null)?.message?.toLowerCase() ?? '';
  return message.includes('cancel') || message.includes('dismiss');
}

export async function saveFile(
  blob: Blob,
  filename: string,
  _mimeType: string,
  shareTitle?: string,
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');

    const base64 = await blobToBase64(blob);
    await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Cache,
    });
    const { uri } = await Filesystem.getUri({
      path: filename,
      directory: Directory.Cache,
    });

    try {
      await Share.share({
        url: uri,
        title: shareTitle ?? filename,
        dialogTitle: shareTitle ?? filename,
      });
    } catch (err) {
      if (isShareCanceled(err)) return;
      throw err;
    }
    return;
  }

  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    URL.revokeObjectURL(url);
  }
}
