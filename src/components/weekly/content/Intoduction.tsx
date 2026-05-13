import React, { useState, useRef, useEffect } from "react";
import { IntroductionProps } from "@/types/introduction.types";
import { autoResize, handleTextChange, handleTabKey, handleBold } from "@/lib/textareaUtils";

const Introduction = ({
  projectLogo,
  projectOverview = "",
  setProjectOverview = () => {},
  designConstruction = "",
  setDesignConstruction = () => {},
  designList = [""],
  setDesignList = () => {},
  handleTextChange: handleTextChangeProp = () => {},
  handleTabKey: handleTabKeyProp = () => {},
  handleBold: handleBoldProp = () => {},
  handleListChange: handleListChangeProp = () => {},
  addListItem: addListItemProp = () => {},
  removeListItem: removeListItemProp = () => {}
}: IntroductionProps) => {
  const [localProjectOverview, setLocalProjectOverview] = useState(projectOverview);
  const [localDesignConstruction, setLocalDesignConstruction] = useState(designConstruction);
  const [localDesignList, setLocalDesignList] = useState<string[]>(designList);

  // Sync local state with prop changes (for master report mode when selecting different reports)
  useEffect(() => {
    setLocalProjectOverview(projectOverview);
  }, [projectOverview]);

  useEffect(() => {
    setLocalDesignConstruction(designConstruction);
  }, [designConstruction]);

  // Use project logo from Cover tab
  const coverImageUrl = projectLogo;

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
    fieldName: string
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

  return (
    <div className="space-y-8">
      {/* Project Overview */}
      <section className="mb-8">
        <div className="mb-2">
          <h2 className="text-lg font-semibold text-foreground">Project Overview</h2>
        </div>
        <textarea
          ref={projectOverviewRef}
          name="projectOverview"
          className="w-full border rounded p-2 min-h-[80px] resize-none focus:outline-blue-400 overflow-hidden dark:bg-card dark:border-border dark:focus:outline-primary"
          placeholder="Enter project overview..."
          value={projectOverview}
          onChange={(e) => handleTextChangeWrapper(e, setProjectOverview, 'projectOverview')}
          onKeyDown={(e) => {
            handleTabKeyWrapper(e);
            handleBoldWrapper(e);
          }}
        />
      </section>

      {/* Design & Construction */}
      <section className="mb-8">
        <div className="mb-2">
          <h2 className="text-lg font-semibold text-foreground">Design & Construction</h2>
        </div>
        <textarea
          ref={designConstructionRef}
          name="designConstruction"
          className="w-full border rounded p-2 min-h-[80px] resize-none focus:outline-blue-400 overflow-hidden mb-4 dark:bg-card dark:border-border dark:focus:outline-primary"
          placeholder="Enter design & construction details..."
          value={designConstruction}
          onChange={(e) => handleTextChangeWrapper(e, setDesignConstruction, 'designConstruction')}
          onKeyDown={(e) => {
            handleTabKeyWrapper(e);
            handleBoldWrapper(e);
          }}
        />
      </section>

      {/* Cover Image */}
      <div className="mb-6 flex flex-col items-center">
        <div
          className={`w-full aspect-[16/9] overflow-hidden rounded-2xl border-2 ${coverImageUrl && coverImageUrl !== "/placeholder-construction.jpg" ? "border-blue-300 dark:border-blue-600 p-0" : "border-dashed border-blue-300 dark:border-blue-600 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6"} flex items-center justify-center transition-all duration-300`}
        >
          {coverImageUrl && coverImageUrl !== "/placeholder-construction.jpg" ?
            <div className="relative w-full h-full">
              <img
                src={coverImageUrl}
                alt="Cover image"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-lg">
                COVER
              </div>
            </div>
          : <div className="text-center w-full">
              <div className="flex justify-center mb-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20"></div>
                  <div className="relative bg-muted dark:bg-muted p-3 rounded-full">
                    <svg
                      className="w-6 h-6 text-primary dark:text-primary"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5V19a2 2 0 002 2h14a2 2 0 002-2v-2.5M16 3.13a4 4 0 010 7.75M12 7v.01M12 12v.01M12 17v.01"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              <p className="text-sm font-medium text-foreground dark:text-foreground mb-1">
                Drop or paste cover image
              </p>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                or click to browse
              </p>
            </div>
          }
        </div>
      </div>
    </div>
  );
};

export default Introduction;
