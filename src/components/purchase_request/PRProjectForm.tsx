// PRProjectForm.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useProfileContext } from '@/contexts/ProfileContext';
import { useToast } from '@/hooks/use-toast';
import { apiPost, apiPut } from '@/lib/apiFetch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MemberInvitationModal from './MemberInvitationModal';

interface PRProject {
  _id?: string;
  name: string;
  projectCode: string;
  description?: string;
  status: 'active' | 'on_hold' | 'completed';
  requestDate: string;
  visibility: 'public' | 'private';
  subProjects: Array<{
    _id?: string | number;
    name: string;
  }>;
  budgetSettings: {
    MBOQ: string;
    DMBOQ: string;
    percentage: string;
  };
  purposes: Array<{
    _id?: string;
    name: string;
    MBOQBudget: string;
    DMBOQBudget: string;
  }>;
  members: Array<{
    _id?: string | number;
    name: string;
    email: string;
    department: string;
    role: string;
    position: string;
  }>;
  createdBy?: string;
  companyId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PRProjectFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onProjectCreated: (project: PRProject) => void;
  mode?: 'create' | 'edit' | 'view';
  initialData?: PRProject;
  isLoading?: boolean;
}

const PRProjectForm: React.FC<PRProjectFormProps> = ({
  isOpen,
  setIsOpen,
  onProjectCreated,
  mode = 'create', // Default to create mode
  initialData, // Optional initial data for edit/detail mode
  isLoading
}) => {
  // console.log('This is the data you got: ', initialData);

  const { profile } = useProfileContext();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSubProjects, setSelectedSubProjects] = useState([]);
  const [selectedPurposes, setSelectedPurposes] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('general-info');
  const [showMemberModal, setShowMemberModal] = useState(false);

  useEffect(() => {
    if ((mode === 'edit' || mode === 'view') && initialData) {
      setFormData({
        ...initialData,
        requestDate: 
          initialData.requestDate 
            ? new Date(initialData.requestDate).toISOString().split('T')[0] 
            : new Date().toISOString().split('T')[0],
      });
    }
  }, [initialData, mode]);

  const [formData, setFormData] = useState<PRProject>(
    initialData || { //Use initialData if provided, otherwise use default values
    name: '',
    projectCode: '',
    description: '',
    status: 'active',
    requestDate: new Date().toISOString().split('T')[0],
    subProjects: [],
    budgetSettings: {
      MBOQ: '',
      DMBOQ: '',
      percentage: ''
    },
    purposes: [],
    members: [],
    visibility: 'public'
  });

  // Add this mock data object before your component or in a separate file
  const mockProjectData = {
    name: 'Website Redesign Project',
    projectCode: 'WR-2026-001',
    description: 'Complete redesign of the company website with modern UI/UX principles and responsive design.',
    status: 'active' as const,
    requestDate: '2026-01-15',
    subProjects: [
      { _id: 1, name: 'Frontend Development'},
      { _id: 2, name: 'Backend API Integration'},
      { _id: 3, name: 'Database Migration'},
      { _id: 4, name: 'Testing & QA'}
    ],
    budgetSettings: {
      MBOQ: '15000.00',
      DMBOQ: '8500.00',
      percentage: '15.50'
    },
    purposes: [
      { _id: 1, name: 'Development Tools', budget: '12000' },
      { _id: 2, name: 'Design Software', budget: '5000' },
      { _id: 3, name: 'Hosting Services', budget: '3000' },
      { _id: 4, name: 'Training Materials', budget: '2000' }
    ],
    members: [
      {
        _id: 1,
        name: 'John Smith',
        department: 'IT',
        role: 'Project Manager',
        position: 'Senior PM',
        email: 'john.smith@company.com',
      },
      {
        _id: 2,
        name: 'Sarah Johnson',
        department: 'Design',
        role: 'Lead Designer',
        position: 'Senior Designer',
        email: 'sarah.j@company.com',
      },
      {
        _id: 3,
        name: 'Mike Chen',
        department: 'Development',
        role: 'Frontend Developer',
        position: 'Mid-Level',
        email: 'mike.chen@company.com',
      },
      {
        _id: 4,
        name: 'Emily Davis',
        department: 'QA',
        role: 'QA Engineer',
        position: 'Junior',
        email: 'emily.d@company.com',
      }
    ],
    visibility: 'private' as const
  };

  // You can use this to populate your form for testing
  // const populateFormWithMockData = () => {
  //   setFormData({
  //     name: mockProjectData.name,
  //     projectCode: mockProjectData.projectCode,
  //     description: mockProjectData.description,
  //     status: mockProjectData.status,
  //     requestDate: mockProjectData.requestDate,
  //     subProjects: mockProjectData.subProjects,
  //     budgetSettings: mockProjectData.budgetSettings,
  //     purposes: mockProjectData.purposes,
  //     members: mockProjectData.members,
  //     visibility: mockProjectData.visibility
  //   });
  // };

  const cleanFormDataForSubmission = (data: PRProject, mode: string) => {
    if (mode === 'edit') {
      // Keep _id for existing items when editing
      return data;
    } else {
      // Remove _id for new items when creating
      return {
        ...data,
        subProjects: data.subProjects.map(({ _id, ...rest }) => rest),
        purposes: data.purposes.map(({ _id, ...rest }) => rest),
      };
    }
  };

  const handleSubmit = async (action: 'create' | 'update') => {
    if (!formData.name || !formData.projectCode) {
      toast({
        title: "Validation Error",
        description: "Project name and code are required"
      });
      return;
    }

    setIsSubmitting(true);
    try {

      // Clean data before sending - remove _id from arrays
      const submissionData = cleanFormDataForSubmission(formData, action);

      let result;

      if (action === 'create') {
        const response = await apiPost('/purchase-requests/pr-projects', submissionData);
        result = await response.json();
      } else if (action === 'update') {
        const response = await apiPut(`/purchase-requests/pr-projects/${formData._id}`, submissionData);
        result = await response.json();
      }

      if (result.success) {
        toast({
          title: "Success",
          description: "Project created successfully"
        });
        
        // Reset form
        setFormData({
          name: '',
          projectCode: '',
          description: '',
          status: 'active',
          requestDate: '',
          subProjects: [],
          budgetSettings: {
            MBOQ: '',
            DMBOQ: '',
            percentage: ''
          },
          purposes: [],
          members: [],
          visibility: 'public'
        });
        
        // Notify parent
        onProjectCreated(result.data);
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to create project"
        });
      }
    } catch (error) {
      console.error('Create project error:', error);
      toast({
        title: "Error",
        description: "Failed to create project"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setFormData({
      name: '',
      projectCode: '',
      description: '',
      status: 'active',
      requestDate: '',
      subProjects: [],
      budgetSettings: {
        MBOQ: '',
        DMBOQ: '',
        percentage: ''
      },
      purposes: [],
      members: [],
      visibility: 'public'
    });
  };

  const addSubProject = () => {
    const newSubProject = {
      _id: Date.now().toString(), // Unique ID
      name: '',
    };

    setFormData(prev => ({
      ...prev,
      subProjects: [...prev.subProjects, newSubProject]
    }));
  };
  
  const removeSelectedSubProjects = () => {
    setFormData(prev => ({
      ...prev,
      subProjects: prev.subProjects.filter(project => !selectedSubProjects.includes(project._id))
    }));
    setSelectedSubProjects([]);
  };

  const addPurpose = () => {
    const newPurpose = {
      _id: Date.now().toString(),
      name: '',
      MBOQBudget: '',
      DMBOQBudget: ''
    };
    
    setFormData(prev => ({
      ...prev,
      purposes: [...prev.purposes, newPurpose]
    }));
  };

  const removeSelectedPurposes = () => {
    formData.purposes = formData.purposes.filter(purpose => !selectedPurposes.includes(purpose._id));
    const totalMBOQ = formData.purposes.reduce((sum, p) => sum + parseFloat(p.MBOQBudget || '0'), 0);
    const totalDMBOQ = formData.purposes.reduce((sum, p) => sum + parseFloat(p.DMBOQBudget || '0'), 0);
    setFormData(prev => ({
      ...prev,
      budgetSettings: {
        ...prev.budgetSettings,
        MBOQ: totalMBOQ.toString(),
        DMBOQ: totalDMBOQ.toString()
      },
      purposes: prev.purposes.filter(purpose => !selectedPurposes.includes(purpose._id))
    }));
    setSelectedPurposes([]);
  };

  const handleRemoveSelectedMembers = () => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.filter(member => !selectedMembers.includes(member._id))
    }));
    setSelectedMembers([]);
  };

  const handleNumberChange = (value: string, isFrom: string, id?: string) => {
    // Allow only numbers and decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleanValue.split('.');
    const finalValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleanValue;
    
    const numValue = parseFloat(finalValue);

    const purpose = formData.purposes.find(p => p._id === id);
    let updatedDMBOQBudget = isFrom === 'MBOQBudget' ? parseFloat(finalValue) * (100 - parseFloat(formData.budgetSettings.percentage)) / 100 : parseFloat(purpose?.DMBOQBudget);
    if (formData.budgetSettings.percentage === '') {
      updatedDMBOQBudget = parseFloat(finalValue);
    }

    if (id && isFrom === 'MBOQBudget') {
      // Update specific purpose
      formData.purposes.map((p) => {
        if (p._id === id) {
          p.MBOQBudget = parseFloat(finalValue).toFixed(2) || '0';
          p.DMBOQBudget = updatedDMBOQBudget?.toFixed(2) || '0';
        }
      });

      const totalMBOQ = formData.purposes.reduce((sum, p) => sum + parseFloat(p.MBOQBudget || '0'), 0);
      const totalDMBOQ = formData.purposes.reduce((sum, p) => sum + parseFloat(p.DMBOQBudget || '0'), 0);
      if (purpose) {
        setFormData({
          ...formData,
          budgetSettings: {
            ...formData.budgetSettings,
            MBOQ: totalMBOQ.toFixed(2),
            DMBOQ: totalDMBOQ.toFixed(2),
          },
          purposes: formData.purposes.map(p => 
            p._id === id 
              ? { ...p, [isFrom]: finalValue, ['DMBOQBudget']: updatedDMBOQBudget?.toFixed(2) || '0'} 
              : p
          )
        });
      }
      return;
    }

    let updatedBudgetSettings = {
      ...formData.budgetSettings,
      [isFrom]: finalValue,
    };

    if (isFrom === 'percentage' && !isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      // Calculate DMBOQ when percentage changes
      const MBOQ = parseFloat(formData.budgetSettings.MBOQ) || 0;
      const calculatedDMBOQ = (MBOQ * (100 - numValue)) / 100;
      updatedBudgetSettings.DMBOQ = calculatedDMBOQ.toFixed(2).toString();

      // Update all purposes with new percentage
      formData.purposes.forEach((p) => {
        p.DMBOQBudget = (parseFloat(p.MBOQBudget) * (100 - numValue) / 100).toFixed(2).toString();
      });
    } else if (isFrom === 'MBOQ' && !isNaN(numValue) && numValue >= 0) {
      // Calculate DMBOQ when MBOQ changes
      const percentage = parseFloat(formData.budgetSettings.percentage) || 0;
      const calculatedDMBOQ = (numValue * (100 - percentage)) / 100;
      updatedBudgetSettings.DMBOQ = calculatedDMBOQ.toFixed(2).toString();
    }
    // For DMBOQ changes, we don't auto-calculate anything
    
    setFormData({ 
      ...formData, 
      budgetSettings: updatedBudgetSettings
    });
  };

  const handleNumberBlur = (value: string, isFrom: string, id?: string) => {
    const numValue = parseFloat(value);
    
    if (isNaN(numValue) || numValue < 0) {
      return; // Don't update if invalid
    }
    
    let updatedBudgetSettings = {
      ...formData.budgetSettings,
    };
    
    if (isFrom === 'percentage') {
      // Validate percentage range (0-100)
      if (numValue > 100) {
        return; // Don't update if over 100%
      }
      
      // Calculate DMBOQ when percentage changes
      const MBOQ = parseFloat(formData.budgetSettings.MBOQ) || 0;
      const calculatedDMBOQ = (MBOQ * (100 - numValue)) / 100;
      updatedBudgetSettings.DMBOQ = calculatedDMBOQ.toFixed(2).toString();
      updatedBudgetSettings.percentage = numValue.toFixed(2);
      
    } else if (isFrom === 'MBOQ') {
      // Validate MBOQ (no upper limit, just non-negative)
      const MBOQ = parseFloat(formData.budgetSettings.MBOQ) || 0;
      const percentage = parseFloat(formData.budgetSettings.percentage) || 0;
      const calculatedDMBOQ = (numValue * (100 - percentage)) / 100;
      updatedBudgetSettings.MBOQ = numValue.toFixed(2);
      updatedBudgetSettings.DMBOQ = calculatedDMBOQ.toFixed(2).toString();
    } else if (isFrom === 'DMBOQBudget' || isFrom === 'MBOQBudget') {
      const purpose = formData.purposes.find(p => p._id === id);
      if (purpose) {
        purpose[isFrom] = numValue.toFixed(2);
      }
    } else {
      // For other fields, just format to 2 decimal places
      updatedBudgetSettings[isFrom] = numValue.toFixed(2);
    }
    
    setFormData({ 
      ...formData, 
      budgetSettings: updatedBudgetSettings
    });
  };

  const getHeaderTitle = (mode) => {
    if (mode === 'create') return 'Create New Project';
    else if (mode === 'edit') return 'Edit Existing Project';
    return 'Project Details Overview'
  }

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(isOpen) => {
        // When dialog tries to close (X button, outside click, Escape)
        if (!isOpen) { // Dialog is closing
          handleClose();
        }
      }}
    >
      <DialogContent 
        className="max-w-6xl max-h-[95vh] overflow-y-auto"
        {...(mode !== 'view' && {
          onPointerDownOutside: (e) => e.preventDefault(),
          onEscapeKeyDown: (e) => e.preventDefault()
        })}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 z-50 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading request...</p>
          </div>
        )}
        <DialogHeader>
          <DialogTitle>
            {getHeaderTitle(mode)}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general-info">General Info </TabsTrigger>
            <TabsTrigger value="member-access">Member & Access</TabsTrigger>
          </TabsList>

          {mode !== 'create' && (
            <div className='mt-4'>
              <Label htmlFor="projectName" className="text-sm font-medium mt-4">
                Last Updated: {formData.updatedAt ? new Date(formData.updatedAt).toLocaleString() : 'N/A'}
              </Label>
            </div>
          )}

          <TabsContent value="general-info" className="space-y-4 mt-6">
            <form className="space-y-4">
              <div className="space-y-6">
                {/* Header Section */}
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Project Information</h3>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Status Selection <span className="text-red-500">*</span>
                    </Label>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        {mode === 'view' && (<span>{formData.status === 'active' ? '☑' : '☐'}</span>)}
                        {mode !== 'view' && (
                          <input
                            type="checkbox"
                            id="active"
                            checked={formData.status === 'active'}
                            onChange={(e) => setFormData({
                              ...formData,
                              status: 'active'
                            })}
                          />
                        )}
                        <label htmlFor="active" className="text-sm">Active</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        {mode === 'view' && (<span>{formData.status === 'on_hold' ? '☑' : '☐'}</span>)}
                        {mode !== 'view' && (
                          <input
                            type="checkbox"
                            id="on_hold"
                            checked={formData.status === 'on_hold'}
                            onChange={(e) => setFormData({
                              ...formData,
                              status: 'on_hold'
                            })}
                          />
                        )}
                        <label htmlFor="on_hold" className="text-sm">On Hold</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        {mode === 'view' && (<span>{formData.status === 'completed' ? '☑' : '☐'}</span>)}
                        {mode !== 'view' && (
                          <input
                            type="checkbox"
                            id="completed"
                            checked={formData.status === 'completed'}
                            onChange={(e) => setFormData({
                              ...formData,
                              status: 'completed'
                            })}
                          />
                        )}
                        <label htmlFor="completed" className="text-sm">Completed</label>
                      </div>
                    </div>
                  </div>
                  
                  {/* Project Name */}
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="projectName" className="text-sm font-medium">
                      Project Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="projectName"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Enter project name"
                      required
                      className="w-full disabled:opacity-100"
                      disabled={mode === 'view'}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {/* Request Date */}
                    <div className="space-y-2">
                      <Label htmlFor="requestDate" className="text-sm font-medium">
                        Request Date <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="date"
                        value={formData.requestDate || new Date().toISOString().split('T')[0]}
                        onChange={(e) => setFormData({...formData, requestDate: e.target.value})}
                        className="w-full disabled:opacity-100"
                        disabled={mode === 'view'}
                      />
                    </div>

                    {/* Project Code */}
                    <div className="space-y-2">
                      <Label htmlFor="projectCode" className="text-sm font-medium">
                        Project Code <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="projectCode"
                        value={formData.projectCode}
                        onChange={(e) => setFormData({...formData, projectCode: e.target.value})}
                        placeholder="Enter project code"
                        required
                        className="w-full disabled:opacity-100"
                        disabled={mode === 'view'}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Enter project description"
                      rows={4}
                      className="w-full resize-none disabled:opacity-100"
                      disabled={mode === 'view'}
                    />
                  </div>
                </div>

                {/* Additional Details Section */}
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Sub-Project List</h3>

                  <div className="space-y-2 mt-4">
                    <p className="text-sm text-muted-foreground">
                      {"(Users will select these 'Sub-Project' when creating Purchase Requests)"}
                    </p>
                    {formData.subProjects.length <= 0 && (
                      <div className="gap-2">
                        <p className="text-sm text-muted-foreground">
                          No sub-projects added yet
                        </p>
                        {mode !== 'view' ? <p className="text-xs">Click "Add Sub-Project" to add sub-projects</p> : null}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center mt-2">
                    {mode !== 'view' && (
                      <div className="flex gap-2">
                        <Button
                          type="button" 
                          variant="default" 
                          size="sm"
                          onClick={addSubProject}
                        >
                          Add Sub-Project
                        </Button>
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="sm"
                          onClick={removeSelectedSubProjects}
                          disabled={selectedSubProjects.length === 0}
                        >
                          Remove Selected Sub-Project(s)
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 mt-2">
                    {formData.subProjects.map((project) => (
                      <div key={project._id} className="project-row flex items-center gap-2 p-2 border rounded">
                        <input
                          type="checkbox"
                          className="w-4 h-4"
                          checked={selectedSubProjects.includes(project._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSubProjects(prev => [...prev, project._id]);
                            } else {
                              setSelectedSubProjects(prev => prev.filter(id => id !== project._id));
                            }
                          }}
                          disabled={mode === 'view'}
                        />
                        {project ? (
                          <Input
                            type="text"
                            placeholder="Enter sub-project name..."
                            className="flex-1 disabled:opacity-100"
                            value={project.name}
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                subProjects: prev.subProjects.map(p => 
                                  p._id === project._id ? {...p, name: e.target.value} : p
                                )
                              }));
                            }}
                            disabled={mode === 'view'}
                          />
                        ) : (
                          <span className="flex-1">{project.name}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Budget Settings</h3>

                  <div className="space-y-2 mt-4">
                    <Label htmlFor="directMaterialsBOQ" className="text-md font-medium">
                      {"Allocate Budget By Purpose(s):"}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {"(Users will select these 'Purposes' when creating Purchase Requests)"}
                    </p>
                    {formData.purposes.length <= 0 && (
                      <div className="gap-2">
                        <p className="text-sm text-muted-foreground">
                          No purposes added yet
                        </p>
                        {mode !== 'view' ? <p className="text-xs">Click "Add Purpose" to add purposes</p> : null}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center mt-3 mb-3">
                    {mode !== 'view' && (
                      <div className="flex gap-2">
                        <Button
                          type="button" 
                          variant="default" 
                          size="sm"
                          onClick={addPurpose}
                        >
                          Add Purpose
                        </Button>
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="sm"
                          onClick={removeSelectedPurposes}
                          disabled={selectedPurposes.length === 0}
                        >
                          Remove Selected Purpose(s)
                        </Button>
                      </div>
                    )}
                  </div>

                  {formData.purposes.some(p => p._id) ?(
                    <div className="flex items-end gap-2 mt-3 mb-3">
                      <Label htmlFor="purpose" className="text-sm font-medium ml-9 mr-9">
                        Purpose <span className="text-red-500">*</span>
                      </Label>
                      <Label htmlFor="materialBOQ" className="text-sm font-medium ml-36 mr-8">
                        Material BOQ <span className="text-red-500">*</span>
                      </Label>
                      <div className='flex items-end gap-2'>
                        <Label htmlFor="directMaterialBOQ" className="text-sm font-medium ml-36">
                          Direct Material BOQ <span className="text-red-500">*</span>
                        </Label>
                        {/* Percentage Input */}
                        <div className="space-y-2 mb-2">
                          <Label htmlFor="percentage" className="text-sm font-medium">
                            Percentage <span className="text-red-500">*</span>
                          </Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                              % -
                            </span>
                            <Input
                              id="percentage"
                              type="text"
                              inputMode="decimal"
                              value={formData.budgetSettings.percentage}
                              onChange={(e) => handleNumberChange(e.target.value, 'percentage')}
                              onBlur={(e) => handleNumberBlur(e.target.value, 'percentage')}
                              placeholder="0.00"
                              required
                              className="w-[50%] pl-10 disabled:opacity-100"
                              disabled={mode === 'view'}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {formData.purposes.map((purpose) => (
                    <div key={purpose._id} className="purpose-row flex items-center gap-2 p-2 border rounded">
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={selectedPurposes.includes(purpose._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPurposes(prev => [...prev, purpose._id]);
                          } else {
                            setSelectedPurposes(prev => prev.filter(id => id !== purpose._id));
                          }
                        }}
                        disabled={mode === 'view'}
                      />
                      {purpose ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            type="text"
                            placeholder="Enter purpose name..."
                            className="flex-1 disabled:opacity-100"
                            value={purpose.name}
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                purposes: prev.purposes.map(p => 
                                  p._id === purpose._id ? {...p, name: e.target.value} : p
                                )
                              }));
                            }}
                            disabled={mode === 'view'}
                          />
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                              $
                            </span>
                            <Input
                              type="number"
                              placeholder="0.00"
                              className="flex-1 pl-8 disabled:opacity-100"
                              value={purpose.MBOQBudget || ''}
                              onChange={(e) => {handleNumberChange(e.target.value, 'MBOQBudget', purpose._id)}}
                              onBlur={(e) => handleNumberBlur(e.target.value, 'MBOQBudget', purpose._id)}
                              step="0.01"
                              min="0"
                              disabled={mode === 'view'}
                            />
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                              $
                            </span>
                            <Input
                              type="number"
                              placeholder="0.00"
                              className="flex-1 pl-8 disabled:opacity-100"
                              value={purpose.DMBOQBudget || ''}
                              onChange={(e) => {
                                setFormData(prev => ({
                                  ...prev,
                                  purposes: prev.purposes.map(p => 
                                    p._id === purpose._id ? {...p, DMBOQBudget: e.target.value} : p
                                  )
                                }));
                              }}
                              step="0.01"
                              min="0"
                              disabled={mode === 'view'}
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}


                  <div className="purpose-row flex items-center gap-2 p-2 border rounded">    
                    <span className='w-4 h-4'></span>
                    <div className="flex items-center gap-2 flex-1">
                      {formData.purposes && formData.purposes.length > 0 ? (
                        <div className='w-[25%] flex justify-end items-center pr-6'><h3>Total: </h3></div>
                      ) : (
                        <h3 className='pr-6'>Total: </h3>
                      )}
                      <div className="space-y-2">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                            $
                          </span>
                          <Input
                            type="number"
                            placeholder="0.00"
                            inputMode="decimal"
                            className="flex-1 pl-8 disabled:opacity-100"
                            value={formData.budgetSettings.MBOQ}
                            onChange={(e) => handleNumberChange(e.target.value, 'MBOQ')}
                            onBlur={(e) => handleNumberBlur(e.target.value, 'MBOQ')}
                            required
                            disabled={mode === 'view'}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                            $
                          </span>
                          <Input
                            type="number"
                            placeholder="0.00"
                            className="flex-1 pl-8 disabled:opacity-100"
                            value={formData.budgetSettings.DMBOQ}
                            onChange={(e) => handleNumberChange(e.target.value, 'DMBOQ')}
                            onBlur={(e) => handleNumberBlur(e.target.value, 'DMBOQ')}
                            step="0.01"
                            min="0"
                            disabled={mode === 'view'}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>


              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => handleClose()}
                >
                  Cancel
                </Button>
                <Button 
                  type="button"
                  onClick={() => setActiveTab('member-access')}
                >
                  Next
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="member-access" className="mt-6">
            <div className="bg-muted/30 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Project Member(s) List</h3>
              
              <div className="flex justify-between items-center mb-4">
                {mode !== 'view' && (
                  <div className="flex gap-2">
                    <Button
                      type="button" 
                      variant="default" 
                      size="sm"
                      onClick={() => setShowMemberModal(true)}  // ✅ Correct
                    >
                      Add Member(s)
                    </Button>
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="sm"
                      onClick={handleRemoveSelectedMembers}
                      disabled={selectedMembers.length === 0}
                    >
                      Remove Member(s) ({selectedMembers.length})
                    </Button>
                  </div>
                )}
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2 text-xs font-medium w-8">
                        <input
                          type="checkbox"
                          checked={formData.members.length > 0 && selectedMembers.length === formData.members.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMembers(formData.members.map(member => member._id));
                            } else {
                              setSelectedMembers([]);
                            }
                          }}
                          className="w-4 h-4"
                          disabled={mode === 'view'}
                        />
                      </th>
                      <th className="text-left p-2 text-xs font-medium">Name</th>
                      <th className="text-left p-2 text-xs font-medium">Email</th>
                      <th className="text-left p-2 text-xs font-medium">Department</th>
                      <th className="text-left p-2 text-xs font-medium">Role</th>
                      <th className="text-left p-2 text-xs font-medium">Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.members.length > 0 ? (
                      formData.members.map((member) => (
                        <tr key={member._id} className="border-t hover:bg-muted/30">
                          <td className="p-2">
                            <input
                              type="checkbox"
                              checked={selectedMembers.includes(member._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedMembers(prev => [...prev, member._id]);
                                } else {
                                  setSelectedMembers(prev => prev.filter(id => id !== member._id));
                                }
                              }}
                              className="w-4 h-4"
                              disabled={mode === 'view'}
                            />
                          </td>
                          <td className="p-2 text-sm font-medium">{member.name}</td>
                          <td className="p-2 text-sm text-muted-foreground">{member.email}</td>
                          <td className="p-2 text-sm">{member.department}</td>
                          <td className="p-2 text-sm">{member.role}</td>
                          <td className="p-2 text-sm">{member.position}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center p-8 text-muted-foreground">
                          <div className="space-y-2">
                            <p className="text-sm">No members added yet</p>
                            {mode !== 'view' ? <p className="text-xs">Click "Add Member(s)" to add team members</p> : null}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="space-y-2">
                <h4 className="text-md font-semibold mt-4 mb-2">Visibility</h4>
                <div className="flex items-center space-x-2">
                  {mode === 'view' && (<span>{formData.visibility === 'public' ? '☑' : '☐'}</span>)}
                  {mode !== 'view' && (
                    <input
                      type="checkbox"
                      id="public"
                      checked={formData.visibility === 'public'}
                      onChange={(e) => setFormData({
                        ...formData,
                        visibility: e.target.checked ? 'public' : 'private'
                      })}
                      className="w-4 h-4"
                    />
                  )}
                  <label htmlFor="public" className="text-sm cursor-pointer">
                    Public  - Anyone in the company can charge to this budget
                  </label>
                </div>
                <div className="flex items-center space-x-2 cursor-pointer">
                  {mode === 'view' && (<span>{formData.visibility === 'private' ? '☑' : '☐'}</span>)}
                  {mode !== 'view' && (
                    <input
                      type="checkbox"
                      id="private"
                      checked={formData.visibility === 'private'}
                      onChange={(e) => setFormData({
                        ...formData,
                        visibility: e.target.checked ? 'private' : 'public'
                      })}
                      className="w-4 h-4 disabled:opacity-100"
                    />
                  )}
                  <label htmlFor="private" className="text-sm cursor-pointer">
                    Private - Only members listed below can see this project
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Navigation Buttons */}
              <div className="flex justify-between space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setActiveTab('general-info')}
                  disabled={isSubmitting}
                >
                  Previous
                </Button>
                
                { mode !== 'view' && (
                  <div className="flex space-x-2">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => handleClose()}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    { mode !== 'edit' ? (
                      <Button 
                        type="button"
                        onClick={() => handleSubmit('create')}  // Use the actual submit handler
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Creating..." : "Create Project"}
                      </Button>
                    ) : (
                      <Button 
                        type="button"
                        onClick={() => handleSubmit('update')}  // Use the actual submit handler
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Updating..." : "Update Project"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>

      <MemberInvitationModal
        isOpen={showMemberModal}
        setIsOpen={setShowMemberModal}
        onMembersAdded={(newMembers) => {
          setFormData(prev => ({
            ...prev,
            members: [...prev.members, ...newMembers]
          }));
        }}
        currentMembers={formData.members}
      />
    </Dialog>
  );
};

export default PRProjectForm;