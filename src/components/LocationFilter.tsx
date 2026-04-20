import { useState, useEffect } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { apiGet } from "@/lib/apiFetch";

interface LocationFilterProps {
  selectedLocation: string;
  onLocationChange: (location: string) => void;
  onClearFilter: () => void;
  className?: string;
}

const LocationFilter = ({ 
  selectedLocation, 
  onLocationChange, 
  onClearFilter,
  className = "" 
}: LocationFilterProps) => {
  const [locations, setLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setIsLoading(true);
        const response = await apiGet("/daily-reports/locations");
        if (response.ok) {
          const data = await response.json();
          setLocations(data.locations || []);
        }
      } catch (error) {
        console.error("Failed to fetch locations:", error);
        // Fallback to common Cambodia locations if API fails
        setLocations([
          "Phnom Penh",
          "Siem Reap", 
          "Sihanoukville",
          "Battambang",
          "Kep",
          "Kampot",
          "Koh Kong",
          "Kandal",
          "Kampong Cham",
          "Pursat"
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLocations();
  }, []);

  const handleClearFilter = () => {
    onLocationChange("all");
    onClearFilter();
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-2 flex-1">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filter by Location:</span>
        <Select
          value={selectedLocation}
          onValueChange={onLocationChange}
          disabled={isLoading}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={isLoading ? "Loading locations..." : "All locations"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc} value={loc}>
                {loc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {selectedLocation && selectedLocation !== "all" && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            {selectedLocation}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={handleClearFilter}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        </div>
      )}
    </div>
  );
};

export default LocationFilter;
