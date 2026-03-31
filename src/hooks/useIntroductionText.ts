import { useState, useRef, useEffect } from "react";
import { IntroductionProps } from "@/types/introduction.types";
import { autoResize, handleTextChange, handleTabKey, handleBold } from "@/lib/textareaUtils";

// Storage keys for introduction data
const INTRODUCTION_STORAGE_KEY = "weekly-report:introduction";

export const useIntroductionText = (projectLogo: string = "") => {
  // Load saved data from localStorage on initial mount using lazy initialization
  const [projectOverview, setProjectOverview] = useState(() => {
    try {
      const saved = localStorage.getItem(INTRODUCTION_STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        return data.projectOverview || "";
      }
    } catch (e) {
      console.error('[useIntroductionText] Failed to load saved projectOverview:', e);
    }
    return "";
  });

  const [designNConstruction, setDesignNConstruction] = useState(() => {
    try {
      const saved = localStorage.getItem(INTRODUCTION_STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        return data.designNConstruction || "";
      }
    } catch (e) {
      console.error('[useIntroductionText] Failed to load saved designNConstruction:', e);
    }
    return "";
  });

  const [coverImage, setCoverImage] = useState(() => {
    try {
      const saved = localStorage.getItem(INTRODUCTION_STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        return data.coverImage || projectLogo || "";
      }
    } catch (e) {
      console.error('[useIntroductionText] Failed to load saved coverImage:', e);
    }
    return projectLogo || "";
  });

  // Save data to localStorage whenever it changes
  useEffect(() => {
    const dataToSave = {
      projectOverview,
      designNConstruction,
      coverImage
    };
    
    // Use setTimeout to avoid blocking React's render queue
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(INTRODUCTION_STORAGE_KEY, JSON.stringify(dataToSave));
      } catch (e) {
        console.error('[useIntroductionText] Failed to save data:', e);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [projectOverview, designNConstruction, coverImage]);

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
