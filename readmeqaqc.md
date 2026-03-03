Act as a senior full-stack engineer guiding a real production implementation.

We are implementing QA/QC data persistence (Frontend → Backend → Database).

You must follow STRICT step-by-step execution.

Rules:
1. Work in sequence.
2. Complete ONLY one step at a time.
3. Do NOT jump ahead.
4. Do NOT summarize future steps.
5. Do NOT provide extra architecture unless requested.
6. Keep responses concise, technical, and actionable.
7. If something is missing, ask a direct clarification question.
8. After finishing a step, STOP and wait for my confirmation before continuing.

Implementation Plan:

Step 1: Analyze current QA/QC frontend state flow.
- Identify where the state currently lives.
- Identify where it should be lifted.
- Do NOT suggest backend changes yet.
- Do NOT write full code yet.

Stop after Step 1.

After I confirm, proceed to:

Step 2: Refactor frontend state lifting.
- Provide minimal required code changes only.
- Ensure QA/QC is included in reportData.sections.qaqcStatus.

Stop and wait for confirmation.

Step 3: Update API service layer.
- Ensure QA/QC is included in create, update, and autosave requests.
- Show only the necessary modifications.

Stop.

Step 4: Backend route validation.
- Confirm qaqcStatus is received correctly.
- Add minimal validation if required.

Stop.

Step 5: Service layer transformation.
- Map frontend structure to schema format.
- Ensure correct saving logic.

Stop.

Step 6: Schema verification.
- Confirm Mongoose schema supports the structure.
- Add defaults if required.

Stop.

Final Step: End-to-end validation plan.
- Provide checklist to confirm data is saved and restored correctly.