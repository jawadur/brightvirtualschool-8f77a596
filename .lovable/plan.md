## Goal
Reorganize Bright Virtual School into two clearly separated learning programs (KG2 Brush-Up and Telangana Class 1) without rebuilding existing modules. Add a program selector, daily two-tab learning hub, weekly planner, and split parent/student progress views.

## Scope (this turn)

### 1. Data model (single migration)
Add minimal program scaffolding that links to existing tables:

```text
programs            : code (kg2_brushup | class1), name, description
weekly_plans        : program_code, subject_id, week_number, lessons[], homework[], assignment_id?, test_id?, planner notes
student_program     : student_id, active_program_code, started_at
```

Add `program_code text` (nullable) to existing `lessons`, `homework`, `assignments`, `tests`, `subjects` so existing content keeps working and new content is tagged. No destructive changes; existing modules continue functioning.

### 2. Program selection
- New route `student.program-select.tsx`: two big cards (KG2 Brush-Up / Class 1) → writes `student_program.active_program_code`.
- Helper `useActiveProgram()` in `src/lib/program.tsx`.
- Show program switcher chip in student shell header.

### 3. Today's Learning hub
- New route `student.today.tsx` with two Tabs: "KG2 Brush-Up" and "Class 1".
- Each tab lists the day's subjects as cards. Each card shows three steps: Teacher Lesson → Practice → Homework with completion + lock state (practice locked until lesson done, homework locked until practice done).
- KG2 tab: English/Maths/Telugu/Hindi Revision. Class 1 tab: English/Maths/Telugu/Hindi/EVS.

### 4. Subject daily flow
- New route `student.daily.$program.$subjectId.tsx` rendering the 3-step locked flow, linking into existing TeacherClassroom, practice, and homework modules. No rebuild of those.

### 5. Weekly view
- New route `student.weekly.tsx`: per-program weekly assignment + (Class 1 only) weekly test, unlocked at week end based on `weekly_plans`.

### 6. Admin
- New route `admin.weekly-planner.tsx`: filters by Program / Class / Subject / Week. Form to set lessons, homework, weekly assignment & test refs. "Copy previous week" button.
- Update `admin.curriculum-progress.tsx` (existing) header to group by Program with Program / Subject / Week / Status filters. Light edit only — no rebuild.

### 7. Parent + Student dashboards
- `parent.child.$childId.tsx`: add two stacked cards — "KG2 Brush-Up Progress" and "Class 1 Progress" — each pulling per-subject % from existing progress tables filtered by `program_code`.
- `student.index.tsx`: add Current Program banner, Today's KG2 + Today's Class 1 summary tiles, pending homework / weekly assignment / weekly test / readiness tiles. Keep existing widgets.

### 8. UI polish
- Use shadcn `Tabs`, `Card`, `Accordion`, `Collapsible`. Cards `h-auto`, `min-w-0`, `truncate` only on single-line headings, multiline text wraps. Apply Noto Sans Telugu / Devanagari classes already in `styles.css` to revision cards.

## Out of scope (explicitly skipped)
- Rebuilding TeacherClassroom, lesson engine, question bank, voice reader, readiness, homework engine, writing/read-along — all reused.
- Backfilling `program_code` on historical rows (default behavior: untagged = Class 1).

## Technical notes
- `weekly_plans` keyed by `(program_code, subject_id, week_number)` UNIQUE.
- `student_program` keyed by `student_id` UNIQUE; updated on selector submit.
- Locking computed client-side from existing `progress` / `homework` rows; no new server fns required this turn.
- Migration follows GRANT → RLS → POLICY pattern; policies use `can_access_student` for student-scoped tables and `has_role('admin')` for planner tables.

## Deliverables
1 migration + ~7 new routes + light edits to `student.tsx` (nav), `student.index.tsx`, `parent.child.$childId.tsx`, `admin.tsx` (nav), `admin.curriculum-progress.tsx`.