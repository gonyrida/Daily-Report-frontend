import React, { useState, useEffect, useMemo } from 'react';
import { useProfileContext } from '@/contexts/ProfileContext';
import { apiPut } from '@/lib/apiFetch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiGet } from '@/lib/apiFetch';
import PurchaseRequestDetail from './PurchaseRequestDetail';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PendingApprovalsTab = ({ 
  requests, 
  loadingRequests, 
  onApprove, 
  onReject, 
  onRefresh,
  // Pagination
  pagination,
  setPagination,
  // Filters
  statusFilter,
  setStatusFilter,
  projectFilter,
  setProjectFilter,
  purposeFilter,
  setPurposeFilter,
  requesterFilter,
  setRequesterFilter,
  // Filter options
  PRProjects,
  availablePurposes,
  availableRequesters
}) => {
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailRequest, setDetailRequest] = useState(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [approveNotes, setApproveNotes] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [rejectNotesError, setRejectNotesError] = useState('');
  const { toast } = useToast();
  const { profile } = useProfileContext();

  // Add this useEffect after the existing ones
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiGet('/purchase-requests/users');
        const result = await response.json();
        setAllUsers(result.data || []);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  const getUsersForRole = (roles) => {
    return allUsers.filter(user => roles.includes(user.role));
  };

  // Add this after the useEffect
  const checkers = useMemo(() => 
    allUsers.filter(user => ['admin', 'approver'].includes(user.role)), 
    [allUsers]
  );
  const verifiers = useMemo(() => 
    allUsers.filter(user => ['admin', 'approver'].includes(user.role)), 
    [allUsers]
  );
  const approvers = useMemo(() => 
    allUsers.filter(user => ['admin', 'approver'].includes(user.role)), 
    [allUsers]
  );
  const preparers = useMemo(() => allUsers, [allUsers]);

  const handleApprove = () => {
    setApproveNotes(''); // Reset notes when opening dialog
    setShowApproveDialog(true);
  };

  const confirmApprove = async () => {
    if (!profile) return;
    setIsApproving(true);
    try {
      for (const reqId of selectedRequests) {
        // Find the request to get the workflow step
        const req = requests.find(r => r._id === reqId);
        if (!req) continue;
        // Find the user's workflow step (role)
        const step = req.approvalWorkflow?.find(w => w.backupApprover === profile.id || w.approver === profile.id);
        const role = step?.role || 'approved';
        await apiPut(`/purchase-requests/${reqId}/status`, {
          status: 'approved',  // Changed from `role` to `'approved'`
          approverId: profile.id,
          notes: approveNotes,
          role
        });
      }
      toast({ title: 'Approved', description: `Approved ${selectedRequests.length} request(s).` });
      setSelectedRequests([]);
      setShowApproveDialog(false);
      setApproveNotes(''); // Reset notes after approval
      onApprove && onApprove(selectedRequests);
      onRefresh && onRefresh();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to approve request(s).' });
    } finally {
      setIsApproving(false);
    }
  };

  const confirmReject = async () => {
    if (!profile) return;
    
    // Validate that reject notes are provided
    if (!rejectNotes.trim()) {
      setRejectNotesError('Please provide a reason for rejection');
      return;
    }
    
    setIsRejecting(true);
    setRejectNotesError(''); // Clear any previous error
    try {
      for (const reqId of selectedRequests) {
        // Find the request to get the workflow step
        const req = requests.find(r => r._id === reqId);
        if (!req) continue;
        // Find the user's workflow step (role)
        const step = req.approvalWorkflow?.find(w => w.approver?._id === profile.id || w.approver === profile.id);
        const role = step?.role || 'approved';
        await apiPut(`/purchase-requests/${reqId}/status`, {
          status: 'rejected',
          approverId: profile.id,
          notes: rejectNotes,
          role
        });
      }
      toast({ title: 'Rejected', description: `Rejected ${selectedRequests.length} request(s).` });
      setSelectedRequests([]);
      setShowRejectDialog(false);
      setRejectNotes(''); // Reset notes after rejection
      setRejectNotesError(''); // Clear error
      onReject && onReject(selectedRequests);
      onRefresh && onRefresh();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to reject request(s).' });
    } finally {
      setIsRejecting(false);
    }
  };

	const handleReject = () => {
		setRejectNotes(''); // Reset notes when opening dialog
		setRejectNotesError(''); // Reset validation error
		setShowRejectDialog(true);
	};

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

  // Define order of the approval workflow roles
  const ROLE_ORDER = ['checked','verified','approved'];

  // Determine if a single request can be acted on by current profile
  const canActSingle = (req) => {
    if (!req || !profile || !req.approvalWorkflow) return false;
    const myStep = req.approvalWorkflow.find(s =>
      String(s.backupApprover) === profile.id || String(s.approver) === profile.id
    );
    if (!myStep) return false;
    const myStepIdx = ROLE_ORDER.indexOf(myStep.role);
    if (myStepIdx === 0) return true;
    // If user role is 'approved', they can act on the request
    if (myStep.role === 'approved') return true;
    return req.approvalWorkflow
      .filter(s => ROLE_ORDER.indexOf(s.role) < myStepIdx)
      .every(s => s.status === 'approved' || s.status === 'rejected' || s.status === 'completed');
  };

  // Determine if all selected requests are ready to be acted on
  const canActSelection = () => {
    if (!selectedRequests || selectedRequests.length === 0) return false;
    return selectedRequests.every(id => {
      const req = requests.find(r => r._id === id);
      return canActSingle(req);
    });
  };

  const getPendingStatusText = (request) => {
    if (request.status === 'approved') return 'Approved';
    if (request.status === 'rejected') return 'Rejected';
    
    // Find the first pending step in order
    const pendingStep = request.approvalWorkflow?.find(step => step.status === 'pending');

    if (!pendingStep) return 'Pending';
    
    // Use the same logic as your detailed view
    let userDetails = null;
    if (pendingStep.role === 'prepared') {
      userDetails = preparers.find(user => user._id === pendingStep.approver);
    } else if (pendingStep.role === 'checked') {
      userDetails = checkers.find(user => user._id === pendingStep.approver);
    } else if (pendingStep.role === 'verified') {
      userDetails = verifiers.find(user => user._id === pendingStep.approver);
    } else if (pendingStep.role === 'approved') {
      userDetails = approvers.find(user => user._id === pendingStep.approver);
    }
    
    if (userDetails?.firstName) {
      return `Pending on ${userDetails.firstName} ${userDetails.lastName}`;
    }
    
    return 'Pending';
  };

  const handleViewDetail = async (request) => {
    setLoadingRequest(true);
    setShowDetailsModal(true);
    try {
      const approversFromWorkflow = {
        preparedBy: request.approvalWorkflow.find(w => w.role === 'prepared')?.approver || '',
        checkedBy: request.approvalWorkflow.find(w => w.role === 'checked')?.approver || '',
        verifiedBy: request.approvalWorkflow.find(w => w.role === 'verified')?.approver || '',
        approvedBy: request.approvalWorkflow.find(w => w.role === 'approved')?.approver || ''
      };
  
      const response = await apiGet(`/purchase-requests/${request._id}`);
      const result = await response.json();
      if (result.success) {
        setDetailRequest({
          ...result.data,
          approvers: approversFromWorkflow,
        });
        
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to load request data"
        });
      }

    } catch (error) {
      console.error('Edit request error:', error);
      toast({
        title: "Error",
        description: "Failed to load request data"
      });
    } finally {
      setLoadingRequest(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Approve Confirmation Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Approval</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">Are you sure you want to approve {selectedRequests.length} request(s)?</p>
            <div className="space-y-2">
              <label htmlFor="approve-notes" className="text-sm font-medium text-gray-700">
                Notes (Optional)
              </label>
              <Textarea
                id="approve-notes"
                placeholder="Add optional notes for this approval..."
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowApproveDialog(false)} disabled={isApproving}>Cancel</Button>
            <Button 
              variant="default" 
              onClick={confirmApprove} 
              disabled={isApproving || !(detailRequest ? canActSingle(detailRequest) : canActSelection())}
            >
              {isApproving ? "Approving..." : "Confirm Approval"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Reject Confirmation Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Rejection</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">Are you sure you want to reject {selectedRequests.length} request(s)?</p>
            <div className="space-y-2">
              <label htmlFor="reject-notes" className="text-sm font-medium text-gray-700">
                Reason for Rejection <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="reject-notes"
                placeholder="Please provide a reason for rejection..."
                value={rejectNotes}
                onChange={(e) => {
                  setRejectNotes(e.target.value);
                  if (rejectNotesError) setRejectNotesError(''); // Clear error on typing
                }}
                className="min-h-[80px]"
              />
              {rejectNotesError && (
                <p className="text-sm text-red-500">{rejectNotesError}</p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={isRejecting}>Cancel</Button>
            <Button
              variant="destructive" 
              onClick={confirmReject} 
              disabled={isRejecting || !rejectNotes.trim()}
            >
              {isRejecting ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Button Row */}
      <div className="flex gap-2 mb-6 sticky top-0 bg-background z-10 py-4 border-b">
        <Button variant="default" onClick={handleApprove} disabled={selectedRequests.length === 0 || !canActSelection()}>Approve</Button>
        <Button variant="destructive" onClick={handleReject} disabled={selectedRequests.length === 0}>Reject</Button>
        <Button 
          variant="outline" 
          onClick={onRefresh}
          disabled={loadingRequests}
        >
          {loadingRequests ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
			{/* Request List */}
			<Card>
				<CardHeader>
					<div className="flex flex-col gap-4">
						<CardTitle>Pending Approvals</CardTitle>
						<div className="flex flex-wrap gap-4">
							{/* Status Filter */}
							{/* <div className="flex items-center gap-2">
								<span className="text-sm text-muted-foreground">Status:</span>
								<Select value={statusFilter || "__all__"} onValueChange={setStatusFilter}>
									<SelectTrigger className="w-[140px]">
										<SelectValue placeholder="All Status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="__all__">All Status</SelectItem>
										<SelectItem value="pending">Pending</SelectItem>
										<SelectItem value="approved">Approved</SelectItem>
										<SelectItem value="rejected">Rejected</SelectItem>
										<SelectItem value="checked">Checked</SelectItem>
										<SelectItem value="verified">Verified</SelectItem>
									</SelectContent>
								</Select>
							</div> */}

							{/* Sub-Project Filter */}
							<div className="flex items-center gap-2">
								<span className="text-sm text-muted-foreground">Sub-Project:</span>
								<Select value={projectFilter || "__all__"} onValueChange={setProjectFilter}>
									<SelectTrigger className="w-[160px]">
										<SelectValue placeholder="All Sub Projects" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="__all__">All Sub Projects</SelectItem>
										{PRProjects?.flatMap((project) => 
											project.subProjects?.map((subProject) => (
												<SelectItem key={subProject._id} value={subProject.name}>
													{subProject.name}
												</SelectItem>
											)) || []
										)
										}
									</SelectContent>
								</Select>
							</div>

							{/* Purpose Filter */}
							<div className="flex items-center gap-2">
								<span className="text-sm text-muted-foreground">Purpose:</span>
								<Select value={purposeFilter || "__all__"} onValueChange={setPurposeFilter}>
									<SelectTrigger className="w-[160px]">
										<SelectValue placeholder="All Purposes" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="__all__">All Purposes</SelectItem>
										{availablePurposes?.map((purpose) => (
											<SelectItem key={purpose} value={purpose}>
												{purpose}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* Requester Filter */}
							<div className="flex items-center gap-2">
								<span className="text-sm text-muted-foreground">Requester:</span>
								<Select value={requesterFilter || "__all__"} onValueChange={setRequesterFilter}>
									<SelectTrigger className="w-[160px]">
										<SelectValue placeholder="All Requesters" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="__all__">All Requesters</SelectItem>
										{availableRequesters?.map((requester) => (
											<SelectItem key={requester} value={requester}>
												{requester}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto">
						<table className="w-full border-collapse border">
							<thead>
								<tr className="bg-muted">
									<th className="text-left p-3 font-medium">
										<input
											type="checkbox"
                      className="w-4 h-4 cursor-pointer"
											checked={selectedRequests.length === requests.length && requests.length > 0}
											onChange={e => {
												if (e.target.checked) {
													setSelectedRequests(requests.map(r => r._id));
												} else {
													setSelectedRequests([]);
												}
											}}
										/>
									</th>
									<th className="text-left p-3 font-medium">Request ID</th>
									<th className="text-left p-3 font-medium">Project Name</th>
									<th className="text-left p-3 font-medium">Requester</th>
									<th className="text-left p-3 font-medium">Category</th>
									<th className="text-left p-3 font-medium">Purpose</th>
									<th className="text-left p-3 font-medium">Items</th>
									<th className="text-left p-3 font-medium">Total</th>
									<th className="text-left p-3 font-medium">Stage</th>
									<th className="text-left p-3 font-medium">Date</th>
								</tr>
							</thead>
							<tbody>
								{loadingRequests ? (
									<tr><td colSpan={10} className="text-center py-8">Loading requests...</td></tr>
								) : requests.length === 0 ? (
									<tr><td colSpan={10} className="text-center py-8">No requests found</td></tr>
								) : (
									requests.map((request) => {
										const isSelected = selectedRequests.includes(request._id);
										return (
											<tr
												key={request._id}
                        className={`border-b cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-blue-100 dark:bg-blue-900/30 dark:border-l-4 dark:border-l-blue-400' 
                            : 'hover:bg-muted/30 dark:hover:bg-muted/20'
                        }`}
												onClick={e => {
													// If clicking checkbox, don't open modal
													if (e.target instanceof HTMLInputElement) return;
													handleViewDetail(request);
												}}
											>
												<td className="p-3">
													<input
														type="checkbox"
                            className="w-4 h-4 cursor-pointer"
														checked={isSelected}
														onChange={e => {
															e.stopPropagation();
															if (e.target.checked) {
																setSelectedRequests([...selectedRequests, request._id]);
															} else {
																setSelectedRequests(selectedRequests.filter(id => id !== request._id));
															}
														}}
													/>
												</td>
												<td className="p-3 font-medium">{request.label}</td>
												<td className="p-3">{request.projectName}</td>
												<td className="p-3">{request.requesterName}</td>
                        <td className="p-3">
                          <div className="flex gap-1 flex-wrap">
                            {request.categories.admin && (
                              <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">Admin</span>
                            )}
                            {request.categories.construction && (
                              <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">Construction</span>
                            )}
                            {request.categories.material && (
                              <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">Material</span>
                            )}
                            {request.categories.services && (
                              <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">Services</span>
                            )}
                          </div>
                        </td>
												<td className="p-3">{request.purpose}</td>
												<td className="p-3">{request.items.length} {request.items.length === 1 ? 'Item' : 'Items'}</td>
												<td className="p-3 font-medium">${request.grandTotal?.toFixed(2) || '0.00'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            request.status === 'approved' ? 'bg-green-100 text-green-800' :
                            request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {getPendingStatusText(request)}
                          </span>
                        </td>
												<td className="p-3">{new Date(request.createdAt).toLocaleString()}</td>
											</tr>
                    );
									})
								)}
							</tbody>
						</table>

						{/* Pagination Controls */}
						{pagination?.pages > 0 && (
							<div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<span>Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results</span>
									<Select
										value={pagination.limit.toString()}
										onValueChange={(value) => {
											setPagination(prev => ({ ...prev, limit: parseInt(value), page: 1 }));
										}}
									>
										<SelectTrigger className="w-20 h-8">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="10">10</SelectItem>
											<SelectItem value="25">25</SelectItem>
											<SelectItem value="50">50</SelectItem>
										</SelectContent>
									</Select>
									<span>per page</span>
								</div>
								
								<div className="flex items-center gap-1">
									<Button
										variant="outline"
										size="sm"
										onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
										disabled={pagination.page === 1 || loadingRequests}
									>
										←
									</Button>
									
									{Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
										let pageNum;
										if (pagination.pages <= 5) {
											pageNum = i + 1;
										} else if (pagination.page <= 3) {
											pageNum = i + 1;
										} else if (pagination.page >= pagination.pages - 2) {
											pageNum = pagination.pages - 4 + i;
										} else {
											pageNum = pagination.page - 2 + i;
										}
										
										return (
											<Button
												key={pageNum}
												variant={pagination.page === pageNum ? "default" : "outline"}
												size="sm"
												onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
												disabled={loadingRequests}
												className="min-w-[32px]"
											>
												{pageNum}
											</Button>
										);
									})}
									
									<Button
										variant="outline"
										size="sm"
										onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
										disabled={pagination.page === pagination.pages || loadingRequests}
									>
										→
									</Button>
								</div>
							</div>
						)}

            {/* Request Detail Dialog */}
            <PurchaseRequestDetail
              selectedRequest={detailRequest}
              showDetailsModal={showDetailsModal}
              setShowDetailsModal={setShowDetailsModal}
              onEdit={() => {}} // No edit in pending approvals
              getPendingStatusText={getPendingStatusText}
              preparers={preparers}
              checkers={checkers}
              verifiers={verifiers}
              approvers={approvers}
              isLoading={loadingRequest}
            />

					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export default PendingApprovalsTab;