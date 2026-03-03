// src/pages/test-bulk-activities.tsx
// Test page for bulk activities functionality

import { useState } from "react";
import BulkActivitiesDemo from "@/components/weekly/content/BulkActivitiesDemo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TestBulkActivitiesPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Bulk Activities Test</h1>
          <p className="text-muted-foreground">Test the bulk activities input system</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <strong>1. Click "Open Bulk Input" button</strong>
              <p className="text-muted-foreground">This opens the bulk input modal</p>
            </div>
            <div>
              <strong>2. Try the example data</strong>
              <p className="text-muted-foreground">Click "Load Example" to see the format</p>
            </div>
            <div>
              <strong>3. Test your own input</strong>
              <p className="text-muted-foreground">Try pasting hierarchical activities</p>
            </div>
            <div>
              <strong>4. Check the preview</strong>
              <p className="text-muted-foreground">Watch the live preview as you type</p>
            </div>
            <div>
              <strong>5. Import activities</strong>
              <p className="text-muted-foreground">Click "Import" to add them to the lists</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <BulkActivitiesDemo />
    </div>
  );
}
