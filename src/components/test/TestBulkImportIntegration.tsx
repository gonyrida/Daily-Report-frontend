// src/components/test/TestBulkImportIntegration.tsx
// Test component to verify bulk import integration

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";
import { ActivityRow } from "@/types/activity.types";
import Activities from "@/components/weekly/content/Activities";

export default function TestBulkImportIntegration() {
  const [weeklyActivities, setWeeklyActivities] = useState<ActivityRow[]>([
    { description: "1. Existing activity", percent: 50 }
  ]);
  const [nextWeekPlan, setNextWeekPlan] = useState<ActivityRow[]>([
    { description: "1. Existing next week", percent: 25 }
  ]);
  const [importCount, setImportCount] = useState(0);

  const handleBulkImport = (importedWeekly: ActivityRow[], importedNext: ActivityRow[]) => {
    console.log("Bulk import test:", { importedWeekly, importedNext });
    
    const newWeeklyActivities = [...weeklyActivities, ...importedWeekly];
    const newNextWeekPlan = [...nextWeekPlan, ...importedNext];
    
    setWeeklyActivities(newWeeklyActivities);
    setNextWeekPlan(newNextWeekPlan);
    setImportCount(importCount + 1);
    
    console.log("Updated state:", { newWeeklyActivities, newNextWeekPlan });
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Bulk Import Integration Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">
                Integration Active - Bulk import should work in Activities component
              </span>
            </div>

            {/* Import Counter */}
            {importCount > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                <span className="text-sm">
                  Bulk imports performed: <strong>{importCount}</strong>
                </span>
              </div>
            )}

            {/* Current State */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Weekly Activities ({weeklyActivities.length})</h4>
                <div className="space-y-1 text-sm bg-muted p-3 rounded max-h-32 overflow-y-auto">
                  {weeklyActivities.map((activity, index) => (
                    <div key={index}>
                      {activity.description} - {activity.percent}%
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Next Week Plan ({nextWeekPlan.length})</h4>
                <div className="space-y-1 text-sm bg-muted p-3 rounded max-h-32 overflow-y-auto">
                  {nextWeekPlan.map((activity, index) => (
                    <div key={index}>
                      {activity.description} - {activity.percent}%
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Test Instructions */}
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="font-medium text-sm">Test Instructions</span>
              </div>
              <ol className="text-sm space-y-1 list-decimal list-inside">
                <li>Go to Activities tab in your weekly report</li>
                <li>Click the purple "Bulk Import" button</li>
                <li>Click "Load Example" to see sample data</li>
                <li>Click "Import" to add activities</li>
                <li>Check if activities appear in both sections below</li>
              </ol>
            </div>

            {/* Activities Component Test */}
            <div className="border-2 border-dashed rounded p-4">
              <h4 className="font-medium mb-2">Activities Component Test:</h4>
              <Activities
                weeklyActivities={weeklyActivities}
                setWeeklyActivities={setWeeklyActivities}
                nextWeekPlan={nextWeekPlan}
                setNextWeekPlan={setNextWeekPlan}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
