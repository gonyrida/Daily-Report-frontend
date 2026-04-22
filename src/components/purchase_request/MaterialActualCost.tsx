import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FileText, ArrowLeft, Loader2 } from 'lucide-react';

// Loading State Component
const LoadingState = () => (
	<div className="flex flex-col items-center justify-center py-16">
		<Loader2 className="w-8 h-8 text-muted-foreground animate-spin mb-4" />
		<h3 className="text-sm font-medium text-muted-foreground mb-2">Loading Project Data</h3>
		<p className="text-xs text-muted-foreground text-center max-w-md">
			Fetching purchase requests and material costs...
		</p>
	</div>
);

// Empty State Component
const EmptyState = ({ onCreateNew, onSelectProject }) => (
	<div className="flex flex-col items-center justify-center py-16">
		<FileText className="w-16 h-16 text-muted-foreground mb-4" />
		<h3 className="text-lg font-semibold text-muted-foreground mb-2">No Project Data Available</h3>
		<p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
			Select a project to view purchase requests and material costs, or create a new project to get started.
		</p>
	</div>
);

const MaterialActualCost = ({
	mode = 'create',
	requests,
	setActiveTab,
	currentFormData = null,
	onFormDataChange
}) => {
	// Handle loading state when requests is being fetched
	if (requests === 'loading') {
		return (
			<div className="bg-muted/30 p-4 rounded-lg">
				<h3 className="text-lg font-semibold mb-4">Material - Actual Cost</h3>
				<LoadingState />
			</div>
		);
	}

	// Handle case where no data is provided
	if (!requests) {
		return (
			<div className="bg-muted/30 p-4 rounded-lg">
				<h3 className="text-lg font-semibold mb-4">Material - Actual Cost</h3>
				<EmptyState 
					onCreateNew={() => setActiveTab('purchase-request')}
					onSelectProject={() => setActiveTab('purchase-request')}
				/>
			</div>
		);
	}

	// Extract reports and summary from the requests object
	const reports = requests?.reports || [];
	const summary = requests?.summary || { totalSpend: 0, reportCount: 0 };

	// Track editable values for the current request row
	const [editableRowData, setEditableRowData] = useState({
		description: currentFormData?.requestDescription || '',
		remarks: currentFormData?.requestRemarks || ''
	});

	// Update when currentFormData changes (mode switch or new request)
	useEffect(() => {
		if (currentFormData) {
			setEditableRowData({
				description: currentFormData.requestDescription || '',
				remarks: currentFormData.requestRemarks || ''
			});
		}
	}, [currentFormData?._id, mode]);

	// Sync changes back to parent formData
	useEffect(() => {
		if (onFormDataChange) {
			onFormDataChange({
				requestDescription: editableRowData.description,
				requestRemarks: editableRowData.remarks
			});
		}
	}, [editableRowData.description, editableRowData.remarks]);

	// Calculate current request total from form data
	const getCurrentRequestTotal = () => {
		if (!currentFormData?.items || currentFormData.items.length === 0) return 0;
		return currentFormData.items.reduce((total, item) => total + (item.quantity * item.unitPrice || 0), 0);
	};

	// Build unified reports array including current request, sorted by 'no' field
	const buildUnifiedReports = () => {
		const baseReports = [...reports];
		
		if (currentFormData) {
			// Check if currentFormData already exists in reports (by _id)
			const existingIndex = baseReports.findIndex(r => r._id === currentFormData._id);
			
			if (existingIndex >= 0 && (mode === 'edit' || mode === 'revise')) {
				// Replace existing report with editable version
				baseReports[existingIndex] = {
					...currentFormData,
          no : !currentFormData.no ? summary.project.counter + 1 : currentFormData.no,
					isEditable: true
				};
			} else if (mode === 'create') {
				// Add new request at end for create mode
				baseReports.push({
					...currentFormData,
					label: `MR #${summary.reportCount + 1}`,
					version: 0,
					status: 'unknown',
					no: summary.project.counter + 1,
					isEditable: true,
					isNew: true
				});
			}
		}
		
		// Sort by 'no' field
		return baseReports.sort((a, b) => (a.no || 0) - (b.no || 0));
	};

	const unifiedReports = buildUnifiedReports();

	return (
		<>
			<div className="bg-muted/30 p-4 rounded-lg">
				<h3 className="text-lg font-semibold mb-4">Material - Actual Cost</h3>

        {/* Empty State when no reports */}
        {reports.length === 0 && !currentFormData && (
          <div className="text-center py-8">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">No purchase requests found for this project</p>
              <p className="text-xs text-muted-foreground">Try creating a new purchase request or selecting a different project</p>
            </div>
          </div>
        )}

        {/* Summary Section */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-center p-2 text-md font-medium">MR #</th>
                <th className="text-center p-2 text-md font-medium">Revision</th>
                <th className="text-center p-2 text-md font-medium">Status</th>
                <th className="text-center p-2 text-md font-medium">Category</th>
                <th className="text-center p-2 text-md font-medium">Description</th>
                <th className="text-center p-2 text-md font-medium">Total</th>
                <th className="text-center p-2 text-md font-medium">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {unifiedReports.map((report) => {
                const isCurrentRequest = report._id === currentFormData?._id || report.isNew;
                const isEditable = isCurrentRequest && (mode === 'create' || mode === 'edit' || mode === 'revise');
                
                return (
                  <tr 
                    key={report._id || 'new-request'} 
                    className={`border-t ${isEditable ? 'bg-blue-50 dark:bg-blue-900/20 font-semibold' : 'hover:bg-muted/30'}`}
                  >
                    <td className="text-center p-2 text-sm font-medium">
                      {`MR #${report.no || 0}`}
                    </td>
                    <td className="text-center p-2 text-sm font-medium">
                      R-{report.version ?? 0}
                    </td>
                    <td className="text-center p-2 text-sm font-medium">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        report.status === 'approved' ? 'bg-green-100 text-green-800' :
                        report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        report.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        report.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {report.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="text-center p-2 text-sm font-medium">
                      {report.purpose || currentFormData?.purpose || 'None'}
                    </td>
                    <td className="text-center p-2 text-sm font-medium">
                      {isEditable ? (
                        <Input
                          value={editableRowData.description}
                          onChange={(e) => setEditableRowData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Enter description..."
                          className="text-xs h-8 text-center border-blue-200 focus:border-blue-400"
                          title={editableRowData.description}
                        />
                      ) : (
                        <p title={report.requestDescription || 'No description available'}>{report.requestDescription || 'No description available'}</p>
                      )}
                    </td>
                    <td className="text-center p-2 text-sm font-medium">
                      ${isEditable ? getCurrentRequestTotal().toLocaleString() : (report.grandTotal?.toLocaleString() || '0')}
                    </td>
                    <td className="text-center p-2 text-sm font-medium">
                      {isEditable ? (
                        <Input
                          value={editableRowData.remarks}
                          onChange={(e) => setEditableRowData(prev => ({ ...prev, remarks: e.target.value }))}
                          placeholder="Enter remarks..."
                          className="text-xs h-8 text-center border-blue-200 focus:border-blue-400"
                          title={editableRowData.remarks}
                        />
                      ) : (
                        <p title={report.requestRemarks || report.remark || '-'}>{report.requestRemarks || report.remark || '-'}</p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* TOTAL Section */}
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-700">
          <div className="text-right">
            <p className="text-sm text-green-600 dark:text-green-300 mb-1">
              Including {unifiedReports.length} request{unifiedReports.length !== 1 ? 's' : ''}
            </p>
            <p className="text-2xl font-bold text-green-800 dark:text-green-200">
              TOTAL: ${unifiedReports.reduce((sum, report) => {
                const isCurrent = report._id === currentFormData?._id || report.isNew;
                const reportTotal = isCurrent ? getCurrentRequestTotal() : (report.grandTotal || 0);
                return sum + reportTotal;
              }, 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Budget Analysis Table */}
        {summary.project && summary.project.purposes && (
          <div className="mt-6">
            <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Budget Analysis by Purpose</h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-center p-3 text-sm font-medium">Purpose(s)</th>
                    <th className="text-center p-3 text-sm font-medium">Materials BOQ</th>
                    <th className="text-center p-3 text-sm font-medium">Direct Materials BOQ ({summary.project.budgetSettings?.percentage || 0}%)</th>
                    <th className="text-center p-3 text-sm font-medium">Materials Actual</th>
                    <th className="text-center p-3 text-sm font-medium">Remaining Budget</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.project.purposes.map((purpose, index) => {
                    // Find corresponding materialsActual for this purpose
                    const materialActual = summary.materialsActual?.find(
                      item => item.purpose === purpose.name
                    );
                    // For each purpose row, calculate:
                    const actualTotal = (materialActual?.actualTotal || 0) + 
                      (currentFormData?.purpose === purpose.name ? getCurrentRequestTotal() : 0);

                    const remainingBudget = (purpose.DMBOQBudget || 0) - actualTotal;
                    
                    return (
                      <tr key={purpose._id || index} className="border-t hover:bg-muted/30">
                        <td className="text-center p-3 text-sm font-medium">
                          {purpose.name}
                        </td>
                        <td className="text-center p-3 text-sm">
                          ${(purpose.MBOQBudget || 0).toLocaleString()}
                        </td>
                        <td className="text-center p-3 text-sm">
                          ${(purpose.DMBOQBudget || 0).toLocaleString()}
                        </td>
                        <td className="text-center p-3 text-sm font-medium text-blue-600">
                          ${actualTotal.toLocaleString()}
                        </td>
                        <td className={`text-center p-3 text-sm font-medium ${
                          remainingBudget >= 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          ${remainingBudget.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                  
                  {/* Summary Row */}
                  <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 font-semibold">
                    <td className="text-center p-3 text-sm font-bold">TOTAL</td>
                    <td className="text-center p-3 text-sm font-bold">
                      ${summary.project.purposes.reduce((sum, p) => sum + (p.MBOQBudget || 0), 0).toLocaleString()}
                    </td>
                    <td className="text-center p-3 text-sm font-bold">
                      ${summary.project.purposes.reduce((sum, p) => sum + (p.DMBOQBudget || 0), 0).toLocaleString()}
                    </td>
                    <td className="text-center p-3 text-sm font-bold text-blue-600">
                      ${((summary.materialsActual?.reduce((sum, item) => sum + (item.actualTotal || 0), 0) || 0) + 
                        getCurrentRequestTotal()).toLocaleString()}
                    </td>
                    <td className={`text-center p-3 text-sm font-bold ${
                      (summary.project.purposes.reduce((sum, p) => sum + (p.DMBOQBudget || 0), 0) - 
                       (summary.materialsActual?.reduce((sum, item) => sum + (item.actualTotal || 0), 0) || 0)) >= 0
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      ${(summary.project.purposes.reduce((sum, p) => sum + (p.DMBOQBudget || 0), 0) - 
                        (summary.materialsActual?.reduce((sum, item) => sum + (item.actualTotal || 0), 0) + 
                        getCurrentRequestTotal() || 0)).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
			</div>

			{/* Navigation Buttons */}
			<div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
				{/* Left side - Previous button */}
				<div className="flex space-x-2">
					<Button 
						type="button" 
						variant="outline"
						onClick={() => {
							// Reset data when navigating away
							setActiveTab('purchase-request');
						}}
					>
						← Previous
					</Button>
				</div>
				
				{/* Right side - Next button */}
				<div className="flex space-x-2">
					<Button 
						type="button" 
						onClick={() => {
							// Reset data when navigating away
							setActiveTab('attachments');
						}}
					>
						Next →
					</Button>
				</div>
			</div>
		</>
	)
}

export default MaterialActualCost;