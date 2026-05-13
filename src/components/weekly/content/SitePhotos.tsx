import React from "react";
import ReferenceSection from "../../ReferenceSection";
import { createDefaultSiteActivitiesSections } from "@/utils/referenceHelpers";
import { RefreshCw, ImageIcon } from "lucide-react";
import { updateReportImages, previewAggregatedImages } from "@/services/weeklyReportService";

interface SitePhotosProps {
  data?: {
    title?: string;
    locations?: any[];
  };
  onChange?: (data: any) => void;
  isEditing?: boolean;
  reportId?: string;
  sharedData?: any;
  isMasterMode?: boolean;
}

/**
 * Flatten all image slots from every project section into a single section
 * with sequential 2-slot entries.
 *
 * Rules:
 * - Only slots that contain an actual image are collected.
 * - Images are paired globally — the boundary between project sections is
 *   ignored so no entry is wasted.
 * - If the total image count is odd, the last entry gets one empty slot.
 * - Stable positional IDs (flat-entry-N, flat-slot-N) ensure React does not
 *   remount Entry/Slot components when captions are edited.
 */
function flattenToSingleSection(locations: any[]): any[] {
  const allImages: { image: any; caption: string }[] = [];

  (locations || []).forEach((loc) => {
    (loc.entries || []).forEach((entry: any) => {
      (entry.slots || []).forEach((slot: any) => {
        if (slot.image !== null && slot.image !== undefined && slot.image !== "") {
          allImages.push({ image: slot.image, caption: slot.caption || "" });
        }
      });
    });
  });

  const entries: any[] = [];
  for (let i = 0; i < allImages.length; i += 2) {
    entries.push({
      id: `flat-entry-${Math.floor(i / 2)}`,
      slots: [
        {
          id: `flat-slot-${i}`,
          image: allImages[i].image,
          caption: allImages[i].caption,
        },
        {
          id: `flat-slot-${i + 1}`,
          image: allImages[i + 1]?.image ?? null,
          caption: allImages[i + 1]?.caption ?? "",
        },
      ],
    });
  }

  // Always keep at least one entry so the upload button area renders
  if (entries.length === 0) {
    entries.push({
      id: "flat-entry-0",
      slots: [
        { id: "flat-slot-0", image: null, caption: "" },
        { id: "flat-slot-1", image: null, caption: "" },
      ],
    });
  }

  return [{ id: "master-photos-flat", title: "", entries }];
}

const SitePhotos: React.FC<SitePhotosProps> = ({
  data,
  onChange,
  isEditing = false,
  reportId,
  sharedData,
  isMasterMode = false,
}) => {
  const [isAggregating, setIsAggregating] = React.useState(false);

  const photosData = data || {
    title: "Site Activities Photos",
    locations: createDefaultSiteActivitiesSections(),
  };

  // ── Master-mode normalization ────────────────────────────────────────────
  // When the master report first loads it has one PhotoLocation per project.
  // We flatten those into a single section once and update the parent state
  // so all subsequent edits operate on the already-flat structure.
  // Keyed on `locations.length` so it only fires when the count changes
  // (i.e. on initial load), never on caption edits or individual uploads.
  React.useEffect(() => {
    if (!isMasterMode) return;
    const locs = data?.locations;
    if (!locs || locs.length <= 1) return;
    onChange?.({
      title: data?.title || "Site Activities Photos",
      locations: flattenToSingleSection(locs),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMasterMode, data?.locations?.length]);

  // Compute display sections synchronously so the first render already shows
  // the flat layout — no visible flash before the effect above runs.
  const displayedSections: any[] = isMasterMode
    ? photosData.locations?.length === 1
      ? photosData.locations
      : flattenToSingleSection(photosData.locations ?? [])
    : photosData.locations ?? createDefaultSiteActivitiesSections();

  const handleSetSections = (sections: any[]) => {
    onChange?.({ title: photosData.title || "Site Activities Photos", locations: sections });
  };

  // ── Aggregate from daily reports (single-report mode only) ───────────────
  const handleAggregateSitePhotos = async () => {
    if (!sharedData?.dateRange || (!sharedData?.projectId && !sharedData?.projectName)) return;

    setIsAggregating(true);
    try {
      const dateRangeStr = sharedData.dateRange.trim().replace(/\s*~\s*/, "~");
      const [startDateStr, endDateStr] = dateRangeStr.split("~");

      const parseDate = (dateStr: string) => {
        const clean = dateStr.trim();
        const [day, month, year] = clean.split("-");
        const monthMap: Record<string, string> = {
          Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
          Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
        };
        return `20${year}-${monthMap[month]}-${day.padStart(2, "0")}`;
      };

      const startDate = parseDate(startDateStr);
      const endDate = parseDate(endDateStr);

      if (reportId) {
        const result = await updateReportImages(reportId, { maxImagesPerReport: Infinity });
        if (result.success && result.data) {
          onChange?.(result.data.sections?.photos);
        }
      } else {
        const projectIdentifier = sharedData.projectId || sharedData.projectName;
        const result = await previewAggregatedImages(projectIdentifier, startDate, endDate, {
          useProjectId: !!sharedData.projectId,
          maxImagesPerReport: Infinity,
        });
        if (result.success && result.data) {
          onChange?.(
            result.data.photosSection || { title: "Site Activities Photos", locations: [] }
          );
          alert(
            `✅ Preview: ${result.data.sitePhotoCount || 0} site photos from ${result.data.dailyReportCount || 0} daily reports. Will be saved when you save the report.`
          );
        } else {
          alert(`Aggregation failed: ${result.error}`);
        }
      }
    } catch (error) {
      console.error("Error aggregating site photos:", error);
    } finally {
      setIsAggregating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">
            7
          </span>{" "}
          Site Activity Photos
        </h3>

        {/* Aggregate button is only relevant for single-project reports */}
        {!isMasterMode && (
          <button
            onClick={handleAggregateSitePhotos}
            disabled={
              isAggregating ||
              !sharedData?.dateRange ||
              (!sharedData?.projectId && !sharedData?.projectName)
            }
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={
              !sharedData?.dateRange || (!sharedData?.projectId && !sharedData?.projectName)
                ? "Project and date range are required"
                : reportId
                ? "Aggregate images from daily reports"
                : "Preview images (will save when report is saved)"
            }
          >
            <ImageIcon className="w-4 h-4" />
            <RefreshCw className={`w-4 h-4 ${isAggregating ? "animate-spin" : ""}`} />
            {isAggregating ? "Aggregating..." : reportId ? "Aggregate Images" : "Preview Images"}
          </button>
        )}
      </div>

      <ReferenceSection
        sections={displayedSections}
        setSections={handleSetSections}
        hideTitle={true}
        hideShadow={true}
      />
    </div>
  );
};

export default SitePhotos;
