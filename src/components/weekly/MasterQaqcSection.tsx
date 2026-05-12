// src/components/weekly/MasterQaqcSection.tsx
// Read-only component for displaying aggregated QAQC data from multiple projects

import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import type { MasterQaqcSection, MasterQaqcItem } from '@/types/masterReport.types';

// Section mapping from backend keys to frontend display
const SECTION_DISPLAY_MAP: Record<string, { id: string; title: string }> = {
  ncr: { id: '4.1', title: 'Non-Conformance Report (NCR)' },
  car: { id: '4.2', title: 'Corrective Action Request (CAR)' },
  scar: { id: '4.3', title: 'Site Clarification Request (SCR)' },
  pmsi: { id: '4.4', title: 'Pre-Material/Service Inspection (PMSI)' },
  csi: { id: '4.5', title: 'Client Site Instruction (CSI)' },
  ir: { id: '4.6', title: 'Inspection Request (IR)' },
  mfa: { id: '4.7', title: 'Material Failure Analysis (MFA)' },
  rfi: { id: '4.8', title: 'Request for Information (RFI)' },
  rfa: { id: '4.9', title: 'Request for Approval (RFA)' },
  fcr: { id: '4.10', title: 'Field Change Request (FCR)' },
  vo: { id: '4.11', title: 'Variation Order (VO)' },
  tr: { id: '4.12', title: 'Technical Review (TR)' },
  mir: { id: '4.13', title: 'Material Inspection Report (MIR)' },
};

// Status color mapping
const getStatusColor = (status?: string) => {
  switch (status?.toLowerCase()) {
    case 'approved':
    case 'approved with condition':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'respond':
    case 'resubmit':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'submit':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'not approved':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusIcon = (status?: string) => {
  switch (status?.toLowerCase()) {
    case 'approved':
    case 'approved with condition':
      return <CheckCircle className="h-3 w-3" />;
    case 'pending':
      return <Clock className="h-3 w-3" />;
    case 'not approved':
      return <AlertTriangle className="h-3 w-3" />;
    default:
      return null;
  }
};

interface MasterQaqcSectionProps {
  qaqcData: Record<string, MasterQaqcSection>;
}

const MasterQaqcSection: React.FC<MasterQaqcSectionProps> = ({ qaqcData }) => {
  // Helper to create empty rows for default display
  const createEmptyRows = (count: number): MasterQaqcItem[] => {
    return Array(count).fill(null).map(() => ({
      code: '',
      description: '',
      status: '',
      dateResponded: '',
      projectSource: '',
    }));
  };

  // Get section headers based on section ID (same as QaqcStatusNew)
  const getSectionHeaders = (sectionId: string) => {
    switch (sectionId) {
      case '4.5': // Client Site Instruction (SI)
        return [
          { key: '#', label: '#', width: 'w-12' },
          { key: 'code', label: 'Code', width: 'min-w-36' },
          { key: 'description', label: 'Description', width: 'min-w-48' },
          { key: 'issuedBy', label: 'Issued By', width: 'min-w-36' },
          { key: 'issuedDate', label: 'Issued Date', width: 'w-32' },
          { key: 'projectSource', label: 'Project', width: 'min-w-32' }
        ];
      case '4.6': // Inspection Request (IR)
        return [
          { key: '#', label: '#', width: 'w-12' },
          { key: 'code', label: 'Code', width: 'min-w-36' },
          { key: 'description', label: 'Description', width: 'min-w-48' },
          { key: 'receivedDate', label: 'Received Date', width: 'w-32' },
          { key: 'inspectionDate', label: 'Inspection Date', width: 'w-32' },
          { key: 'projectSource', label: 'Project', width: 'min-w-32' }
        ];
      default:
        return [
          { key: '#', label: '#', width: 'w-12' },
          { key: 'code', label: 'Code', width: 'min-w-36' },
          { key: 'description', label: 'Description', width: 'min-w-48' },
          { key: 'status', label: 'Status', width: 'min-w-36' },
          { key: 'dateResponse', label: 'Date Submit/Response', width: 'w-32' },
          { key: 'projectSource', label: 'Project', width: 'min-w-32' }
        ];
    }
  };

  // Transform and group data by project
  const transformedData = useMemo(() => {
    const result: Record<string, {
      id: string;
      title: string;
      items: MasterQaqcItem[];
      comments: string;
      projectGroups: Record<string, MasterQaqcItem[]>;
    }> = {};

    Object.entries(qaqcData).forEach(([backendKey, section]) => {
      const displayInfo = SECTION_DISPLAY_MAP[backendKey];
      if (!displayInfo) return;

      // Group items by project source
      const projectGroups: Record<string, MasterQaqcItem[]> = {};
      section.items.forEach(item => {
        const project = item.projectSource || 'Unknown Project';
        if (!projectGroups[project]) {
          projectGroups[project] = [];
        }
        projectGroups[project].push(item);
      });

      result[displayInfo.id] = {
        id: displayInfo.id,
        title: displayInfo.title,
        items: section.items,
        comments: section.comments,
        projectGroups,
      };
    });

    return result;
  }, [qaqcData]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    let totalItems = 0;
    let pendingItems = 0;
    let approvedItems = 0;
    const projectCounts: Record<string, number> = {};

    Object.values(transformedData).forEach(section => {
      totalItems += section.items.length;
      section.items.forEach(item => {
        const project = item.projectSource || 'Unknown Project';
        projectCounts[project] = (projectCounts[project] || 0) + 1;

        switch (item.status?.toLowerCase()) {
          case 'pending':
            pendingItems++;
            break;
          case 'approved':
          case 'approved with condition':
            approvedItems++;
            break;
        }
      });
    });

    return {
      totalItems,
      pendingItems,
      approvedItems,
      projectCounts,
      totalProjects: Object.keys(projectCounts).length,
    };
  }, [transformedData]);

  
  return (
    <div className="space-y-4">
      {/* QAQC Sections - Always show all sections with default 5 rows */}
      {Object.entries(SECTION_DISPLAY_MAP)
        .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
        .map(([backendKey, displayInfo]) => {
          const sectionId = displayInfo.id;
          const sectionData = transformedData[sectionId];
          const headers = getSectionHeaders(sectionId);
          
          // Use existing data or create default 5 empty rows
          const displayItems = sectionData?.items.length > 0 
            ? sectionData.items 
            : createEmptyRows(5);
          
          const displayComments = sectionData?.comments || '';
          
          return (
            <div key={sectionId} id={`section-${sectionId}`}>
              <div className="section-card p-6">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">
                        {sectionId}
                      </span>
                      <h3 className="text-lg font-semibold text-foreground">{displayInfo.title}</h3>
                    </div>
                    {displayItems.length > 0 && (
                      <span className="px-2 py-1 bg-muted text-muted-foreground text-xs font-medium rounded">
                        {displayItems.length} {displayItems.length === 1 ? "item" : "items"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        {headers.map((header) => (
                          <th key={header.key} className={`text-left py-2 px-2 ${header.width}`}>
                            {header.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayItems.map((item, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/20 transition-colors">
                          <td className="py-2 px-2 text-center text-muted-foreground font-medium text-xs">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-2">
                            <span className="font-mono text-xs">{item.code || '—'}</span>
                          </td>
                          <td className="py-2 px-2">
                            {item.description || '—'}
                          </td>
                          {sectionId === '4.5' && (
                            <>
                              <td className="py-2 px-2">
                                {(item as any).issuedBy || '—'}
                              </td>
                              <td className="py-2 px-2 text-xs">
                                {(item as any).issuedDate || '—'}
                              </td>
                            </>
                          )}
                          {sectionId === '4.6' && (
                            <>
                              <td className="py-2 px-2 text-xs">
                                {(item as any).receivedDate || '—'}
                              </td>
                              <td className="py-2 px-2 text-xs">
                                {(item as any).inspectionDate || '—'}
                              </td>
                            </>
                          )}
                          {sectionId !== '4.5' && sectionId !== '4.6' && (
                            <>
                              <td className="py-2 px-2">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs font-medium flex items-center gap-1 w-fit ${getStatusColor(item.status)}`}
                                >
                                  {getStatusIcon(item.status)}
                                  {item.status || '—'}
                                </Badge>
                              </td>
                              <td className="py-2 px-2 text-xs">
                                {item.dateResponded || '—'}
                              </td>
                            </>
                          )}
                          <td className="py-2 px-2">
                            <Badge variant="outline" className="text-xs font-medium">
                              {item.projectSource || '—'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                      {displayItems.length > 0 && (
                        <tr className="bg-muted/10">
                          <td colSpan={headers.length} className="py-3 px-2">
                            <table className="w-full">
                              <tbody>
                                <tr>
                                  <td className="flex-1">
                                    <div className="mb-2">
                                      <span className="text-sm font-semibold text-foreground">Comments</span>
                                    </div>
                                    <textarea
                                      value={displayComments}
                                      readOnly
                                      placeholder="No comments available..."
                                      rows={3}
                                      className="w-full border rounded px-2 py-1 text-sm resize-none dark:bg-card dark:border-border bg-muted/50"
                                    />
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
};

export default MasterQaqcSection;
