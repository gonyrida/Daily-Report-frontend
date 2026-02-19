export const handleImageUpload = (
  event: React.ChangeEvent<HTMLInputElement>,
  coverData: any,
  setCoverData: React.Dispatch<React.SetStateAction<any>>,
  onDataChange?: (data: any) => void,
) => {
  const file = event.target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const newImageData = e.target?.result as string;
      const updatedData = {
        ...coverData,
        coverImage: newImageData,
      };
      setCoverData(updatedData);
      onDataChange?.(updatedData);
    };
    reader.readAsDataURL(file);
  }
};

export const handleSignatureUpload = (
  event: React.ChangeEvent<HTMLInputElement>,
  letterData: any,
  setLetterData: React.Dispatch<React.SetStateAction<any>>,
  onDataChange?: (data: any) => void,
) => {
  const file = event.target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const newSignatureData = e.target?.result as string;
      const updatedData = { ...letterData, signatureImage: newSignatureData };
      setLetterData(updatedData);
      onDataChange?.(updatedData);
    };
    reader.readAsDataURL(file);
  }
};
