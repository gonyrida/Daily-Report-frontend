export const handleFieldChange = (
  field: string,
  value: string,
  data: any,
  setData: React.Dispatch<React.SetStateAction<any>>,
  onDataChange?: (data: any) => void,
) => {
  const updatedData = { ...data, [field]: value };
  setData(updatedData);
  onDataChange?.(updatedData);
};
