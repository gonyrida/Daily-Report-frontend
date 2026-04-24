// Handle file upload with callback - pass File object directly
export const handleFileUpload = (
  event: React.ChangeEvent<HTMLInputElement>,
  callback: (file: File) => void
) => {
  const file = event.target.files?.[0];
  if (file) {
    callback(file);
  }
};

// Validate file type
export const validateImageFile = (file: File): boolean => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return allowedTypes.includes(file.type);
};

// Validate file size (in MB)
export const validateFileSize = (file: File, maxSizeMB: number = 10): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};
