// src/components/weekly/content/ActivityPreview.tsx
// Preview component for displaying parsed activities before import

import { ParsedActivity } from "@/utils/bulkActivitiesParser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface ActivityPreviewProps {
  activities: ParsedActivity[];
  showInvalid?: boolean;
  className?: string;
}

export default function ActivityPreview({ 
  activities, 
  showInvalid = false,
  className = ""
}: ActivityPreviewProps) {
  const filteredActivities = showInvalid 
    ? activities 
    : activities.filter(a => a.isValid);

  const getTypeColor = (type: ParsedActivity['type']) => {
    switch (type) {
      case 'title': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'detail': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'sub-detail': return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  const getTypeIcon = (type: ParsedActivity['type']) => {
    switch (type) {
      case 'title': return '📋';
      case 'detail': return '📝';
      case 'sub-detail': return '•';
    }
  };

  const getValidationIcon = (activity: ParsedActivity) => {
    if (activity.isValid) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  if (filteredActivities.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground">
            {showInvalid ? "No activities to display" : "No valid activities to display"}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Activity Preview</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {filteredActivities.filter(a => a.isValid).length} valid
            </Badge>
            {showInvalid && (
              <Badge variant="destructive">
                {filteredActivities.filter(a => !a.isValid).length} invalid
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {filteredActivities.map((activity, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border transition-colors ${getTypeColor(activity.type)}`}
            >
              <div className="flex items-start gap-3">
                {/* Type Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {getTypeIcon(activity.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {/* Display Index */}
                    <span className="font-medium text-sm text-muted-foreground">
                      {activity.displayIndex}
                    </span>

                    {/* Validation Status */}
                    {getValidationIcon(activity)}

                    {/* Percentage Badge */}
                    {activity.percent > 0 && (
                      <Badge 
                        variant={activity.percent === 100 ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {activity.percent}%
                      </Badge>
                    )}
                  </div>

                  {/* Description */}
                  <div className="text-sm break-words">
                    {activity.description}
                  </div>

                  {/* Errors */}
                  {activity.errors && activity.errors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {activity.errors.map((error, errorIndex) => (
                        <div 
                          key={errorIndex}
                          className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Level Indicator */}
                <div className="flex-shrink-0">
                  <div className="text-xs text-muted-foreground">
                    Level {activity.level}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Statistics */}
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-blue-600">
                {filteredActivities.filter(a => a.type === 'title').length}
              </div>
              <div className="text-muted-foreground">Titles</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-green-600">
                {filteredActivities.filter(a => a.type === 'detail').length}
              </div>
              <div className="text-muted-foreground">Details</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-600">
                {filteredActivities.filter(a => a.type === 'sub-detail').length}
              </div>
              <div className="text-muted-foreground">Sub-details</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-purple-600">
                {filteredActivities.reduce((sum, a) => sum + a.percent, 0)}%
              </div>
              <div className="text-muted-foreground">Total %</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
