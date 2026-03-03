// src/components/test/BulkActivitiesTest.tsx
// Simple test component for bulk activities functionality

import { useState } from "react";
import BulkActivitiesDemo from "@/components/weekly/content/BulkActivitiesDemo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, Upload, Eye } from "lucide-react";

export default function BulkActivitiesTest() {
  const [showDemo, setShowDemo] = useState(true);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Upload className="w-6 h-6" />
            Bulk Activities Test Suite
          </h1>
          <p className="text-muted-foreground">Test the bulk activities input system</p>
        </div>
        <Button variant="outline" onClick={() => setShowDemo(!showDemo)}>
          {showDemo ? <Eye className="w-4 h-4 mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
          {showDemo ? "Hide Demo" : "Show Demo"}
        </Button>
      </div>

      {/* Test Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Quick Test Steps
              </h3>
              <ol className="space-y-2 text-sm">
                <li>1. Click "Open Bulk Input" button below</li>
                <li>2. Click "Load Example" to see sample format</li>
                <li>3. Try editing the input text</li>
                <li>4. Watch the live preview update</li>
                <li>5. Click "Import" to test functionality</li>
              </ol>
            </div>
            
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Test These Features
              </h3>
              <ul className="space-y-2 text-sm">
                <li>✓ Roman numerals (I, II, III)</li>
                <li>✓ Numbered items (1, 1.1, 1.1.1)</li>
                <li>✓ Bullet points (-)</li>
                <li>✓ Percentage parsing (- 85%)</li>
                <li>✓ Error validation</li>
                <li>✓ Live preview</li>
                <li>✓ Import functionality</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Data for Testing */}
      <Card>
        <CardHeader>
          <CardTitle>Sample Test Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Copy and paste this to test:</h4>
              <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
{`I. Site Preparation
    1. Clear vegetation - 100%
    1.1 Remove trees - 85%
    1.2 Grade site - 60%
    - Additional cleanup - 40%

II. Foundation Work
    1. Excavation - 100%
    1.1 Footing excavation - 100%
    1.2 Backfilling - 75%
    - Compaction testing - 90%

III. Structural Work
    1. Column construction - 80%
    1.1 Reinforcement - 90%
    1.2 Concrete pouring - 70%
    - Curing process - 50%`}
              </pre>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Test invalid data:</h4>
              <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
{`Invalid line without prefix
I. Title with no description
1. Detail - 150% (invalid percentage)
2. Another detail - -10% (negative)
- Bullet with no desc`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Component */}
      {showDemo && (
        <Card>
          <CardHeader>
            <CardTitle>Live Demo</CardTitle>
          </CardHeader>
          <CardContent>
            <BulkActivitiesDemo />
          </CardContent>
        </Card>
      )}

      {/* Test Results Log */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Test Results Log</CardTitle>
              <Button variant="outline" size="sm" onClick={clearResults}>
                Clear Log
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded max-h-48 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono">
                  {result}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
