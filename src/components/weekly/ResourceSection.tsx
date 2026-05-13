import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Truck, Wrench } from 'lucide-react';

interface ResourceSectionProps {
  materials?: any[];
  machinery?: any[];
}

const ResourceSection: React.FC<ResourceSectionProps> = ({ materials, machinery }) => {
  console.log('🔍 ResourceSection received data:', {
    materials: materials?.length || 0,
    machinery: machinery?.length || 0,
    materialsData: materials?.slice(0, 2),
    machineryData: machinery?.slice(0, 2)
  });

  const hasMaterials = materials && materials.length > 0;
  const hasMachinery = machinery && machinery.length > 0;

  if (!hasMaterials && !hasMachinery) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No resource data available</p>
        <p className="text-xs mt-2">Debug: Materials: {materials?.length || 0}, Machinery: {machinery?.length || 0}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Materials Section */}
      {hasMaterials && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-500" />
            Material Delivery Status
            {materials.length > 0 && (
              <Badge variant="secondary" className="text-xs ml-2">
                {materials.length} items
              </Badge>
            )}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.map((material, index) => (
              <Card key={`material-${index}`} className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">
                    {material.title || `Material Delivery ${index + 1}`}
                  </CardTitle>
                  {material.status && (
                    <Badge 
                      variant={material.status === 'Delivered' ? 'default' : 'secondary'} 
                      className="ml-2"
                    >
                      {material.status}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {material.deliveryDate && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Delivery Date:</span>
                        <span className="text-sm text-muted-foreground">{material.deliveryDate}</span>
                      </div>
                    )}
                    {material.supplier && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Supplier:</span>
                        <span className="text-sm text-muted-foreground">{material.supplier}</span>
                      </div>
                    )}
                    {material.description && (
                      <div>
                        <span className="text-sm font-medium">Description:</span>
                        <p className="text-sm text-muted-foreground mt-1">{material.description}</p>
                      </div>
                    )}
                    {material.quantity && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Quantity:</span>
                        <span className="text-sm text-muted-foreground">{material.quantity}</span>
                      </div>
                    )}
                    {material.projectSource && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Project:</span>
                        <Badge variant="outline" className="text-xs">
                          {material.projectSource}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Machinery Section */}
      {hasMachinery && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-green-500" />
            Machinery & Equipment Status
            {machinery.length > 0 && (
              <Badge variant="secondary" className="text-xs ml-2">
                {machinery.length} items
              </Badge>
            )}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {machinery.map((equipment, index) => (
              <Card key={`machinery-${index}`} className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">
                    {equipment.title || `Machinery & Equipment ${index + 1}`}
                  </CardTitle>
                  {equipment.status && (
                    <Badge 
                      variant={equipment.status === 'Available' ? 'default' : 'secondary'} 
                      className="ml-2"
                    >
                      {equipment.status}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {equipment.type && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Type:</span>
                        <span className="text-sm text-muted-foreground">{equipment.type}</span>
                      </div>
                    )}
                    {equipment.quantity && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Quantity:</span>
                        <span className="text-sm text-muted-foreground">{equipment.quantity}</span>
                      </div>
                    )}
                    {equipment.condition && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Condition:</span>
                        <span className="text-sm text-muted-foreground">{equipment.condition}</span>
                      </div>
                    )}
                    {equipment.location && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Location:</span>
                        <span className="text-sm text-muted-foreground">{equipment.location}</span>
                      </div>
                    )}
                    {equipment.description && (
                      <div>
                        <span className="text-sm font-medium">Description:</span>
                        <p className="text-sm text-muted-foreground mt-1">{equipment.description}</p>
                      </div>
                    )}
                    {equipment.projectSource && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Project:</span>
                        <Badge variant="outline" className="text-xs">
                          {equipment.projectSource}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceSection;
