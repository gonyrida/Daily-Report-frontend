// PurchaseRequestForm.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProfileContext } from '@/contexts/ProfileContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Draggable from 'react-draggable';
import { Textarea } from '@/components/ui/textarea';
import { X, Upload } from "lucide-react";
import { 
	apiPost,
	apiGet,
	apiPut
} from '@/lib/apiFetch';
import { useToast } from '@/hooks/use-toast';
import CustomCombobox from './CustomCombobox';
import MaterialActualCost from './MaterialActualCost';
import AttachmentsTab, { Attachment } from './AttachmentsTab';

const parseFileSize = (fileSize) => {
  if (fileSize === undefined || fileSize === null) return 0;
  if (typeof fileSize === 'number') return fileSize;
  if (typeof fileSize !== 'string') return 0;
  let normalized = fileSize.trim().toUpperCase();

  const parts = normalized.split(' ');
  if (parts.length === 0) return 0;

  let value = parseFloat(parts[0].replace(/,/g, ''));
  if (Number.isNaN(value)) return 0;

  const suffix = parts[1] || 'B';
  switch (true) {
    case suffix.startsWith('KB'):
      return Math.round(value * 1024);
    case suffix.startsWith('MB'):
      return Math.round(value * 1024 * 1024);
    case suffix.startsWith('GB'):
      return Math.round(value * 1024 * 1024 * 1024);
    case suffix.startsWith('TB'):
      return Math.round(value * 1024 * 1024 * 1024 * 1024);
    default:
      return Math.round(value);
  }
};

interface PurchaseRequestFormProps {
  mode: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onRefresh: () => void;
  projectData: any;
  initialData?: any; // For edit/revise mode
  requestId?: string; // For edit/revise mode
}

const PurchaseRequestForm: React.FC<PurchaseRequestFormProps> = ({
  mode,
  isOpen,
  setIsOpen,
  onRefresh,
  projectData,
  initialData,
  requestId
}) => {
	// console.log('This is the request you got ', initialData)

  const { profile } = useProfileContext();
  const [activeTab, setActiveTab] = useState('purchase-request');
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
	const [editingIndex, setEditingIndex] = useState(null);
	const [isEditMode, setIsEditMode] = useState(false);
	const [showAddItemModal, setShowAddItemModal] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false); // NEW: Edit modal visibility
	const [loadingUsers, setLoadingUsers] = useState(false);
	const [allUsers, setAllUsers] = useState([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { toast } = useToast();
	const [requests, setRequests] = useState([]);
	const [prSummaryData, setPrSummaryData] = useState(null);

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

  // Role-based filtering functions
  const getUsersForRole = (allowedRoles) => {
    return allUsers.filter(user => 
      allowedRoles.includes(user.role?.toLowerCase())
    );
  };

  // Specific filters for each dropdown
  const preparers = allUsers; // Anyone can prepare
  const checkers = getUsersForRole(['admin', 'approver']);
  const verifiers = getUsersForRole(['admin', 'approver']);
  const approvers = getUsersForRole(['admin', 'approver']);

	const formDataFilled = (data) => {
		return {
			requesterName: data.requesterName || '',
			requesterDepartment: data.requesterDepartment || '',
			projectName: data.projectName || '',
			label: data.label || '',
			projectFrom: {
				mainProject: data.projectFrom?.mainProject || '',
				mainId: data.projectFrom?.mainId || '',
				subProject: data.projectFrom?.subProject || '',
				subId: data.projectFrom?.subId || ''
			},
			purpose: data.purpose || '',
			requestDate: data.requestDate || new Date().toISOString().split('T')[0],
			deliveryPlace: data.deliveryPlace || '',
			categories: data.categories || {
				construction: false,
				admin: false,
				material: false,
				services: false
			},
			items: data.items || [],
			formattedGrandTotal: data.formattedGrandTotal || '',
			requestDescription: data.requestDescription || '',
			requestRemarks: data.requestRemarks || '',
			attachments: data.attachments || [],
			approvers: {
				preparedBy: data.approvers?.preparedBy || '',
				checkedBy: data.approvers?.checkedBy || '',
				verifiedBy: data.approvers?.verifiedBy || '',
				approvedBy: data.approvers?.approvedBy || ''
			},
			status: data.status,
			priority: data.priority
    };
	};

	const getPRSummaryData = async (projectId: string) => {
		try {
			setPrSummaryData('loading'); // Set loading state
			const response = await apiGet(`/purchase-requests/pr-summary/${projectId}`);
			const result = await response.json();
			setPrSummaryData(result.data);
		} catch (error) {
			console.error('Error fetching PR summary data:', error);
			setPrSummaryData(null); // Reset to null on error
			return null;
		}
	}

	useEffect(() => {
		if (initialData?.projectFrom?.mainId) {
			getPRSummaryData(initialData.projectFrom.mainId)
		}
	}, [initialData])

  const [formData, setFormData] = useState(() => {
    if (mode === 'edit' && initialData) {
      return formDataFilled(initialData);
    } else if ( mode === 'revise' && initialData) {
			return formDataFilled(initialData);
    } else {
      // Default for new request
      return {
        requesterName: profile?.fullName || '',
        requesterDepartment: profile?.department || '',
        projectName: '',
				projectFrom: {
					mainProject: '',
					mainId: '',
					subProject: '',
					subId: ''
				},
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
        requestDescription: '',
        requestRemarks: '',
        attachments: [],
        approvers: {
					preparedBy: '',
          checkedBy: '',
          verifiedBy: '',
          approvedBy: ''
        },
				status: '',
				priority: ''
      };
    }
  });

  const [attachments, setAttachments] = useState<Attachment[]>([]);

	useEffect(() => {
		// Sync attachments to formData
		setFormData(prev => ({
			...prev,
			attachments: attachments
		}));
	}, [attachments]);

	useEffect(() => {
		if ((mode === 'edit' || mode === 'revise') && initialData) {
			setFormData({
				...initialData,
			});
			// Also set attachments from initialData
			if (initialData.attachments) {
				setAttachments(initialData.attachments);
			}
		}
	}, [initialData, mode]);

	const [newItem, setNewItem] = useState({
		description: '',
		unit: '',
		quantity: 0,
		unitPrice: 0,
		brand: '',
		reference: '',
		note: ''
	});

	const [displayValues, setDisplayValues] = useState({
		quantity: '0',
		unitPrice: '0'
	});

  const resetForm = () => {
		setFormData({
			requesterName: profile?.fullName || '',
			requesterDepartment: profile?.department || '',
			projectName: '',
			projectFrom: {
				mainProject: '',
				mainId: '',
				subProject: '',
				subId: ''
			},
			purpose: '',
			requestDate: new Date().toISOString().split('T')[0],
			deliveryPlace: '',
			categories: { construction: false, admin: false, material: false, services: false },
			items: [],
			requestDescription: '',
			requestRemarks: '',
			attachments: [],
			approvers: { preparedBy: '', checkedBy: '', verifiedBy: '', approvedBy: '' },
			status: '',
			priority: ''
		});
		setSelectedItems([]); // Clear any selected items
		setPrSummaryData(null); // Reset PR summary data
		setActiveTab('purchase-request'); // Reset to first tab
		setAttachments([]);
 	}

	const handleSubmit = async (action) => {
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

			const submissionData = {
				...formData,
				attachments: formData.attachments.map(attachment => ({
					...attachment,
					fileSize: parseFileSize(attachment.fileSize),
					base64: attachment.imageData || attachment.base64 // Use imageData as base64
				}))
			};

			let result = null;

      if (action === 'update') {
        // Update existing request
        const response = await apiPut(`/purchase-requests/${requestId}`, submissionData);
				result = await response.json();
			} else if (action === 'post' && formData.status === 'draft') {
				submissionData.status = 'pending';
        const response = await apiPut(`/purchase-requests/${requestId}`, submissionData);
				result = await response.json();
			} else if (action === 'revise') {
				const response = await apiPost(`/purchase-requests/${requestId}/revise`, submissionData);
				result = await response.json();
      } else {
        // Create new request
        submissionData.status = action === 'draft' ? 'draft' : 'pending';
        submissionData.priority = 'medium';
        const response = await apiPost('/purchase-requests', submissionData);
				result = await response.json();
      }

      if (result.success) {
        toast({
          title: "Success",
          description: `Purchase request ${mode === 'edit' ? 'updated' : (action === 'draft' ? 'saved as draft' : 'submitted')} successfully`
        });
        
        // Reset form
        if (mode === 'create') {
          setFormData({
            requesterName: profile?.fullName || '',
            requesterDepartment: profile?.department || '',
            projectName: '',
						projectFrom: {
							mainProject: '',
							mainId: '',
							subProject: '',
							subId: ''
						},
            purpose: '',
            requestDate: new Date().toISOString().split('T')[0],
            deliveryPlace: '',
            categories: { construction: false, admin: false, material: false, services: false },
            items: [],
            requestDescription: '',
            requestRemarks: '',
            attachments: [],
            approvers: { preparedBy: '', checkedBy: '', verifiedBy: '', approvedBy: '' },
						status: '',
						priority: ''
          });
          setAttachments([]);
        }
        
        setIsOpen(false);
        onRefresh && onRefresh();
			} else {
				console.log("This is the result", result)
				console.log("This is the result success", result.success)

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

  const handleEditSelected = () => {
    if (selectedItems.length === 1) {
      const itemIndex = selectedItems[0];
      
      // Smart context detection
      const isEditMode = showEditModal;
      const currentItems = formData.items;
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
      const updatedItems = formData.items.filter((_, index) => !selectedItems.includes(index));
      setFormData({...formData, items: updatedItems});
      setSelectedItems([]);
    }
  };

  const handleAddItem = () => {
    if (newItem.description && newItem.quantity > 0 && newItem.unitPrice > 0) {
      let updatedItems;
      
      if (editingIndex !== null && editingIndex >= 0) {
        // Edit existing item
        updatedItems = formData.items.map((item, index) => 
          index === editingIndex ? newItem : item
        );
        console.log("Editing item at index", editingIndex, "with:", newItem);
      } else {
        // Add new item
        updatedItems = [...formData.items, newItem];
        console.log("Adding new item:", newItem);
      }
      
      // Update form data with the new items array
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

	const getTitle = (mode) => {
		if (mode === 'create') {
			return 'New Purchase Request';
		} else if (mode === 'edit') {
			return 'Edit Purchase Request';
		} else if (mode === 'revise') {
			return 'Revise Purchase Request';
		}
	}

	const handleFormDataChange = useCallback((updates) => {
		setFormData(prev => ({ ...prev, ...updates }));
	}, []);

  return (
		<>
			<Dialog 
				open={isOpen} 
				onOpenChange={(isOpen) => {
					// When dialog tries to close (X button, outside click, Escape)
					if (!isOpen) { // Dialog is closing
						setIsOpen(false);
						resetForm();
					} else {
						setIsOpen(true);
					}
				}}>
				<DialogTrigger asChild>
					{/* {mode === 'create' && (
						<Button 
							variant="default"
							onClick={() => {
								// Reset form data when opening New Request
								setFormData({
									requesterName: profile?.fullName || '',
									requesterDepartment: profile?.department || '',
									projectName: '',
									projectFrom: {
										mainProject: '',
										mainId: '',
										subProject: '',
										subId: ''
									},
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
									requestDescription: '',
									requestRemarks: '',
									attachments: [],
									approvers: {
										preparedBy: '',
										checkedBy: '',
										verifiedBy: '',
										approvedBy: ''
									},
									status: '',
									priority: ''
								});
								setSelectedItems([]); // Clear any selected items
								setPrSummaryData(null); // Reset PR summary data
								setActiveTab('purchase-request'); // Reset to first tab
							}}
						>
							New Request
						</Button>
					)} */}
				</DialogTrigger>
				<DialogContent 
					className="max-w-6xl max-h-[95vh] overflow-y-auto"
					onPointerDownOutside={(e) => e.preventDefault()}
					onEscapeKeyDown={(e) => e.preventDefault()}
				>
					<DialogHeader>
						<DialogTitle>{getTitle(mode)}</DialogTitle>
					</DialogHeader>
					
					{/* Modal Tabs */}
					<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
						<TabsList className="grid w-full grid-cols-3">
							<TabsTrigger value="purchase-request">Purchase Request</TabsTrigger>
							<TabsTrigger value="placeholder1">Material - Actual Cost</TabsTrigger>
							<TabsTrigger value="attachments">Attachments</TabsTrigger>
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
											<div>
												<CustomCombobox 
													initialValue={formData.projectName || ''}
													options={projectData}
													optionsFrom='subProjects'
													onChange={(value) => {
														const project = projectData.find((project) => project.subProjects?.some((subProject) => subProject._id === value));
														const subProject = project.subProjects.find((subProject) => subProject._id === value);
														setFormData({
															...formData,
															projectName: subProject?.name || '',
															projectFrom: {
																mainProject: project?.parentProjectCode || '',
																mainId: project?._id || '',
																subProject: subProject?.name || '',
																subId: subProject?._id || ''
															}
														})
														getPRSummaryData(project?._id || '')
													}}
													onCreate={(label) => {
														setFormData({
															...formData,
															projectName: label || '',
															projectFrom: {
																mainProject: '',
																mainId: '',
																subProject: '',
																subId: ''
															}
														})
													}}
													placeholder="Pick a project..."
												/>
											</div>
										</div>
										
										{/* Purpose */}
										<div className="space-y-2">
											<label className="text-sm font-medium">Purpose *</label>
											<div>
												<CustomCombobox 
													initialValue={formData.purpose || ''}
													options={projectData}
													optionsFrom='purposes'
													onChange={(value) => {
														const project = projectData.find((project) => project.purposes?.some((subProject) => subProject._id === value));
														const subProject = project.purposes.find((subProject) => subProject._id === value);
														setFormData({
															...formData,
															purpose: subProject?.name || ''
														})
													}}
													onCreate={(label) => {
														setFormData({
															...formData,
															purpose: label || ''
														})
													}}
													placeholder="Pick a purpose..."
												/>
											</div>
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
												className="cursor-pointer"
											/>
											<label htmlFor="construction" className="text-sm cursor-pointer">Construction</label>
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
												className="cursor-pointer"
											/>
											<label htmlFor="admin" className="text-sm cursor-pointer">Admin</label>
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
												className="cursor-pointer"
											/>
											<label htmlFor="material" className="text-sm cursor-pointer">Material</label>
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
												className="cursor-pointer"
											/>
											<label htmlFor="services" className="text-sm cursor-pointer">Services</label>
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
															selectedItems.includes(index) 
																? 'bg-blue-100 dark:bg-blue-900/30 dark:border-l-4 dark:border-l-blue-400' 
																: 'hover:bg-muted/30 dark:hover:bg-muted/20'
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
														<td className="p-2 text-xs">${(item.unitPrice || 0).toFixed(2)}</td>
														<td className="p-2 text-xs font-medium">
															${(item.quantity * item.unitPrice).toFixed(2) || '0.00'}
														</td>
														<td className="p-2 text-xs">{item.brand || ''}</td>
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
										<Select
											value={formData.approvers.preparedBy} 
											onValueChange={(value) => 
												setFormData(prev => ({
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
													<SelectItem value="loading_state" disabled>Loading...</SelectItem>
												) : (
													preparers.map((user) => (
														<SelectItem key={user._id} value={user._id || `user-${user.id}`}>
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
													<SelectItem value="loading_state" disabled>Loading...</SelectItem>
												) : (
													checkers.map((user) => (
														<SelectItem key={user._id} value={user._id || `user-${user.id}`}>
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
													<SelectItem value="loading_state" disabled>Loading...</SelectItem>
												) : (
													verifiers.map((user) => (
														<SelectItem key={user._id} value={user._id || `user-${user.id}`}>
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
													<SelectItem value="loading_state" disabled>Loading...</SelectItem>
												) : (
													approvers.map((user) => (
														<SelectItem key={user._id} value={user._id || `user-${user.id}`}>
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
												console.log("This is final formData: ", formData);
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
									
									{/* Right side - Cancel and Next */}
									<div className="flex space-x-2">
										<Button 
											type="button" 
											variant="outline"
											onClick={() => {
												setIsOpen(false);
												resetForm();
											}}
										>
											Cancel
										</Button>

										<Button 
											type="button" 
											onClick={() => {
												// Switch to Material Actual Cost tab
												setActiveTab('placeholder1');
											}}
										>
											Next →
										</Button>
									</div>
								</div>
							</form>
						</TabsContent>

						<TabsContent value="placeholder1" className="mt-6">
							<MaterialActualCost
								mode={mode}
								requests={prSummaryData}
								setActiveTab={setActiveTab}
								currentFormData={formData}
								onFormDataChange={handleFormDataChange}
							/>
						</TabsContent>

						<TabsContent value="attachments" className="mt-6">
							<AttachmentsTab
								attachments={attachments}
								onAttachmentsChange={setAttachments}
								mode={mode}
								isSubmitting={isSubmitting}
								formData={formData}
								handleSubmit={handleSubmit}
								setActiveTab={setActiveTab}
								maxFiles={10}
								maxFileSize={10}
								allowedFileTypes={['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']}
							/>
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
									{newItem.reference ? (
										<div className="relative flex items-center justify-center p-2">
											<img 
												src={newItem.reference} 
												alt="Reference" 
												className="w-20 h-10 object-contain rounded border"
											/>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => setNewItem({...newItem, reference: ''})}
												className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 hover:bg-red-600"
											>
												<X className="w-3 h-3 text-white" />
											</Button>
										</div>
									) : (
										<Button
											variant="outline"
											onClick={() => document.getElementById('reference-input')?.click()}
											className="w-full"
										>
											<Upload className="w-4 h-4 mr-2" />
											Upload Reference
										</Button>
									)}
									<Input
										id="reference-input"
										type="file"
										accept="image/*"
										className="hidden"
										onChange={(e) => {
											const file = e.target.files?.[0];
											if (file) {
												const reader = new FileReader();
												reader.onloadend = () => {
													setNewItem({...newItem, reference: reader.result as string});
												};
												reader.readAsDataURL(file);
											}
										}}
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
		</>
    );
  };
  
  export default PurchaseRequestForm;