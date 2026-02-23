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
import HierarchicalSidebar from '@/components/HierarchicalSidebar';
import { ThemeToggle } from "@/components/ThemeToggle";
import ProfileIcon from '@/components/ProfileIcon';
import Draggable from 'react-draggable';

const PurchaseRequest = () => {
  const [formData, setFormData] = useState({
    requesterName: '', // Will be filled from user context
    requesterDepartment: '', // Will be filled from user context
    projectName: '',
    purpose: '',
    requestDate: new Date().toISOString().split('T')[0], // Today's date
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
      id: 'MR-2024-001',
      project: 'Project Alpha',
      category: 'Equipment',
      purpose: 'Office Setup',
      items: ['Laptops', 'Monitors', 'Keyboards'], // ✅ Array instead of string
      total: '$5,200',
      status: 'Pending',
      date: '2024-01-15'
    },
    {
      id: 'MR-2024-002',
      project: 'Project Beta',
      category: 'Materials',
      purpose: 'Construction',
      items: ['Steel', 'Concrete', 'Cement', 'Rebar'], // ✅ Array instead of string
      total: '$12,000',
      status: 'Approved',
      date: '2024-01-14'
    },
    {
      id: 'MR-2024-003',
      project: 'Project Gamma',
      category: 'Services',
      purpose: 'Consulting',
      items: ['Legal Services'], // ✅ Array instead of string
      total: '$3,500',
      status: 'Rejected',
      date: '2024-01-13'
    }
  ]);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await apiPost('/purchase-requests', formData);
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Purchase request submitted successfully"
        });
        setFormData({
          requesterName: formData.requesterName, // Keep current user info
          requesterDepartment: formData.requesterDepartment, // Keep current user info
          projectName: '',
          purpose: '',
          requestDate: new Date().toISOString().split('T')[0], // Today's date
          deliveryPlace: '',
          categories: {
            construction: false,
            admin: false,
            material: false,
            services: false
          },
          items: []
        });
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to submit request"
        });
      }
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to submit request"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddItem = () => {
    if (newItem.description && newItem.quantity > 0 && newItem.unitPrice > 0) {
      setFormData({
        ...formData,
        items: [...formData.items, { ...newItem }]
      });
      // Reset item form
      setNewItem({
        description: '',
        unit: '',
        quantity: 1,
        unitPrice: 0,
        brand: '',
        reference: '',
        note: ''
      });
      
      setShowAddItemModal(false);
    }
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
                    <h1 className="text-lg font-semibold">Purchase Request</h1>
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
                                      <Button type="button" variant="outline" size="sm">Edit Selected</Button>
                                      <Button type="button" variant="outline" size="sm">Remove Selected</Button>
                                    </div>
                                  </div>

                                  {/* Items Table */}
                                  <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full">
                                      <thead className="bg-muted/50">
                                        <tr>
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
                                          <tr key={index} className="border-t">
                                            <td className="p-2 text-xs">{index + 1}</td>
                                            <td className="p-2 text-xs">{item.description || ''}</td>
                                            <td className="p-2 text-xs">{item.unit || ''}</td>
                                            <td className="p-2 text-xs">{item.quantity || ''}</td>
                                            <td className="p-2 text-xs">{item.unitPrice || ''}</td>
                                            <td className="p-2 text-xs font-medium">
                                              {(item.quantity * item.unitPrice).toFixed(2) || '0.00'}
                                            </td>
                                            <td className="p-2 text-xs">{item.brand || ''}</td>
                                            <td className="p-2 text-xs">{item.reference || ''}</td>
                                            <td className="p-2 text-xs">{item.note || ''}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Grand Total */}
                                  <div className="flex justify-start">
                                    <div className="bg-muted/30 p-3 rounded-lg">
                                      <span className="text-sm font-medium">Grand Total: </span>
                                      <span className="text-lg font-bold">
                                        ${formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex justify-end space-x-2 pt-4 border-t">
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
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                <th className="text-left p-3 font-medium">MR Number</th>
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
                              {requests.map((request) => (
                                <tr key={request.id} className="border-b hover:bg-muted/30 transition-colors">
                                  <td className="p-3 font-medium">{request.id}</td>
                                  <td className="p-3">{request.project}</td>
                                  <td className="p-3">
                                    <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                      {request.category}
                                    </span>
                                  </td>
                                  <td className="p-3">{request.purpose}</td>
                                  <td className="p-3">
                                    <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                                      {request.items.length} {request.items.length === 1 ? 'Item' : 'Items'}
                                    </span>
                                  </td>
                                  <td className="p-3 font-medium">{request.total}</td>
                                  <td className="p-3">
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                      request.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                      request.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {request.status}
                                    </span>
                                  </td>
                                  <td className="p-3">{request.date}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

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