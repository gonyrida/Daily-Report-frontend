// src/components/weekly/content/BulkActivitiesInput.tsx
// Bulk input component for hierarchical activities with Roman numerals, numbers, and bullets

import { useState, useEffect } from "react";
import { 
  Upload, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Eye,
  EyeOff,
  Copy,
  HelpCircle,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  parseBulkActivities, 
  convertToActivityRows, 
  generateExampleInput,
  formatActivitiesForDisplay,
  type ParseResult,
  type ParsedActivity
} from "@/utils/bulkActivitiesParser";
import { ActivityRow } from "@/types/activity.types";

interface BulkActivitiesInputProps {
  onImport: (weeklyActivities: ActivityRow[], nextWeekPlan: ActivityRow[]) => void;
  onClose?: () => void;
  context?: "weekly" | "next";
}

export default function BulkActivitiesInput({ onImport, onClose, context }: BulkActivitiesInputProps) {
  const [input, setInput] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [importMode, setImportMode] = useState<"all" | "weekly" | "next">(context || "all");
  const [activeTab, setActiveTab] = useState("input");

  // Parse input whenever it changes
  useEffect(() => {
    if (input.trim()) {
      const result = parseBulkActivities(input);
      setParseResult(result);
    } else {
      setParseResult(null);
    }
  }, [input]);

  // Load example input
  const loadExample = () => {
    setInput(generateExampleInput());
  };

  // Clear input
  const clearInput = () => {
    setInput("");
    setParseResult(null);
  };

  // Import activities
  const handleImport = () => {
    if (!parseResult || parseResult.summary.validActivities === 0) return;

    const validActivities = parseResult.activities.filter(a => a.isValid);
    
    let weeklyActivities: ActivityRow[] = [];
    let nextWeekPlan: ActivityRow[] = [];
    
    // Generate unique bulk import ID and timestamp
    const bulkImportId = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const addedAt = new Date();
    
    if (context) {
      // Use context to determine where to put activities
      if (context === "weekly") {
        weeklyActivities = validActivities.map(activity => ({
          description: activity.displayIndex + " " + activity.description,
          percent: activity.percent,
          source: "bulk",
          bulkImportId,
          addedAt
        }));
      } else if (context === "next") {
        nextWeekPlan = validActivities.map(activity => ({
          description: activity.displayIndex + " " + activity.description,
          percent: activity.percent,
          source: "bulk",
          bulkImportId,
          addedAt
        }));
      }
    } else {
      // Use import mode when no context is provided
      if (importMode === "all") {
        // Split activities: first half to weekly, second half to next
        const midPoint = Math.floor(validActivities.length / 2);
        const weeklyParsed = validActivities.slice(0, midPoint);
        const nextParsed = validActivities.slice(midPoint);
        
        weeklyActivities = weeklyParsed.map(activity => ({
          description: activity.displayIndex + " " + activity.description,
          percent: activity.percent,
          source: "bulk",
          bulkImportId,
          addedAt
        }));
        
        nextWeekPlan = nextParsed.map(activity => ({
          description: activity.displayIndex + " " + activity.description,
          percent: activity.percent,
          source: "bulk",
          bulkImportId,
          addedAt
        }));
      } else if (importMode === "weekly") {
        weeklyActivities = validActivities.map(activity => ({
          description: activity.displayIndex + " " + activity.description,
          percent: activity.percent,
          source: "bulk",
          bulkImportId,
          addedAt
        }));
      } else if (importMode === "next") {
        nextWeekPlan = validActivities.map(activity => ({
          description: activity.displayIndex + " " + activity.description,
          percent: activity.percent,
          source: "bulk",
          bulkImportId,
          addedAt
        }));
      }
    }

    console.log("Bulk import:", { context, weeklyActivities, nextWeekPlan });

    onImport(weeklyActivities, nextWeekPlan);
    onClose?.();
  };

  // Copy formatted activities
  const copyFormatted = async () => {
    if (!parseResult) return;
    
    const formatted = formatActivitiesForDisplay(parseResult.activities.filter(a => a.isValid));
    await navigator.clipboard.writeText(formatted);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-lg font-semibold">Bulk Activities Input</h3>
          <p className="text-sm text-muted-foreground">
            Enter multiple activities at once using hierarchical numbering
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadExample}>
            <FileText className="w-4 h-4 mr-1" />
            Load Example
          </Button>
          <Button variant="outline" size="sm" onClick={clearInput}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Import Mode Selector - only show if no specific context */}
        {!context && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded">
            <span className="text-sm font-medium">Import to:</span>
            <div className="flex gap-1">
              <Button
                variant={importMode === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setImportMode("all")}
              >
                All (Split)
              </Button>
              <Button
                variant={importMode === "weekly" ? "default" : "outline"}
                size="sm"
                onClick={() => setImportMode("weekly")}
              >
                Weekly Only
              </Button>
              <Button
                variant={importMode === "next" ? "default" : "outline"}
                size="sm"
                onClick={() => setImportMode("next")}
              >
                Next Week Only
              </Button>
            </div>
          </div>
        )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="input">Input</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="help">Format Guide</TabsTrigger>
        </TabsList>

        {/* Input Tab */}
        <TabsContent value="input" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Input Area */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Activities Input</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter activities with hierarchical numbering..."
                className="min-h-[400px] font-mono text-sm"
                rows={15}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{input.split('\n').length} lines</span>
                <span>{input.length} characters</span>
              </div>
            </div>

            {/* Live Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Live Preview</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              
              {showPreview && parseResult && (
                <Card className="min-h-[400px]">
                  <CardContent className="p-4">
                    {parseResult.summary.validActivities > 0 ? (
                      <div className="space-y-2">
                        {parseResult.activities
                          .filter(a => a.isValid)
                          .map((activity, index) => (
                            <div
                              key={index}
                              className={`p-2 rounded text-sm ${
                                activity.type === 'title' 
                                  ? 'bg-blue-50 dark:bg-blue-900/20 font-semibold'
                                  : activity.type === 'detail'
                                  ? 'bg-green-50 dark:bg-green-900/20 ml-4'
                                  : 'bg-gray-50 dark:bg-gray-900/20 ml-8'
                              }`}
                            >
                              <span className="text-muted-foreground">
                                {activity.displayIndex}
                              </span>{" "}
                              {activity.description}
                              {activity.percent > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                  {activity.percent}%
                                </Badge>
                              )}
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        No valid activities to preview
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          {parseResult && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {parseResult.summary.totalActivities}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Activities</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {parseResult.summary.validActivities}
                    </div>
                    <div className="text-sm text-muted-foreground">Valid</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {parseResult.summary.invalidActivities}
                    </div>
                    <div className="text-sm text-muted-foreground">Invalid</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {parseResult.summary.totalPercentage}%
                    </div>
                    <div className="text-sm text-muted-foreground">Total %</div>
                  </CardContent>
                </Card>
              </div>

              {/* Errors and Warnings */}
              {(parseResult.errors.length > 0 || parseResult.warnings.length > 0) && (
                <div className="space-y-2">
                  {parseResult.errors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="font-medium mb-2">Errors ({parseResult.errors.length}):</div>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {parseResult.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {parseResult.warnings.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="font-medium mb-2">Warnings ({parseResult.warnings.length}):</div>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {parseResult.warnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Formatted Output */}
              {parseResult.summary.validActivities > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Formatted Output</CardTitle>
                      <Button variant="outline" size="sm" onClick={copyFormatted}>
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-sm bg-muted p-4 rounded overflow-auto">
                      {formatActivitiesForDisplay(parseResult.activities.filter(a => a.isValid))}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Help Tab */}
        <TabsContent value="help" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Format Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Supported Formats:</h4>
                <div className="space-y-2 text-sm bg-muted p-4 rounded">
                  <div><strong>Roman Numerals (Titles):</strong> I. Site Preparation</div>
                  <div><strong>Numbers (Details):</strong> 1. Clear vegetation</div>
                  <div><strong>Sub-numbers:</strong> 1.1 Remove trees</div>
                  <div><strong>Bullets (Sub-details):</strong> - Additional cleanup</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Percentage Format:</h4>
                <div className="space-y-2 text-sm bg-muted p-4 rounded">
                  <div>1. Clear vegetation - 100%</div>
                  <div>1.1 Remove trees - 85%</div>
                  <div>- Additional cleanup - 40%</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Complete Example:</h4>
                <pre className="text-sm bg-muted p-4 rounded overflow-auto">
{`I. Site Preparation
    1. Clear vegetation - 100%
    1.1 Remove trees - 85%
    1.2 Grade site - 60%
    - Additional cleanup - 40%

II. Foundation Work
    1. Excavation - 100%
    1.1 Footing excavation - 100%
    1.2 Backfilling - 75%
    - Compaction testing - 90%`}
                </pre>
              </div>

              <div>
                <h4 className="font-medium mb-2">Tips:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Use consistent indentation for better readability</li>
                  <li>Percentages are optional (defaults to 0%)</li>
                  <li>Empty lines are ignored</li>
                  <li>Copy-paste from Excel/Google Sheets works</li>
                  <li>Roman numerals automatically become title rows</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          onClick={handleImport}
          disabled={!parseResult || parseResult.summary.validActivities === 0}
        >
          <Upload className="w-4 h-4 mr-2" />
          Import {parseResult?.summary.validActivities || 0} to {context ? (context === "weekly" ? "Activities Of Work Done" : "Next Week Plan") : (importMode === "all" ? "Both Sections" : importMode === "weekly" ? "Weekly Activities" : "Next Week Plan")}
        </Button>
      </div>
    </div>
  );
}
