import React, { useState, useRef, useEffect } from "react";

interface IntroductionProps {
  projectLogo?: string;
}

const Introduction: React.FC<IntroductionProps> = ({ projectLogo = "" }) => {
  const [projectOverview, setProjectOverview] = useState("");
  const [designConstruction, setDesignConstruction] = useState("");
  const [designList, setDesignList] = useState<string[]>([""]);

  // Use project logo from Cover tab
  const coverImageUrl = projectLogo;

  // Refs for textareas
  const projectOverviewRef = useRef<HTMLTextAreaElement>(null);
  const designConstructionRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea function
  const autoResize = (ref: React.RefObject<HTMLTextAreaElement>) => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  };

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
  const handleTextChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
    setter: React.Dispatch<React.SetStateAction<string>>,
  ) => {
    setter(e.target.value);
  };

  // Handle Tab key for list indentation
  const handleTabKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      // Insert tab character (4 spaces for better visual)
      const newValue =
        target.value.substring(0, start) + "    " + target.value.substring(end);

      // Update the textarea value
      if (target === projectOverviewRef.current) {
        setProjectOverview(newValue);
        // Set cursor position after the inserted tab
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = start + 4;
        }, 0);
      } else if (target === designConstructionRef.current) {
        setDesignConstruction(newValue);
        // Set cursor position after the inserted tab
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = start + 4;
        }, 0);
      }
    }
  };

  // Handle Alt+B for bold text (to avoid browser Ctrl+B conflict)
  const handleBold = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.altKey && e.key === "b") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const text = target.value;

      let boldText = "";
      let cursorPosition = start;

      if (start === end) {
        // No text selected, find word at cursor
        const wordStart = text.lastIndexOf(" ", start - 1) + 1;
        const wordEnd = text.indexOf(" ", start);
        const actualWordEnd = wordEnd === -1 ? text.length : wordEnd;
        const word = text.substring(wordStart, actualWordEnd);

        if (word.length > 0) {
          boldText =
            text.substring(0, wordStart) +
            "**" +
            word +
            "**" +
            text.substring(actualWordEnd);
          cursorPosition = actualWordEnd + 4; // Position after **word**
        } else {
          // No word at cursor, insert ** ** for user to type
          boldText = text.substring(0, start) + "****" + text.substring(end);
          cursorPosition = start + 2; // Position between the **
        }
      } else {
        // Text selected, wrap it in **
        const selectedText = text.substring(start, end);
        boldText =
          text.substring(0, start) +
          "**" +
          selectedText +
          "**" +
          text.substring(end);
        cursorPosition = end + 4; // Position after **selectedText**
      }

      // Update the textarea value
      if (target === projectOverviewRef.current) {
        setProjectOverview(boldText);
      } else if (target === designConstructionRef.current) {
        setDesignConstruction(boldText);
      }

      // Set cursor position
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = cursorPosition;
      }, 0);
    }
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
          <h2 className="text-lg font-semibold">Project Overview</h2>
        </div>
        <textarea
          ref={projectOverviewRef}
          className="w-full border rounded p-2 min-h-[80px] resize-none focus:outline-blue-400 overflow-hidden"
          placeholder="Enter project overview..."
          value={projectOverview}
          onChange={(e) => handleTextChange(e, setProjectOverview)}
          onKeyDown={(e) => {
            handleTabKey(e);
            handleBold(e);
          }}
        />
      </section>

      {/* Design & Construction */}
      <section className="mb-8">
        <div className="mb-2">
          <h2 className="text-lg font-semibold">Design & Construction</h2>
        </div>
        <textarea
          ref={designConstructionRef}
          className="w-full border rounded p-2 min-h-[80px] resize-none focus:outline-blue-400 overflow-hidden mb-4"
          placeholder="Enter design & construction details..."
          value={designConstruction}
          onChange={(e) => handleTextChange(e, setDesignConstruction)}
          onKeyDown={(e) => {
            handleTabKey(e);
            handleBold(e);
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
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded-lg">
                COVER
              </div>
            </div>
          : <div className="text-center w-full">
              <div className="flex justify-center mb-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20"></div>
                  <div className="relative bg-blue-100 dark:bg-blue-800 p-3 rounded-full">
                    <svg
                      className="w-6 h-6 text-blue-600 dark:text-blue-400"
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
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                Drop or paste cover image
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
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
