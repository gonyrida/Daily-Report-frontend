import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Image, ImageIcon } from 'lucide-react';
import type { MasterHsePhotoReferences, MasterHsePhotoSection, MasterHsePhotoReference, MasterHsePhotoSlot } from '@/types/masterReport.types';

interface MasterHsePhotoSectionProps {
  hsePhotoReferences?: MasterHsePhotoReferences;
}

const MasterHsePhotoSection: React.FC<MasterHsePhotoSectionProps> = ({ hsePhotoReferences }) => {
  console.log('🔍 MasterHsePhotoSection: Component received data:', hsePhotoReferences);
  
  if (!hsePhotoReferences) {
    console.log('🔍 MasterHsePhotoSection: No data provided, showing empty state');
    return (
      <div className="text-center py-12 text-muted-foreground italic">
        No HSE photo references available from any project reports.
      </div>
    );
  }
  
  console.log('🔍 MasterHsePhotoSection: Data structure:', {
    hasToolboxMeeting: !!hsePhotoReferences.hseToolboxMeeting,
    toolboxMeetingLength: Array.isArray(hsePhotoReferences.hseToolboxMeeting) ? hsePhotoReferences.hseToolboxMeeting.length : 'N/A',
    hasActivityPhotos: !!hsePhotoReferences.hseActivityPhotos,
    activityPhotosLength: Array.isArray(hsePhotoReferences.hseActivityPhotos) ? hsePhotoReferences.hseActivityPhotos.length : 'N/A'
  });
  
  // Log detailed section data
  if (hsePhotoReferences.hseToolboxMeeting) {
    console.log('🔍 MasterHsePhotoSection: Toolbox sections detail:', hsePhotoReferences.hseToolboxMeeting.map((section, index) => ({
      index,
      title: section.title,
      hasEntries: !!section.entries,
      entriesType: Array.isArray(section.entries) ? 'array' : typeof section.entries,
      entriesLength: Array.isArray(section.entries) ? section.entries.length : 'N/A',
      entries: section.entries
    })));
  }
  
  if (hsePhotoReferences.hseActivityPhotos) {
    console.log('🔍 MasterHsePhotoSection: Activity sections detail:', hsePhotoReferences.hseActivityPhotos.map((section, index) => ({
      index,
      title: section.title,
      hasEntries: !!section.entries,
      entriesType: Array.isArray(section.entries) ? 'array' : typeof section.entries,
      entriesLength: Array.isArray(section.entries) ? section.entries.length : 'N/A',
      entries: section.entries
    })));
  }

  const renderPhotoSection = (section: MasterHsePhotoSection[], sectionTitle: string) => {
    if (!section || section.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No {sectionTitle.toLowerCase()} photos available</p>
        </div>
      );
    }

    // Extract all images from multiple entries (2 images per entry)
    const allImages: MasterHsePhotoReference[] = [];
    
    section.forEach((photoSection) => {
      if (photoSection.entries && Array.isArray(photoSection.entries) && photoSection.entries.length > 0) {
        // Process all entries (each with max 2 images)
        photoSection.entries.forEach((entry) => {
          if (entry.slots && Array.isArray(entry.slots)) {
            entry.slots.forEach((slot) => {
              if (slot.image && slot.image.trim() !== '') {
                allImages.push({
                  image: slot.image,
                  caption: slot.caption || '',
                  projectSource: slot.projectSource || 'Unknown'
                });
              }
            });
          }
        });
      }
    });

    if (allImages.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No {sectionTitle.toLowerCase()} photos available</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {section.map((photoSection, sectionIndex) => (
          <div key={sectionIndex} className="space-y-4">
            {photoSection.title && (
              <h4 className="text-md font-semibold text-foreground">{photoSection.title}</h4>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allImages.map((photo, photoIndex) => (
                <Card key={photoIndex} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    {photo.image ? (
                      <div className="aspect-video relative bg-muted">
                        <img
                          src={photo.image}
                          alt={photo.caption || 'HSE Photo'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '';
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                            e.currentTarget.parentElement?.classList.remove('aspect-video');
                          }}
                        />
                        {!photo.image && (
                          <div className="flex items-center justify-center h-full">
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="aspect-video bg-muted flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    
                    <div className="p-3 space-y-2">
                      {photo.projectSource && (
                        <Badge variant="outline" className="text-xs">
                          {photo.projectSource}
                        </Badge>
                      )}
                      
                      {photo.caption && (
                        <p className="text-sm text-foreground line-clamp-2">
                          {photo.caption}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* HSE Toolbox Meeting Photos */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <h3 className="text-lg font-semibold text-foreground">HSE Toolbox Meeting Photos</h3>
          {hsePhotoReferences.hseToolboxMeeting && (
            <Badge variant="secondary" className="text-xs">
              {hsePhotoReferences.hseToolboxMeeting.reduce((sum, section) => 
                sum + section.entries?.reduce((entrySum, entry) => 
                  entrySum + (entry.slots?.filter(slot => slot.image).length || 0), 0) || 0, 0)} photos
            </Badge>
          )}
        </div>
        {renderPhotoSection(hsePhotoReferences.hseToolboxMeeting, 'HSE Toolbox Meeting')}
      </div>

      {/* HSE Activities Photos */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <h3 className="text-lg font-semibold text-foreground">HSE Activities Photos</h3>
          {hsePhotoReferences.hseActivityPhotos && (
            <Badge variant="secondary" className="text-xs">
              {hsePhotoReferences.hseActivityPhotos.reduce((sum, section) => 
                sum + section.entries?.reduce((entrySum, entry) => 
                  entrySum + (entry.slots?.filter(slot => slot.image).length || 0), 0) || 0, 0)} photos
            </Badge>
          )}
        </div>
        {renderPhotoSection(hsePhotoReferences.hseActivityPhotos, 'HSE Activities')}
      </div>
    </div>
  );
};

export default MasterHsePhotoSection;
