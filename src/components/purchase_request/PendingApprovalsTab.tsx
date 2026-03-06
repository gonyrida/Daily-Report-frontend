import React, { useState, useEffect, useMemo } from 'react';
import { useProfileContext } from '@/contexts/ProfileContext';
import { apiPut } from '@/lib/apiFetch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiGet } from '@/lib/apiFetch';


const PendingApprovalsTab = ({ requests, loadingRequests, onApprove, onReject, onRefresh }) => {
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailRequest, setDetailRequest] = useState(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
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
        const req = requests.find(r => r.id === reqId);
        if (!req) continue;
        console.log('Approving request:', req);
        // Find the user's workflow step (role)
        const step = req.approvalWorkflow?.find(w => w.approver?._id === profile.id || w.approver === profile.id);
        const role = step?.role || 'approved';
        await apiPut(`/purchase-requests/${reqId}/status`, {
          status: 'approved',  // Changed from `role` to `'approved'`
          approverId: profile.id,
          notes: approveNotes,
          role
        });
        console.log('=== APPROVAL DEBUG START ===');
        console.log('Request ID:', reqId);
        console.log('Full request object:', req);
        console.log('User profile:', profile);
        console.log('Found workflow step:', step);
        console.log('Role being sent:', role);
        console.log('API payload:', {
          status: 'approved',
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
        const req = requests.find(r => r.id === reqId);
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
      String(s.approver?._id) === profile.id || String(s.approver) === profile.id
    );
    if (!myStep) return false;
    const myStepIdx = ROLE_ORDER.indexOf(myStep.role);
    if (myStepIdx === 0) return true;
    return req.approvalWorkflow
      .filter(s => ROLE_ORDER.indexOf(s.role) < myStepIdx)
      .every(s => s.status === 'approved' || s.status === 'rejected' || s.status === 'completed');
  };

  // Determine if all selected requests are ready to be acted on
  const canActSelection = () => {
    if (!selectedRequests || selectedRequests.length === 0) return false;
    return selectedRequests.every(id => {
      const req = requests.find(r => r.id === id);
      return canActSingle(req);
    });
  };

  const getPendingStatusText = (request) => {
    if (request.status === 'approved') return 'Approved';
    if (request.status === 'rejected') return 'Rejected';
    
    // Find the first pending step in order
    const pendingStep = request.approvalWorkflow?.find(step => step.status === 'pending');
    
    console.log('request', request);
    console.log('pendingStep', pendingStep);
    console.log('approvalWorkflow', request.approvalWorkflow);

    if (!pendingStep) return 'Pending';
    
    // Use the same logic as your detailed view
    let userDetails = null;
    if (pendingStep.role === 'prepared') {
      userDetails = preparers.find(user => user._id === pendingStep.approver);
      console.log('This is preparer',userDetails)
    } else if (pendingStep.role === 'checked') {
      userDetails = checkers.find(user => user._id === pendingStep.approver);
      console.log('approver', pendingStep.approver)
    } else if (pendingStep.role === 'verified') {
      userDetails = verifiers.find(user => user._id === pendingStep.approver);
      console.log('This is verifier',userDetails)
    } else if (pendingStep.role === 'approved') {
      userDetails = approvers.find(user => user._id === pendingStep.approver);
    }
    
    if (userDetails?.firstName) {
      return `Pending on ${userDetails.firstName} ${userDetails.lastName}`;
    }

    console.log('This is user details',userDetails)
    
    return 'Pending';
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
        <Button variant="outline">Placeholder1</Button>
      </div>
			{/* Request List */}
			<Card>
				<CardHeader>
					<CardTitle>Pending Approvals</CardTitle>
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
													setSelectedRequests(requests.map(r => r.id));
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
										const isSelected = selectedRequests.includes(request.id);
										return (
											<tr
												key={request.id}
												className={`border-b cursor-pointer transition-colors ${isSelected ? 'bg-blue-100' : 'hover:bg-muted/30'}`}
												onClick={e => {
													// If clicking checkbox, don't open modal
													if (e.target instanceof HTMLInputElement) return;
													setDetailRequest(request);
													setShowDetailsModal(true);
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
																setSelectedRequests([...selectedRequests, request.id]);
															} else {
																setSelectedRequests(selectedRequests.filter(id => id !== request.id));
															}
														}}
													/>
												</td>
												<td className="p-3 font-medium">{request.id}</td>
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

            {/* Request Detail Dialog */}
            <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Purchase Request Details</DialogTitle>
                </DialogHeader>
                {detailRequest && (
                  <div className="space-y-6">
                    {/* 1. Document Header (MR Number Info) */}
                    <div className="bg-muted/30 p-4 rounded-lg border-l-4 border-blue-500">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-lg">MR-{detailRequest.id}</h3>
                          <p className="text-sm text-muted-foreground">
                            Created: {new Date(detailRequest.createdAt || detailRequest.date).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            detailRequest.status === 'approved' ? 'bg-green-100 text-green-800' :
                            detailRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            detailRequest.status === 'checked' ? 'bg-blue-100 text-blue-800' :
                            detailRequest.status === 'verified' ? 'bg-purple-100 text-purple-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {getPendingStatusText(detailRequest)}
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
                          <p className="text-sm font-semibold">{detailRequest.projectName}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-blue-700">Internal Project Code</label>
                          <p className="text-sm">{detailRequest.id}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-blue-700">Category</label>
                          <div className="flex gap-1 flex-wrap">
                            {detailRequest.categories.admin && (
                              <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">Admin</span>
                            )}
                            {detailRequest.categories.construction && (
                              <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">Construction</span>
                            )}
                            {detailRequest.categories.material && (
                              <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">Material</span>
                            )}
                            {detailRequest.categories.services && (
                              <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">Services</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-blue-700">Purpose</label>
                          <p className="text-sm">{detailRequest.purpose}</p>
                        </div>
                      </div>
                    </div>

                    {/* 3. Stakeholder Data (Requester Info) */}
                    <div className="bg-muted/30 p-4 rounded-lg">
                      <h3 className="font-semibold mb-4 text-green-700">Requester Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-green-700">Full Name</label>
                          <p className="text-sm font-semibold">{detailRequest.requesterName}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-green-700">Department</label>
                          <p className="text-sm">{detailRequest.requesterDepartment}</p>
                        </div>
                        {/* <div>
                          <label className="text-sm font-medium text-green-700">Contact</label>
                          <p className="text-sm">{profile?.email}</p>
                        </div> */}
                        <div>
                          <label className="text-sm font-medium text-green-700">Request Date</label>
                          <p className="text-sm">{new Date(detailRequest.createdAt || detailRequest.date).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* 4. Delivery Place (Updated from Logistics) */}
                    <div className="bg-muted/30 p-4 rounded-lg">
                      <h3 className="font-semibold mb-4 text-orange-700">Delivery Place</h3>
                      <div className="bg-white p-4 rounded border-l-4 border-orange-500">
                        <p className="text-sm leading-relaxed">
                          {detailRequest.deliveryPlace || 'Main Office - Reception Area'}
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
                            {detailRequest.items.map((item, index) => (
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
                                <td className="p-2 text-xs">{item.reference || '-'}</td>
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
                          <p className="text-2xl font-bold">${(detailRequest.grandTotal || '0.00').toFixed(2)}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Amount in Words</label>
                          <p className="text-lg font-semibold capitalize">
                            {(() => {
                              const total = detailRequest.grandTotal || '0';
                              
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
                      <h3 className="font-semibold mb-4 text-gray-700">Approval Workflow</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <span className="text-sm font-medium">Current Status</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            detailRequest.status === 'approved' ? 'bg-green-100 text-green-800' :
                            detailRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            detailRequest.status === 'checked' ? 'bg-blue-100 text-blue-800' :
                            detailRequest.status === 'verified' ? 'bg-purple-100 text-purple-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {getPendingStatusText(detailRequest)}
                          </span>
                        </div>

                        {/* NEW: Workflow Table Display */}
                        <div className="space-y-4">
                          <div className="space-y-2">
                            {detailRequest.approvalWorkflow?.map((step, index) => {

                              // Find the user details based on the approver ID
                              let userDetails = null;
                              if (step.role === 'prepared') {
                                userDetails = preparers.find(user => user._id === step.approver);
                              } else if (step.role === 'checked') {
                                userDetails = checkers.find(user => user._id === step.approver);
                              } else if (step.role === 'verified') {
                                userDetails = verifiers.find(user => user._id === step.approver);
                              } else if (step.role === 'approved') {
                                userDetails = approvers.find(user => user._id === step.approver);
                              }

                              return (
                                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-medium capitalize">{step.role}</span>
                                      <span className={`px-2 py-1 rounded text-xs ${
                                        step.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        step.status === 'approved' ? 'bg-green-100 text-green-800' :
                                        step.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        step.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {step.status}
                                      </span>
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1">
                                      {userDetails ? `${userDetails.firstName} ${userDetails.lastName}` : 'Not Assigned'}
                                      {userDetails?.role && (
                                        <span className="ml-1">({userDetails.role})</span>
                                      )}
                                    </div>
                                    {step.notes && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        Note: {step.notes}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-right text-sm text-gray-600">
                                    {step.timestamp ? new Date(step.timestamp).toLocaleString() : 'Pending'}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export default PendingApprovalsTab;