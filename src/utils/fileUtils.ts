// Convert file to data URL (base64)
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      resolve(result);
    };
    reader.onerror = (e) => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
};

// Handle file upload with callback
export const handleFileUpload = (
  event: React.ChangeEvent<HTMLInputElement>,
  callback: (dataUrl: string) => void
) => {
  const file = event.target.files?.[0];
  if (file) {
    fileToDataUrl(file).then(callback).catch(console.error);
  }
};
