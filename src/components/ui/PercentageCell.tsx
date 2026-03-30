import React, { useState, useEffect } from "react";
import { Input } from "./input";

interface PercentageCellProps {
  value: number | string | undefined;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  inputClassName?: string;
  showIndicator?: boolean;
  backgroundType?: "blue" | "orange" | "green" | "none";
  isPrimary?: boolean;
}

export default function PercentageCell({
  value,
  onChange,
  placeholder = "0.0",
  readOnly = false,
  className = "",
  inputClassName = "",
  showIndicator = false,
  backgroundType = "none",
  isPrimary = false,
}: PercentageCellProps) {
  const [inputValue, setInputValue] = useState<string>("");

  // Sync external value without forcing formatting
  useEffect(() => {
    if (value !== undefined && value !== null) {
      // Handle 0 as a valid value, not empty
      const displayValue = value === 0 ? "0.0" : String(value);
      setInputValue(displayValue);
    } else {
      setInputValue(""); // keep empty so placeholder shows
    }
  }, [value]);

  // Use inputValue for background bar so it always updates
  const numericInputValue = parseFloat(inputValue);
  const clampedValue = Math.min(
    100,
    Math.max(0, isNaN(numericInputValue) ? 0 : numericInputValue)
  );

  const getBackgroundClass = () => {
    // Check if value is over 100% and return red background
    if (numericInputValue > 100) {
      return "bg-[#ef4444]";
    }
    
    switch (backgroundType) {
      case "blue":
        return "bg-blue-500";
      case "orange":
        return "bg-orange-500";
      case "green":
        return "bg-green-500";
      default:
        return "";
    }
  };

  const getTextClass = () => {
    // Check if value is over 100% and return red text
    if (numericInputValue > 100) {
      return "text-red-500";
    }
    
    return "";
  };

  // Allow free typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Allow only numbers and one decimal point
    if (!/^\d*\.?\d*$/.test(newValue)) return;

    setInputValue(newValue);
    onChange?.(newValue);
  };

  // Format only when leaving field
  const handleBlur = () => {
    if (inputValue === "") {
      onChange?.("0.0");
      return;
    }

    const numValue = parseFloat(inputValue);

    if (!isNaN(numValue)) {
      // Keep the original value without clamping to 100
      const formatted = numValue.toFixed(1);
      setInputValue(formatted);
      onChange?.(formatted);
    }
  };

  return (
    <td className={`px-3 py-2 relative ${className}`}>
      {/* Background bar */}
      {((backgroundType !== "none" && clampedValue > 0) || numericInputValue > 100) && (
        <div
          className={`absolute inset-0 ${getBackgroundClass()} opacity-20`}
          style={{ width: `${numericInputValue > 100 ? 100 : clampedValue}%` }}
        />
      )}

      <div className="flex items-center relative z-10">
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={(e) => e.target.select()} // optional: auto-select
          placeholder={placeholder}
          className={`border-0 bg-transparent text-center focus-visible:ring-1 min-w-[60px] ${
            isPrimary ? "font-semibold text-primary" : ""
          } ${getTextClass()} ${inputClassName}`}
          readOnly={readOnly}
          showIndicator={showIndicator}
        />
        <span
          className={`ml-1 text-sm font-medium ${
            isPrimary ? "text-primary" : ""
          } ${getTextClass()}`}
        >
          %
        </span>
      </div>
    </td>
  );
}
