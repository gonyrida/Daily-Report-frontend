# Complete Activities Data Schema

## 📋 Overview
The activities data schema spans across frontend TypeScript interfaces, backend MongoDB models, and transformation utilities. Here's the complete structure:

---

## 🎨 Frontend Schema (TypeScript)

### ActivityRow Interface
```typescript
export interface ActivityRow {
  description: string;                    // Activity description
  percent: number;                        // Percentage (0-100)
  source?: "manual" | "bulk";           // How activity was added
  bulkImportId?: string;                  // Which bulk import batch
  addedAt?: Date;                        // When activity was added
}
```

### ActivitiesProps Interface
```typescript
export interface ActivitiesProps {
  weeklyActivities?: ActivityRow[];         // Work done activities
  setWeeklyActivities?: (rows: ActivityRow[]) => void;
  nextWeekPlan?: ActivityRow[];            // Next week plan activities
  setNextWeekPlan?: (rows: ActivityRow[]) => void;
  reportId?: string;                      // Current report ID for API calls
}
```

---

## 🗄️ Backend Schema (MongoDB)

### Daily Report Model Schema
```javascript
activities: {
  weeklyActivities: [{
    description: String,                                   // Activity description
    percent: { type: Number, default: 0 },                // Percentage as number
    source: { 
      type: String, 
      enum: ["manual", "bulk"], 
      default: "manual" 
    },                                                   // NEW: Track source
    bulkImportId: String,                                  // NEW: Batch tracking
    addedAt: { type: Date, default: Date.now },          // NEW: Timestamp
    
    // Legacy compatibility fields
    percentage: String,                                     // Old string format
    subActivities: [{                                     // Nested structure
      description: String,
      percentage: String,
      subActivities: [{
        description: String,
        percentage: String,
        subActivities: [{
          description: String,
          percentage: String
        }]
      }]
    }]
  }],
  
  nextWeekPlan: [{
    // Same structure as weeklyActivities
    description: String,
    percent: { type: Number, default: 0 },
    source: { 
      type: String, 
      enum: ["manual", "bulk"], 
      default: "manual" 
    },
    bulkImportId: String,
    addedAt: { type: Date, default: Date.now },
    
    // Legacy compatibility
    percentage: String,
    subActivities: [{...}] // Same nested structure
  }]
}
```

### Weekly Report Model Schema
```javascript
sections: {
  activities: {
    weeklyActivities: [{
      // Identical structure to Daily Report model
      description: String,
      percent: { type: Number, default: 0 },
      source: { 
        type: String, 
        enum: ["manual", "bulk"], 
        default: "manual" 
      },
      bulkImportId: String,
      addedAt: { type: Date, default: Date.now },
      
      // Legacy compatibility
      percentage: String,
      subActivities: [{...}] // Same nested structure
    }],
    
    nextWeekPlan: [{
      // Same structure as weeklyActivities
      description: String,
      percent: { type: Number, default: 0 },
      source: { 
        type: String, 
        enum: ["manual", "bulk"], 
        default: "manual" 
      },
      bulkImportId: String,
      addedAt: { type: Date, default: Date.now },
      
      // Legacy compatibility
      percentage: String,
      subActivities: [{...}] // Same nested structure
    }]
  }
}
```

---

## 🔄 Data Transformation Schema

### Frontend to Backend Transformation
```typescript
// Input: ActivityRow[]
// Output: BackendActivityRow[]
const transformFrontendToBackend = (activities: ActivityRow[]) => {
  return activities.map(activity => ({
    description: activity.description || "",
    percent: activity.percent || 0,
    source: activity.source || "manual",
    bulkImportId: activity.bulkImportId,
    addedAt: activity.addedAt || new Date(),
    
    // Legacy compatibility
    percentage: activity.percent ? activity.percent.toString() : "0",
    subActivities: activity.subActivities || []
  }));
};
```

### Backend to Frontend Transformation
```typescript
// Input: BackendActivityRow[]
// Output: ActivityRow[]
const transformBackendToFrontend = (activities: any[]) => {
  return activities.map(activity => ({
    description: activity.description || "",
    percent: activity.percent || 0,
    source: activity.source || "manual",
    bulkImportId: activity.bulkImportId,
    addedAt: activity.addedAt
  }));
};
```

---

## 📊 Database Document Example

### Complete Daily Report Document with Activities
```json
{
  "_id": "698eace46c7b770e92d18c4f",
  "userId": "698eace46c7b770e92d18c4f",
  "companyId": "698548ef9889163d13639650",
  "projectName": "Sample Project",
  "reportDate": "2024-12-27T00:00:00.000Z",
  "status": "draft",
  
  "activities": {
    "weeklyActivities": [
      {
        "description": "1. Clear vegetation",
        "percent": 100,
        "source": "bulk",
        "bulkImportId": "bulk_1640587200000_abc123def",
        "addedAt": "2024-12-27T10:00:00.000Z",
        "percentage": "100",
        "subActivities": []
      },
      {
        "description": "2. Manual entry activity",
        "percent": 75,
        "source": "manual",
        "bulkImportId": null,
        "addedAt": "2024-12-27T11:00:00.000Z",
        "percentage": "75",
        "subActivities": []
      }
    ],
    
    "nextWeekPlan": [
      {
        "description": "1. Foundation work",
        "percent": 50,
        "source": "bulk",
        "bulkImportId": "bulk_1640587200000_xyz456ghi",
        "addedAt": "2024-12-27T12:00:00.000Z",
        "percentage": "50",
        "subActivities": []
      }
    ]
  },
  
  // ... other report fields
  "createdAt": "2024-12-27T00:00:00.000Z",
  "updatedAt": "2024-12-27T12:00:00.000Z"
}
```

---

## 🔍 Field Details

### Core Fields
| Field | Type | Frontend | Backend | Description |
|-------|------|----------|----------|-------------|
| `description` | String | ✅ | ✅ | Activity description |
| `percent` | Number | ✅ | ✅ | Percentage (0-100) |
| `source` | Enum | ✅ | ✅ | "manual" or "bulk" |
| `bulkImportId` | String | ✅ | ✅ | Batch identifier |
| `addedAt` | Date | ✅ | ✅ | Creation timestamp |

### Legacy Fields
| Field | Type | Purpose |
|-------|------|---------|
| `percentage` | String | Old string format (backward compatibility) |
| `subActivities` | Array | Nested structure (legacy support) |

---

## 🎯 Key Features

### ✅ Bulk Import Tracking
- **Source Identification**: Manual vs Bulk entries
- **Batch Tracking**: Group activities by import session
- **Timestamp Tracking**: When each activity was added
- **Audit Trail**: Complete history of activity additions

### ✅ Backward Compatibility
- **Legacy Fields**: Maintained for existing data
- **Nested Structure**: Preserved for old format
- **Dual Storage**: Both new and old formats stored

### ✅ Data Integrity
- **Type Safety**: Number vs String for percentages
- **Validation**: Enum validation for source types
- **Consistency**: Uniform structure across models

---

## 🚀 API Endpoints

### Bulk Import Operations
```
POST /daily-reports/:reportId/bulk-import
GET  /daily-reports/bulk-import/:bulkId
GET  /daily-reports/bulk-import/stats
```

### Data Flow
```
Frontend ActivityRow[] 
    ↓ transformFrontendToBackend()
Backend ActivityRow[]
    ↓ Save to MongoDB
Database Document
    ↓ transformBackendToFrontend()
Frontend ActivityRow[]
```

This complete schema ensures full bulk import tracking while maintaining backward compatibility with existing data! 🎯
