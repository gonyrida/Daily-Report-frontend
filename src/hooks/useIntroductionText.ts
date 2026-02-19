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
        console.log('[useIntroductionText] Loaded saved projectOverview:', data.projectOverview);
        return data.projectOverview || "";
      }
    } catch (e) {
      console.error('[useIntroductionText] Failed to load saved projectOverview:', e);
    }
    return "";
  });

  const [designConstruction, setDesignConstruction] = useState(() => {
    try {
      const saved = localStorage.getItem(INTRODUCTION_STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        console.log('[useIntroductionText] Loaded saved designConstruction:', data.designConstruction);
        return data.designConstruction || "";
      }
    } catch (e) {
      console.error('[useIntroductionText] Failed to load saved designConstruction:', e);
    }
    return "";
  });

  const [designList, setDesignList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(INTRODUCTION_STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        console.log('[useIntroductionText] Loaded saved designList:', data.designList);
        return data.designList || [""];
      }
    } catch (e) {
      console.error('[useIntroductionText] Failed to load saved designList:', e);
    }
    return [""];
  });

  // Save data to localStorage whenever it changes
  useEffect(() => {
    const dataToSave = {
      projectOverview,
      designConstruction,
      designList
    };
    
    // Use setTimeout to avoid blocking React's render queue
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(INTRODUCTION_STORAGE_KEY, JSON.stringify(dataToSave));
        console.log('[useIntroductionText] Saved data to localStorage:', dataToSave);
      } catch (e) {
        console.error('[useIntroductionText] Failed to save data:', e);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [projectOverview, designConstruction, designList]);

  // Refs for textareas
  const projectOverviewRef = useRef<HTMLTextAreaElement>(null);
  const designConstructionRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize on content change
  useEffect(() => {
    autoResize(projectOverviewRef);
  }, [projectOverview]);

  useEffect(() => {
    autoResize(designConstructionRef);
  }, [designConstruction]);

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
    handleTabKey(e, setProjectOverview, setDesignConstruction, projectOverviewRef, designConstructionRef);
  };

  // Handle Alt+B for bold text (to avoid browser Ctrl+B conflict)
  const handleBoldWrapper = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    handleBold(e, setProjectOverview, setDesignConstruction, projectOverviewRef, designConstructionRef);
  };

  const handleListChange = (index: number, value: string) => {
    const newList = [...designList];
    newList[index] = value;
    setDesignList(newList);
  };

  const addListItem = () => {
    setDesignList([...designList, ""]);
  };

  const removeListItem = (index: number) => {
    if (designList.length === 1) return;
    setDesignList(designList.filter((_, i) => i !== index));
  };

  return {
    projectOverview,
    setProjectOverview,
    designConstruction,
    setDesignConstruction,
    designList,
    setDesignList,
    handleTextChangeWrapper,
    handleTabKeyWrapper,
    handleBoldWrapper,
    handleListChange,
    addListItem,
    removeListItem,
  };
};
