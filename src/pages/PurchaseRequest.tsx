import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  apiDelete,
  apiGet,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ConfirmationModal from '@/components/purchase_request/ConfirmationModal';
import { API_BASE_URL } from '@/config/api';

interface PurchaseRequest {
  groupId?: string;
  version: number;
  status: 'pending' | 'checked' | 'verified' | 'approved' | 'rejected' | 'draft' | 'revised';
}

const PurchaseRequest = ({onRefresh}) => {
  const { profile } = useProfileContext();
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
  const [allRequests, setAllRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [allRequestsPagination, setAllRequestsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [projectFilter, setProjectFilter] = useState('');
  const [purposeFilter, setPurposeFilter] = useState('');
  const [availablePurposes, setAvailablePurposes] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [allProjectFilter, setAllProjectFilter] = useState('');
  const [allPurposeFilter, setAllPurposeFilter] = useState('');
  const [allStatusFilter, setAllStatusFilter] = useState('');
  const [allRequesterFilter, setAllRequesterFilter] = useState('');
  const [allAvailableRequesters, setAllAvailableRequesters] = useState([]);
  // Pending Approvals filter and pagination states
  const [pendingApprovalsPagination, setPendingApprovalsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [pendingStatusFilter, setPendingStatusFilter] = useState('');
  const [pendingProjectFilter, setPendingProjectFilter] = useState('');
  const [pendingPurposeFilter, setPendingPurposeFilter] = useState('');
  const [pendingRequesterFilter, setPendingRequesterFilter] = useState('');
  const [pendingAvailableRequesters, setPendingAvailableRequesters] = useState([]);
  const [displayValues, setDisplayValues] = useState({
    quantity: '0',
    unitPrice: '0'
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [mode, setMode] = useState('create');
  const [showModal, setShowModal] = useState(false);
  const [showDeletionModal, setShowDeletionModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch pending approvals function
  const fetchPendingApprovals = async () => {
    if (profile?.role === 'approver' || profile?.role === 'admin') {
      setLoadingPendingApprovals(true);
      try {
        // Build query params
        const params = new URLSearchParams();
        params.set('page', pendingApprovalsPagination.page.toString());
        params.set('limit', pendingApprovalsPagination.limit.toString());
        if (pendingStatusFilter) params.set('status', pendingStatusFilter);
        if (pendingProjectFilter) params.set('subProject', pendingProjectFilter);
        if (pendingPurposeFilter) params.set('purpose', pendingPurposeFilter);
        if (pendingRequesterFilter) params.set('requester', pendingRequesterFilter);
        
        const endpoint = `/purchase-requests/pending-approvals${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await apiGet(endpoint);
        const result = await response.json();
        
        if (result.success) {
          setPendingApprovals(result.data);
          if (result.pagination) {
            setPendingApprovalsPagination(result.pagination);
          }
        }
      } catch (error) {
        console.error('Failed to fetch pending approvals:', error);
        setPendingApprovals([]);
      } finally {
        setLoadingPendingApprovals(false);
      }
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

  const handleViewDetails =  async (request) => {
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
        setSelectedRequest({
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

  // Add my-request tab fetching:
  useEffect(() => {
    const fetchRequests = async () => {
      setLoadingRequests(true);
      try {
        // Build query params
        const params = new URLSearchParams();
        params.set('page', pagination.page.toString());
        params.set('limit', pagination.limit.toString());
        if (statusFilter) params.set('status', statusFilter);
        if (projectFilter) params.set('subProject', projectFilter);
        if (purposeFilter) params.set('purpose', purposeFilter);
        
        // Use different endpoints based on active tab
        const baseEndpoint = '/purchase-requests/my-requests';
        const endpoint = `${baseEndpoint}${params.toString() ? `?${params.toString()}` : ''}`;
        
        const response = await apiGet(endpoint);
        const result = await response.json();
        if (result.success) {
          setRequests(result.data);
          if (result.pagination) {
            setPagination(result.pagination);
          }
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to your requests"
        });
      } finally {
        setLoadingRequests(false);
      }
    };
    
    fetchRequests();
  }, [pagination.page, pagination.limit, statusFilter, projectFilter, purposeFilter]); // Re-fetch when these change

  // Add all-mrs tab fetching:
  useEffect(() => {
    const fetchRequests = async () => {
      setLoadingRequests(true);
      try {
        // Build query params
        const params = new URLSearchParams();
        params.set('page', allRequestsPagination.page.toString());
        params.set('limit', allRequestsPagination.limit.toString());
        if (allStatusFilter) params.set('status', allStatusFilter);
        if (allProjectFilter) params.set('subProject', allProjectFilter);
        if (allPurposeFilter) params.set('purpose', allPurposeFilter);
        if (allRequesterFilter) params.set('requester', allRequesterFilter);
        
        // Use different endpoints based on active tab
        const baseEndpoint = '/purchase-requests';
        const endpoint = `${baseEndpoint}${params.toString() ? `?${params.toString()}` : ''}`;
        
        const response = await apiGet(endpoint);
        const result = await response.json();
        if (result.success) {
          setAllRequests(result.data);
          if (result.pagination) {
            setAllRequestsPagination(result.pagination);
          }
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load all requests"
        });
      } finally {
        setLoadingRequests(false);
      }
    };
    
    fetchRequests();
  }, [allRequestsPagination.page, allRequestsPagination.limit, allStatusFilter, allProjectFilter, allPurposeFilter, allRequesterFilter]); // Re-fetch when these change

  // Fetch pending approvals when filters or pagination changes
  useEffect(() => {
    if (activeTab === 'pending-approvals') {
      fetchPendingApprovals();
    }
  }, [pendingApprovalsPagination.page, pendingApprovalsPagination.limit, pendingStatusFilter, pendingProjectFilter, pendingPurposeFilter, pendingRequesterFilter]);

  // Extract unique purposes from projects and requests for the filter dropdown
  useEffect(() => {
    if (activeTab === 'my-requests') {
      const purposesFromProjects = PRProjects.flatMap(p => p.purposes?.map(purp => purp.name) || []);
      const purposesFromRequests = requests.map(r => r.purpose).filter(Boolean);
      const allPurposes = [...purposesFromProjects, ...purposesFromRequests];
      const uniquePurposes = [...new Set(allPurposes)];
      setAvailablePurposes(uniquePurposes);
    } else if (activeTab === 'all-mrs') {
      // Extract unique requester names for All Related Requests tab
      const requestersFromRequests = allRequests.map(r => r.requesterName).filter(Boolean);
      const uniqueRequesters = [...new Set(requestersFromRequests)];
      setAllAvailableRequesters(uniqueRequesters);
    } else if (activeTab === 'pending-approvals') {
      // Extract unique purposes and requesters for Pending Approvals tab
      const purposesFromProjects = PRProjects.flatMap(p => p.purposes?.map(purp => purp.name) || []);
      const purposesFromRequests = pendingApprovals.map(r => r.purpose).filter(Boolean);
      const allPurposes = [...purposesFromProjects, ...purposesFromRequests];
      const uniquePurposes = [...new Set(allPurposes)];
      setAvailablePurposes(uniquePurposes);
      
      const requestersFromRequests = pendingApprovals.map(r => r.requesterName).filter(Boolean);
      const uniqueRequesters = [...new Set(requestersFromRequests)];
      setPendingAvailableRequesters(uniqueRequesters);
    }
  }, [PRProjects, requests, pendingApprovals]);

  const getUsersForRole = (allowedRoles) => {
    return allUsers.filter(user => 
      allowedRoles.includes(user.role?.toLowerCase())
    );
  };

  const [loadingRequest, setLoadingRequest] = useState(false);

  const handleEditRequest = async (request) => {
    setMode('edit')
    setLoadingRequest(true);
    setShowModal(true);
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
        setFormData({
          ...result.data,
          requestDate: result.data.requestDate ? new Date(result.data.requestDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          dueDate: result.data.dueDate ? new Date(result.data.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          approvers: approversFromWorkflow,
        });
        
        setSelectedRequests([]);
        setSelectedItems([]);
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
    setMode('revise')
    setLoadingRequest(true);
    setShowModal(true);
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
        setFormData({
          ...result.data,
          requestDate: result.data.requestDate ? new Date(result.data.requestDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          dueDate: result.data.dueDate ? new Date(result.data.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          approvers: approversFromWorkflow,
        });
        

        setSelectedRequests([]);
        setSelectedItems([]);
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to load request data"
        });
      }

    } catch (error) {
      console.error('Revise request error:', error);
      toast({
        title: "Error",
        description: "Failed to load request data"
      });
    } finally {
      setLoadingRequest(false);
    }
  };

  const refreshRequests = async () => {
    try {
      //Set params for my-requets tab
      const myRequestsParams = new URLSearchParams();
      myRequestsParams.set('page', '1');
      myRequestsParams.set('limit', pagination.limit.toString());
      if (statusFilter) myRequestsParams.set('status', statusFilter);
      if (projectFilter) myRequestsParams.set('subProject', projectFilter);
      if (purposeFilter) myRequestsParams.set('purpose', purposeFilter);
      //Set params for all-mrs tab
      const allMRsParams = new URLSearchParams();
      allMRsParams.set('page', allRequestsPagination.page.toString());
      allMRsParams.set('limit', allRequestsPagination.limit.toString());
      if (allStatusFilter) allMRsParams.set('status', allStatusFilter);
      if (allProjectFilter) allMRsParams.set('subProject', allProjectFilter);
      if (allPurposeFilter) allMRsParams.set('purpose', allPurposeFilter);
      if (allRequesterFilter) allMRsParams.set('requester', allRequesterFilter);
      
      const myRequetsEndpoint = `/purchase-requests/my-requests?${myRequestsParams.toString()}`;
      const allMRsEndpoint = `/purchase-requests?${allMRsParams.toString()}`;
      const myRequestResponse = await apiGet(myRequetsEndpoint);
      const allMRsResponse = await apiGet(allMRsEndpoint);
      const myRequestResult = await myRequestResponse.json();
      const allMRsResult = await allMRsResponse.json();
      
      if (myRequestResult.success && allMRsResult.success) {
        setRequests(myRequestResult.data);
        setAllRequests(allMRsResult.data);
        if (myRequestResult.pagination) {
          setPagination(myRequestResult.pagination);
        } else if (allMRsResult.pagination) {
          setAllRequestsPagination(allMRsResult.pagination);
        }
      }
    } catch (error) {
      console.error('Failed to refresh requests:', error);
    }
  };

  const handleRefresh = async (tab?: string) => {
    setLoadingRequests(true);
    try {
      // Determine which tab we're refreshing (default to activeTab if not specified)
      const targetTab = tab || activeTab;
      
      // Build query params based on the tab
      const params = new URLSearchParams();
      
      if (targetTab === 'my-requests') {
        // Use current pagination and filters for my-requests
        params.set('page', pagination.page.toString());
        params.set('limit', pagination.limit.toString());
        if (statusFilter) params.set('status', statusFilter);
        if (projectFilter) params.set('subProject', projectFilter);
        if (purposeFilter) params.set('purpose', purposeFilter);
      } else {
        // Use current pagination and filters for all-mrs
        params.set('page', allRequestsPagination.page.toString());
        params.set('limit', allRequestsPagination.limit.toString());
        if (allStatusFilter && allStatusFilter !== '__all__') params.set('status', allStatusFilter);
        if (allProjectFilter && allProjectFilter !== '__all__') params.set('subProject', allProjectFilter);
        if (allPurposeFilter && allPurposeFilter !== '__all__') params.set('purpose', allPurposeFilter);
        if (allRequesterFilter && allRequesterFilter !== '__all__') params.set('requester', allRequesterFilter);
      }
      
      // Use different endpoints based on tab
      const baseEndpoint = targetTab === 'my-requests' 
        ? '/purchase-requests/my-requests' 
        : '/purchase-requests';
      const endpoint = `${baseEndpoint}${params.toString() ? `?${params.toString()}` : ''}`;
      
      const my_requests_response = await apiGet(endpoint);
      const pr_projects_response = await apiGet('/purchase-requests/pr-projects');
      const my_requests_result = await my_requests_response.json();
      const pr_projects_result = await pr_projects_response.json();
      
      if (my_requests_result.success) {
        if (targetTab === 'my-requests') {
          setRequests(my_requests_result.data);
        } else {
          setAllRequests(my_requests_result.data);
        }
        setPRProjects(pr_projects_result.data);
        // Update the correct pagination state
        if (my_requests_result.pagination) {
          if (targetTab === 'my-requests') {
            setPagination(my_requests_result.pagination);
          } else {
            setAllRequestsPagination(my_requests_result.pagination);
          }
        }
      } else {
        toast({
          title: "Error",
          description: my_requests_result.message || "Failed to load requests data"
        });
      }
    } catch (error) {
      console.error('Failed to refresh requests:', error);
      toast({
        title: "Error",
        description: "Failed to load requests data"
      });
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleDeleteRequest = async () => {
    let response = null;
    let result = null;
    // if selectedRequests has only 1 request
    if (selectedRequests.length === 1) {
      response = await apiDelete(`/purchase-requests/${selectedRequests[0]}`);
      result = await response.json();
    }
    // if selectedRequests has more than 1 requests 
    else if (selectedRequests.length > 1) {
      response = await fetch(`${API_BASE_URL}/purchase-requests/bulk`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: selectedRequests
        }),
        credentials: "include",
      });
      result = await response.json();
    }
    if (result.success) {
      toast({
        title: "Success",
        description: result.message || "Request deleted successfully"
      });
      // Refresh the requests list
      refreshRequests();
      setSelectedRequests([]);
    } else {
      toast({
        title: "Error",
        description: result.message || "Failed to delete request"
      });
    }
  };

  const canAct = (reqs: Array<any>) => {
    const filteredRequests = reqs.filter(request => selectedRequests.includes(request._id));
    const allRequestsStatus = filteredRequests.some(request => request.status === "revised" || request.status === "rejected" || request.status === "approved");
    if (!allRequestsStatus) {
      const allStepsStatus = filteredRequests.some(request => 
        request.approvalWorkflow.some(step => step.status === "approved")
      );
      return allStepsStatus;
    }
    return allRequestsStatus;
  }

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
                    <TabsTrigger value="material-master">Material Master</TabsTrigger>
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
                        isLoading={loadingRequest}
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
                        disabled={canAct(requests) || selectedRequests.length === 0}
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
                      <Button
                        variant="destructive"
                        onClick={() => setShowDeletionModal(true)}
                        disabled={canAct(requests) || selectedRequests.length === 0}
                      >
                        Delete Request
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => handleRefresh('my-requests')}
                        disabled={loadingRequests}
                      >
                        {loadingRequests ? 'Refreshing...' : 'Refresh'}
                      </Button>
                    </div>

                    {/* Request List */}
                    <Card>
                      <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <CardTitle>My Purchase Requests</CardTitle>
                          <div className="flex flex-col sm:flex-row gap-2">
                            {/* Project Filter (SubProjects) */}
                            <Select
                              value={projectFilter || "__all__"}
                              onValueChange={(value) => {
                                setProjectFilter(value === "__all__" ? "" : value);
                                setPagination(prev => ({ ...prev, page: 1 }));
                              }}
                            >
                              <SelectTrigger className="w-full sm:w-44">
                                <SelectValue placeholder="All Projects" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__all__">All Projects</SelectItem>
                                {PRProjects.flatMap((project) => 
                                  project.subProjects?.map((subProject) => (
                                    <SelectItem key={subProject._id} value={subProject.name}>
                                      {subProject.name}
                                    </SelectItem>
                                  )) || []
                                )}
                              </SelectContent>
                            </Select>

                            {/* Purpose Filter */}
                            <Select
                              value={purposeFilter || "__all__"}
                              onValueChange={(value) => {
                                setPurposeFilter(value === "__all__" ? "" : value);
                                setPagination(prev => ({ ...prev, page: 1 }));
                              }}
                            >
                              <SelectTrigger className="w-full sm:w-44">
                                <SelectValue placeholder="All Purposes" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__all__">All Purposes</SelectItem>
                                {availablePurposes.map((purpose) => (
                                  <SelectItem key={purpose} value={purpose}>
                                    {purpose}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Status Filter */}
                            <Select
                              value={statusFilter || "__all__"}
                              onValueChange={(value) => {
                                setStatusFilter(value === "__all__" ? "" : value);
                                setPagination(prev => ({ ...prev, page: 1 }));
                              }}
                            >
                              <SelectTrigger className="w-full sm:w-36">
                                <SelectValue placeholder="All Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__all__">All Status</SelectItem>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                                <SelectItem value="revised">Revised</SelectItem>
                              </SelectContent>
                            </Select>
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
                        {/* Pagination Controls */}
                        {pagination.pages > 0 && (
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
                    isLoading={loadingRequest}
                  />

                  <ConfirmationModal
                    isOpen={showDeletionModal}
                    onClose={() => setShowDeletionModal(false)}
                    onConfirm={() => {
                      setShowDeletionModal(false);
                      handleDeleteRequest();
                    }}
                    title="Confirm Deletion"
                    message={`Are you sure you want to delete ${selectedRequests.length} purchase request(s)?`}
                    confirmText="Delete Request"
                    isLoading={isDeleting}
                  />

                  {/* All Related MRs */}
                  <TabsContent value="all-mrs" className="space-y-6">
                    {/* All Request List */}
                    <Card>
                      <CardHeader>
                        <div className="flex flex-col gap-4">
                          <CardTitle>All Related Requests</CardTitle>
                          {/* Button Row */}
                          <div className="flex gap-2 border-b">
                            <Button 
                              variant="outline" 
                              onClick={() => handleRefresh()}
                              disabled={loadingRequests}
                            >
                              {loadingRequests ? 'Refreshing...' : 'Refresh'}
                            </Button>
                            {profile.role === "admin" && (
                              <Button
                                variant='destructive'
                                onClick={() => setShowDeletionModal(true)}
                                disabled={selectedRequests.length === 0 || profile.role !== "admin"}
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-4">
                            {/* Status Filter */}
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Status:</span>
                              <Select value={allStatusFilter} onValueChange={setAllStatusFilter}>
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__all__">All Status</SelectItem>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="approved">Approved</SelectItem>
                                  <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Sub-Project Filter */}
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Project:</span>
                              <Select value={allProjectFilter} onValueChange={setAllProjectFilter}>
                                <SelectTrigger className="w-[160px]">
                                  <SelectValue placeholder="All Projects" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__all__">All Projects</SelectItem>
                                  {PRProjects.flatMap((project) => 
                                    project.subProjects?.map((subProject) => (
                                      <SelectItem key={subProject._id} value={subProject.name}>
                                        {subProject.name}
                                      </SelectItem>
                                    )) || []
                                  )}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Purpose Filter */}
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Purpose:</span>
                              <Select value={allPurposeFilter} onValueChange={setAllPurposeFilter}>
                                <SelectTrigger className="w-[160px]">
                                  <SelectValue placeholder="All Purposes" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__all__">All Purposes</SelectItem>
                                  {availablePurposes.map((purpose) => (
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
                              <Select value={allRequesterFilter} onValueChange={setAllRequesterFilter}>
                                <SelectTrigger className="w-[160px]">
                                  <SelectValue placeholder="All Requesters" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__all__">All Requesters</SelectItem>
                                  {allAvailableRequesters.map((requester) => (
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
                                {profile.role === "admin" && (
                                  <th className="text-left p-3 font-medium">
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 cursor-pointer"
                                      checked={selectedRequests.length === allRequests.length && allRequests.length > 0}
                                      onChange={e => {
                                        if (e.target.checked) {
                                          setSelectedRequests(allRequests.map(r => r.id || r._id));
                                        } else {
                                          setSelectedRequests([]);
                                        }
                                      }}
                                    />
                                  </th>
                                )}
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
                              ) : allRequests.length === 0 ? (
                                <div className="text-center py-8">
                                  <p className="text-gray-600">No requests found</p>
                                </div>
                              ) : (
                                <>
                                  {allRequests.map((request) => {
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
                                        {profile.role === "admin" && (
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
                                        )}
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
                                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                            request.status === 'checked' ? 'bg-blue-100 text-blue-800' :
                                            request.status === 'verified' ? 'bg-purple-100 text-purple-800' :
                                            request.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                                            request.status === 'revised' ? 'bg-blue-100 text-blue-800' :
                                            'bg-red-100 text-red-800'
                                          }`}>
                                            {getPendingStatusText(request)}
                                          </span>
                                        </td>
                                        <td className="p-3">{computeStage(request)}</td>
                                        <td className="p-3">{new Date(request.createdAt).toLocaleString()}</td>
                                      </tr>
                                    )
                                  })}
                                </>
                              )}
                            </tbody>
                          </table>
                        </div>
                        {/* Pagination Controls */}
                        {allRequestsPagination.pages > 0 && (
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>Showing {(allRequestsPagination.page - 1) * allRequestsPagination.limit + 1} to {Math.min(allRequestsPagination.page * allRequestsPagination.limit, allRequestsPagination.total)} of {allRequestsPagination.total} results</span>
                              <Select
                                value={allRequestsPagination.limit.toString()}
                                onValueChange={(value) => {
                                  setAllRequestsPagination(prev => ({ ...prev, limit: parseInt(value), page: 1 }));
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
                                onClick={() => setAllRequestsPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                disabled={allRequestsPagination.page === 1 || loadingRequests}
                              >
                                ←
                              </Button>
                              
                              {Array.from({ length: Math.min(5, allRequestsPagination.pages) }, (_, i) => {
                                let pageNum;
                                if (allRequestsPagination.pages <= 5) {
                                  pageNum = i + 1;
                                } else if (allRequestsPagination.page <= 3) {
                                  pageNum = i + 1;
                                } else if (allRequestsPagination.page >= allRequestsPagination.pages - 2) {
                                  pageNum = allRequestsPagination.pages - 4 + i;
                                } else {
                                  pageNum = allRequestsPagination.page - 2 + i;
                                }
                                
                                return (
                                  <Button
                                    key={pageNum}
                                    variant={allRequestsPagination.page === pageNum ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setAllRequestsPagination(prev => ({ ...prev, page: pageNum }))}
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
                                onClick={() => setAllRequestsPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                disabled={allRequestsPagination.page === allRequestsPagination.pages || loadingRequests}
                              >
                                →
                              </Button>
                            </div>
                          </div>
                        )}
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
                        pagination={pendingApprovalsPagination}
                        setPagination={setPendingApprovalsPagination}
                        statusFilter={pendingStatusFilter}
                        setStatusFilter={setPendingStatusFilter}
                        projectFilter={pendingProjectFilter}
                        setProjectFilter={setPendingProjectFilter}
                        purposeFilter={pendingPurposeFilter}
                        setPurposeFilter={setPendingPurposeFilter}
                        requesterFilter={pendingRequesterFilter}
                        setRequesterFilter={setPendingRequesterFilter}
                        PRProjects={PRProjects}
                        availablePurposes={availablePurposes}
                        availableRequesters={pendingAvailableRequesters}
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
                  <TabsContent value="material-master" className="space-y-6">
                    <MasterMaterials/>
                  </TabsContent>
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