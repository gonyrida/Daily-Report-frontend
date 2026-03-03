// src/components/weekly/content/BulkActivitiesDemo.tsx
// Demo component to showcase bulk activities functionality

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText } from "lucide-react";
import BulkActivitiesModal from "./BulkActivitiesModal";
import { ActivityRow } from "@/types/activity.types";

export default function BulkActivitiesDemo() {
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [weeklyActivities, setWeeklyActivities] = useState<ActivityRow[]>([
    { description: "1. Site preparation", percent: 100 },
    { description: "1.1 Clear vegetation", percent: 85 },
  ]);
  const [nextWeekPlan, setNextWeekPlan] = useState<ActivityRow[]>([
    { description: "1. Foundation work", percent: 75 },
  ]);

  const handleBulkImport = (importedWeekly: ActivityRow[], importedNext: ActivityRow[]) => {
    setWeeklyActivities([...weeklyActivities, ...importedWeekly]);
    setNextWeekPlan([...nextWeekPlan, ...importedNext]);
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Bulk Activities Input Demo</span>
            <Button onClick={() => setShowBulkModal(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Open Bulk Input
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Current Weekly Activities:</h3>
              <div className="space-y-1">
                {weeklyActivities.map((activity, index) => (
                  <div key={index} className="p-2 bg-muted rounded">
                    {activity.description} - {activity.percent}%
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Current Next Week Plan:</h3>
              <div className="space-y-1">
                {nextWeekPlan.map((activity, index) => (
                  <div key={index} className="p-2 bg-muted rounded">
                    {activity.description} - {activity.percent}%
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <BulkActivitiesModal
        open={showBulkModal}
        onOpenChange={setShowBulkModal}
        onImport={handleBulkImport}
      />
    </div>
  );
}
