Fix the issue where the location entered by the user in the frontend is not being saved or reflected in Excel.

Important Notes:

❗ Do NOT modify anything inside the Python folder. The Python backend logic is already correct:

location = data.get('location', '')
if location:
    ws["B10"].value = f"Location : {location}"


Only update the frontend and API request handling if necessary.

Requirements:

The location field must capture user input correctly using React state.

When submitting the form, ensure the payload includes:

"location": "<user_input_value>"


Confirm the request is sent as JSON.

Ensure the frontend submission function includes location in the request body.

Do not change UI layout or input design.

Add console logging before submission to verify the payload contains location.

Ensure the backend receives the location field correctly (no changes to Python logic).

After submission, the Excel file must display:

Location : Phnom Penh


(or whatever value the user entered)

Expected Flow:
User types location → Click submit → Payload contains "location" → Backend receives it → Excel cell B10 updates correctly.

Do not modify Python logic. Fix only frontend data flow and API request configuration.