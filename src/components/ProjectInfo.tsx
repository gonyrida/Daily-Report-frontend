import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ProjectInfoProps {
  projectName: string;
  setProjectName: (name: string) => void;
  reportDate: Date | undefined;
  setReportDate: (date: Date | undefined) => void;
  weatherAM: string;
  setWeatherAM: (weather: string) => void;
  weatherPM: string;
  setWeatherPM: (weather: string) => void;
  tempAM: string;
  setTempAM: (temp: string) => void;
  tempPM: string;
  setTempPM: (temp: string) => void;
  currentPeriod: "AM" | "PM";
  setCurrentPeriod: (period: "AM" | "PM") => void;
}

const ProjectInfo = ({
  projectName,
  setProjectName,
  reportDate,
  setReportDate,
  weatherAM,
  setWeatherAM,
  weatherPM,
  setWeatherPM,
  tempAM,
  setTempAM,
  tempPM,
  setTempPM,
  currentPeriod,
  setCurrentPeriod,
}: ProjectInfoProps) => {
  const weatherOptions = ["Sunny", "Cloudy", "Rainy"];
  
  // Get current period's values
  const currentWeather = currentPeriod === "AM" ? weatherAM : weatherPM;
  const currentTemp = currentPeriod === "AM" ? tempAM : tempPM;
  
  // Handlers for current period
  const handleWeatherChange = (value: string) => {
    if (currentPeriod === "AM") {
      setWeatherAM(value);
    } else {
      setWeatherPM(value);
    }
  };
  
  const handleTempChange = (value: string) => {
    if (currentPeriod === "AM") {
      setTempAM(value);
    } else {
      setTempPM(value);
    }
  };

  // Generate Weather Summary
  const weatherSummary = `Weather      : AM ${weatherAM || ""}  |  PM ${weatherPM || ""}`;
  const tempSummary = `Temperature  : AM ${tempAM ? `${tempAM}°C` : ""}    |  PM ${tempPM ? `${tempPM}°C` : ""}`;
  const [isOpen, setIsOpen] = useState(false);

  // const weatherOptions = [
  //   { value: "Sunny", icon: Sun },
  //   { value: "Cloudy", icon: Cloud },
  //   { value: "Rainy", icon: CloudRain },
  // ];

  return (
    <div className="section-card p-6 animate-fade-in">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label
              htmlFor="projectName"
              className="text-sm font-medium text-foreground"
            >
              Project Name *
            </Label>
            <Input
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name..."
              className="mt-1.5"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-foreground">
              Report Date *
            </Label>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1.5",
                    !reportDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {reportDate ? format(reportDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={reportDate}
                  onSelect={(date) => {
                    setReportDate(date);
                    setIsOpen(false);  // ✅ Close the picker
                  }}
                  initialFocus
                  defaultMonth={new Date()}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-foreground">
              Weather
            </Label>
            <div className="space-y-3 mt-1.5">
              {/* Input Row: Period, Weather Condition, Temperature */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label htmlFor="period" className="text-xs text-muted-foreground mb-1 block">
                    Period
                  </Label>
                  <Select value={currentPeriod} onValueChange={(value: "AM" | "PM") => setCurrentPeriod(value)}>
                    <SelectTrigger id="period">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex-1">
                  <Label htmlFor="weather-condition" className="text-xs text-muted-foreground mb-1 block">
                    Weather Condition
                  </Label>
                  <Select value={currentWeather || ""} onValueChange={handleWeatherChange}>
                    <SelectTrigger id="weather-condition">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {weatherOptions.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-24">
                  <Label htmlFor="temperature" className="text-xs text-muted-foreground mb-1 block">
                    Temperature
                  </Label>
                  <Input
                    id="temperature"
                    value={currentTemp}
                    onChange={(e) => handleTempChange(e.target.value)}
                    placeholder="°C"
                  />
                </div>
              </div>

              {/* Weather Summary */}
              <div className="mt-4 pt-3 border-t">
                <Label className="text-sm font-medium text-foreground mb-2 block">
                  Weather Summary
                </Label>
                <div className="font-mono text-sm text-muted-foreground space-y-1 bg-muted/50 p-3 rounded-md">
                  <div>{weatherSummary}</div>
                  <div>{tempSummary}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectInfo;
