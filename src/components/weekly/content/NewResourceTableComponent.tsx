import React, { useState, useEffect } from "react";
import { DAY_NAMES } from "@/constants/dayNames";
import { generateWeekDates } from "@/lib/weekDateUtils";
import { Resources, ManPowerTeams, ManPowerEntry } from "@/types/resources.types";

interface NewResourceTableComponentProps {
  sharedData?: any;
  resources?: Resources;
  setResources?: (resources: Resources) => void;
  showTitles?: boolean;
  monthYearDisplay?: string;
  dates?: string[];
}

const NewResourceTableComponent: React.FC<NewResourceTableComponentProps> = ({ 
  sharedData, 
  showTitles = true, 
  resources: passedResources,
  setResources: passedSetResources,
  monthYearDisplay: passedMonthYearDisplay,
  dates: passedDates
}) => {
  const [localResources, setLocalResources] = useState<Resources>(passedResources || {
    manPower: {
      managementTeam: [],
      workingTeamInterior: [],
      workingTeamMEP: []
    }
  });

  const resources = passedResources || localResources;
  const setResources = passedSetResources || setLocalResources;

  const monthYearDisplay = passedMonthYearDisplay || "Feb-26";
  const dates = passedDates || ["-", "-", "-", "-", "-", "-", "-"];

  const dayNames = DAY_NAMES;

  useEffect(() => {
    if (sharedData?.dateRange && !passedMonthYearDisplay) {
      const { monthYearDisplay: newMonthYearDisplay, dates: newDates } = generateWeekDates(sharedData.dateRange);
      // Update monthYearDisplay and dates if needed
    }
  }, [sharedData?.dateRange, passedMonthYearDisplay]);

  const updateManPowerEntry = (
    teamType: keyof ManPowerTeams,
    index: number,
    field: keyof ManPowerEntry,
    value: string | number | any
  ) => {
    const newResources = { ...resources };
    const team = [...newResources.manPower[teamType]];
    
    if (field === 'date' && typeof value === 'object') {
      team[index] = {
        ...team[index],
        date: { ...team[index].date, ...value }
      };
    } else if (field === 'prevWeek' || field === 'thisWeek' || field === 'accumulated') {
      team[index] = {
        ...team[index],
        [field]: Number(value) || 0
      };
      
      // Auto-calculate accumulated when prevWeek or thisWeek changes
      if (field === 'prevWeek' || field === 'thisWeek') {
        const prevWeek = field === 'prevWeek' ? Number(value) || 0 : team[index].prevWeek;
        const thisWeek = field === 'thisWeek' ? Number(value) || 0 : team[index].thisWeek;
        team[index].accumulated = prevWeek + thisWeek;
      }
    } else {
      team[index] = {
        ...team[index],
        [field]: value
      };
    }
    
    newResources.manPower[teamType] = team;
    setResources(newResources);
  };

  const addManPowerEntry = (teamType: keyof ManPowerTeams) => {
    const newEntry: ManPowerEntry = {
      description: "",
      date: {
        fri: 0,
        sat: 0,
        sun: 0,
        mon: 0,
        tue: 0,
        wed: 0,
        thu: 0
      },
      prevWeek: 0,
      thisWeek: 0,
      accumulated: 0
    };

    const newResources = { ...resources };
    newResources.manPower[teamType] = [...newResources.manPower[teamType], newEntry];
    setResources(newResources);
  };

  const removeManPowerEntry = (teamType: keyof ManPowerTeams, index: number) => {
    const newResources = { ...resources };
    if (newResources.manPower[teamType].length > 1) {
      newResources.manPower[teamType] = newResources.manPower[teamType].filter((_, i) => i !== index);
      setResources(newResources);
    }
  };

  const calculateTeamTotals = (team: ManPowerEntry[]) => {
    return team.reduce((acc, entry) => {
      const dayTotals = {
        fri: acc.date.fri + entry.date.fri,
        sat: acc.date.sat + entry.date.sat,
        sun: acc.date.sun + entry.date.sun,
        mon: acc.date.mon + entry.date.mon,
        tue: acc.date.tue + entry.date.tue,
        wed: acc.date.wed + entry.date.wed,
        thu: acc.date.thu + entry.date.thu
      };
      return {
        date: dayTotals,
        prevWeek: acc.prevWeek + entry.prevWeek,
        thisWeek: acc.thisWeek + entry.thisWeek,
        accumulated: acc.accumulated + entry.accumulated
      };
    }, {
      date: { fri: 0, sat: 0, sun: 0, mon: 0, tue: 0, wed: 0, thu: 0 },
      prevWeek: 0,
      thisWeek: 0,
      accumulated: 0
    });
  };

  const renderTeamSection = (
    title: string,
    teamType: keyof ManPowerTeams,
    team: ManPowerEntry[]
  ) => {
    const totals = calculateTeamTotals(team);

    return (
      <div key={teamType} className="mb-6">
        {showTitles && (
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold text-foreground">{title}</h3>
            <button
              onClick={() => addManPowerEntry(teamType)}
              className="text-primary hover:text-primary hover:bg-primary/10 px-3 py-1 rounded text-sm"
            >
              + Add Row
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-border">
            <thead>
              <tr>
                <th className="border border-border bg-blue-100 dark:bg-blue-900/30 px-4 py-2 text-left font-semibold">
                  Description
                </th>
                {(['fri', 'sat', 'sun', 'mon', 'tue', 'wed', 'thu'] as const).map((day) => (
                  <th key={day} className="border border-border bg-blue-100 dark:bg-blue-900/30 px-4 py-2 text-center font-semibold">
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </th>
                ))}
                <th className="border border-border bg-blue-100 dark:bg-blue-900/30 px-4 py-2 text-center font-semibold">
                  Prev Week
                </th>
                <th className="border border-border bg-blue-100 dark:bg-blue-900/30 px-4 py-2 text-center font-semibold">
                  This Week
                </th>
                <th className="border border-border bg-blue-100 dark:bg-blue-900/30 px-4 py-2 text-center font-semibold">
                  Accumulated
                </th>
                <th className="border border-border bg-blue-100 dark:bg-blue-900/30 px-4 py-2 text-center font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {team.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-8 text-muted-foreground">
                    No entries yet. Click "Add Row" to begin.
                  </td>
                </tr>
              ) : (
                team.map((entry, index) => (
                  <tr key={index} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="border border-border px-4 py-2">
                      <input
                        type="text"
                        value={entry.description}
                        onChange={(e) => updateManPowerEntry(teamType, index, 'description', e.target.value)}
                        className="w-full px-2 py-1 border-none outline-none bg-transparent dark:bg-card"
                        placeholder="Enter description"
                      />
                    </td>
                    {(['fri', 'sat', 'sun', 'mon', 'tue', 'wed', 'thu'] as const).map((day) => (
                      <td key={day} className="border border-border px-4 py-2 text-center">
                        <input
                          type="number"
                          value={entry.date[day] || ""}
                          onChange={(e) => updateManPowerEntry(teamType, index, 'date', { [day]: Number(e.target.value) || 0 })}
                          className="w-full text-center px-2 py-1 border-none outline-none bg-transparent dark:bg-card"
                          placeholder="0"
                        />
                      </td>
                    ))}
                    <td className="border border-border px-4 py-2 text-center">
                      <input
                        type="number"
                        value={entry.prevWeek || ""}
                        onChange={(e) => updateManPowerEntry(teamType, index, 'prevWeek', e.target.value)}
                        className="w-full text-center px-2 py-1 border-none outline-none bg-transparent dark:bg-card"
                        placeholder="0"
                      />
                    </td>
                    <td className="border border-border px-4 py-2 text-center">
                      <input
                        type="number"
                        value={entry.thisWeek || ""}
                        onChange={(e) => updateManPowerEntry(teamType, index, 'thisWeek', e.target.value)}
                        className="w-full text-center px-2 py-1 border-none outline-none bg-transparent dark:bg-card"
                        placeholder="0"
                      />
                    </td>
                    <td className="border border-border px-4 py-2 text-center font-semibold text-primary">
                      {entry.accumulated}
                    </td>
                    <td className="border border-border px-4 py-2 text-center">
                      <button
                        onClick={() => removeManPowerEntry(teamType, index)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2 py-1 rounded text-sm"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
              {/* Total Row */}
              <tr className="border-t-2 border-primary/30 bg-primary/5">
                <td className="border border-border px-4 py-2 font-bold">
                  Total
                </td>
                {(['fri', 'sat', 'sun', 'mon', 'tue', 'wed', 'thu'] as const).map((day) => (
                  <td key={day} className="border border-border px-4 py-2 text-center font-bold">
                    {totals.date[day]}
                  </td>
                ))}
                <td className="border border-border px-4 py-2 text-center font-bold">
                  {totals.prevWeek}
                </td>
                <td className="border border-border px-4 py-2 text-center font-bold">
                  {totals.thisWeek}
                </td>
                <td className="border border-border px-4 py-2 text-center font-bold text-primary">
                  {totals.accumulated}
                </td>
                <td className="border border-border px-4 py-2"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">
        <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">6.1</span> 
        Manpower Status
      </h3>
      
      {renderTeamSection("I. Site Management Team", "managementTeam", resources.manPower.managementTeam)}
      {renderTeamSection("II. Site Working Team Interior", "workingTeamInterior", resources.manPower.workingTeamInterior)}
      {renderTeamSection("III. Site Working Team MEP", "workingTeamMEP", resources.manPower.workingTeamMEP)}
    </div>
  );
};

export default NewResourceTableComponent;
