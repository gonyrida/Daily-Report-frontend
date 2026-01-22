import { Wrench } from "lucide-react";
import ResourceTable, { ResourceRow } from "./ResourceTable";

interface SiteWorkingTeamGroupProps {
  interiorTeam: ResourceRow[];
  setInteriorTeam: (rows: ResourceRow[]) => void;
  mepTeam: ResourceRow[];
  setMepTeam: (rows: ResourceRow[]) => void;
}

const INTERIOR_TEAM_OPTIONS = ["Site Manager", "Site Engineer", "Foreman", "Skill Workers", "General Workers"];
const MEP_TEAM_OPTIONS = ["MEP Engineer", "MEP Workers"];

const SiteWorkingTeamGroup = ({
  interiorTeam,
  setInteriorTeam,
  mepTeam,
  setMepTeam,
}: SiteWorkingTeamGroupProps) => {
  return (
    <div className="section-card overflow-hidden animate-fade-in">
      {/* Parent Header */}
      <div className="bg-table-header px-4 py-3 border-b border-table-border">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-foreground">Site Working Team</h3>
        </div>
      </div>

      {/* Sub-sections Container */}
      <div className="divide-y divide-table-border">
        {/* Interior Team Sub-section */}
        <div className="p-4">
          <div className="mb-3">
            <h2 className="font-bold text-foreground text-sm">Site Working Team (Interior)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-2.5 text-sm font-medium text-muted-foreground w-[40%]">
                    Description
                  </th>
                  <th className="text-center px-4 py-2.5 text-sm font-medium text-muted-foreground w-[12%]">
                    Prev
                  </th>
                  <th className="text-center px-4 py-2.5 text-sm font-medium text-muted-foreground w-[12%]">
                    Today
                  </th>
                  <th className="text-center px-4 py-2.5 text-sm font-medium text-muted-foreground w-[12%]">
                    Accum
                  </th>
                  <th className="w-[8%]"></th>
                </tr>
              </thead>
              <tbody>
                {interiorTeam.length === 0 ? (
                  <tr key="empty-interior">
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      No entries yet. Click "Add Row" to begin.
                    </td>
                  </tr>
                ) : (
                  <>
                    {interiorTeam.map((row) => (
                      <tr
                        key={`interior-${row.id}`}
                        className="border-t border-table-border hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-3 py-2">
                          {INTERIOR_TEAM_OPTIONS.length > 0 ? (
                            (row.description === "" || INTERIOR_TEAM_OPTIONS.includes(row.description)) && row.description !== "__custom_input__" ? (
                              <select
                                value={row.description}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "__custom__") {
                                    setInteriorTeam(
                                      interiorTeam.map((r) =>
                                        r.id === row.id
                                          ? { ...r, description: "__custom_input__" }
                                          : r
                                      )
                                    );
                                  } else {
                                    setInteriorTeam(
                                      interiorTeam.map((r) =>
                                        r.id === row.id ? { ...r, description: value } : r
                                      )
                                    );
                                  }
                                }}
                                className="w-full border-0 bg-transparent focus:ring-1 focus:ring-primary rounded px-2 py-1"
                              >
                                <option value="">Select position...</option>
                                {INTERIOR_TEAM_OPTIONS.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                                <option value="__custom__">+ Custom Entry</option>
                              </select>
                            ) : (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={row.description === "__custom_input__" ? "" : row.description}
                                  onChange={(e) =>
                                    setInteriorTeam(
                                      interiorTeam.map((r) =>
                                        r.id === row.id ? { ...r, description: e.target.value } : r
                                      )
                                    )
                                  }
                                  placeholder="Enter custom position..."
                                  className="flex-1 border-0 bg-transparent focus-visible:ring-1 rounded px-2 py-1"
                                  autoFocus
                                />
                                <button
                                  onClick={() =>
                                    setInteriorTeam(
                                      interiorTeam.map((r) =>
                                        r.id === row.id
                                          ? { ...r, description: INTERIOR_TEAM_OPTIONS[0] || "" }
                                          : r
                                      )
                                    )
                                  }
                                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0 rounded"
                                >
                                  ×
                                </button>
                              </div>
                            )
                          ) : (
                            <input
                              type="text"
                              value={row.description}
                              onChange={(e) =>
                                setInteriorTeam(
                                  interiorTeam.map((r) =>
                                    r.id === row.id ? { ...r, description: e.target.value } : r
                                  )
                                )
                              }
                              placeholder="Enter description..."
                              className="w-full border-0 bg-transparent focus-visible:ring-1 rounded px-2 py-1"
                            />
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.prev || ""}
                            onChange={(e) => {
                              const value = Number(e.target.value) || 0;
                              setInteriorTeam(
                                interiorTeam.map((r) =>
                                  r.id === row.id
                                    ? { ...r, prev: value, accumulated: value + r.today }
                                    : r
                                )
                              );
                            }}
                            placeholder="0"
                            className="w-full border-0 bg-transparent text-center focus-visible:ring-1 rounded px-2 py-1"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.today || ""}
                            onChange={(e) => {
                              const value = Number(e.target.value) || 0;
                              setInteriorTeam(
                                interiorTeam.map((r) =>
                                  r.id === row.id
                                    ? { ...r, today: value, accumulated: r.prev + value }
                                    : r
                                )
                              );
                            }}
                            placeholder="0"
                            className="w-full border-0 bg-transparent text-center focus-visible:ring-1 rounded px-2 py-1"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-center font-semibold text-primary">
                            {row.accumulated}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <button
                            onClick={() =>
                              setInteriorTeam(interiorTeam.filter((r) => r.id !== row.id))
                            }
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-primary/30 bg-primary/5">
                      <td className="px-4 py-3 font-semibold text-foreground">
                        Total
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-foreground">
                        {interiorTeam.reduce((sum, row) => sum + row.prev, 0)}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-foreground">
                        {interiorTeam.reduce((sum, row) => sum + row.today, 0)}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-primary">
                        {interiorTeam.reduce((sum, row) => sum + row.accumulated, 0)}
                      </td>
                      <td></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => {
              const newRow: ResourceRow = {
                id: crypto.randomUUID(),
                description: "",
                prev: 0,
                today: 0,
                accumulated: 0,
              };
              setInteriorTeam([...interiorTeam, newRow]);
            }}
            className="mt-3 text-primary hover:text-primary hover:bg-primary/10 px-3 py-1 rounded text-sm"
          >
            + Add Row
          </button>
        </div>

        {/* MEP Team Sub-section */}
        <div className="p-4">
          <div className="mb-3">
            <h2 className="font-bold text-foreground text-sm">Site Working Team (MEP)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-2.5 text-sm font-medium text-muted-foreground w-[40%]">
                    Description
                  </th>
                  <th className="text-center px-4 py-2.5 text-sm font-medium text-muted-foreground w-[12%]">
                    Prev
                  </th>
                  <th className="text-center px-4 py-2.5 text-sm font-medium text-muted-foreground w-[12%]">
                    Today
                  </th>
                  <th className="text-center px-4 py-2.5 text-sm font-medium text-muted-foreground w-[12%]">
                    Accum
                  </th>
                  <th className="w-[8%]"></th>
                </tr>
              </thead>
              <tbody>
                {mepTeam.length === 0 ? (
                  <tr key="empty-mep">
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      No entries yet. Click "Add Row" to begin.
                    </td>
                  </tr>
                ) : (
                  <>
                    {mepTeam.map((row) => (
                      <tr
                        key={`mep-${row.id}`}
                        className="border-t border-table-border hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-3 py-2">
                          {MEP_TEAM_OPTIONS.length > 0 ? (
                            (row.description === "" || MEP_TEAM_OPTIONS.includes(row.description)) && row.description !== "__custom_input__" ? (
                              <select
                                value={row.description}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "__custom__") {
                                    setMepTeam(
                                      mepTeam.map((r) =>
                                        r.id === row.id
                                          ? { ...r, description: "__custom_input__" }
                                          : r
                                      )
                                    );
                                  } else {
                                    setMepTeam(
                                      mepTeam.map((r) =>
                                        r.id === row.id ? { ...r, description: value } : r
                                      )
                                    );
                                  }
                                }}
                                className="w-full border-0 bg-transparent focus:ring-1 focus:ring-primary rounded px-2 py-1"
                              >
                                <option value="">Select position...</option>
                                {MEP_TEAM_OPTIONS.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                                <option value="__custom__">+ Custom Entry</option>
                              </select>
                            ) : (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={row.description === "__custom_input__" ? "" : row.description}
                                  onChange={(e) =>
                                    setMepTeam(
                                      mepTeam.map((r) =>
                                        r.id === row.id ? { ...r, description: e.target.value } : r
                                      )
                                    )
                                  }
                                  placeholder="Enter custom position..."
                                  className="flex-1 border-0 bg-transparent focus-visible:ring-1 rounded px-2 py-1"
                                  autoFocus
                                />
                                <button
                                  onClick={() =>
                                    setMepTeam(
                                      mepTeam.map((r) =>
                                        r.id === row.id
                                          ? { ...r, description: MEP_TEAM_OPTIONS[0] || "" }
                                          : r
                                      )
                                    )
                                  }
                                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0 rounded"
                                >
                                  ×
                                </button>
                              </div>
                            )
                          ) : (
                            <input
                              type="text"
                              value={row.description}
                              onChange={(e) =>
                                setMepTeam(
                                  mepTeam.map((r) =>
                                    r.id === row.id ? { ...r, description: e.target.value } : r
                                  )
                                )
                              }
                              placeholder="Enter description..."
                              className="w-full border-0 bg-transparent focus-visible:ring-1 rounded px-2 py-1"
                            />
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.prev || ""}
                            onChange={(e) => {
                              const value = Number(e.target.value) || 0;
                              setMepTeam(
                                mepTeam.map((r) =>
                                  r.id === row.id
                                    ? { ...r, prev: value, accumulated: value + r.today }
                                    : r
                                )
                              );
                            }}
                            placeholder="0"
                            className="w-full border-0 bg-transparent text-center focus-visible:ring-1 rounded px-2 py-1"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.today || ""}
                            onChange={(e) => {
                              const value = Number(e.target.value) || 0;
                              setMepTeam(
                                mepTeam.map((r) =>
                                  r.id === row.id
                                    ? { ...r, today: value, accumulated: r.prev + value }
                                    : r
                                )
                              );
                            }}
                            placeholder="0"
                            className="w-full border-0 bg-transparent text-center focus-visible:ring-1 rounded px-2 py-1"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-center font-semibold text-primary">
                            {row.accumulated}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <button
                            onClick={() =>
                              setMepTeam(mepTeam.filter((r) => r.id !== row.id))
                            }
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-primary/30 bg-primary/5">
                      <td className="px-4 py-3 font-semibold text-foreground">
                        Total
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-foreground">
                        {mepTeam.reduce((sum, row) => sum + row.prev, 0)}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-foreground">
                        {mepTeam.reduce((sum, row) => sum + row.today, 0)}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-primary">
                        {mepTeam.reduce((sum, row) => sum + row.accumulated, 0)}
                      </td>
                      <td></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => {
              const newRow: ResourceRow = {
                id: crypto.randomUUID(),
                description: "",
                prev: 0,
                today: 0,
                accumulated: 0,
              };
              setMepTeam([...mepTeam, newRow]);
            }}
            className="mt-3 text-primary hover:text-primary hover:bg-primary/10 px-3 py-1 rounded text-sm"
          >
            + Add Row
          </button>
        </div>
      </div>
    </div>
  );
};

export default SiteWorkingTeamGroup;
