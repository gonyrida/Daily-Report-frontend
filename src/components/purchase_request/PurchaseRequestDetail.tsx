import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProfileContext } from '@/contexts/ProfileContext';
import { apiGet } from '@/lib/apiFetch';
import PurchaseRequestAuditTrails from './PurchaseRequestAuditTrails';
import MaterialActualCost from './MaterialActualCost';
import AttachmentsTab from './AttachmentsTab';
import { exportPurchaseRequestExcel, exportPurchaseRequestPDF } from './services/exportServices';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileDown,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { set } from 'date-fns';

interface PurchaseRequestDetailProps {
  selectedRequest: any;
  showDetailsModal: boolean;
  setShowDetailsModal: (show: boolean) => void;
  onEdit: (request: any) => void;
  getPendingStatusText: (request: any) => string;
  preparers: any[];
  checkers: any[];
  verifiers: any[];
  approvers: any[];
  isLoading?: boolean; // Loading state from parent
}

const PurchaseRequestDetail: React.FC<PurchaseRequestDetailProps> = ({
  selectedRequest,
  showDetailsModal,
  setShowDetailsModal,
  onEdit,
  getPendingStatusText,
  preparers,
  checkers,
  verifiers,
  approvers,
  isLoading
}) => {
  const { profile } = useProfileContext();
  const [activeTab, setActiveTab] = useState('purchase-request');
  const [attachments, setAttachments] = useState(selectedRequest?.attachments || []);
  const [prSummaryData, setPrSummaryData] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // Helper functions for number to words (from improv.md)
  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const scales = ['', 'Thousand', 'Million', 'Billion'];

    const convertChunk = (n) => {
      let chunkStr = "";
      if (n >= 100) {
        chunkStr += ones[Math.floor(n / 100)] + " Hundred ";
        n %= 100;
      }
      if (n >= 20) {
        chunkStr += tens[Math.floor(n / 10)] + " ";
        n %= 10;
      }
      if (n > 0) {
        chunkStr += ones[n] + " ";
      }
      return chunkStr.trim();
    }

    if (num === 0) return "Zero";

    let words = "";
    let scaleIdx = 0;

    while (num > 0) {
      let chunk = num % 1000;
      if (chunk !== 0) {
        let chunkText = convertChunk(chunk);
        words = chunkText + (scales[scaleIdx] ? " " + scales[scaleIdx] : "") + " " + words;
      }
      num = Math.floor(num / 1000);
      scaleIdx++;
    }

    return words.trim();
  }

  // Process attachments for view mode
  const processExistingAttachments = (backendAttachments: any[]): any[] => {
    if (!backendAttachments || !Array.isArray(backendAttachments)) return [];
    
    return backendAttachments.map(att => {
      const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].some(ext => 
        att.filename?.toLowerCase().endsWith(ext)
      );
      const isPDF = att.filename?.toLowerCase().endsWith('.pdf');
      
      const id = att._id || att.id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      let fileSizeStr = att.fileSize;
      if (typeof att.fileSize === 'number') {
        const bytes = att.fileSize;
        if (bytes === 0) fileSizeStr = '0 Bytes';
        else if (bytes < 1024) fileSizeStr = `${bytes} Bytes`;
        else if (bytes < 1024 * 1024) fileSizeStr = `${(bytes / 1024).toFixed(2)} KB`;
        else fileSizeStr = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
      }
      
      return {
        id,
        filename: att.filename,
        fileType: att.fileType,
        fileSize: fileSizeStr,
        uploadedAt: att.uploadedAt || new Date().toISOString(),
        status: 'completed' as const,
        imageData: isImage ? (att.base64 || null) : null,
        base64: att.base64 || null
      };
    });
  };


  const getPRSummaryData = async (projectId: string, requestId: string) => {
    try {
      setPrSummaryData('loading'); // Set loading state
      const response = await apiGet(`/purchase-requests/pr-summary/${projectId}/${requestId}`);
      const result = await response.json();
      setPrSummaryData(result.data);
    } catch (error) {
      console.error('Error fetching PR summary data:', error);
      setPrSummaryData(null); // Reset to null on error
      return null;
    }
  }

  useEffect(() => {
    if (selectedRequest?.projectFrom?.mainId) {
      getPRSummaryData(selectedRequest.projectFrom.mainId, selectedRequest._id)
    }
  }, [selectedRequest])

  const handleExport = async (mode: 'excel' | 'pdf') => {
    setIsExporting(true);
    const purposesList = structuredClone(prSummaryData.summary.materialsActual);
    const currentPurposeIdx = purposesList.findIndex((item: any) => item.purpose === selectedRequest.purpose);
    purposesList[currentPurposeIdx]["actualTotal"] += selectedRequest.grandTotal;
    try {
      if (mode === 'excel') {
        await exportPurchaseRequestExcel({
          ...selectedRequest,
          requestDate: new Date(selectedRequest.requestDate).toISOString().split('T')[0],
          ...prSummaryData,
          summary: {
            ...prSummaryData.summary,
            materialsActual: purposesList
          }
        });
      } else {
        await exportPurchaseRequestPDF({
          ...selectedRequest,
          requestDate: new Date(selectedRequest.requestDate).toISOString().split('T')[0],
          ...prSummaryData,
          summary: {
            ...prSummaryData.summary,
            materialsActual: purposesList
          }
        });
      }
    } catch (error) {
      console.error('Error exporting purchase request:', error);
    } finally {
      setIsExporting(false);
    }
  }

  if (!selectedRequest) return null;

  return (
    <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
      <DialogContent className={`max-w-6xl max-h-[90vh] ${isLoading ? 'overflow-y-hidden' : 'overflow-y-auto'}`}>
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 z-50 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading request...</p>
          </div>
        )}
        <DialogHeader>
          <DialogTitle>Purchase Request Details</DialogTitle>
        </DialogHeader>

        {/* Edit Button: Top right below close button, only for owner */}
        {/* {selectedRequest && profile && selectedRequest.approvalWorkflow[0].approver === profile.id && (
          <Button
            variant="default"
            size="sm"
            className="ml-2 w-fit"
            onClick={() => {
              onEdit(selectedRequest);
              setShowDetailsModal(false);
            }}
          >
            Edit
          </Button>
        )} */}

        {/* Add to your details modal content */}
        {selectedRequest && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="purchase-request">Request Details</TabsTrigger>
              <TabsTrigger value="material-cost">Material Actual Cost</TabsTrigger>
              <TabsTrigger value="attachments">Attachments</TabsTrigger>
            </TabsList>

            {/* Tab 1: Request Details */}
            <TabsContent value="purchase-request" className="space-y-6 mt-6">
              {/* 1. Document Header (MR Number Info) */}
              <div className="bg-muted/30 p-4 rounded-lg border-l-4 border-blue-500">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{selectedRequest.label}</h3>
                    <p className="text-sm text-muted-foreground">
                      Created: {new Date(selectedRequest.createdAt || selectedRequest.date).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedRequest.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 dark:border dark:border-green-700' :
                      selectedRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 dark:border dark:border-yellow-700' :
                      selectedRequest.status === 'checked' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 dark:border dark:border-blue-700' :
                      selectedRequest.status === 'verified' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 dark:border dark:border-purple-700' :
                      selectedRequest.status === 'draft' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 dark:border dark:border-yellow-700' :
                      selectedRequest.status === 'revised' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 dark:border dark:border-blue-700' :
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 dark:border dark:border-red-700'
                    }`}>
                      {getPendingStatusText(selectedRequest)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Request Information (Updated) */}
              <div className="bg-muted/30 p-4 rounded-lg">
                <h3 className="font-semibold mb-4 text-blue-700">Request Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-blue-700">Project Name</label>
                    <p className="text-sm font-semibold">{selectedRequest.projectName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-blue-700">Internal Project Code</label>
                    <p className="text-sm">{selectedRequest.projectFrom.mainProject}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-blue-700">Category</label>
                    <div className="flex gap-1 flex-wrap">
                      {selectedRequest.categories.admin && (
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 dark:border dark:border-blue-700">Admin</span>
                      )}
                      {selectedRequest.categories.construction && (
                        <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 dark:border dark:border-orange-700">Construction</span>
                      )}
                      {selectedRequest.categories.material && (
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 dark:border dark:border-green-700">Material</span>
                      )}
                      {selectedRequest.categories.services && (
                        <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 dark:border dark:border-purple-700">Services</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-blue-700">Purpose</label>
                    <p className="text-sm">{selectedRequest.purpose}</p>
                  </div>
                </div>
              </div>

              {/* 3. Stakeholder Data (Requester Info) */}
              <div className="bg-muted/30 p-4 rounded-lg">
                <h3 className="font-semibold mb-4 text-green-700">Requester Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-green-700">Full Name</label>
                    <p className="text-sm font-semibold">{selectedRequest.requesterName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-green-700">Department</label>
                    <p className="text-sm">{selectedRequest.requesterDepartment}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-green-700">Request Date</label>
                    <p className="text-sm">{new Date(selectedRequest.createdAt || selectedRequest.date).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-green-700">Due Date</label>
                    <p className="text-sm">{new Date(selectedRequest.dueDate).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* 4. Delivery Place (Updated from Logistics) */}
              <div className="bg-muted/30 p-4 rounded-lg">
                <h3 className="font-semibold mb-4 text-orange-700">Delivery Place</h3>
                <div className="bg-background p-4 rounded border-l-4 border-orange-500">
                  <p className="text-sm leading-relaxed">
                    {selectedRequest.deliveryPlace || 'Main Office - Reception Area'}
                  </p>
                </div>
              </div>

              {/* 5. Financial Core (Item List Table) */}
              <div className="bg-muted/30 p-4 rounded-lg">
                <h3 className="font-semibold mb-4 text-cyan-700">Item List</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2 text-xs font-medium w-8">No</th>
                        <th className="text-left p-2 text-xs font-medium">Description</th>
                        <th className="text-left p-2 text-xs font-medium">Unit</th>
                        <th className="text-left p-2 text-xs font-medium">Qty</th>
                        <th className="text-left p-2 text-xs font-medium">Unit Price</th>
                        <th className="text-left p-2 text-xs font-medium">Total Price</th>
                        <th className="text-left p-2 text-xs font-medium">Brand</th>
                        <th className="text-left p-2 text-xs font-medium">Reference</th>
                        <th className="text-left p-2 text-xs font-medium">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRequest.items.map((item, index) => (
                        <tr key={index} className="border-t hover:bg-muted/30 transition-colors">
                          <td className="p-2 text-xs">{index + 1}</td>
                          <td className="p-2 text-xs">{item.description || 'Item ' + (index + 1)}</td>
                          <td className="p-2 text-xs">{item.unit || 'pcs'}</td>
                          <td className="p-2 text-xs">{item.quantity || ''}</td>
                          <td className="p-2 text-xs">${(item.unitPrice || 0).toFixed(2)}</td>
                          <td className="p-2 text-xs font-medium">
                            ${((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}
                          </td>
                          <td className="p-2 text-xs">{item.brand || '-'}</td>
                          <td className="p-2 text-xs">
                            {item.reference ? (
                              <img 
                                src={item.reference} 
                                alt="Reference" 
                                className="w-16 h-8 object-contain rounded border"
                              />
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="p-2 text-xs">{item.note || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 6. Validation (Grand Total & Amount in Words) */}
              <div className="bg-muted/30 p-4 rounded-lg">
                <h3 className="font-semibold mb-4 text-green-700">Financial Validation</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Grand Total</label>
                    <p className="text-2xl font-bold">{selectedRequest.formattedGrandTotal || '0.00'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Amount in Words</label>
                    <p className="text-lg font-semibold capitalize">
                      {(() => {
                        const total = selectedRequest.grandTotal || '0';
                        
                        if (isNaN(total)) return 'Zero Dollars';
                        
                        const dollars = Math.floor(total);
                        const cents = Math.round((total - dollars) * 100);
                        
                        const wordResult = numberToWords(dollars);
                        const centsStr = cents.toString().padStart(2, '0');
                        
                        return `${wordResult} and ${centsStr}/100 Dollars`;
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              {/* 7. Workflow State (Approval Info & Status) */}
              <div className="bg-muted/30 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">Approval Workflow</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 rounded bg-background">
                    <span className="bg-background text-sm font-medium">Current Status</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedRequest.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 dark:border dark:border-green-700' :
                      selectedRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 dark:border dark:border-yellow-700' :
                      selectedRequest.status === 'checked' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 dark:border dark:border-blue-700' :
                      selectedRequest.status === 'verified' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 dark:border dark:border-purple-700' :
                      selectedRequest.status === 'draft' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 dark:border dark:border-yellow-700' :
                      selectedRequest.status === 'revised' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 dark:border dark:border-blue-700' :
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 dark:border dark:border-red-700'
                    }`}>
                      {getPendingStatusText(selectedRequest)}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      {selectedRequest.approvalWorkflow?.map((step, index) => {
                        // Find the user details based on the approver ID
                        let userDetails = null;
                        let backupUserDetails = null;
                        if (step.role === 'prepared') {
                          userDetails = preparers.find(user => user._id === step.approver);
                        } else if (step.role === 'checked') {
                          userDetails = checkers.find(user => user._id === step.approver);
                          backupUserDetails = checkers.find(user => user._id === step.backupApprover);
                        } else if (step.role === 'verified') {
                          userDetails = verifiers.find(user => user._id === step.approver);
                          backupUserDetails = verifiers.find(user => user._id === step.backupApprover);
                        } else if (step.role === 'approved') {
                          userDetails = approvers.find(user => user._id === step.approver);
                          backupUserDetails = approvers.find(user => user._id === step.backupApprover);
                        }

                        return (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium capitalize">{step.role}</span>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  step.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 dark:border dark:border-green-700' :
                                  step.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 dark:border dark:border-green-700' :
                                  step.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 dark:border dark:border-yellow-700' :
                                  step.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 dark:border dark:border-red-700' :
                                  'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:border dark:border-gray-700'
                                }`}>
                                  {step.status}
                                </span>
                              </div>
                              <div className="text-sm text-bg-background mt-1">
                                {userDetails ? `${userDetails.firstName} ${userDetails.lastName}` : 'Not Assigned'}
                                {userDetails?.role && (
                                  <span className="ml-1">({userDetails.department})</span>
                                )}
                              </div>
                              {backupUserDetails && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  Backup Person: {backupUserDetails.firstName} {backupUserDetails.lastName}
                                  {backupUserDetails.department && (
                                    <span className="ml-1">({backupUserDetails.department})</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* NEW: Workflow Table Display */}
                  <div className="space-y-4">
                    <PurchaseRequestAuditTrails
                      requestId={selectedRequest.requestNumber || selectedRequest._id}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex space-x-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        className="min-w-[160px] bg-primary hover:bg-primary/90"
                        disabled={isExporting}
                      >
                        <FileDown className="w-4 h-4 mr-2" />
                        {isExporting ? "Exporting..." : "Export"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleExport('pdf')}
                        disabled={isExporting}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Export As PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          handleExport('excel')}
                        }
                        disabled={isExporting}
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Export As Excel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex space-x-2">
                  <Button 
                    type="button" 
                    onClick={() => {
                      // Switch to Material Actual Cost tab
                      setActiveTab('material-cost');
                    }}
                  >
                    Next →
                  </Button>
                  <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Material Actual Cost */}
            <TabsContent value="material-cost" className="mt-6">
              <MaterialActualCost
                mode="view"
                requests={prSummaryData}
                setActiveTab={setActiveTab}
                currentFormData={selectedRequest}
                onFormDataChange={() => {}}
              />
            </TabsContent>

            {/* Tab 3: Attachments */}
            <TabsContent value="attachments" className="mt-6">
              <AttachmentsTab
                attachments={processExistingAttachments(selectedRequest.attachments || [])}
                onAttachmentsChange={() => {}}
                mode="view"
                isSubmitting={false}
                setActiveTab={setActiveTab}
                formData={selectedRequest}
                handleSubmit={() => {}}
              />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseRequestDetail;