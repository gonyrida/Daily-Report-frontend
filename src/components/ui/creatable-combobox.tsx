import React, { useEffect, useState } from "react"
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

interface Option {
  value: string;
  label: string;
}

interface CreatableComboboxProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  onCreate?: (value: string) => void;
  placeholder?: string;
  width?: string;
}

const CreatableCombobox: React.FC<CreatableComboboxProps> = ({
  options,
  value,
  onChange,
  onCreate,
  placeholder = "Select...",
  width = "w-[180px]",
}) => {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [localOptions, setLocalOptions] = useState<Option[]>(options)

  useEffect(() => {
    if (options) {
      // Update internal state when initialValue changes
      setLocalOptions(options);
    }
  }, [options]);

  const selectedLabel = localOptions.find(opt => opt.value === value)?.label || value

  const handleCreate = (inputValue: string) => {
    const trimmed = inputValue.trim()
    if (!trimmed) return

    // Check if already exists (case insensitive)
    const exists = localOptions.some(
      opt => opt.value.toLowerCase() === trimmed.toLowerCase()
    )
    if (exists) return

    const newOption: Option = { value: trimmed.toLowerCase(), label: trimmed }
    setLocalOptions(prev => [...prev, newOption])
    onChange(newOption.value)
    if (onCreate) onCreate(trimmed)
    setOpen(false)
    setInputValue("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(width, "justify-between")}
        >
          {selectedLabel || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn(width, "p-0")}>
        <Command>
          <CommandInput
            placeholder={onCreate ? "Search or type new..." : "Search..."}
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty className="flex flex-col items-center justify-center p-2">
              <p className="text-sm text-muted-foreground mb-2">No results found.</p>
              {onCreate && inputValue.trim() && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => handleCreate(inputValue)}
                >
                  {/* <Plus className="mr-2 h-3 w-3" /> */}
                  Create "{inputValue.trim()}"
                </Button>
              )}
            </CommandEmpty>
            <CommandGroup>
              {localOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default CreatableCombobox
