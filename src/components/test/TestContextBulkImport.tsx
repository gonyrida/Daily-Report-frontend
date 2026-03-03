// src/components/test/TestContextBulkImport.tsx
// Test component to verify context-based bulk import

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";
import { ActivityRow } from "@/types/activity.types";
import Activities from "@/components/weekly/content/Activities";

export default function TestContextBulkImport() {
  const [weeklyActivities, setWeeklyActivities] = useState<ActivityRow[]>([
    { description: "1. Existing weekly activity", percent: 50 }
  ]);
  const [nextWeekPlan, setNextWeekPlan] = useState<ActivityRow[]>([
    { description: "1. Existing next week activity", percent: 25 }
  ]);

  return (
    <div className="space-y-6 p-6 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Context-Based Bulk Import Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">
                ✅ Context-aware bulk import is now active!
              </span>
            </div>

            {/* Instructions */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-sm">Test Instructions</span>
              </div>
              <ol className="text-sm space-y-1 list-decimal list-inside">
                <li>Click <strong>"Bulk Import"</strong> in the <strong>Activities Of Work Done</strong> card</li>
                <li>Modal title should show <strong>"Bulk Activities Input - Activities Of Work Done"</strong></li>
                <li>Import activities and they should appear <strong>only</strong> in the weekly card</li>
                <li>Click <strong>"Bulk Import"</strong> in the <strong>Next Week Plan</strong> card</li>
                <li>Modal title should show <strong>"Bulk Activities Input - Next Week Plan"</strong></li>
                <li>Import activities and they should appear <strong>only</strong> in the next week card</li>
              </ol>
            </div>

            {/* Current State Display */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-3 bg-muted rounded">
                <h4 className="font-medium mb-2">Activities Of Work Done ({weeklyActivities.length})</h4>
                <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
                  {weeklyActivities.map((activity, index) => (
                    <div key={index} className="p-1 bg-white dark:bg-gray-800 rounded">
                      {activity.description} - {activity.percent}%
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-3 bg-muted rounded">
                <h4 className="font-medium mb-2">Next Week Plan ({nextWeekPlan.length})</h4>
                <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
                  {nextWeekPlan.map((activity, index) => (
                    <div key={index} className="p-1 bg-white dark:bg-gray-800 rounded">
                      {activity.description} - {activity.percent}%
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Activities Component Test */}
            <div className="border-2 border-dashed rounded p-4">
              <h4 className="font-medium mb-2">Live Activities Component:</h4>
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
