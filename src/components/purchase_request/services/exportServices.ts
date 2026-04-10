import { 
	pythonApiPost
} from '@/lib/pythonApiFetch';
import { PYTHON_API_BASE_URL } from "@/config/api";

const cleanData = (data: any) => {

  const cleanedData = { 
    ...data,
    categories: {
      construction: String(data.categories?.construction || null),
      admin: String(data.categories?.admin || null),
      material: String(data.categories?.material || null),
      services: String(data.categories?.services || null)
    }
  };

  return cleanedData;
};

export const exportPurchaseRequestExcel = async (data: any) => {
  try {
    const response = await pythonApiPost(`${PYTHON_API_BASE_URL}/generate-pr-excel`, cleanData(data));
  
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to generate purchase request excel" }));
      throw new Error(
        error.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }
  
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
  
    link.download = "purchase-request.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  
    return { success: true };
  } catch (error) {
    console.error("Purchase Request Excel generation error:", error);
    throw error;
  }
};