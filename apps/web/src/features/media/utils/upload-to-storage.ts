const HTTP_OK_MIN = 200;
const HTTP_OK_MAX = 299;

export class StorageUploadError extends Error {
  constructor(public readonly status: number) {
    super(`Storage upload failed (${status})`);
    this.name = 'StorageUploadError';
  }
}

/**
 * PUTs a file straight to object storage using a presigned URL.
 * XHR (not fetch) so upload progress can be reported.
 */
export function uploadToStorage(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () =>
      xhr.status >= HTTP_OK_MIN && xhr.status <= HTTP_OK_MAX ? resolve() : reject(new StorageUploadError(xhr.status));
    xhr.onerror = () => reject(new StorageUploadError(0));
    xhr.send(file);
  });
}
