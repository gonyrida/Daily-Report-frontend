// src/components/test/DebugBulkImport.tsx
// Debug component to test bulk import functionality

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, AlertCircle, CheckCircle } from "lucide-react";
import BulkActivitiesModal from "@/components/weekly/content/BulkActivitiesModal";
import { ActivityRow } from "@/types/activity.types";

export default function DebugBulkImport() {
  const [showModal, setShowModal] = useState(false);
  const [weeklyActivities, setWeeklyActivities] = useState<ActivityRow[]>([
    { description: "1. Test activity", percent: 50 }
  ]);
  const [nextWeekPlan, setNextWeekPlan] = useState<ActivityRow[]>([
    { description: "1. Next week test", percent: 25 }
  ]);
  const [lastImport, setLastImport] = useState<string>("");

  const handleBulkImport = (importedWeekly: ActivityRow[], importedNext: ActivityRow[]) => {
    console.log("Bulk import triggered:", { importedWeekly, importedNext });
    
    const newWeeklyActivities = [...weeklyActivities, ...importedWeekly];
    const newNextWeekPlan = [...nextWeekPlan, ...importedNext];
    
    setWeeklyActivities(newWeeklyActivities);
    setNextWeekPlan(newNextWeekPlan);
    setLastImport(`Imported ${importedWeekly.length} weekly + ${importedNext.length} next week activities`);
    
    console.log("Updated state:", { newWeeklyActivities, newNextWeekPlan });
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Bulk Import Debug Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Test Button */}
            <Button 
              onClick={() => setShowModal(true)}
              className="w-full"
              size="lg"
            >
              <Upload className="w-4 h-4 mr-2" />
              Test Bulk Import Modal
            </Button>

            {/* Status */}
            {lastImport && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">{lastImport}</span>
              </div>
            )}

            {/* Current State */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Weekly Activities ({weeklyActivities.length})</h4>
                <div className="space-y-1 text-sm bg-muted p-3 rounded">
                  {weeklyActivities.map((activity, index) => (
                    <div key={index}>
                      {activity.description} - {activity.percent}%
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Next Week Plan ({nextWeekPlan.length})</h4>
                <div className="space-y-1 text-sm bg-muted p-3 rounded">
                  {nextWeekPlan.map((activity, index) => (
                    <div key={index}>
                      {activity.description} - {activity.percent}%
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Debug Info */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-sm">Debug Info</span>
              </div>
              <div className="text-xs space-y-1">
                <div>Modal State: {showModal ? "Open" : "Closed"}</div>
                <div>Weekly Activities: {weeklyActivities.length} items</div>
                <div>Next Week Plan: {nextWeekPlan.length} items</div>
                <div>Last Import: {lastImport || "None"}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      <BulkActivitiesModal
        open={showModal}
        onOpenChange={setShowModal}
        onImport={handleBulkImport}
      />
    </div>
  );
}
