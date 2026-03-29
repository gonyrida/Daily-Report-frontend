import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

// interface MaterialActualCost {

// }

const MaterialActualCost = ({
	request
}) => {
	console.log("This is the MA requet got ", request)
	return (
		<>
			<div className="bg-muted/30 p-4 rounded-lg">
				<h3 className="text-lg font-semibold mb-4">Material - Actual Cost</h3>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-center p-2 text-md font-medium">MR #</th>
                <th className="text-center p-2 text-md font-medium">Category</th>
                <th className="text-center p-2 text-md font-medium">Description</th>
                <th className="text-center p-2 text-md font-medium">Total</th>
                <th className="text-center p-2 text-md font-medium">Remark</th>
              </tr>
            </thead>
            <tbody>
            	<tr>
	            	<td className="text-center p-2 text-sm font-medium">{request.label}</td>
	            	<td className="text-center p-2 text-sm font-medium">{request.purpose}</td>
	            	{/*<td className="text-center p-2 text-sm font-medium">Electrical Conduit, Electrical cable, and ligting Equipment for (PIKSP)</td>*/}
	            	<td className="text-center p-2 text-sm font-medium">
									<Input
										value={request.deliveryPlace}
										// onChange={(e) => setFormData({...formData, deliveryPlace: e.target.value})}
										placeholder="Enter delivery location"
									/>
	            	</td>
	            	{/*<td className="text-center p-2 text-sm font-medium">{request.formattedGrandTotal}</td>*/}
	            	{/*<td className="text-center p-2 text-sm font-medium">$600000000</td>*/}
	            	<td className="text-center p-2 text-sm font-medium">
									<Input
										value={request.deliveryPlace}
										// onChange={(e) => setFormData({...formData, deliveryPlace: e.target.value})}
										placeholder="Enter delivery location"
									/>
	            	</td>
	            </tr>
              {/*{formData.members.length > 0 ? (
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
              )}*/}
            </tbody>
          </table>
        </div>
			</div>
		</>
	)
}

export default MaterialActualCost;