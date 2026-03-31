import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  apiPost,
  apiGet,
  apiPut
} from '@/lib/apiFetch';
import { 
  SidebarTrigger, 
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import HierarchicalSidebar from '@/components/HierarchicalSidebar';
import { ThemeToggle } from "@/components/ThemeToggle";
import ProfileIcon from '@/components/ProfileIcon';
import { useProfileContext } from '@/contexts/ProfileContext';
import PendingApprovalsTab from '@/components/purchase_request/PendingApprovalsTab';
import PurchaseRequestDetail from '@/components/purchase_request/PurchaseRequestDetail';
import PurchaseRequestForm from '@/components/purchase_request/PurchaseRequestForm';
import ProjectManagement from '@/components/purchase_request/ProjectManagement';
import MasterMaterials from '@/components/purchase_request/MasterMaterials';

interface PurchaseRequest {
  groupId?: string;
  version: number;
  status: 'pending' | 'checked' | 'verified' | 'approved' | 'rejected' | 'draft' | 'revised';
}

const PurchaseRequest = ({onRefresh}) => {
  const { profile } = useProfileContext();
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [PRProjects, setPRProjects] = useState([]);
  const [loadingPRProjects, setLoadingPRProjects] = useState(false);
  const [formData, setFormData] = useState({
    _id: '',
    requesterName: profile?.fullName || '',
    requesterDepartment: profile?.department || '',
    projectName: '',
    purpose: '',
    requestDate: new Date().toISOString().split('T')[0],
    deliveryPlace: '',
    categories: {
      construction: false,
      admin: false,
      material: false,
      services: false
    },
    items: [],
    // NEW: Add approvers selection
    approvers: {
      checkedBy: '',
      verifiedBy: '',
      approvedBy: ''
    }
  });

  const [selectedItems, setSelectedItems] = useState([]);
  const [activeTab, setActiveTab] = useState('my-requests');
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loadingPendingApprovals, setLoadingPendingApprovals] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [displayValues, setDisplayValues] = useState({
    quantity: '0',
    unitPrice: '0'
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [mode, setMode] = useState('create');
  const [showModal, setShowModal] = useState(false);

  // Fetch pending approvals function
  const fetchPendingApprovals = () => {
    if (profile?.role === 'approver' || profile?.role === 'admin') {
      setLoadingPendingApprovals(true);
      apiGet('/purchase-requests/pending-approvals')
        .then(res => res.json())
        .then(result => {
          if (result.success) setPendingApprovals(result.data);
        })
        .catch(() => setPendingApprovals([]))
        .finally(() => setLoadingPendingApprovals(false));
    }
  };

  const fetchPRProjects = async () => {
    setLoadingPRProjects(true);
    try {
      const response = await apiGet('/purchase-requests/pr-projects');
      const result = await response.json();
      
      if (result.success) {
        setPRProjects(result.data);
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to fetch projects"
        });
      }
    } catch (error) {
      console.error('Fetch projects error:', error);
      toast({
        title: "Error", 
        description: "Failed to fetch projects"
      });
    } finally {
      setLoadingPRProjects(false);
    }
  };

  // Fetch pending approvals for approver/admin
  useEffect(() => {
    fetchPendingApprovals();
    fetchPRProjects();
  }, [profile]);

  useEffect(() => {
    if (showAddItemModal && !isEditMode) {
      // Only reset when adding, not editing
      setDisplayValues({
        quantity: '0',
        unitPrice: '0'
      });
    }
  }, [showAddItemModal, isEditMode]);

  const { toast } = useToast();

  const handleViewDetails = (request) => {
    const approversFromWorkflow = {
      preparedBy: request.approvalWorkflow.find(w => w.role === 'prepared')?.approver || '',
      checkedBy: request.approvalWorkflow.find(w => w.role === 'checked')?.approver || '',
      verifiedBy: request.approvalWorkflow.find(w => w.role === 'verified')?.approver || '',
      approvedBy: request.approvalWorkflow.find(w => w.role === 'approved')?.approver || ''
    };

    // Populate selectedRequest with request data
    setSelectedRequest({
      ...request,
      approvers: approversFromWorkflow
    });

    setShowDetailsModal(true);
  };

  // Approval role order for stage display
  const ROLE_ORDER = ['prepared', 'checked', 'verified', 'approved'];

  // Compute stage string like "2/4 - Checked"
  const computeStage = (req) => {
    if (!req || !req.approvalWorkflow) return '';
    
    const total = req.approvalWorkflow.length || ROLE_ORDER.length;
    
    // Handle rejected status
    if (req.status === 'rejected') {
      // Find which step was rejected
      const rejectedStep = req.approvalWorkflow.find(s => s.status === 'rejected');
      if (rejectedStep) {
        const rejectedIdx = ROLE_ORDER.indexOf(rejectedStep.role);
        const stepNumber = rejectedIdx + 1;
        return `${stepNumber}/${total} - Rejected`;
      }
      return `${total}/${total} - Rejected`;
    }
    
    const completed = req.approvalWorkflow.filter(s => s.status === 'completed' || s.status === 'approved').length;
    
    // Determine label: if at least one completed, use last completed role; else use next pending role or prepared
    let label = '';
    if (completed > 0) {
      const lastCompleted = req.approvalWorkflow
        .filter(s => s.status === 'completed' || s.status === 'approved')
        .slice(-1)[0];
      label = lastCompleted?.role || ROLE_ORDER[Math.max(0, completed - 1)];
    } else {
      // find first pending or default to prepared
      const next = req.approvalWorkflow.find(s => s.status !== 'completed' && s.status !== 'approved');
      label = next?.role || 'prepared';
    }
    
    // Capitalize first letter
    return `${completed}/${total} - ${label.charAt(0).toUpperCase() + label.slice(1)}`;
  };

  // Fetch all users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const response = await apiGet('/purchase-requests/users');
        const result = await response.json();
        if (result.success) {
          setAllUsers(result.data);
          // console.log('✅ Users loaded:', result.data);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load users"
        });
      } finally {
        setLoadingUsers(false);
      }
    };
    
    fetchUsers();
  }, []);

  // Add tab-specific fetching:
  useEffect(() => {
    const fetchRequests = async () => {
      setLoadingRequests(true);
      try {
        // Use different endpoints based on active tab
        const endpoint = activeTab === 'my-requests' 
          ? '/purchase-requests/my-requests' 
            : '/purchase-requests';
        
        const response = await apiGet(endpoint);
        const result = await response.json();
        if (result.success) {
          setRequests(result.data);
          // console.log('✅ Requests loaded:', result.data);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load requests"
        });
      } finally {
        setLoadingRequests(false);
      }
    };
    
    fetchRequests();
  }, [activeTab]); // Re-fetch when tab changes

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        requesterName: profile.fullName || prev.requesterName,
        requesterDepartment: profile.department || prev.requesterDepartment
      }));
      setIsProfileLoading(false);
    }
  }, [profile]);

  // Role-based filtering functions
  const getUsersForRole = (allowedRoles) => {
    return allUsers.filter(user => 
      allowedRoles.includes(user.role?.toLowerCase())
    );
  };

  const handleEditRequest = (request) => {
    // console.log('Edit request:', request);
    // console.log('Setting editingRequest to:', request);
    // console.log('Setting editFormData to:', editFormData);

    const approversFromWorkflow = {
      preparedBy: request.approvalWorkflow.find(w => w.role === 'prepared')?.approver || '',
      checkedBy: request.approvalWorkflow.find(w => w.role === 'checked')?.approver || '',
      verifiedBy: request.approvalWorkflow.find(w => w.role === 'verified')?.approver || '',
      approvedBy: request.approvalWorkflow.find(w => w.role === 'approved')?.approver || ''
    };

    setFormData({
      ...request,
      requestDate: request.requestDate ? new Date(request.requestDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      approvers: approversFromWorkflow,
    });
    
    // // Populate formData with request data
    setMode('edit')
    setSelectedRequests([]); // Clear selection after edit opens
    setSelectedItems([]); // CLEAR selection from New Request modal
    setShowModal(true);
    // console.log('editingRequest after set:', editingRequest);
    // console.log('editFormData after set:', editFormData);
  };

  const getPendingStatusText = (request) => {
    if (request.status === 'draft') {
      return 'Draft';
    }

    if (request.status === 'revised') {
      return 'Revised';
    }

    if (request.status === 'approved') {
      // Find the last approved step to show who approved it
      const approvedSteps = request.approvalWorkflow?.filter(step => step.status === 'approved');
      if (approvedSteps && approvedSteps.length > 0) {
        const lastApprovedStep = approvedSteps[approvedSteps.length - 1];
        let userDetails = null;
        
        if (lastApprovedStep.role === 'prepared') {
          userDetails = preparers.find(user => user._id === lastApprovedStep.approver);
        } else if (lastApprovedStep.role === 'checked') {
          userDetails = checkers.find(user => user._id === lastApprovedStep.approver);
        } else if (lastApprovedStep.role === 'verified') {
          userDetails = verifiers.find(user => user._id === lastApprovedStep.approver);
        } else if (lastApprovedStep.role === 'approved') {
          userDetails = approvers.find(user => user._id === lastApprovedStep.approver);
        }
        
        if (userDetails?.firstName) {
          return `Approved by ${userDetails.firstName} ${userDetails.lastName}`;
        }
      }
      return 'Approved';
    }
    
    if (request.status === 'rejected') {
      // Find the rejected step to show who rejected it
      const rejectedStep = request.approvalWorkflow?.find(step => step.status === 'rejected');
      if (rejectedStep) {
        let userDetails = null;
        
        if (rejectedStep.role === 'prepared') {
          userDetails = preparers.find(user => user._id === rejectedStep.approver);
        } else if (rejectedStep.role === 'checked') {
          userDetails = checkers.find(user => user._id === rejectedStep.approver);
        } else if (rejectedStep.role === 'verified') {
          userDetails = verifiers.find(user => user._id === rejectedStep.approver);
        } else if (rejectedStep.role === 'approved') {
          userDetails = approvers.find(user => user._id === rejectedStep.approver);
        }
        
        if (userDetails?.firstName) {
          return `Rejected by ${userDetails.firstName} ${userDetails.lastName}`;
        }
      }
      return 'Rejected';
    }
    
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

  // Specific filters for each dropdown
  const preparers = allUsers; // Anyone can prepare
  const checkers = getUsersForRole(['admin', 'approver']);
  const verifiers = getUsersForRole(['admin', 'approver']);
  const approvers = getUsersForRole(['admin', 'approver']);

  // Add this function to handle revision
  const handleReviseRequest = async (request) => {
    const approversFromWorkflow = {
      preparedBy: request.approvalWorkflow.find(w => w.role === 'prepared')?.approver || '',
      checkedBy: request.approvalWorkflow.find(w => w.role === 'checked')?.approver || '',
      verifiedBy: request.approvalWorkflow.find(w => w.role === 'verified')?.approver || '',
      approvedBy: request.approvalWorkflow.find(w => w.role === 'approved')?.approver || ''
    };

    setFormData({
      ...request,
      requestDate: request.requestDate ? new Date(request.requestDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      approvers: approversFromWorkflow
    });

    setMode('revise')
    setSelectedRequests([]);
    setSelectedItems([]);
    setShowModal(true);
  };

  const refreshRequests = async () => {
    try {
      const endpoint = '/purchase-requests/my-requests';
      const response = await apiGet(endpoint);
      const result = await response.json();
      if (result.success) {
        setRequests(result.data);
      }
      setMode('create')
      setFormData({
        _id: '',
        requesterName: profile?.fullName || '',
        requesterDepartment: profile?.department || '',
        projectName: '',
        purpose: '',
        requestDate: new Date().toISOString().split('T')[0],
        deliveryPlace: '',
        categories: {
          construction: false,
          admin: false,
          material: false,
          services: false
        },
        items: [],
        // NEW: Add approvers selection
        approvers: {
          checkedBy: '',
          verifiedBy: '',
          approvedBy: ''
        }
      })
    } catch (error) {
      console.error('Failed to refresh requests:', error);
    }
  };

  // console.log("I am Rendering")

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <HierarchicalSidebar />
        <SidebarInset>
          <div className="space-y-6">
            <div className="container mx-auto p-6">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center gap-4">
                      <h1 className="text-lg font-semibold">Purchase Request</h1>
                      <SidebarTrigger />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <button 
                        onClick={() => window.history.back()}
                        className="hover:text-foreground transition-colors"
                      >
                        ← Back
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <ThemeToggle />
                      <ProfileIcon />
                    </div>
                  </div>
                </div>

                {/* Tab Switcher */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="my-requests">My Request(s)</TabsTrigger>
                    <TabsTrigger value="all-mrs">All Related MRs</TabsTrigger>
                    {profile?.role === 'approver' || profile?.role === 'admin' ? (
                      <TabsTrigger value="pending-approvals">Pending Approvals</TabsTrigger>
                    ) : null}
                    {profile?.role === 'approver' || profile?.role === 'admin' ? (
                      <TabsTrigger value="project-management">Project Management</TabsTrigger>
                    ) : null}
                    {profile?.role === 'approver' || profile?.role === 'admin' ? (
                      <TabsTrigger value="material-master">Material Master</TabsTrigger>
                    ) : null}
                  </TabsList>

                  <TabsContent value="my-requests" className="space-y-6">
                    {/* Button Row */}
                    <div className="flex gap-2 mb-6 sticky top-0 bg-background z-10 py-4 border-b">
                      {/* Request Form */}
                      <PurchaseRequestForm
                        key={formData?._id || 'request'} //Unique key to force reset
                        mode={mode}
                        isOpen={showModal}
                        setIsOpen={setShowModal}
                        onRefresh={refreshRequests}
                        initialData={formData}
                        requestId={formData?._id}
                        projectData={PRProjects}
                      />

                      <Button 
                        variant="default"
                        onClick={() => {
                          setMode('create');
                          setShowModal(true);
                        }}
                      >
                        New Request
                      </Button>
                      <Button 
                        variant="default" 
                        onClick={() => {
                          if (selectedRequests.length === 1) {
                            const request = requests.find(r => r.id === selectedRequests[0] || r._id === selectedRequests[0]);
                            if (request) handleEditRequest(request);
                          }
                        }}
                        disabled={selectedRequests.length !== 1 || (() => {
                          if (selectedRequests.length === 1) {
                            const request = requests.find(r => r.id === selectedRequests[0] || r._id === selectedRequests[0]);
                            return request?.approvalWorkflow?.some(step => step.status === 'approved' || step.status === 'rejected') || false;
                          }
                          return false;
                        })()}
                      >
                        Edit Request
                      </Button>
                      <Button 
                        variant="default" 
                        onClick={() => {
                          if (selectedRequests.length === 1) {
                            const request = requests.find(r => r.id === selectedRequests[0] || r._id === selectedRequests[0]);
                            if (request) handleReviseRequest(request);
                          }
                        }}
                        disabled={selectedRequests.length !== 1}
                      >
                        Revise Request
                      </Button>
                      <Button variant="outline">Placeholder 2</Button>
                    </div>

                    {/* Request List */}
                    <Card>
                      <CardHeader>
                        <CardTitle>My Purchase Requests</CardTitle>
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
                                        setSelectedRequests(requests.map(r => r.id || r._id));
                                      } else {
                                        setSelectedRequests([]);
                                      }
                                    }}
                                  />
                                </th>
                                <th className="text-left p-3 font-medium">Request ID</th>
                                <th className="text-left p-3 font-medium">Project</th>
                                <th className="text-left p-3 font-medium">Category</th>
                                <th className="text-left p-3 font-medium">Purpose</th>
                                <th className="text-left p-3 font-medium">Items</th>
                                <th className="text-left p-3 font-medium">Total</th>
                                <th className="text-left p-3 font-medium">Status</th>
                                <th className="text-left p-3 font-medium">Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {loadingRequests ? (
                                <div className="text-center py-8">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                  <p className="mt-2 text-gray-600">Loading requests...</p>
                                </div>
                              ) : requests.length === 0 ? (
                                <div className="text-center py-8">
                                  <p className="text-gray-600">No requests found</p>
                                </div>
                              ) : (
                                // Your existing request list table
                                <>
                                  {requests.map((request) => {
                                    const isSelected = selectedRequests.includes(request.id || request._id);
                                    const requestId = request.id || request._id;
                                    
                                    return (
                                      <tr 
                                        key={requestId} 
                                        className={`border-b cursor-pointer transition-colors ${
                                          isSelected 
                                            ? 'bg-blue-100 dark:bg-blue-900/30 dark:border-l-4 dark:border-l-blue-400' 
                                            : 'hover:bg-muted/30 dark:hover:bg-muted/20'
                                        }`}
                                        onClick={(e) => {
                                          // If clicking checkbox, don't toggle
                                          if (e.target instanceof HTMLInputElement) return;
                                          // Optional: row click opens details
                                          handleViewDetails(request);
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
                                                setSelectedRequests([...selectedRequests, requestId]);
                                              } else {
                                                setSelectedRequests(selectedRequests.filter(id => id !== requestId));
                                              }
                                            }}
                                          />
                                        </td>
                                        <td className="p-3 font-medium">{request.label}</td>
                                        <td className="p-3">{request.projectName}</td>
                                        <td className="p-3">
                                          <div className="flex gap-1 flex-wrap">
                                            {request.categories.admin && (
                                              <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 dark:border dark:border-blue-700">Admin</span>
                                            )}
                                            {request.categories.construction && (
                                              <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 dark:border dark:border-orange-700">Construction</span>
                                            )}
                                            {request.categories.material && (
                                              <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 dark:border dark:border-green-700">Material</span>
                                            )}
                                            {request.categories.services && (
                                              <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 dark:border dark:border-purple-700">Services</span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="p-3">{request.purpose}</td>
                                        <td className="p-3">
                                          <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                                            {request.items.length} {request.items.length === 1 ? 'Item' : 'Items'}
                                          </span>
                                        </td>
                                        <td className="p-3 font-medium">${request.grandTotal?.toFixed(2) || '0.00'}</td>
                                        <td className="p-3">
                                          <span className={`px-2 py-1 rounded-full text-xs ${
                                            request.status === 'approved' ? 'bg-green-100 text-green-800' :
                                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                            request.status === 'checked' ? 'bg-blue-100 text-blue-800' :
                                            request.status === 'verified' ? 'bg-purple-100 text-purple-800' :
                                            request.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                                            request.status === 'revised' ? 'bg-blue-100 text-blue-800' :
                                            'bg-red-100 text-red-800'
                                          }`}>
                                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                          </span>
                                        </td>
                                        <td className="p-3">{new Date(request.createdAt).toLocaleString()}</td>
                                      </tr>
                                    );
                                  })}
                                </>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Add the Details Modal here */}
                  <PurchaseRequestDetail
                    selectedRequest={selectedRequest}
                    showDetailsModal={showDetailsModal}
                    setShowDetailsModal={setShowDetailsModal}
                    onEdit={handleEditRequest}
                    getPendingStatusText={getPendingStatusText}
                    preparers={preparers}
                    checkers={checkers}
                    verifiers={verifiers}
                    approvers={approvers}
                  />

                  {/* All Related MRs */}
                  <TabsContent value="all-mrs" className="space-y-6">
                    {/* All Request List */}
                    <Card>
                      <CardHeader>
                        <CardTitle>All Requests</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border">
                            <thead>
                              <tr className="bg-muted">
                                <th className="text-left p-3 font-medium">Request ID</th>
                                <th className="text-left p-3 font-medium">Project</th>
                                <th className="text-left p-3 font-medium">Requester</th>
                                <th className="text-left p-3 font-medium">Category</th>
                                <th className="text-left p-3 font-medium">Purpose</th>
                                <th className="text-left p-3 font-medium">Items</th>
                                <th className="text-left p-3 font-medium">Total</th>
                                <th className="text-left p-3 font-medium">Status</th>
                                <th className="text-left p-3 font-medium">Stage</th>
                                <th className="text-left p-3 font-medium">Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {loadingRequests ? (
                                <div className="text-center py-8">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                  <p className="mt-2 text-gray-600">Loading requests...</p>
                                </div>
                              ) : requests.length === 0 ? (
                                <div className="text-center py-8">
                                  <p className="text-gray-600">No requests found</p>
                                </div>
                              ) : (
                                <>
                                  {requests.map((request) => (
                                    <tr 
                                      key={request.id} 
                                      className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                                      onClick={() => handleViewDetails(request)}
                                    >
                                      <td className="p-3 font-medium">{request.label}</td>
                                      <td className="p-3">{request.projectName}</td>
                                      <td className="p-3">{request.requesterName}</td>
                                      <td className="p-3">
                                        <div className="flex gap-1 flex-wrap">
                                          {request.categories.admin && (
                                            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 dark:border dark:border-blue-700">Admin</span>
                                          )}
                                          {request.categories.construction && (
                                            <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 dark:border dark:border-orange-700">Construction</span>
                                          )}
                                          {request.categories.material && (
                                            <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 dark:border dark:border-green-700">Material</span>
                                          )}
                                          {request.categories.services && (
                                            <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 dark:border dark:border-purple-700">Services</span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="p-3">{request.purpose}</td>
                                      <td className="p-3">
                                        <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                                          {request.items.length} {request.items.length === 1 ? 'Item' : 'Items'}
                                        </span>
                                      </td>
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
                                      <td className="p-3">{computeStage(request)}</td>
                                      <td className="p-3">{new Date(request.createdAt).toLocaleString()}</td>
                                    </tr>
                                  ))}
                                </>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  {profile?.role === 'approver' || profile?.role === 'admin' ? (
                    <TabsContent value="pending-approvals" className="space-y-6">
                      <PendingApprovalsTab 
                        requests={pendingApprovals}
                        loadingRequests={loadingPendingApprovals}
                        onApprove={(id) => console.log('Approve', id)}
                        onReject={(id) => console.log('Reject', id)}
                        onRefresh={fetchPendingApprovals}
                      />
                    </TabsContent>
                  ) : null}
                  {profile?.role === 'approver' || profile?.role === 'admin' ? (
                    <TabsContent value="project-management" className="space-y-6">
                      <ProjectManagement 
                        projects={PRProjects}
                        loadingProjects={loadingPRProjects}
                        onRefresh={fetchPRProjects}
                      />
                    </TabsContent>
                  ) : null}
                  {profile?.role === 'approver' || profile?.role === 'admin' ? (
                    <TabsContent value="material-master" className="space-y-6">
                      <MasterMaterials 
                        // projects={PRProjects}
                        // loadingProjects={loadingPRProjects}
                        // onRefresh={fetchPRProjects}
                      />
                    </TabsContent>
                  ) : null}
                </Tabs>
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default PurchaseRequest;