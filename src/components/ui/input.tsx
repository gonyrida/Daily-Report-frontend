import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <div className="relative">
        <input
          type={type}
          className={cn(
            "w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-blue-200 dark:border-blue-700 rounded-xl text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200",
            className,
          )}
          ref={ref}
          {...props}
        />
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
        </div>
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
