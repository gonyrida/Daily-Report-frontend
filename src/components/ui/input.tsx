import * as React from "react";

import { cn } from "@/lib/utils";

type InputSize = "sm" | "md" | "lg";

interface InputProps extends React.ComponentProps<"input"> {
  showIndicator?: boolean;
  inputSize?: InputSize;
}

const sizeClasses: Record<InputSize, string> = {
  sm: "h-9 px-3 py-2 text-sm",
  md: "h-12 px-4 py-3 text-base",
  lg: "h-14 px-5 py-4 text-lg",
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, showIndicator = true, inputSize = "md", ...props }, ref) => {
    return (
      <div className="relative">
        <input
          type={type}
          className={cn(
            "w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-blue-200 dark:border-blue-700 rounded-xl text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200",
            sizeClasses[inputSize],
          )}
          ref={ref}
          {...props}
        />
        {showIndicator && (
          <div className="absolute top-2 right-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          </div>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
