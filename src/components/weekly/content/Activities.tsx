import { ClipboardList, CalendarCheck, Plus, Trash2, GripVertical } from "lucide-react";
import { ActivityRow, ActivitiesProps } from "@/types/activity.types";
import { adjustHeight } from "@/utils/autoResizeTextarea";
import { useState, useCallback, useEffect, useRef } from "react";
import { mergeConstructionIntoActivityRows } from "@/utils/constructionProgressToActivities";

const Activities = (props: ActivitiesProps) => {
  // Local state for construction progress integration
  const [weeklyRows, setWeeklyRows] = useState<ActivityRow[]>(props.weeklyActivities || []);
  const [nextRows, setNextRows] = useState<ActivityRow[]>(props.nextWeekPlan || []);
  
  // Track deleted construction progress items (by unique row id) to prevent re-adding
  const [deletedRowIds, setDeletedRowIds] = useState<Set<string>>(new Set());
  // Track if merge has been done to prevent duplicate runs
  const mergeDoneRef = useRef(false);
  // Track if initial sync has been done
  const initialSyncDoneRef = useRef(false);
  
  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<{ type: "weekly" | "next"; index: number } | null>(null);
  const dragOverItem = useRef<{ type: "weekly" | "next"; index: number } | null>(null);
  // Visual drop-line indicator (index the dragged row will land at)
  const [dropTarget, setDropTarget] = useState<{ type: "weekly" | "next"; index: number } | null>(null);

  // Track the id of the row most recently added via "Add Row", for auto-scroll
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  // State for popup dialog
  const [showAddRowsDialog, setShowAddRowsDialog] = useState(false);
  const [rowsToAdd, setRowsToAdd] = useState(1);
  // Callback ref: fires once when the new row mounts and scrolls it into view
  const scrollToNewRow = useCallback((el: HTMLTableRowElement | null) => {
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setLastAddedId(null);
    }
  }, []);
  
  // Sync with parent state (only on initial load, not after merge)
  useEffect(() => {
    if (!initialSyncDoneRef.current && props.weeklyActivities && props.weeklyActivities.length > 0) {
      setWeeklyRows(props.weeklyActivities);
      initialSyncDoneRef.current = true;
    }
  }, [props.weeklyActivities]);

  useEffect(() => {
    if (!initialSyncDoneRef.current && props.nextWeekPlan && props.nextWeekPlan.length > 0) {
      setNextRows(props.nextWeekPlan);
      initialSyncDoneRef.current = true;
    }
  }, [props.nextWeekPlan]);
  
  // Merge construction progress data when available
  useEffect(() => {
    if (props.constructionProgressItems && props.constructionProgressItems.length > 0) {
      // Merge for weekly activities (work done) - using % up to this week
      const mergedWeekly = mergeConstructionIntoActivityRows(
        props.constructionProgressItems,
        weeklyRows,
        'weekly',
        deletedRowIds
      );

      if (mergedWeekly.length !== weeklyRows.length ||
          JSON.stringify(mergedWeekly) !== JSON.stringify(weeklyRows)) {
        setWeeklyRows(mergedWeekly);
        props.setWeeklyActivities?.(mergedWeekly);
      }

      // Merge for next week plan - using % next week plan
      const mergedNext = mergeConstructionIntoActivityRows(
        props.constructionProgressItems,
        nextRows,
        'next',
        deletedRowIds
      );

      if (mergedNext.length !== nextRows.length ||
          JSON.stringify(mergedNext) !== JSON.stringify(nextRows)) {
        setNextRows(mergedNext);
        props.setNextWeekPlan?.(mergedNext);
      }
    }
  }, [props.constructionProgressItems, deletedRowIds]);
  
  // Helper function to get indentation style based on level
  const getIndentStyle = (level: number = 0) => {
    const indentPixels = level * 24; // 24px per level
    return { paddingLeft: `${indentPixels}px` };
  };
  
  // Use local or props
  const weeklyActivities = weeklyRows;
  const nextWeekPlan = nextRows;

  // Helper functions using props
  // Show dialog to ask how many rows to add
  const addRow = useCallback(() => {
    setShowAddRowsDialog(true);
    setRowsToAdd(1); // Reset to default
  }, []);

  // Actually add the specified number of rows
  const addMultipleRows = useCallback(() => {
    const newWeeklyActivities = [...weeklyActivities];
    const newNextWeekPlan = [...nextWeekPlan];
    let lastAddedIdValue: string | null = null;

    for (let i = 0; i < rowsToAdd; i++) {
      const sharedId = crypto.randomUUID();
      const newRow: ActivityRow = {
        id: sharedId,
        description: "",
        displayId: "",
        percent: 0,
        percentage: "0",
        source: "manual",
        bulkImportId: undefined,
        addedAt: new Date(),
        indentLevel: 0,
      };
      newWeeklyActivities.push({ ...newRow });
      newNextWeekPlan.push({ ...newRow });
      lastAddedIdValue = sharedId; // Keep track of the last added row
    }

    setWeeklyRows(newWeeklyActivities);
    props.setWeeklyActivities?.(newWeeklyActivities);
    setNextRows(newNextWeekPlan);
    props.setNextWeekPlan?.(newNextWeekPlan);
    
    // Set the last added ID for auto-scroll to the newest row
    if (lastAddedIdValue) {
      setLastAddedId(lastAddedIdValue);
    }
    
    // Close dialog
    setShowAddRowsDialog(false);
  }, [weeklyActivities, nextWeekPlan, rowsToAdd, props.setWeeklyActivities, props.setNextWeekPlan]);

  // Delete removes the paired row from both sections
  const deleteRow = useCallback((type: "weekly" | "next", index: number) => {
    const sourceRows = type === "weekly" ? weeklyActivities : nextWeekPlan;
    const deletedRow = sourceRows[index];
    const deletedId = deletedRow?.id;

    if (deletedId) {
      setDeletedRowIds(prev => new Set([...prev, deletedId]));
      const newActivities = weeklyActivities.filter(r => r.id !== deletedId);
      const newPlan = nextWeekPlan.filter(r => r.id !== deletedId);
      setWeeklyRows(newActivities);
      props.setWeeklyActivities?.(newActivities);
      setNextRows(newPlan);
      props.setNextWeekPlan?.(newPlan);
    } else {
      // Fallback for rows without id
      if (type === "weekly") {
        const newActivities = weeklyActivities.filter((_, idx) => idx !== index);
        setWeeklyRows(newActivities);
        props.setWeeklyActivities?.(newActivities);
      } else {
        const newPlan = nextWeekPlan.filter((_, idx) => idx !== index);
        setNextRows(newPlan);
        props.setNextWeekPlan?.(newPlan);
      }
    }
  }, [weeklyActivities, nextWeekPlan, props.setWeeklyActivities, props.setNextWeekPlan]);

  const updateRow = useCallback((
    type: "weekly" | "next",
    index: number,
    field: "description" | "percent" | "displayId",
    value: string | number
  ) => {
    if (field === "percent") {
      // Percent is section-specific — never synced
      const numValue = typeof value === 'string' ? Number(value) : value;
      const safeValue = isNaN(numValue) ? 0 : numValue;
      if (type === "weekly") {
        const newActivities = [...weeklyActivities];
        newActivities[index].percent = safeValue;
        newActivities[index].percentage = safeValue.toString();
        setWeeklyRows(newActivities);
        props.setWeeklyActivities?.(newActivities);
      } else {
        const newPlan = [...nextWeekPlan];
        newPlan[index].percent = safeValue;
        newPlan[index].percentage = safeValue.toString();
        setNextRows(newPlan);
        props.setNextWeekPlan?.(newPlan);
      }
    } else {
      // description and displayId sync to the paired row in the other section
      const stringValue = value as string;
      if (type === "weekly") {
        const newActivities = [...weeklyActivities];
        newActivities[index][field] = stringValue;
        setWeeklyRows(newActivities);
        props.setWeeklyActivities?.(newActivities);
        const pairedId = newActivities[index].id;
        if (pairedId) {
          const newPlan = [...nextRows];
          const pairedIdx = newPlan.findIndex(r => r.id === pairedId);
          if (pairedIdx !== -1) {
            newPlan[pairedIdx][field] = stringValue;
            setNextRows(newPlan);
            props.setNextWeekPlan?.(newPlan);
          }
        }
      } else {
        const newPlan = [...nextWeekPlan];
        newPlan[index][field] = stringValue;
        setNextRows(newPlan);
        props.setNextWeekPlan?.(newPlan);
        const pairedId = newPlan[index].id;
        if (pairedId) {
          const newActivities = [...weeklyRows];
          const pairedIdx = newActivities.findIndex(r => r.id === pairedId);
          if (pairedIdx !== -1) {
            newActivities[pairedIdx][field] = stringValue;
            setWeeklyRows(newActivities);
            props.setWeeklyActivities?.(newActivities);
          }
        }
      }
    }
  }, [weeklyActivities, nextWeekPlan, weeklyRows, nextRows, props.setWeeklyActivities, props.setNextWeekPlan]);

  // Auto-resize textarea in table
  const adjustHeightWrapper = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    adjustHeight(e);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, type: "weekly" | "next", index: number) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `${type}-${index}`);
    setDraggedItem({ type, index });
  };

  const resetDrag = () => {
    setDraggedItem(null);
    setDropTarget(null);
    dragOverItem.current = null;
  };

  const handleDragOver = (e: React.DragEvent, type: "weekly" | "next", index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    dragOverItem.current = { type, index };
    setDropTarget(prev =>
      prev?.type === type && prev?.index === index ? prev : { type, index }
    );
  };

  const handleDrop = (e: React.DragEvent, type: "weekly" | "next", dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem || draggedItem.type !== type) { resetDrag(); return; }

    const dragIndex = draggedItem.index;
    if (dragIndex === dropIndex || dragIndex < 0 || dropIndex < 0) { resetDrag(); return; }

    // Reorder the source table
    const reorder = (rows: ActivityRow[]) => {
      if (dragIndex >= rows.length || dropIndex > rows.length) return null;
      const next = [...rows];
      const [removed] = next.splice(dragIndex, 1);
      next.splice(dropIndex, 0, removed);
      return next;
    };

    // Sync the other table to match the new id-order
    const syncByIds = (newOrder: ActivityRow[], otherRows: ActivityRow[]) => {
      const otherById = new Map(otherRows.map(r => [r.id, r]));
      const synced = newOrder.map(r => otherById.get(r.id)).filter(Boolean) as ActivityRow[];
      const orphans = otherRows.filter(r => !newOrder.some(nr => nr.id === r.id));
      return [...synced, ...orphans];
    };

    if (type === "weekly") {
      const newWeekly = reorder(weeklyRows);
      if (!newWeekly) { resetDrag(); return; }
      const newNext = syncByIds(newWeekly, nextRows);
      setWeeklyRows(newWeekly);
      props.setWeeklyActivities?.(newWeekly);
      setNextRows(newNext);
      props.setNextWeekPlan?.(newNext);
    } else {
      const newNext = reorder(nextRows);
      if (!newNext) { resetDrag(); return; }
      const newWeekly = syncByIds(newNext, weeklyRows);
      setNextRows(newNext);
      props.setNextWeekPlan?.(newNext);
      setWeeklyRows(newWeekly);
      props.setWeeklyActivities?.(newWeekly);
    }
    resetDrag();
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.preventDefault();
    resetDrag();
  };

  // Check if row is from construction progress (read-only)
  const isConstructionRow = (row: ActivityRow) => {
    return row.sourceId && row.sourceId.length > 0;
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 animate-fade-in">
      
      {/* Weekly Activities */}
      <div className="section-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ClipboardList className="w-4 sm:w-5 h-4 sm:h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-foreground">Activities Of Work Done</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Describe this week&apos;s completed work (% up to this week)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => addRow()}
              className="flex items-center gap-1 text-xs sm:text-sm text-primary hover:underline"
            >
              <Plus className="w-3 sm:w-4 h-3 sm:h-4" /> <span className="hidden sm:inline">Add Row</span><span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="text-center py-2 px-1 w-8"></th>
              <th className="text-left py-2 px-2 w-16">ID</th>
              <th className="text-left py-2 px-2">Scope of Works</th>
              <th className="text-center py-2 px-2 w-20">%</th>
              <th className="text-center py-2 px-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {(weeklyActivities || []).map((row, idx) => {
              const construction = isConstructionRow(row);
              const readOnly = construction;
              return (
                <tr
                  key={`weekly-${row.id}-${idx}`}
                  ref={row.id === lastAddedId ? scrollToNewRow : null}
                  className={`border-b hover:bg-muted/30 transition-colors
                    ${draggedItem?.type === "weekly" && draggedItem?.index === idx ? "opacity-40" : ""}
                    ${dropTarget?.type === "weekly" && dropTarget?.index === idx && draggedItem?.index !== idx ? "border-t-2 border-t-blue-500" : ""}
                  `}
                  draggable={!readOnly}
                  onDragStart={(e) => !readOnly && handleDragStart(e, "weekly", idx)}
                  onDragOver={(e) => handleDragOver(e, "weekly", idx)}
                  onDrop={(e) => handleDrop(e, "weekly", idx)}
                  onDragEnd={handleDragEnd}
                >
                  <td className="py-2 px-1 align-top">
                    {!readOnly && (
                      <div className="cursor-move text-muted-foreground hover:text-foreground">
                        <GripVertical className="w-4 h-4" />
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-2 text-muted-foreground font-medium">
                    {readOnly ? (
                      row.displayId ?? row.sourceId ?? ""
                    ) : (
                      <input
                        type="text"
                        value={row.displayId ?? ""}
                        onChange={(e) => updateRow("weekly", idx, "displayId", e.target.value)}
                        className="w-full bg-transparent text-xs sm:text-sm text-muted-foreground"
                        style={{ border: 'none', outline: 'none', minWidth: '40px' }}
                        placeholder="ID"
                      />
                    )}
                  </td>
                  <td className="py-2 px-1 sm:px-2 align-top">
                    <div className="relative">
                      {readOnly ? (
                        <div className={`w-full text-xs sm:text-sm ${
                          row.sourceId && /^[IVX]|^(I{1,3}|IV|V|VI|VII|VIII|IX|X)$/i.test(row.sourceId.trim())
                            ? 'font-bold'
                            : 'font-normal'
                        }`} style={getIndentStyle(row.indentLevel)}>
                          {row.description}
                        </div>
                      ) : (
                        <textarea
                          value={row.description}
                          onChange={(e) => {
                            updateRow("weekly", idx, "description", e.target.value);
                            adjustHeightWrapper(e);
                          }}
                          className={`w-full resize-none overflow-hidden dark:bg-transparent dark:text-foreground text-xs sm:text-sm ${
                            row.sourceId && /^[IVX]|^(I{1,3}|IV|V|VI|VII|VIII|IX|X)$/i.test(row.sourceId.trim())
                              ? 'font-bold'
                              : 'font-normal'
                          }`}
                          placeholder="Enter description"
                          rows={1}
                          style={{
                            border: 'none',
                            outline: 'none',
                            padding: '1px sm:2px',
                            ...getIndentStyle(row.indentLevel)
                          }}
                        />
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-1 sm:px-2 align-top">
                    <div className="relative w-full">
                      <div
                        className={`absolute inset-0 rounded transition-all duration-300 ${
                          row.percent === 100
                            ? 'bg-green-200 dark:bg-green-300'
                            : 'bg-yellow-200 dark:bg-yellow-300'
                        }`}
                        style={{ width: `${Math.min(row.percent, 100)}%` }}
                      />
                      {readOnly ? (
                        <div className={`relative bg-transparent z-10 dark:text-foreground text-center w-16 sm:w-20 px-1 sm:px-2 py-1 text-xs sm:text-sm ${
                          row.percent === 100
                            ? 'text-green-800 dark:text-green-300 font-semibold'
                            : 'text-yellow-800 dark:text-yellow-300'
                        }`}>
                          {row.percent !== undefined && row.percent !== null ? `${row.percent === 100 ? '100' : Number(row.percent).toFixed(2)}%` : ""}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={row.percent !== undefined && row.percent !== null ? `${row.percent === 100 ? '100' : Number(row.percent).toFixed(2)}%` : ""}
                          onChange={(e) => {
                            const value = e.target.value.replace('%', '');
                            const numValue = parseFloat(value);
                            updateRow("weekly", idx, "percent", isNaN(numValue) ? 0 : numValue);
                          }}
                          className={`relative bg-transparent z-10 dark:text-foreground text-center w-16 sm:w-20 px-1 sm:px-2 py-1 text-xs sm:text-sm ${
                            row.percent === 100
                              ? 'text-green-800 dark:text-green-300 font-semibold'
                              : 'text-yellow-800 dark:text-yellow-300'
                          }`}
                          placeholder="0.00%"
                          min={0}
                          max={100}
                        />
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-1 sm:px-2 align-top">
                    <button
                      onClick={() => deleteRow("weekly", idx)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 dark:text-red-400 dark:hover:text-red-300 rounded transition-colors"
                      title="Delete row"
                    >
                      <Trash2 className="w-3 sm:w-4 h-3 sm:h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Next Week Plan */}
      <div className="section-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-accent/10 rounded-lg">
              <CalendarCheck className="w-4 sm:w-5 h-4 sm:h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-foreground">Next Week Plan</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Plan next week&apos;s activities (% next week plan)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => addRow()}
              className="flex items-center gap-1 text-xs sm:text-sm text-accent hover:underline"
            >
              <Plus className="w-3 sm:w-4 h-3 sm:h-4" /> <span className="hidden sm:inline">Add Row</span><span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="text-center py-2 px-1 w-8"></th>
              <th className="text-left py-2 px-2 w-16">ID</th>
              <th className="text-left py-2 px-2">Scope of Works</th>
              <th className="text-center py-2 px-2 w-20">%</th>
              <th className="text-center py-2 px-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {(nextWeekPlan || []).map((row, idx) => {
              const construction = isConstructionRow(row);
              const readOnly = construction;
              return (
                <tr
                  key={`next-${row.id}-${idx}`}
                  ref={row.id === lastAddedId ? scrollToNewRow : null}
                  className={`border-b hover:bg-muted/30 transition-colors
                    ${draggedItem?.type === "next" && draggedItem?.index === idx ? "opacity-40" : ""}
                    ${dropTarget?.type === "next" && dropTarget?.index === idx && draggedItem?.index !== idx ? "border-t-2 border-t-blue-500" : ""}
                  `}
                  draggable={!readOnly}
                  onDragStart={(e) => !readOnly && handleDragStart(e, "next", idx)}
                  onDragOver={(e) => handleDragOver(e, "next", idx)}
                  onDrop={(e) => handleDrop(e, "next", idx)}
                  onDragEnd={handleDragEnd}
                >
                  <td className="py-2 px-1 align-top">
                    {!readOnly && (
                      <div className="cursor-move text-muted-foreground hover:text-foreground">
                        <GripVertical className="w-4 h-4" />
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-2 text-muted-foreground font-medium">
                    {readOnly ? (
                      row.displayId ?? row.sourceId ?? ""
                    ) : (
                      <input
                        type="text"
                        value={row.displayId ?? ""}
                        onChange={(e) => updateRow("next", idx, "displayId", e.target.value)}
                        className="w-full bg-transparent text-xs sm:text-sm text-muted-foreground"
                        style={{ border: 'none', outline: 'none', minWidth: '40px' }}
                        placeholder="ID"
                      />
                    )}
                  </td>
                  <td className="py-2 px-1 sm:px-2 align-top">
                    {readOnly ? (
                      <div className={`w-full text-xs sm:text-sm ${
                        row.sourceId && /^[IVX]|^(I{1,3}|IV|V|VI|VII|VIII|IX|X)$/i.test(row.sourceId.trim())
                          ? 'font-bold'
                          : 'font-normal'
                      }`} style={getIndentStyle(row.indentLevel)}>
                        {row.description}
                      </div>
                    ) : (
                      <textarea
                        value={row.description}
                        onChange={(e) => {
                          updateRow("next", idx, "description", e.target.value);
                          adjustHeightWrapper(e);
                        }}
                        className={`w-full resize-none overflow-hidden dark:bg-transparent dark:text-foreground text-xs sm:text-sm ${
                          row.sourceId && /^[IVX]|^(I{1,3}|IV|V|VI|VII|VIII|IX|X)$/i.test(row.sourceId.trim())
                            ? 'font-bold'
                            : 'font-normal'
                        }`}
                        placeholder="Enter description"
                        rows={1}
                        style={{
                          border: 'none',
                          outline: 'none',
                          padding: '1px sm:2px',
                          ...getIndentStyle(row.indentLevel)
                        }}
                      />
                    )}
                  </td>
                  <td className="py-2 px-1 sm:px-2 align-top">
                    <div className="relative w-full">
                      <div
                        className={`absolute inset-0 rounded transition-all duration-300 ${
                          row.percent === 100
                            ? 'bg-green-200 dark:bg-green-400/70'
                            : 'bg-yellow-200 dark:bg-yellow-400/70'
                        }`}
                        style={{ width: `${Math.min(row.percent, 100)}%` }}
                      />
                      {readOnly ? (
                        <div className={`relative bg-transparent z-10 dark:text-foreground text-center w-16 sm:w-20 px-1 sm:px-2 py-1 text-xs sm:text-sm ${
                          row.percent === 100
                            ? 'text-green-800 dark:text-green-300 font-semibold'
                            : 'text-yellow-800 dark:text-yellow-300'
                        }`}>
                          {row.percent !== undefined && row.percent !== null ? `${row.percent === 100 ? '100' : Number(row.percent).toFixed(2)}%` : ""}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={row.percent !== undefined && row.percent !== null ? `${row.percent === 100 ? '100' : Number(row.percent).toFixed(2)}%` : ""}
                          onChange={(e) => {
                            const value = e.target.value.replace('%', '');
                            const numValue = parseFloat(value);
                            updateRow("next", idx, "percent", isNaN(numValue) ? 0 : numValue);
                          }}
                          className={`relative bg-transparent z-10 dark:text-foreground text-center w-16 sm:w-20 px-1 sm:px-2 py-1 text-xs sm:text-sm ${
                            row.percent === 100
                              ? 'text-green-800 dark:text-green-300 font-semibold'
                              : 'text-yellow-800 dark:text-yellow-300'
                          }`}
                          placeholder="0.00%"
                          style={{ border: 'none', outline: 'none' }}
                        />
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-1 sm:px-2 align-top">
                    {!readOnly && (
                      <button
                        onClick={() => deleteRow("next", idx)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 dark:text-red-400 dark:hover:text-red-300 rounded transition-colors"
                        title="Delete row"
                      >
                        <Trash2 className="w-3 sm:w-4 h-3 sm:h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>

      {/* Add Rows Dialog */}
      {showAddRowsDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              How many rows would you like to add?
            </h3>
            <div className="mb-6">
              <label htmlFor="rowsCount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Number of rows:
              </label>
              <input
                id="rowsCount"
                type="number"
                min="1"
                max="50"
                value={rowsToAdd}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1;
                  setRowsToAdd(Math.min(Math.max(value, 1), 50)); // Clamp between 1 and 50
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                autoFocus
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Enter a number between 1 and 50
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAddRowsDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={addMultipleRows}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add Rows
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Activities;
