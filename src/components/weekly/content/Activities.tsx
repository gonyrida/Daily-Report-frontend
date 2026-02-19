import { ClipboardList, CalendarCheck, Plus, Trash2 } from "lucide-react";
import { ActivityRow, ActivitiesProps } from "@/types/activity.types";
import { adjustHeight } from "@/utils/autoResizeTextarea";
import { useActivities } from "@/hooks/useActivities";

const Activities = (props: ActivitiesProps) => {
  const {
    weeklyActivities,
    setWeeklyActivities,
    nextWeekPlan,
    setNextWeekPlan,
    addRow,
    deleteRow,
    updateRow,
  } = useActivities(props.weeklyActivities, props.nextWeekPlan);

  // Auto-resize textarea in table
  const adjustHeightWrapper = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    adjustHeight(e);
  };

  return (
    <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
      
      {/* Weekly Activities */}
      <div className="section-card p-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Activities Of Work Done</h2>
              <p className="text-sm text-muted-foreground">Describe this week's completed work</p>
            </div>
          </div>
          <button
            onClick={() => addRow("weekly")}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Plus className="w-4 h-4" /> Add Row
          </button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 px-2">Description</th>
              <th className="text-left py-2 px-2 w-20">%</th>
              <th className="text-left py-2 px-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {(weeklyActivities || []).map((row, idx) => (
              <tr key={idx}>
                <td className="py-2 px-2 align-top">
                  <textarea
                    value={row.description}
                    onChange={(e) => {
                      updateRow("weekly", idx, "description", e.target.value);
                      adjustHeightWrapper(e);
                    }}
                    className="w-full border rounded px-2 py-1 resize-none overflow-hidden h-8 dark:bg-card dark:border-border dark:text-foreground"
                    placeholder="Enter description"
                    rows={1}
                  />
                </td>
                <td className="py-2 px-2 align-top">
                  <div className="relative w-full">
                    <div 
                      className="absolute inset-0 bg-yellow-200 dark:bg-yellow-300 rounded transition-all duration-300"
                      style={{ width: `${Math.min(row.percent, 100)}%` }}
                    />
                    <input
                      type="number"
                      value={row.percent || ""}
                      onChange={(e) => updateRow("weekly", idx, "percent", e.target.value)}
                      className={`relative w-full border rounded px-2 py-1 h-8 bg-transparent z-10 dark:bg-yellow-800/40 dark:border-border dark:text-foreground ${
                        row.percent === 100 
                          ? 'border-green-400 text-green-800 dark:text-green-300 dark:border-green-400 font-semibold' 
                          : 'border-yellow-300 text-yellow-800 dark:text-yellow-300 dark:border-yellow-400'
                      }`}
                      placeholder="%"
                      min={0}
                      max={100}
                    />
                  </div>
                </td>
                <td className="py-2 px-2 align-top">
                  <button
                    onClick={() => deleteRow("weekly", idx)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 dark:text-red-400 dark:hover:text-red-300 rounded transition-colors"
                    title="Delete row"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Next Week Plan */}
      <div className="section-card p-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-accent/10 rounded-lg">
              <CalendarCheck className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Next Week Plan</h2>
              <p className="text-sm text-muted-foreground">Plan next week's activities</p>
            </div>
          </div>
          <button
            onClick={() => addRow("next")}
            className="flex items-center gap-1 text-sm text-accent hover:underline"
          >
            <Plus className="w-4 h-4" /> Add Row
          </button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 px-2">Description</th>
              <th className="text-left py-2 px-2 w-20">%</th>
              <th className="text-left py-2 px-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {(nextWeekPlan || []).map((row, idx) => (
              <tr key={idx}>
                <td className="py-2 px-2 align-top">
                  <textarea
                    value={row.description}
                    onChange={(e) => {
                      updateRow("next", idx, "description", e.target.value);
                      adjustHeightWrapper(e);
                    }}
                    className="w-full border rounded px-2 py-1 resize-none overflow-hidden h-8 dark:bg-yellow-800/40 dark:border-border dark:text-foreground"
                    placeholder="Enter description"
                    rows={1}
                  />
                </td>
                <td className="py-2 px-2 align-top">
                  <div className="relative w-full">
                    <div 
                      className="absolute inset-0 bg-yellow-200 dark:bg-yellow-400/70 rounded transition-all duration-300"
                      style={{ width: `${Math.min(row.percent, 100)}%` }}
                    />
                    <input
                      type="number"
                      value={row.percent || ""}
                      onChange={(e) => updateRow("next", idx, "percent", e.target.value)}
                      className={`relative w-full border rounded px-2 py-1 h-8 bg-transparent z-10 dark:bg-yellow-800/40 dark:border-border dark:text-foreground ${
                        row.percent === 100 
                          ? 'border-green-400 text-green-800 dark:text-green-300 dark:border-green-400 font-semibold' 
                          : 'border-yellow-300 text-yellow-800 dark:text-yellow-300 dark:border-yellow-400'
                      }`}
                      placeholder="%"
                      min={0}
                      max={100}
                    />
                  </div>
                </td>
                <td className="py-2 px-2 align-top">
                  <button
                    onClick={() => deleteRow("next", idx)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 dark:text-red-400 dark:hover:text-red-300 rounded transition-colors"
                    title="Delete row"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default Activities;
