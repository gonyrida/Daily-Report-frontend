import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const MasterMaterials = ({ 
	// projects, 
	// loadingProjects, 
	// onRefresh 
}) => {



	return (
		<div className="space-y-6">
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="text-xl font-semibold">Material Items</CardTitle>

          <div className="flex gap-2">
            {/* Placeholder for future buttons like "New Project" */}
            <Button 
              variant="default" 
              size="sm"
              // onClick={handleCreateProject}
            >
              New Item
            </Button>
            <Button 
              variant="default" 
              size="sm"
              // onClick={() => {
              //   if (selectedProjects.length === 1) {
              //     const project = projects.find(p => p.id === selectedProjects[0] || p._id === selectedProjects[0]);
              //     if (project) handleEditProject(project);
              //   }
              // }}
              // disabled={selectedProjects.length !== 1 || (() => {
              //   if (selectedProjects.length === 1) {
              //     const project = projects.find(p => p.id === selectedProjects[0] || p._id === selectedProjects[0]);
              //     return project?.status === 'completed' || project?.status === 'on_hold' || false;
              //   }
              //   return false;
              // })()}
            >
              Edit Item
            </Button>
          </div>
				</CardHeader>
			</Card>
		</div>
	)
}

export default MasterMaterials;