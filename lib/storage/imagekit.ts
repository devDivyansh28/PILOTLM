import ImageKit from 'imagekit';

let imagekitInstance: ImageKit | null = null;

export function getImageKit(): ImageKit {
  if (imagekitInstance) return imagekitInstance;

  const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

  if (!publicKey) throw new Error('NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY not set');
  if (!privateKey) throw new Error('IMAGEKIT_PRIVATE_KEY not set');
  if (!urlEndpoint) throw new Error('IMAGEKIT_URL_ENDPOINT not set');

  imagekitInstance = new ImageKit({
    publicKey,
    privateKey,
    urlEndpoint,
  });

  return imagekitInstance;
}

export interface UploadOptions {
  fileName: string;
  file: Buffer | string; // base64 string or buffer
  folder?: string;
  tags?: string[];
  customMetadata?: Record<string, string>;
}

export async function uploadFile(options: UploadOptions): Promise<{
  fileId: string;
  url: string;
  filePath: string;
  size: number;
}> {
  const ik = getImageKit();
  
  const fileBase64 = Buffer.isBuffer(options.file) 
    ? options.file.toString('base64') 
    : options.file;

  const result = await ik.upload({
    file: fileBase64,
    fileName: options.fileName,
    folder: options.folder ?? '/sources',
    tags: options.tags ?? [],
    customMetadata: options.customMetadata ?? {},
    useUniqueFileName: true,
  });

  return {
    fileId: result.fileId,
    url: result.url,
    filePath: result.filePath,
    size: result.size,
  };
}

export async function deleteFile(fileId: string): Promise<void> {
  const ik = getImageKit();
  await ik.deleteFile(fileId);
}

export function getSignedUploadUrl(
  fileName: string,
  folder: string = '/sources',
  expireMinutes: number = 30
): { signedUrl: string; expire: number; token: string } {
  const ik = getImageKit();
  
  const authenticateParams = ik.getAuthenticationParameters(String(expireMinutes * 60));
  
  return {
    signedUrl: `${process.env.IMAGEKIT_URL_ENDPOINT}${folder}/${fileName}`,
    expire: authenticateParams.expire,
    token: authenticateParams.token,
  };
}

export function getPublicUrl(filePath: string): string {
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  if (!urlEndpoint) throw new Error('IMAGEKIT_URL_ENDPOINT not set');
  return `${urlEndpoint}${filePath}`;
}