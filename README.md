# Student Edit Capability

This update adds the ability to edit student fields (name, grad_year, class_codes) directly from the admin dashboard.

## Files to update

1. **`lib/mutations.js`** — adds `updateStudent()` function
2. **`components/students/EditStudentModal.js`** — new modal component
3. **`app/students/page.js`** — updated with edit button and filters

## Setup

### 1. Run the SQL migration

Open Supabase SQL Editor for the **Tracker project** (ipjolefhnzwthmalripz) and run:

```sql
DROP POLICY IF EXISTS "Allow anon update students" ON students;

CREATE POLICY "Allow anon update students" 
ON students 
FOR UPDATE 
USING (true) 
WITH CHECK (true);
```

### 2. Copy the files

Replace/add these files in your `ib-tracker/` folder:
- `lib/mutations.js` (replace)
- `components/students/EditStudentModal.js` (new file)
- `app/students/page.js` (replace)

### 3. Test

1. Go to the Students tab
2. You should see a new "⚠️ No class codes" filter option
3. Students without class codes show a red dot indicator
4. Click "✏️ Edit" to open the edit modal
5. Edit name, grad year, or class codes
6. Click "Save Changes"

## Features

- **Edit modal**: Name, grad year (dropdown), class codes (chips with quick-add)
- **"No class codes" filter**: Quickly find students needing assignment
- **Visual indicator**: Red dot on students without class codes
- **Alert banner**: Shows when there are students missing class codes
- **Quick-add chips**: Existing class codes shown as quick-add buttons
- **Auto-refresh**: Data refreshes after saving
