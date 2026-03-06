import { useState, useEffect } from "react";
import { MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { apiGet } from "@/lib/apiFetch";

interface LocationDropdownProps {
  location: string;
  setLocation: (location: string) => void;
  className?: string;
}

const LocationDropdown = ({ 
  location, 
  setLocation, 
  className = "" 
}: LocationDropdownProps) => {
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

  return (
    <div className={className}>
      <Label
        htmlFor="location"
        className="text-sm font-medium text-foreground"
      >
        Location
      </Label>
      <div className="relative">
        <Select
          value={location}
          onValueChange={setLocation}
          disabled={isLoading}
        >
          <SelectTrigger id="location" className="mt-1.5">
            <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder={isLoading ? "Loading locations..." : "Select location..."} />
          </SelectTrigger>
          <SelectContent>
            {locations.map((loc) => (
              <SelectItem key={loc} value={loc}>
                <div className="flex items-center">
                  <MapPin className="mr-2 h-3 w-3" />
                  {loc}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default LocationDropdown;
