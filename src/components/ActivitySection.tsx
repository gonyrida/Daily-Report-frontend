import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ClipboardList, CalendarCheck } from "lucide-react";

interface ActivitySectionProps {
  activityToday: string;
  setActivityToday: (activity: string) => void;
  workPlanNextDay: string;
  setWorkPlanNextDay: (plan: string) => void;
}

const ActivitySection = ({
  activityToday,
  setActivityToday,
  workPlanNextDay,
  setWorkPlanNextDay,
}: ActivitySectionProps) => {
  return (
    <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
      <div className="section-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Working Activity Today</h2>
            <p className="text-sm text-muted-foreground">Describe today's completed work</p>
          </div>
        </div>
        <Textarea
          value={activityToday}
          onChange={(e) => setActivityToday(e.target.value)}
          placeholder="Enter details of work completed today..."
          className="min-h-[180px] resize-none"
        />
      </div>
      
      <div className="section-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-accent/10 rounded-lg">
            <CalendarCheck className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Work Plan for Next Day</h2>
            <p className="text-sm text-muted-foreground">Plan tomorrow's activities</p>
          </div>
        </div>
        <Textarea
          value={workPlanNextDay}
          onChange={(e) => setWorkPlanNextDay(e.target.value)}
          placeholder="Enter planned activities for tomorrow..."
          className="min-h-[180px] resize-none"
        />
      </div>
    </div>
  );
};

export default ActivitySection;
