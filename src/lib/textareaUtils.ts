import { RefObject, useEffect } from "react";

export const autoResize = (ref: RefObject<HTMLTextAreaElement>) => {
  if (ref.current) {
    ref.current.style.height = "auto";
    ref.current.style.height = ref.current.scrollHeight + "px";
  }
};

export const handleTextChange = (
  e: React.ChangeEvent<HTMLTextAreaElement>,
  setter: React.Dispatch<React.SetStateAction<string>>,
) => {
  setter(e.target.value);
};

export const handleTabKey = (
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  setProjectOverview: React.Dispatch<React.SetStateAction<string>>,
  setDesignConstruction: React.Dispatch<React.SetStateAction<string>>,
  projectOverviewRef: RefObject<HTMLTextAreaElement>,
  designConstructionRef: RefObject<HTMLTextAreaElement>,
) => {
  if (e.key === "Tab") {
    e.preventDefault();
    const target = e.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;

    // Insert tab character (4 spaces for better visual)
    const newValue =
      target.value.substring(0, start) + "    " + target.value.substring(end);

    // Update textarea value
    if (target === projectOverviewRef.current) {
      setProjectOverview(newValue);
      // Set cursor position after inserted tab
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      }, 0);
    } else if (target === designConstructionRef.current) {
      setDesignConstruction(newValue);
      // Set cursor position after inserted tab
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      }, 0);
    }
  }
};

export const handleBold = (
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  setProjectOverview: React.Dispatch<React.SetStateAction<string>>,
  setDesignConstruction: React.Dispatch<React.SetStateAction<string>>,
  projectOverviewRef: RefObject<HTMLTextAreaElement>,
  designConstructionRef: RefObject<HTMLTextAreaElement>,
) => {
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
        cursorPosition = start + 2; // Position between **
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

    // Update textarea value
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
