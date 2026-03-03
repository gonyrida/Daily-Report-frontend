import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { 
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import HierarchicalSidebar from '@/components/HierarchicalSidebar';
import { ThemeToggle } from "@/components/ThemeToggle";
import ProfileIcon from '@/components/ProfileIcon';
import { useProfileContext } from '@/contexts/ProfileContext';
import PendingApprovalsTab from '@/components/purchase_request/PendingApprovalsTab';
import Draggable from 'react-draggable';

const PurchaseRequest = () => {
  const { profile } = useProfileContext();
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [formData, setFormData] = useState({
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

  const [editFormData, setEditFormData] = useState({
    requesterName: '',
    requesterDepartment: '',
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
    approvers: {
      preparedBy: '',
      checkedBy: '',
      verifiedBy: '',
      approvedBy: ''
    }
  });

  const [selectedItems, setSelectedItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('my-requests');
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loadingPendingApprovals, setLoadingPendingApprovals] = useState(false);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null); // NEW: For editing
  const [showEditModal, setShowEditModal] = useState(false); // NEW: Edit modal visibility
  const [displayValues, setDisplayValues] = useState({
    quantity: '0',
    unitPrice: '0'
  });
  const [isEditMode, setIsEditMode] = useState(false);

  // Fetch pending approvals for approver/admin
  useEffect(() => {
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

  const [newItem, setNewItem] = useState({
    description: '',
    unit: '',
    quantity: 0,
    unitPrice: 0,
    brand: '',
    reference: '',
    note: ''
  });

  const { toast } = useToast();

  const handleSubmit = async (action = 'post') => {
    setIsSubmitting(true);
    
    try {
      // Validate form (less strict for drafts)
      if (action === 'post' && (!formData.projectName || !formData.purpose || !formData.deliveryPlace || formData.items.length === 0)) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields and add at least one item"
        });
        setIsSubmitting(false);
        return;
      }

      if (action === 'draft' && !formData.projectName) {
        toast({
          title: "Validation Error", 
          description: "Please enter at least a project name for drafts"
        });
        setIsSubmitting(false);
        return;
      }

      // Prepare submission data with approval fields
      const submissionData = {
        ...formData,
        status: action === 'draft' ? 'draft' : 'pending',
        // Add approval workflow fields (can be populated later)
        preparedBy: null,
        checkedBy: null, 
        verifiedBy: null,
        approvedBy: null,
        priority: 'medium'
      };

      const response = await apiPost('/purchase-requests', submissionData);
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Success",
          description: `Purchase request ${action === 'draft' ? 'saved as draft' : 'submitted'} successfully`
        });
        
        // Reset form but keep user info
        setFormData({
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
        
        // Close modal
        setShowNewRequest(false);
        
        // Optionally refresh requests list
        // await fetchPurchaseRequests();
        
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to submit request"
        });
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: "Error",
        description: `Failed to ${action === 'draft' ? 'save draft' : 'submit request'}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update handleAddItem function
  const handleAddItem = () => {
    if (newItem.description && newItem.quantity > 0 && newItem.unitPrice > 0) {
      let updatedItems;
      
      // Smart context detection
      const isEditMode = showEditModal;
      
      if (editingIndex !== null) {
        // Edit existing item
        if (isEditMode) {
          updatedItems = editFormData.items.map((item, index) => 
            index === editingIndex ? newItem : item
          );
        } else {
          updatedItems = formData.items.map((item, index) => 
            index === editingIndex ? newItem : item
          );
        }
      } else {
        // Add new item
        if (isEditMode) {
          updatedItems = [...editFormData.items, newItem];
        } else {
          updatedItems = [...formData.items, newItem];
        }
      }
      
      // Update the appropriate state
      if (isEditMode) {
        setEditFormData({...editFormData, items: updatedItems});
      } else {
        setFormData({...formData, items: updatedItems});
      }
      
      // Reset form
      setNewItem({
        description: '',
        unit: '',
        quantity: 1,
        unitPrice: 0,
        brand: '',
        reference: '',
        note: ''
      });
      setEditingIndex(null);
      setShowAddItemModal(false);
    }
  };

  const handleEditSelected = () => {
    if (selectedItems.length === 1) {
      const itemIndex = selectedItems[0];
      
      // Smart context detection
      const isEditMode = showEditModal;
      const currentItems = isEditMode ? editFormData.items : formData.items;
      const item = currentItems[itemIndex];
      
      setNewItem({
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        brand: item.brand,
        reference: item.reference,
        note: item.note
      });
      
      setEditingIndex(itemIndex);

      // Set display values for editing
      setDisplayValues({
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString()
      });
      setIsEditMode(true); // Set to edit mode
      setShowAddItemModal(true);
    }
  };

  const handleRemoveSelected = () => {
    if (selectedItems.length > 0) {
      // Smart context detection
      const isEditMode = showEditModal;
      
      if (isEditMode) {
        const updatedItems = editFormData.items.filter((_, index) => !selectedItems.includes(index));
        setEditFormData({...editFormData, items: updatedItems});
      } else {
        const updatedItems = formData.items.filter((_, index) => !selectedItems.includes(index));
        setFormData({...formData, items: updatedItems});
      }
      setSelectedItems([]);
    }
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

  // Fetch all users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const response = await apiGet('/purchase-requests/users');
        const result = await response.json();
        if (result.success) {
          setAllUsers(result.data);
          console.log('✅ Users loaded:', result.data);
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
          console.log('✅ Requests loaded:', result.data);
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
    console.log('Edit request:', request);
    setEditingRequest(request);

    const approversFromWorkflow = {
      preparedBy: request.approvalWorkflow.find(w => w.role === 'prepared')?.approver || '',
      checkedBy: request.approvalWorkflow.find(w => w.role === 'checked')?.approver || '',
      verifiedBy: request.approvalWorkflow.find(w => w.role === 'verified')?.approver || '',
      approvedBy: request.approvalWorkflow.find(w => w.role === 'approved')?.approver || ''
    };
    
    // Populate formData with request data
    setEditFormData({
      requesterName: request.requesterName || '',
      requesterDepartment: request.requesterDepartment || '',
      projectName: request.projectName || '',
      purpose: request.purpose || '',
      requestDate: request.requestDate ? new Date(request.requestDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      deliveryPlace: request.deliveryPlace || '',
      categories: request.categories || {
        construction: false,
        admin: false,
        material: false,
        services: false
      },
      items: request.items || [],
      approvers: approversFromWorkflow
    });

    setSelectedRequests([]); // Clear selection after edit opens
    setSelectedItems([]); // CLEAR selection from New Request modal
    setShowEditModal(true);
  };

  const handlePlaceholder1 = (request) => {
    console.log('Placeholder 1 for:', request);
    // TODO: Implement placeholder 1 functionality
    toast({
      title: "Placeholder 1",
      description: `Action for request: ${request.id}`
    });
  };

  const handleUpdateRequest = async (action = 'update') => {
    setIsUpdating(true);
    try {
      const updateData = {
        ...editFormData,
        ...(action === 'post' && { status: 'pending' })
      };

      const response = await apiPut(`/purchase-requests/${editingRequest._id}`, updateData);
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Request updated successfully"
        });
        setShowEditModal(false);
        setEditingRequest(null);
        // Refresh requests
        const fetchRequests = async () => {
          const endpoint = activeTab === 'my-requests' 
            ? '/purchase-requests/my-requests' 
            : '/purchase-requests';
          const response = await apiGet(endpoint);
          const result = await response.json();
          if (result.success) {
            setRequests(result.data);
          }
        };
        fetchRequests();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update request"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Add this helper function in your component
  const handleDecimalInput = (value: string, fieldName: 'quantity' | 'unitPrice') => {
    const regex = /^\d*\.?\d{0,2}$/;
    
    if (regex.test(value) || value === "") {
      // Update display value
      setDisplayValues(prev => ({
        ...prev,
        [fieldName]: value
      }));
      
      // Update stored value (as number)
      setNewItem(prev => ({
        ...prev,
        [fieldName]: value === "" || value === "." ? 0 : parseFloat(value) || 0
      }));
    }
  };
  
  const handleBlur = (fieldName: 'quantity' | 'unitPrice') => {
    const currentValue = displayValues[fieldName];
    if (currentValue !== "") {
      const numericValue = parseFloat(currentValue);
      
      // Only show decimal places if it's not a whole number
      const formatted = numericValue % 1 === 0 
        ? numericValue.toString()  // "10" instead of "10.00"
        : numericValue.toFixed(2); // "10.50" stays as "10.50"
      
      setDisplayValues(prev => ({
        ...prev,
        [fieldName]: formatted
      }));
      setNewItem(prev => ({
        ...prev,
        [fieldName]: parseFloat(formatted)
      }));
    }
  };

  // Specific filters for each dropdown
  const preparers = allUsers; // Anyone can prepare
  const checkers = getUsersForRole(['admin', 'approver']);
  const verifiers = getUsersForRole(['admin', 'approver']);
  const approvers = getUsersForRole(['admin', 'approver']);

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
                  </TabsList>

                  <TabsContent value="my-requests" className="space-y-6">
                    {/* Button Row */}
                    <div className="flex gap-2 mb-6 sticky top-0 bg-background z-10 py-4 border-b">
                      <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="default"
                            onClick={() => {
                              // Reset form data when opening New Request
                              setFormData({
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
                                approvers: {
                                  checkedBy: '',
                                  verifiedBy: '',
                                  approvedBy: ''
                                }
                              });
                              setSelectedItems([]); // Clear any selected items
                            }}
                          >
                            New Request
                          </Button>
                        </DialogTrigger>
                        <DialogContent 
                          className="max-w-6xl max-h-[95vh] overflow-y-auto"
                          onPointerDownOutside={(e) => e.preventDefault()}
                          onEscapeKeyDown={(e) => e.preventDefault()}
                        >
                          <DialogHeader>
                            <DialogTitle>New Purchase Request</DialogTitle>
                          </DialogHeader>
                          
                          {/* Modal Tabs */}
                          <Tabs defaultValue="purchase-request" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                              <TabsTrigger value="purchase-request">Purchase Request</TabsTrigger>
                              <TabsTrigger value="placeholder1">Placeholder 1</TabsTrigger>
                              <TabsTrigger value="placeholder2">Placeholder 2</TabsTrigger>
                            </TabsList>

                            <TabsContent value="purchase-request" className="space-y-4 mt-6">
                              <form className="space-y-6">
                                {/* Header Section */}
                                <div className="bg-muted/30 p-4 rounded-lg">
                                  <div className="space-y-4">
                                    {/* Requester */}
                                    <div>
                                      <label className="text-sm font-medium text-muted-foreground">Requester</label>
                                      <div className="text-sm font-semibold">
                                        {isProfileLoading ? 'Loading...' : `${formData.requesterName} (${formData.requesterDepartment})`}
                                      </div>
                                    </div>
                                    
                                    {/* Project Name */}
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium">Project Name *</label>
                                      <Input
                                        value={formData.projectName}
                                        onChange={(e) => setFormData({...formData, projectName: e.target.value})}
                                        placeholder="Enter project name"
                                        required
                                      />
                                    </div>
                                    
                                    {/* Purpose */}
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium">Purpose *</label>
                                      <Input
                                        value={formData.purpose}
                                        onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                                        placeholder="Enter Purpose of Request"
                                      />
                                    </div>
                                    
                                    {/* Request Date */}
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium">Request Date</label>
                                      <Input
                                        type="date"
                                        value={formData.requestDate || new Date().toISOString().split('T')[0]}
                                        onChange={(e) => setFormData({...formData, requestDate: e.target.value})}
                                      />
                                    </div>
                                    
                                    {/* Delivery Place */}
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium">Delivery Place</label>
                                      <Input
                                        value={formData.deliveryPlace}
                                        onChange={(e) => setFormData({...formData, deliveryPlace: e.target.value})}
                                        placeholder="Enter delivery location"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Category Selection */}
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Category Selection</label>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        id="construction"
                                        checked={formData.categories.construction}
                                        onChange={(e) => setFormData({
                                          ...formData,
                                          categories: {...formData.categories, construction: e.target.checked}
                                        })}
                                      />
                                      <label htmlFor="construction" className="text-sm">Construction</label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        id="admin"
                                        checked={formData.categories.admin}
                                        onChange={(e) => setFormData({
                                          ...formData,
                                          categories: {...formData.categories, admin: e.target.checked}
                                        })}
                                      />
                                      <label htmlFor="admin" className="text-sm">Admin</label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        id="material"
                                        checked={formData.categories.material}
                                        onChange={(e) => setFormData({
                                          ...formData,
                                          categories: {...formData.categories, material: e.target.checked}
                                        })}
                                      />
                                      <label htmlFor="material" className="text-sm">Material</label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        id="services"
                                        checked={formData.categories.services}
                                        onChange={(e) => setFormData({
                                          ...formData,
                                          categories: {...formData.categories, services: e.target.checked}
                                        })}
                                      />
                                      <label htmlFor="services" className="text-sm">Services</label>
                                    </div>
                                  </div>
                                </div>

                                {/* Item Management */}
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium">Item Management</label>
                                    <div className="flex gap-2">
                                      <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => {
                                          // Reset all edit-related state before opening
                                          setNewItem({ description: '', unit: '', quantity: 0, unitPrice: 0, brand: '', reference: '', note: '' });
                                          setDisplayValues({ quantity: '0', unitPrice: '0' });
                                          setEditingIndex(null);
                                          setIsEditMode(false);
                                          setShowAddItemModal(true)
                                        }}
                                      >
                                        Add Item
                                      </Button>
                                      <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm"
                                        onClick={handleEditSelected}
                                        disabled={selectedItems.length === 0 || selectedItems.length > 1}
                                      >
                                        Edit Selected
                                      </Button>
                                      <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm"
                                        onClick={handleRemoveSelected}
                                        disabled={selectedItems.length === 0}
                                      >
                                        Remove Selected
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Items Table */}
                                  <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full">
                                      <thead className="bg-muted/50">
                                        <tr>
                                          <th className="text-left p-2 text-xs font-medium w-8">
                                            <input
                                              type="checkbox"
                                              checked={selectedItems.length === formData.items.length && formData.items.length > 0}
                                              onChange={(e) => {
                                                if (e.target.checked) {
                                                  setSelectedItems(formData.items.map((_, index) => index));
                                                } else {
                                                  setSelectedItems([]);
                                                }
                                              }}
                                            />
                                          </th>
                                          <th className="text-left p-2 text-xs font-medium">No</th>
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
                                        {formData.items.map((item, index) => (
                                          <tr 
                                            key={index} 
                                            className={`border-t cursor-pointer transition-colors ${
                                              selectedItems.includes(index) ? 'bg-blue-50' : 'hover:bg-muted/30'
                                            }`}
                                          >
                                            <td className="p-2 text-xs">
                                              <input
                                                type="checkbox"
                                                checked={selectedItems.includes(index)}
                                                onChange={(e) => {
                                                  if (e.target.checked) {
                                                    setSelectedItems([...selectedItems, index]);
                                                  } else {
                                                    setSelectedItems(selectedItems.filter(i => i !== index));
                                                  }
                                                }}
                                              />
                                            </td>
                                            <td className="p-2 text-xs">{index + 1}</td>
                                            <td className="p-2 text-xs">{item.description || ''}</td>
                                            <td className="p-2 text-xs">{item.unit || ''}</td>
                                            <td className="p-2 text-xs">{item.quantity || ''}</td>
                                            <td className="p-2 text-xs">${item.unitPrice || ''}</td>
                                            <td className="p-2 text-xs font-medium">
                                              ${(item.quantity * item.unitPrice).toFixed(2) || '0.00'}
                                            </td>
                                            <td className="p-2 text-xs">{item.brand || ''}</td>
                                            <td className="p-2 text-xs">{item.reference || ''}</td>
                                            <td className="p-2 text-xs">{item.note || ''}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Stacked Total Section */}
                                  <div className="bg-muted/30 p-4 rounded-lg">
                                    {/* Grand Total */}
                                    <div className="flex items-center mb-3 gap-2">
                                      <span className="text-sm font-medium">Grand Total: </span>
                                      <span className="text-lg font-bold">
                                        ${formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2)}
                                      </span>
                                    </div>
                                    
                                    {/* Amount in Words */}
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">Amount in Words: </span>
                                      <span className="text-base font-semibold capitalize">
                                        {(() => {
                                          const total = formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
                                          const dollars = Math.floor(total);
                                          const cents = Math.round((total - dollars) * 100);
                                          
                                          const wordResult = numberToWords(dollars);
                                          const centsStr = cents.toString().padStart(2, '0');
                                          
                                          return `${wordResult} and ${centsStr}/100 Dollars`;
                                        })()}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Divider */}
                                <div className="border-t pt-4 mt-4"></div>
                                
                                {/* Signature Section */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium">Prepared By</Label>
                                    <Select>
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select preparer" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {loadingUsers ? (
                                          <SelectItem value="" disabled>Loading...</SelectItem>
                                        ) : (
                                          preparers.map((user) => (
                                            <SelectItem key={user._id} value={user._id}>
                                              {user.firstName + ' ' + user.lastName} ({user.role})
                                            </SelectItem>
                                          ))
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                
                                  <div>
                                    <Label className="text-sm font-medium">Checked By</Label>
                                    <Select 
                                      value={formData.approvers.checkedBy} 
                                      onValueChange={(value) => 
                                        setFormData(prev => ({
                                          ...prev,
                                          approvers: { ...prev.approvers, checkedBy: value }
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select checker" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {loadingUsers ? (
                                          <SelectItem value="" disabled>Loading...</SelectItem>
                                        ) : (
                                          checkers.map((user) => (
                                            <SelectItem key={user._id} value={user._id}>
                                              {user.firstName + ' ' + user.lastName} ({user.role})
                                            </SelectItem>
                                          ))
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                
                                  <div>
                                    <Label className="text-sm font-medium">Verified By</Label>
                                    <Select 
                                      value={formData.approvers.verifiedBy} 
                                      onValueChange={(value) => 
                                        setFormData(prev => ({
                                          ...prev,
                                          approvers: { ...prev.approvers, verifiedBy: value }
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select verifier" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {loadingUsers ? (
                                          <SelectItem value="" disabled>Loading...</SelectItem>
                                        ) : (
                                          verifiers.map((user) => (
                                            <SelectItem key={user._id} value={user._id}>
                                              {user.firstName + ' ' + user.lastName} ({user.role})
                                            </SelectItem>
                                          ))
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                
                                  <div>
                                    <Label className="text-sm font-medium">Approved By</Label>
                                    <Select 
                                      value={formData.approvers.approvedBy} 
                                      onValueChange={(value) => 
                                        setFormData(prev => ({
                                          ...prev,
                                          approvers: { ...prev.approvers, approvedBy: value }
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select approver" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {loadingUsers ? (
                                          <SelectItem value="" disabled>Loading...</SelectItem>
                                        ) : (
                                          approvers.map((user) => (
                                            <SelectItem key={user._id} value={user._id}>
                                              {user.firstName + ' ' + user.lastName} ({user.role})
                                            </SelectItem>
                                          ))
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex justify-between items-center pt-4 border-t">
                                  {/* Left side - Export and Preview */}
                                  <div className="flex space-x-2">
                                    <Button 
                                      type="button" 
                                      variant="outline"
                                      onClick={() => {
                                        // Export logic here
                                        console.log("Export clicked");
                                      }}
                                    >
                                      Export
                                    </Button>
                                    <Button 
                                      type="button" 
                                      variant="outline"
                                      onClick={() => {
                                        // Preview logic here
                                        console.log("Preview clicked");
                                      }}
                                    >
                                      Preview
                                    </Button>
                                  </div>
                                  
                                  {/* Right side - Cancel and Post */}
                                  <div className="flex space-x-2">
                                    <Button 
                                      type="button" 
                                      variant="outline"
                                      onClick={() => setShowNewRequest(false)}
                                    >
                                      Cancel
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button 
                                          type="button" 
                                          disabled={isSubmitting || !formData.projectName || formData.items.length === 0}
                                        >
                                          {isSubmitting ? "Processing..." : "Options ▼"}
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => handleSubmit('post')}>
                                          {isSubmitting ? "Posting..." : "Post"}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleSubmit('draft')}>
                                          {isSubmitting ? "Saving..." : "Save as Draft"}
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              </form>
                            </TabsContent>

                            <TabsContent value="placeholder1" className="mt-6">
                              <div className="text-center py-8 text-muted-foreground">
                                <p>Placeholder 1 content will appear here.</p>
                              </div>
                            </TabsContent>

                            <TabsContent value="placeholder2" className="mt-6">
                              <div className="text-center py-8 text-muted-foreground">
                                <p>Placeholder 2 content will appear here.</p>
                              </div>
                            </TabsContent>
                          </Tabs>
                        </DialogContent>
                      </Dialog>

                      <Button 
                        variant="default" 
                        onClick={() => {
                          if (selectedRequests.length === 1) {
                            const request = requests.find(r => r.id === selectedRequests[0] || r._id === selectedRequests[0]);
                            if (request) handleEditRequest(request);
                          }
                        }}
                        disabled={selectedRequests.length !== 1}
                      >
                        Edit Request
                      </Button>
                      <Button variant="outline">Placeholder 1</Button>
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
                                        className={`border-b cursor-pointer transition-colors ${isSelected ? 'bg-blue-100' : 'hover:bg-muted/30'}`}
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
                                        <td className="p-3 font-medium">{request.id}</td>
                                        <td className="p-3">{request.projectName}</td>
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
                                            'bg-red-100 text-red-800'
                                          }`}>
                                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                          </span>
                                        </td>
                                        <td className="p-3">{new Date(request.createdAt).toLocaleDateString()}</td>
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
                  <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Purchase Request Details</DialogTitle>
                      </DialogHeader>

                      {/* Edit Button: Top right below close button, only for owner */}
                      {selectedRequest && profile && selectedRequest.approvers.preparedBy === profile.id && (
                        <Button
                          variant="default"
                          size="sm"
                          className="ml-2 w-fit"
                          onClick={() => {
                            handleEditRequest(selectedRequest);
                            setShowDetailsModal(false);
                          }}
                        >
                          Edit
                        </Button>
                      )}

                      {/* Add to your details modal content */}
                      {selectedRequest && (
                        <div className="space-y-6">
                          {/* 1. Document Header (MR Number Info) */}
                          <div className="bg-muted/30 p-4 rounded-lg border-l-4 border-blue-500">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-bold text-lg">MR-{selectedRequest.id}</h3>
                                <p className="text-sm text-muted-foreground">
                                  Created: {new Date(selectedRequest.createdAt || selectedRequest.date).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  selectedRequest.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  selectedRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  selectedRequest.status === 'checked' ? 'bg-blue-100 text-blue-800' :
                                  selectedRequest.status === 'verified' ? 'bg-purple-100 text-purple-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {selectedRequest.status}
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
                                <p className="text-sm">{selectedRequest.id}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-blue-700">Category</label>
                                <div className="flex gap-1 flex-wrap">
                                  {selectedRequest.categories.admin && (
                                    <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">Admin</span>
                                  )}
                                  {selectedRequest.categories.construction && (
                                    <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">Construction</span>
                                  )}
                                  {selectedRequest.categories.material && (
                                    <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">Material</span>
                                  )}
                                  {selectedRequest.categories.services && (
                                    <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">Services</span>
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
                              {/* <div>
                                <label className="text-sm font-medium text-green-700">Contact</label>
                                <p className="text-sm">{profile?.email}</p>
                              </div> */}
                              <div>
                                <label className="text-sm font-medium text-green-700">Request Date</label>
                                <p className="text-sm">{new Date(selectedRequest.createdAt || selectedRequest.date).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </div>

                          {/* 4. Delivery Place (Updated from Logistics) */}
                          <div className="bg-muted/30 p-4 rounded-lg">
                            <h3 className="font-semibold mb-4 text-orange-700">Delivery Place</h3>
                            <div className="bg-white p-4 rounded border-l-4 border-orange-500">
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
                                <p className="text-2xl font-bold">${selectedRequest.grandTotal || '0.00'}</p>
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
                            <h3 className="font-semibold mb-4 text-gray-700">Approval Workflow</h3>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                <span className="text-sm font-medium">Current Status</span>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  selectedRequest.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  selectedRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  selectedRequest.status === 'checked' ? 'bg-blue-100 text-blue-800' :
                                  selectedRequest.status === 'verified' ? 'bg-purple-100 text-purple-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {selectedRequest.status}
                                </span>
                              </div>
                              
                              {/* NEW: Workflow Table Display */}
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  {selectedRequest.approvalWorkflow?.map((step, index) => {
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
                                              step.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
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
                                          {step.timestamp ? new Date(step.timestamp).toLocaleDateString() : 'Pending'}
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

                  {/* Edit Request Modal Re-do */}
                  <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                    <DialogContent 
                      className="max-w-6xl max-h-[95vh] overflow-y-auto"
                      onPointerDownOutside={(e) => e.preventDefault()}
                      onEscapeKeyDown={(e) => e.preventDefault()}
                    >
                      <DialogHeader>
                        <DialogTitle>Edit Purchase Request</DialogTitle>
                      </DialogHeader>
                      
                      {/* Modal Tabs */}
                      <Tabs defaultValue="purchase-request" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="purchase-request">Purchase Request</TabsTrigger>
                          <TabsTrigger value="placeholder1">Placeholder 1</TabsTrigger>
                          <TabsTrigger value="placeholder2">Placeholder 2</TabsTrigger>
                        </TabsList>

                        <TabsContent value="purchase-request" className="space-y-4 mt-6">
                          <form className="space-y-6">
                            {/* Header Section */}
                            <div className="bg-muted/30 p-4 rounded-lg">
                              <div className="space-y-4">
                                {/* Requester */}
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Requester</label>
                                  <div className="text-sm font-semibold">
                                    {editFormData.requesterName} ({editFormData.requesterDepartment})
                                  </div>
                                </div>
                                
                                {/* Project Name */}
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Project Name *</label>
                                  <Input
                                    value={editFormData.projectName}
                                    onChange={(e) => setEditFormData({...editFormData, projectName: e.target.value})}
                                    placeholder="Enter project name"
                                    required
                                  />
                                </div>
                                
                                {/* Purpose */}
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Purpose *</label>
                                  <Input
                                    value={editFormData.purpose}
                                    onChange={(e) => setEditFormData({...editFormData, purpose: e.target.value})}
                                    placeholder="Enter Purpose of Request"
                                  />
                                </div>
                                
                                {/* Request Date */}
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Request Date</label>
                                  <Input
                                    type="date"
                                    value={editFormData.requestDate || new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setEditFormData({...editFormData, requestDate: e.target.value})}
                                  />
                                </div>
                                
                                {/* Delivery Place */}
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Delivery Place</label>
                                  <Input
                                    value={editFormData.deliveryPlace}
                                    onChange={(e) => setEditFormData({...editFormData, deliveryPlace: e.target.value})}
                                    placeholder="Enter delivery location"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Category Selection */}
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Category Selection</label>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id="construction"
                                    checked={editFormData.categories.construction}
                                    onChange={(e) => setEditFormData({
                                      ...editFormData,
                                      categories: {...editFormData.categories, construction: e.target.checked}
                                    })}
                                  />
                                  <label htmlFor="construction" className="text-sm">Construction</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id="admin"
                                    checked={editFormData.categories.admin}
                                    onChange={(e) => setEditFormData({
                                      ...editFormData,
                                      categories: {...editFormData.categories, admin: e.target.checked}
                                    })}
                                  />
                                  <label htmlFor="admin" className="text-sm">Admin</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id="material"
                                    checked={editFormData.categories.material}
                                    onChange={(e) => setEditFormData({
                                      ...editFormData,
                                      categories: {...editFormData.categories, material: e.target.checked}
                                    })}
                                  />
                                  <label htmlFor="material" className="text-sm">Material</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id="services"
                                    checked={editFormData.categories.services}
                                    onChange={(e) => setEditFormData({
                                      ...editFormData,
                                      categories: {...editFormData.categories, services: e.target.checked}
                                    })}
                                  />
                                  <label htmlFor="services" className="text-sm">Services</label>
                                </div>
                              </div>
                            </div>

                            {/* Item Management */}
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <label className="text-sm font-medium">Item Management</label>
                                <div className="flex gap-2">
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      // Reset all edit-related state before opening
                                      setNewItem({ description: '', unit: '', quantity: 0, unitPrice: 0, brand: '', reference: '', note: '' });
                                      setDisplayValues({ quantity: '0', unitPrice: '0' });
                                      setEditingIndex(null);
                                      setIsEditMode(false);
                                      setShowAddItemModal(true)
                                    }}
                                  >
                                    Add Item
                                  </Button>
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm"
                                    onClick={handleEditSelected}
                                    disabled={selectedItems.length === 0 || selectedItems.length > 1}
                                  >
                                    Edit Selected
                                  </Button>
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm"
                                    onClick={handleRemoveSelected}
                                    disabled={selectedItems.length === 0}
                                  >
                                    Remove Selected
                                  </Button>
                                </div>
                              </div>

                              {/* Items Table */}
                              <div className="border rounded-lg overflow-hidden">
                                <table className="w-full">
                                  <thead className="bg-muted/50">
                                    <tr>
                                      <th className="text-left p-2 text-xs font-medium w-8">
                                        <input
                                          type="checkbox"
                                          checked={selectedItems.length === editFormData.items.length && editFormData.items.length > 0}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setSelectedItems(editFormData.items.map((_, index) => index));
                                            } else {
                                              setSelectedItems([]);
                                            }
                                          }}
                                        />
                                      </th>
                                      <th className="text-left p-2 text-xs font-medium">No</th>
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
                                    {editFormData.items.map((item, index) => (
                                      <tr 
                                        key={index} 
                                        className={`border-t cursor-pointer transition-colors ${
                                          selectedItems.includes(index) ? 'bg-blue-50' : 'hover:bg-muted/30'
                                        }`}
                                      >
                                        <td className="p-2 text-xs">
                                          <input
                                            type="checkbox"
                                            checked={selectedItems.includes(index)}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setSelectedItems([...selectedItems, index]);
                                              } else {
                                                setSelectedItems(selectedItems.filter(i => i !== index));
                                              }
                                            }}
                                          />
                                        </td>
                                        <td className="p-2 text-xs">{index + 1}</td>
                                        <td className="p-2 text-xs">{item.description || ''}</td>
                                        <td className="p-2 text-xs">{item.unit || ''}</td>
                                        <td className="p-2 text-xs">{item.quantity || ''}</td>
                                        <td className="p-2 text-xs">${item.unitPrice || ''}</td>
                                        <td className="p-2 text-xs font-medium">
                                          ${(item.quantity * item.unitPrice).toFixed(2) || '0.00'}
                                        </td>
                                        <td className="p-2 text-xs">{item.brand || ''}</td>
                                        <td className="p-2 text-xs">{item.reference || ''}</td>
                                        <td className="p-2 text-xs">{item.note || ''}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Stacked Total Section */}
                              <div className="bg-muted/30 p-4 rounded-lg">
                                {/* Grand Total */}
                                <div className="flex items-center mb-3 gap-2">
                                  <span className="text-sm font-medium">Grand Total: </span>
                                  <span className="text-lg font-bold">
                                    ${editFormData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2)}
                                  </span>
                                </div>
                                
                                {/* Amount in Words */}
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">Amount in Words: </span>
                                  <span className="text-base font-semibold capitalize">
                                    {(() => {
                                      const total = editFormData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
                                      const dollars = Math.floor(total);
                                      const cents = Math.round((total - dollars) * 100);
                                      
                                      const wordResult = numberToWords(dollars);
                                      const centsStr = cents.toString().padStart(2, '0');
                                      
                                      return `${wordResult} and ${centsStr}/100 Dollars`;
                                    })()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Divider */}
                            <div className="border-t pt-4 mt-4"></div>
                            
                            {/* Signature Section */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <Label className="text-sm font-medium">Prepared By</Label>
                                <Select 
                                  value={editFormData.approvers.preparedBy} 
                                  onValueChange={(value) => 
                                    setEditFormData(prev => ({
                                      ...prev,
                                      approvers: { ...prev.approvers, preparedBy: value }
                                    }))
                                  }
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select preparer" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {loadingUsers ? (
                                      <SelectItem value="" disabled>Loading...</SelectItem>
                                    ) : (
                                      preparers.map((user) => (
                                        <SelectItem key={user._id} value={user._id}>
                                          {user.firstName + ' ' + user.lastName} ({user.role})
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            
                              <div>
                                <Label className="text-sm font-medium">Checked By</Label>
                                <Select 
                                  value={editFormData.approvers.checkedBy} 
                                  onValueChange={(value) => 
                                    setEditFormData(prev => ({
                                      ...prev,
                                      approvers: { ...prev.approvers, checkedBy: value }
                                    }))
                                  }
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select checker" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {loadingUsers ? (
                                      <SelectItem value="" disabled>Loading...</SelectItem>
                                    ) : (
                                      checkers.map((user) => (
                                        <SelectItem key={user._id} value={user._id}>
                                          {user.firstName + ' ' + user.lastName} ({user.role})
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            
                              <div>
                                <Label className="text-sm font-medium">Verified By</Label>
                                <Select 
                                  value={editFormData.approvers.verifiedBy} 
                                  onValueChange={(value) => 
                                    setEditFormData(prev => ({
                                      ...prev,
                                      approvers: { ...prev.approvers, verifiedBy: value }
                                    }))
                                  }
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select verifier" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {loadingUsers ? (
                                      <SelectItem value="" disabled>Loading...</SelectItem>
                                    ) : (
                                      verifiers.map((user) => (
                                        <SelectItem key={user._id} value={user._id}>
                                          {user.firstName + ' ' + user.lastName} ({user.role})
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            
                              <div>
                                <Label className="text-sm font-medium">Approved By</Label>
                                <Select 
                                  value={editFormData.approvers.approvedBy} 
                                  onValueChange={(value) => 
                                    setEditFormData(prev => ({
                                      ...prev,
                                      approvers: { ...prev.approvers, approvedBy: value }
                                    }))
                                  }
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select approver" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {loadingUsers ? (
                                      <SelectItem value="" disabled>Loading...</SelectItem>
                                    ) : (
                                      approvers.map((user) => (
                                        <SelectItem key={user._id} value={user._id}>
                                          {user.firstName + ' ' + user.lastName} ({user.role})
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-between items-center pt-4 border-t">
                              {/* Left side - Export and Preview */}
                              <div className="flex space-x-2">
                                <Button 
                                  type="button" 
                                  variant="outline"
                                  onClick={() => {
                                    // Export logic here
                                    console.log("Export clicked");
                                  }}
                                >
                                  Export
                                </Button>
                                <Button 
                                  type="button" 
                                  variant="outline"
                                  onClick={() => {
                                    // Preview logic here
                                    console.log("Preview clicked");
                                  }}
                                >
                                  Preview
                                </Button>
                              </div>
                              
                              {/* Right side - Cancel and Post */}
                              <div className="flex space-x-2">
                                <Button 
                                  type="button" 
                                  variant="outline"
                                  onClick={() => setShowEditModal(false)}
                                >
                                  Cancel
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      type="button" 
                                      disabled={isUpdating || !editFormData.projectName || editFormData.items.length === 0}
                                    >
                                      {isUpdating ? "Processing..." : "Options ▼"}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    <DropdownMenuItem 
                                      onClick={() => handleUpdateRequest('post')}
                                      disabled={editingRequest?.status !== 'draft'}
                                      className={editingRequest?.status !== 'draft' ? 'opacity-50 cursor-not-allowed' : ''}
                                    >
                                      {isUpdating ? "Posting..." : "Post"}
                                      {editingRequest?.status !== 'draft' && (
                                        <span className="ml-2 text-xs text-gray-500">(Only for drafts)</span>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateRequest('update')}>
                                      {isSubmitting ? "Updating..." : "Update"}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </form>
                        </TabsContent>

                        <TabsContent value="placeholder1" className="mt-6">
                          <div className="text-center py-8 text-muted-foreground">
                            <p>Placeholder 1 content will appear here.</p>
                          </div>
                        </TabsContent>

                        <TabsContent value="placeholder2" className="mt-6">
                          <div className="text-center py-8 text-muted-foreground">
                            <p>Placeholder 2 content will appear here.</p>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </DialogContent>
                  </Dialog>

                  {/* Add Item Modal */}
                  <Dialog open={showAddItemModal} onOpenChange={setShowAddItemModal}>
                    <Draggable handle=".drag-handle">
                      <DialogContent 
                        className="max-w-md max-h-[95vh] overflow-y-auto"
                        onPointerDownOutside={(e) => e.preventDefault()}
                        onEscapeKeyDown={(e) => e.preventDefault()}
                      >
                        <DialogHeader className="drag-handle cursor-move">
                          <DialogTitle>Add New Item</DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Description *</label>
                            <Input
                              value={newItem.description}
                              onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                              placeholder="Enter item description"
                            />
                          </div>
                  
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Unit</label>
                              <Input
                                value={newItem.unit}
                                onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                                placeholder="e.g., pcs, kg, m"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Quantity *</label>
                              <Input
                                type="text"
                                inputMode="decimal"
                                placeholder="0"
                                value={displayValues.quantity}
                                onChange={(e) => handleDecimalInput(e.target.value, 'quantity')}
                                onBlur={() => handleBlur('quantity')}
                                autoComplete="off"
                              />
                            </div>
                          </div>
                  
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Unit Price *</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 z-10 pointer-events-none">$</span>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="0.00"
                                  value={displayValues.unitPrice}
                                  onChange={(e) => handleDecimalInput(e.target.value, 'unitPrice')}
                                  onBlur={() => handleBlur('unitPrice')}
                                  autoComplete="off"
                                  className="pl-8" // Add padding to make room for the $ sign
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Total</label>
                              <Input
                                type="text"
                                value={`$${(newItem.quantity * newItem.unitPrice).toFixed(2)}`}
                                readOnly
                                className="bg-muted/50"
                              />
                            </div>
                          </div>
                  
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Brand</label>
                              <Input
                                value={newItem.brand}
                                onChange={(e) => setNewItem({...newItem, brand: e.target.value})}
                                placeholder="Enter brand"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Reference</label>
                              <Input
                                value={newItem.reference}
                                onChange={(e) => setNewItem({...newItem, reference: e.target.value})}
                                placeholder="Enter reference"
                              />
                            </div>
                          </div>
                  
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Note</label>
                            <Textarea
                              value={newItem.note}
                              onChange={(e) => setNewItem({...newItem, note: e.target.value})}
                              placeholder="Enter additional notes"
                              rows={2}
                            />
                          </div>
                        </div>
                  
                        <div className="flex justify-end space-x-2 pt-4">
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => setShowAddItemModal(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="button"
                            onClick={handleAddItem}
                            disabled={!newItem.description || newItem.quantity <= 0 || newItem.unitPrice <= 0}
                          >
                            Add Item
                          </Button>
                        </div>
                      </DialogContent>
                    </Draggable>
                  </Dialog>

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
                                          'bg-red-100 text-red-800'
                                        }`}>
                                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                        </span>
                                      </td>
                                      <td className="p-3">{new Date(request.createdAt).toLocaleDateString()}</td>
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