const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const FOLDER = import.meta.env.VITE_CLOUDINARY_FOLDER;

function getUploadError(xhr: XMLHttpRequest): string {
  try {
    const response = JSON.parse(xhr.responseText) as { error?: { message?: string } };
    if (response.error?.message) {
      return `Cloudinary upload failed: ${response.error.message}`;
    }
  } catch {
    // Use the HTTP status when the server does not return a JSON error.
  }
  return `Cloudinary upload failed with status ${xhr.status}.`;
}

function getUploadUrl(): string {
  if (!CLOUD_NAME) throw new Error('Missing VITE_CLOUDINARY_CLOUD_NAME environment variable.');
  if (!UPLOAD_PRESET) throw new Error('Missing VITE_CLOUDINARY_UPLOAD_PRESET environment variable.');
  return `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
}

function uploadProfileImage(file: File, entityType: 'customers' | 'setupBoys', entityId: string): Promise<string> {
  const uploadUrl = getUploadUrl();

  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', [FOLDER, 'mandap-manager', entityType, entityId].filter(Boolean).join('/'));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl);
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(getUploadError(xhr)));
        return;
      }

      try {
        const response = JSON.parse(xhr.responseText) as { secure_url?: string };
        if (!response.secure_url) {
          reject(new Error('Cloudinary upload response did not contain a secure URL.'));
          return;
        }
        resolve(response.secure_url);
      } catch {
        reject(new Error('Cloudinary upload response was not valid JSON.'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error while uploading customer photo.'));
    xhr.ontimeout = () => reject(new Error('Photo upload timed out. Check your connection and try again.'));
    xhr.timeout = 60_000;
    xhr.send(formData);
  });
}

export function uploadCustomerImage(file: File, customerId: string): Promise<string> {
  return uploadProfileImage(file, 'customers', customerId);
}

export function uploadSetupBoyImage(file: File, laborId: string): Promise<string> {
  return uploadProfileImage(file, 'setupBoys', laborId);
}
