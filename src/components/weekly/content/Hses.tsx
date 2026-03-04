import React from "react";
import HsesTableComponent from "./HsesTableComponent";
import ReferenceSection from "../../ReferenceSection";
import { createReferenceSection } from "@/utils/referenceHelpers";
import { HsesData, HsesProps } from "@/types/hses.types";
import { createHSESections } from "@/utils/hseSectionUtils";

const Hses: React.FC<HsesProps> = ({ data, onChange, isEditing = false }) => {
  const hsesData = data || {
    training: [
      { typeOfTraining: "", date: "", venue: "", trainer: "", attendee: "", remarks: "" },
      { typeOfTraining: "", date: "", venue: "", trainer: "", attendee: "", remarks: "" },
      { typeOfTraining: "", date: "", venue: "", trainer: "", attendee: "", remarks: "" }
    ],
    inspection: [
      { typeOfInspection: "", date: "", inspector: "", remarks: "" },
      { typeOfInspection: "", date: "", inspector: "", remarks: "" },
      { typeOfInspection: "", date: "", inspector: "", remarks: "" }
    ],
    permit: [
      { typeOfPermit: "", startDate: "", endDate: "", inspector: "", approver: "", remarks: "" },
      { typeOfPermit: "", startDate: "", endDate: "", inspector: "", approver: "", remarks: "" },
      { typeOfPermit: "", startDate: "", endDate: "", inspector: "", approver: "", remarks: "" }
    ],
    firstAidAccident: "",
    otherActivities: "",
    hsePhotoReferences: createHSESections(),
  };

  const updateData = (section: keyof HsesData, value: any) => {
    const newData = { ...hsesData, [section]: value };
    onChange?.(newData);
  };

  return (
    <div className="space-y-6">
      {/* <h3 className="text-lg font-semibold text-gray-800">
        5. HEALTH, SAFETY, ENVIRONMENTAL & SECURITY (HSES)
      </h3> */}

      {/* 5.1 HSES Training */}
      <div className="section-card p-6">
        <div className="mb-3">
          <h4 className="text-md font-medium text-foreground flex items-center gap-2">
            <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">5.1</span> HSES Training / Introduction / Toolbox Meeting
          </h4>
        </div>
        <HsesTableComponent
          data={hsesData.training}
          onChange={(training) => updateData("training", training)}
          isEditing={isEditing}
          columns={[
            { key: "typeOfTraining", label: "Type of Training", type: "text", placeholder: "Enter training type", width: "450px" },
            { key: "date", label: "Date", type: "date" },
            { key: "venue", label: "Venue", type: "text", placeholder: "Enter venue" },
            { key: "trainer", label: "Trainer", type: "text", placeholder: "Enter trainer name" },
            { key: "attendee", label: "Attendee", type: "text", placeholder: "Enter attendee" },
            { key: "remarks", label: "Remarks", type: "text", placeholder: "Enter remarks" }
          ]}
          emptyMessage="No training records available"
          addButtonText="Add Training"
        />
      </div>

      {/* 5.2 HSES Inspection */}
      <div className="section-card p-6">
        <div className="mb-3">
          <h4 className="text-md font-medium text-foreground flex items-center gap-2">
            <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">5.2</span> HSES Inspection / Audit / Heavy Equipment / Hand&Power Tool
            Checklist
          </h4>
        </div>
        <HsesTableComponent
          data={hsesData.inspection}
          onChange={(inspection) => updateData("inspection", inspection)}
          isEditing={isEditing}
          columns={[
            { key: "typeOfInspection", label: "Type of Inspection", type: "text", placeholder: "Enter inspection type", width: "450px" },
            { key: "date", label: "Date", type: "date" },
            { key: "inspector", label: "Inspector", type: "text", placeholder: "Enter inspector name" },
            { key: "remarks", label: "Remarks", type: "text", placeholder: "Enter remarks" }
          ]}
          emptyMessage="No inspection records available"
          addButtonText="Add Inspection"
        />
      </div>

      {/* 5.3 Permit to Work */}
      <div className="section-card p-6">
        <div className="mb-3">
          <h4 className="text-md font-medium text-foreground flex items-center gap-2">
            <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">5.3</span> Permit to Work
          </h4>
        </div>
        <HsesTableComponent
          data={hsesData.permit}
          onChange={(permit) => updateData("permit", permit)}
          isEditing={isEditing}
          columns={[
            { key: "typeOfPermit", label: "Type of Permit", type: "text", placeholder: "Enter permit type", width: "450px" },
            { key: "startDate", label: "Start Date", type: "date" },
            { key: "endDate", label: "End Date", type: "date" },
            { key: "inspector", label: "Inspector", type: "text", placeholder: "Enter inspector name" },
            { key: "approver", label: "Approver", type: "text", placeholder: "Enter approver name" },
            { key: "remarks", label: "Remarks", type: "text", placeholder: "Enter remarks" }
          ]}
          emptyMessage="No permit records available"
          addButtonText="Add Permit"
        />
      </div>

      {/* 5.4 First Aid / Accident / Incident */}
      <div className="section-card p-6">
        <div className="mb-3">
          <h4 className="text-md font-medium text-foreground flex items-center gap-2">
            <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">5.4</span> First Aid / Accident / Incident / Near Miss / Fatalities (if Any)
          </h4>
        </div>
        {!isEditing ? (
          <div className="min-h-[100px] p-4 bg-muted/50 rounded-lg border border-border">
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {hsesData.firstAidAccident || 'No incidents recorded'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={hsesData.firstAidAccident}
              onChange={(e) => updateData("firstAidAccident", e.target.value)}
              placeholder="Enter details about first aid, accidents, incidents, near misses, or fatalities (if any)..."
              className="w-full min-h-[120px] p-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-y dark:bg-card dark:border-border"
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              Please provide detailed information about any first aid administered, accidents, incidents, near misses, or fatalities that occurred during this reporting period.
            </p>
          </div>
        )}
      </div>

      {/* 5.5 Other HSES Activities */}
      <div className="section-card p-6">
        <div className="mb-3">
          <h4 className="text-md font-medium text-foreground flex items-center gap-2">
            <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">5.5</span> Other HSES Activities Concerns
          </h4>
        </div>
        {!isEditing ? (
          <div className="min-h-[100px] p-4 bg-muted/50 rounded-lg border border-border">
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {hsesData.otherActivities || 'No other HSES activities recorded'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={hsesData.otherActivities}
              onChange={(e) => updateData("otherActivities", e.target.value)}
              placeholder="Enter details about other HSES activities and concerns..."
              className="w-full min-h-[120px] p-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-y dark:bg-card dark:border-border"
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              Please provide information about any other HSES-related activities, concerns, observations, or improvements that were implemented or identified during this reporting period.
            </p>
          </div>
        )}
      </div>

      {/* 5.6 HSES Photo Reference */}
      <div className="section-card p-6">
        <h4 className="text-md font-medium text-foreground mb-3 flex items-center gap-2">
          <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">5.6</span> HSES Photo Reference
        </h4>
        <ReferenceSection
          sections={hsesData.hsePhotoReferences}
          setSections={(sections) => updateData("hsePhotoReferences", sections)}
          hideTitle={false}
          hideShadow={true}
        />
      </div>
    </div>
  );
};

export default Hses;
