import { useState, useRef, useEffect } from "react";
import { IntroductionProps } from "@/types/introduction.types";
import { autoResize, handleTextChange, handleTabKey, handleBold } from "@/lib/textareaUtils";
import { getWeeklyReportById } from "@/services/weeklyReportService";

export const useIntroductionText = (reportId: string) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const [projectOverview, setProjectOverview] = useState("");
  const [designNConstruction, setDesignNConstruction] = useState("");
  const [coverImage, setCoverImage] = useState("");

  // Load introduction data from API
  const refetch = async () => {
    if (!reportId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await getWeeklyReportById(reportId);

      if (response.success && response.data) {
        const intro = response.data.sections.introduction;
        if (intro) {
          setProjectOverview(intro.projectOverview || "");
          setDesignNConstruction(intro.designNConstruction || "");
          setCoverImage(intro.coverImage || "");
        }
      } else {
        setError(response.error || 'Failed to load introduction data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    if (reportId) {
      refetch();
    }
  }, [reportId]);

  // Refs for textareas
  const projectOverviewRef = useRef<HTMLTextAreaElement>(null);
  const designConstructionRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize on content change
  useEffect(() => {
    autoResize(projectOverviewRef);
  }, [projectOverview]);

  useEffect(() => {
    autoResize(designConstructionRef);
  }, [designNConstruction]);

  // Initial resize on mount
  useEffect(() => {
    autoResize(projectOverviewRef);
    autoResize(designConstructionRef);
  }, []);

  // Handle text input - simplified to allow Ctrl+Z to work
  const handleTextChangeWrapper = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
    setter: React.Dispatch<React.SetStateAction<string>>,
  ) => {
    handleTextChange(e, setter);
  };

  // Handle Tab key for list indentation
  const handleTabKeyWrapper = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    handleTabKey(e, setProjectOverview, setDesignNConstruction, projectOverviewRef, designConstructionRef);
  };

  // Handle Alt+B for bold text (to avoid browser Ctrl+B conflict)
  const handleBoldWrapper = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    handleBold(e, setProjectOverview, setDesignNConstruction, projectOverviewRef, designConstructionRef);
  };

  // Return data in the format expected by the backend
  const data = {
    projectOverview,
    designNConstruction,
    coverImage
  };

  return {
    // Data
    data,
    isLoading,
    error,
    refetch,
    projectOverview,
    setProjectOverview,
    designNConstruction,
    setDesignNConstruction,
    coverImage,
    setCoverImage,
    
    // Legacy field names for backward compatibility
    designConstruction: designNConstruction,
    setDesignConstruction: setDesignNConstruction,
    
    // Handlers
    handleTextChangeWrapper,
    handleTabKeyWrapper,
    handleBoldWrapper,
  };
};
