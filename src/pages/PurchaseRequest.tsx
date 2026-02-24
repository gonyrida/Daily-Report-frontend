import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiPost } from '@/lib/apiFetch';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from "@/components/ui/label";
import HierarchicalSidebar from '@/components/HierarchicalSidebar';
import { ThemeToggle } from "@/components/ThemeToggle";
import ProfileIcon from '@/components/ProfileIcon';
import { useProfileContext } from '@/contexts/ProfileContext';
import Draggable from 'react-draggable';

const PurchaseRequest = () => {
  const { profile } = useProfileContext();
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
    items: []
  });

  const [selectedItems, setSelectedItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('my-requests');
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [newItem, setNewItem] = useState({
    description: '',
    unit: '',
    quantity: 1,
    unitPrice: 0,
    brand: '',
    reference: '',
    note: ''
  });

  const [requests, setRequests] = useState([
    {
      _id: '507f1f77bcf86cd799439011',
      id: 'MR-2024-001',
      projectName: 'Project Alpha',
      purpose: 'Office Setup',
      deliveryPlace: 'Main Office - Reception Area',
      categories: {
        construction: false,
        admin: true,
        material: false,
        services: false
      },
      items: [
        {
          description: 'Dell Laptop XPS 15',
          unit: 'pcs',
          quantity: 5,
          unitPrice: 1299.99,
          brand: 'Dell',
          reference: 'DL-XPS15-001',
          note: 'For development team'
        },
        {
          description: 'LG 27" 4K Monitor',
          unit: 'pcs',
          quantity: 5,
          unitPrice: 349.99,
          brand: 'LG',
          reference: 'LG-4K27-002',
          note: 'Dual monitor setup'
        }
      ],
      grandTotal: 8249.90,
      status: 'pending',
      priority: 'medium',
      preparedBy: null,
      checkedBy: null,
      verifiedBy: null,
      approvedBy: null,
      requesterName: 'John Doe',
      requesterDepartment: 'IT Department',
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z'
    },
    {
      _id: '507f1f77bcf86cd799439012',
      id: 'MR-2024-002',
      projectName: 'Project Beta',
      purpose: 'Construction Materials',
      deliveryPlace: 'Construction Site - Warehouse',
      categories: {
        construction: true,
        admin: false,
        material: true,
        services: false
      },
      items: [
        {
          description: 'Steel Reinforcement Bar',
          unit: 'tons',
          quantity: 10,
          unitPrice: 850.00,
          brand: 'ArcelorMittal',
          reference: 'STL-RB-003',
          note: 'Grade 60 steel'
        },
        {
          description: 'Ready Mix Concrete',
          unit: 'cubic meters',
          quantity: 50,
          unitPrice: 120.00,
          brand: 'Holcim',
          reference: 'CON-RMX-004',
          note: 'High strength concrete'
        },
        {
          description: 'Portland Cement',
          unit: 'bags',
          quantity: 200,
          unitPrice: 12.50,
          brand: 'Lafarge',
          reference: 'CEM-PORT-005',
          note: 'Type I cement'
        }
      ],
      grandTotal: 15500.00,
      status: 'approved',
      priority: 'high',
      preparedBy: 'Jane Smith',
      checkedBy: 'Mike Johnson',
      verifiedBy: 'Sarah Wilson',
      approvedBy: 'David Brown',
      requesterName: 'Bob Smith',
      requesterDepartment: 'Construction',
      createdAt: '2024-01-14T09:15:00Z',
      updatedAt: '2024-01-16T14:20:00Z'
    },
    {
      _id: '507f1f77bcf86cd799439013',
      id: 'MR-2024-003',
      projectName: 'Project Gamma',
      purpose: 'Legal Consulting Services',
      deliveryPlace: 'Head Office - Legal Department',
      categories: {
        construction: false,
        admin: false,
        material: false,
        services: true
      },
      items: [
        {
          description: 'Legal Consultation Services',
          unit: 'hours',
          quantity: 40,
          unitPrice: 250.00,
          brand: null,
          reference: 'LGL-CONS-006',
          note: 'Contract review and compliance'
        }
      ],
      grandTotal: 10000.00,
      status: 'rejected',
      priority: 'low',
      preparedBy: 'Alice Johnson',
      checkedBy: 'Tom Davis',
      verifiedBy: null,
      approvedBy: null,
      requesterName: 'Carol White',
      requesterDepartment: 'Legal',
      createdAt: '2024-01-13T16:45:00Z',
      updatedAt: '2024-01-14T11:30:00Z'
    }
  ]);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Validate form
      if (!formData.projectName || !formData.purpose || !formData.deliveryPlace || formData.items.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields and add at least one item"
        });
        return;
      }

      // Prepare submission data with approval fields
      const submissionData = {
        ...formData,
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
          description: "Purchase request submitted successfully"
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
          items: []
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
        description: "Failed to submit request. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update handleAddItem function
  const handleAddItem = () => {
    if (newItem.description && newItem.quantity > 0 && newItem.unitPrice > 0) {
      let updatedItems;
      
      if (editingIndex !== null) {
        // Edit existing item
        updatedItems = formData.items.map((item, index) => 
          index === editingIndex ? newItem : item
        );
      } else {
        // Add new item
        updatedItems = [...formData.items, newItem];
      }
      
      setFormData({...formData, items: updatedItems});
      
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
      const item = formData.items[itemIndex];
      
      setNewItem({
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        brand: item.brand,
        reference: item.reference,
        note: item.note
      });
      
      setShowAddItemModal(true);
      setEditingIndex(itemIndex);
    }
  };

  const handleRemoveSelected = () => {
    if (selectedItems.length > 0) {
      const updatedItems = formData.items.filter((_, index) => !selectedItems.includes(index));
      setFormData({...formData, items: updatedItems});
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
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

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
                  </TabsList>

                  <TabsContent value="my-requests" className="space-y-6">
                    {/* Button Row */}
                    <div className="flex gap-2 mb-6">
                      <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
                        <DialogTrigger asChild>
                          <Button variant="default">New Request</Button>
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
                              <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Header Section */}
                                <div className="bg-muted/30 p-4 rounded-lg">
                                  <div className="space-y-4">
                                    {/* Requester */}
                                    <div>
                                      <label className="text-sm font-medium text-muted-foreground">Requester</label>
                                      <div className="text-sm font-semibold">
                                        {formData.requesterName} ({formData.requesterDepartment})
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
                                        onClick={() => setShowAddItemModal(true)}
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
                                            <td className="p-2 text-xs">{item.unitPrice || ''}</td>
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
                                        <SelectItem value="user1">John Doe</SelectItem>
                                        <SelectItem value="user2">Jane Smith</SelectItem>
                                        <SelectItem value="user3">Mike Johnson</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                
                                  <div>
                                    <Label className="text-sm font-medium">Checked By</Label>
                                    <Select>
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select checker" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="user1">John Doe</SelectItem>
                                        <SelectItem value="user2">Jane Smith</SelectItem>
                                        <SelectItem value="user3">Mike Johnson</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                
                                  <div>
                                    <Label className="text-sm font-medium">Verified By</Label>
                                    <Select>
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select verifier" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="user1">John Doe</SelectItem>
                                        <SelectItem value="user2">Jane Smith</SelectItem>
                                        <SelectItem value="user3">Mike Johnson</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                
                                  <div>
                                    <Label className="text-sm font-medium">Approved By</Label>
                                    <Select>
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select approver" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="user1">John Doe</SelectItem>
                                        <SelectItem value="user2">Jane Smith</SelectItem>
                                        <SelectItem value="user3">Mike Johnson</SelectItem>
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
                                    <Button 
                                      type="submit" 
                                      disabled={isSubmitting || !formData.projectName || formData.items.length === 0}
                                    >
                                      {isSubmitting ? "Posting..." : "Post"}
                                    </Button>
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
                                    type="number"
                                    min="1"
                                    value={newItem.quantity}
                                    onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 1})}
                                  />
                                </div>
                              </div>
                      
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Unit Price *</label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={newItem.unitPrice.toString()}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setNewItem({...newItem, unitPrice: value ? parseFloat(value) : 0});
                                    }}
                                  />
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
                                <th className="text-left p-3 font-medium">Request ID</th>
                                <th className="text-left p-3 font-medium">Project Name</th>
                                <th className="text-left p-3 font-medium">Category</th>
                                <th className="text-left p-3 font-medium">Purpose</th>
                                <th className="text-left p-3 font-medium">Items</th>
                                <th className="text-left p-3 font-medium">Total</th>
                                <th className="text-left p-3 font-medium">Status</th>
                                <th className="text-left p-3 font-medium">Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {requests.map((request) => (
                                <tr 
                                  key={request.id} 
                                  className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                                  onClick={() => handleViewDetails(request)}
                                >
                                  <td className="p-3 font-medium">{request.id}</td>
                                  <td className="p-3">{request.projectName}</td>
                                  <td className="p-3">
                                    <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                      {request.categories.admin ? 'Admin' : 
                                      request.categories.construction ? 'Construction' :
                                      request.categories.material ? 'Material' :
                                      request.categories.services ? 'Services' : 'Other'}
                                    </span>
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
                                  selectedRequest.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                  selectedRequest.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
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
                                <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                                  {
                                    selectedRequest.categories.admin ? 'Admin' : 
                                    selectedRequest.categories.construction ? 'Construction' :
                                    selectedRequest.categories.material ? 'Material' :
                                    selectedRequest.categories.services ? 'Services' : 'Other'
                                  }
                                </span>
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
                                  selectedRequest.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                  selectedRequest.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {selectedRequest.status}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Prepared By</label>
                                  <p className="text-sm">{selectedRequest.preparedBy || 'Not Assigned'}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Checked By</label>
                                  <p className="text-sm">{selectedRequest.checkedBy || 'Not Assigned'}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Verified By</label>
                                  <p className="text-sm">{selectedRequest.verifiedBy || 'Not Assigned'}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Approved By</label>
                                  <p className="text-sm">{selectedRequest.approvedBy || 'Not Assigned'}</p>
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

                  <TabsContent value="all-mrs" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>All Related Material Requests</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8 text-muted-foreground">
                          <p>All material requests from related projects will appear here.</p>
                        </div>
                      </CardContent>
                    </Card>
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