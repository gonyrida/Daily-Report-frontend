import React, { useState, useEffect } from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// 1. Define the interfaces
interface Option {
  value: string;
  label: string;
}

interface CreatableComboboxProps {
  options: Option[],
  defaultValue?: string,
  defaultLabel?: string,
  optionsFrom?: string,
  onChange: (value: string) => void
  initialValue?: string
  onCreate?: (value: string) => void
  placeholder?: string
}

const CustomCombobox: React.FC<CreatableComboboxProps> = ({
  options: initialOptions,
  defaultValue = "_id",
  defaultLabel = "name",
  optionsFrom,
  onChange,
  initialValue,
  onCreate,
  placeholder = "Select option...",
}) => {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  // Keep track of locally created options so they don't vanish on re-render
  const [localOptions, setLocalOptions] = useState<Option[]>(initialOptions)
  const [displayLabel, setDisplayLabel] = useState<string>(initialValue)

  useEffect(() => {
    if (initialValue) {
      // Update internal state when initialValue changes
      setDisplayLabel(initialValue);
    }
  }, [initialValue]);

  const duplicatedOptions = [];
  const flattenedOptions = localOptions
    .flatMap(project => 
      project[optionsFrom].filter(sub => {       
        if(!duplicatedOptions.includes(sub.name)) {
          duplicatedOptions.push(sub.name)
          return {
            [defaultValue]: sub._id,
            [defaultLabel]: sub.name
          };
        }
      })
    );

  const [currentOptions, setCurrentOptions] = useState<any[]>(flattenedOptions)

  // Merge prop options with locally created ones
  const allOptions = [...flattenedOptions, ...currentOptions]

  const handleCreate = (inputValue: string) => {
    const newValue = inputValue.toLowerCase().trim()
    // Prevent duplicates
    if (allOptions.some((opt) => opt[defaultValue] === newValue)) return

    const newOption = { [defaultValue]: newValue, [defaultLabel]: inputValue }
    
    flattenedOptions.push(newOption)
    setCurrentOptions((prev) => [...prev, newOption])
    setDisplayLabel(inputValue)
    if (onCreate) onCreate(inputValue)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[250px] justify-between"
        >
          {displayLabel ? displayLabel : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput 
            placeholder="Search or type new..." 
            onValueChange={setInputValue} 
          />
          <CommandList>
            <CommandEmpty className="flex flex-col items-center justify-center p-2">
              <p className="text-sm text-muted-foreground mb-2">No results found.</p>
              <Button
                variant="secondary"
                size="sm"
                className="w-full text-xs"
                onClick={() => handleCreate(inputValue)}
              >
                <Plus className="mr-2 h-3 w-3" />
                Create "{inputValue}"
              </Button>
            </CommandEmpty>
            <CommandGroup>
              {currentOptions.map((option) => (
                <CommandItem
                  key={option[defaultValue]}
                  value={option[defaultValue]}
                  onSelect={(currentValue) => {
                    const selectedLabel = option[defaultLabel];
                    setDisplayLabel(selectedLabel);
                    onChange(currentValue)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      displayLabel === option[defaultLabel] ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option[defaultLabel]}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default CustomCombobox;