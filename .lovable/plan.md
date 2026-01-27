
# Fix Plan: Access Code Validation & Empty Subjects in Print Request

## Issues Identified

### Issue 1: Access Code Says "Invalid" When It's Active

**Root Cause:**
The `validate_access_code` database function (line 8) checks for `status = 'unused'`:
```sql
WHERE code = UPPER(_code) AND status = 'unused'
```

However, the recent migration changed the default status for new access codes from `'unused'` to `'active'`. The newly created access code `SV-25GWGRZF` has `status: active`, which doesn't match the validation condition.

**Solution:**
Update the `validate_access_code` function to check for `status = 'active'` instead of `status = 'unused'`.

---

### Issue 2: Empty Subjects Dropdown in Print Request Dialog

**Root Cause:**
The `loadSubjects` function in `PrintRequestDialog.tsx` queries the `subjects` table with:
1. Grade filter: `.eq('grade', enrollment.grade)`
2. Medium filter: `.eq('medium', enrollment.medium)`
3. Stream filter: `.contains('streams', [enrollment.stream])` for A/L students
4. Subject names filter: `.in('name', subjectNames)` - **only if userSubjects exists**

The problem occurs when:
- User hasn't locked subjects yet (`userSubjects` is null)
- The `.contains('streams', [enrollment.stream])` filter for JSONB might not be working correctly, OR
- The combination of filters returns no results

Looking at the data, subjects exist for grade `al_grade13`, medium `english`, with stream `maths` in their streams array. The issue is likely the PostgREST `.contains()` method needs proper format for JSONB arrays.

**Solution:**
The `.contains()` filter syntax for JSONB arrays in Supabase should work, but we need to ensure proper handling. We should also make the query more robust and handle the case when no subjects are found.

---

### Issue 3: UI Layout Improvement - Minimize Vertical Scrolling

**Current Problem:**
The SubjectSelection page shows subjects in a vertical grid layout that requires excessive scrolling.

**Solution:**
1. **Desktop (laptops):** Use horizontal layout with multi-column grids and dropdowns where appropriate
2. **Mobile:** Keep vertical but more compact
3. Pack subjects more efficiently - consider using dropdown selects instead of checkbox grids for basket selections

---

## Implementation Plan

### Phase 1: Fix Access Code Validation (Database Migration)

Update the `validate_access_code` function to check for `status = 'active'`:

```sql
-- Drop and recreate the function with corrected status check
CREATE OR REPLACE FUNCTION validate_access_code(_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  access_code_record RECORD;
BEGIN
  -- Changed from 'unused' to 'active'
  SELECT * INTO access_code_record
  FROM public.access_codes
  WHERE code = UPPER(_code)
  AND status = 'active'
  AND (valid_until IS NULL OR valid_until > now());

  IF NOT FOUND THEN
    -- Check if code exists but has different status
    SELECT * INTO access_code_record
    FROM public.access_codes
    WHERE code = UPPER(_code);
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object('valid', false, 'error', 'INVALID_CODE', 'message', 'Access code not found');
    ELSIF access_code_record.status = 'used' THEN
      RETURN jsonb_build_object('valid', false, 'error', 'CODE_FULLY_USED', 'message', 'This access code has already been used');
    ELSIF access_code_record.status = 'revoked' THEN
      RETURN jsonb_build_object('valid', false, 'error', 'CODE_NOT_ACTIVE', 'message', 'This access code is no longer active');
    ELSIF access_code_record.valid_until IS NOT NULL AND access_code_record.valid_until <= now() THEN
      RETURN jsonb_build_object('valid', false, 'error', 'CODE_EXPIRED', 'message', 'This access code has expired');
    ELSE
      RETURN jsonb_build_object('valid', false, 'error', 'INVALID_CODE', 'message', 'Invalid access code');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'code_id', access_code_record.id,
    'tier', access_code_record.tier,
    'grade', access_code_record.grade,
    'stream', access_code_record.stream,
    'medium', COALESCE(access_code_record.medium, 'english'),
    'duration_days', COALESCE(access_code_record.duration_days, 365)
  );
END;
$$;
```

---

### Phase 2: Fix Empty Subjects in PrintRequestDialog

**File:** `src/components/dashboard/PrintRequestDialog.tsx`

Update the `loadSubjects` function to:
1. Use a more robust approach for filtering JSONB arrays
2. Handle edge cases when no user subjects exist
3. Add logging for debugging

```typescript
const loadSubjects = async () => {
  if (!enrollment) return;
  
  const subjectNames = userSubjects ? [
    userSubjects.subject_1,
    userSubjects.subject_2,
    userSubjects.subject_3,
  ].filter(Boolean) : [];
  
  // Base query with grade AND medium filter
  let query = supabase
    .from('subjects')
    .select('id, name, streams')
    .eq('grade', enrollment.grade)
    .eq('medium', enrollment.medium)
    .eq('is_active', true);
  
  // For A/L students with locked subjects, filter by those subjects
  if (subjectNames.length > 0) {
    query = query.in('name', subjectNames);
  } 
  // For A/L students without locked subjects, filter by stream
  else if (enrollment.stream && !enrollment.grade.startsWith('ol_')) {
    // Use cs (contains) filter for JSONB array
    query = query.contains('streams', [enrollment.stream]);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error loading subjects:', error);
    return;
  }
  
  // Deduplicate by name
  if (data && data.length > 0) {
    const uniqueSubjects = data.filter(
      (subject, index, self) =>
        index === self.findIndex(s => s.name === subject.name)
    );
    setSubjects(uniqueSubjects);
  } else {
    // Fallback: fetch stream_subjects table for this stream
    // This ensures we have subjects even if subjects table is incomplete
    console.log('No subjects found in subjects table, falling back to stream_subjects');
    const stream = enrollment.grade.startsWith('ol_') ? 'ol' : enrollment.stream;
    if (stream) {
      const { data: streamData } = await supabase
        .from('stream_subjects')
        .select('id, subject_name')
        .eq('stream', stream)
        .order('sort_order');
      
      if (streamData) {
        setSubjects(streamData.map(s => ({ id: s.id, name: s.subject_name })));
      }
    }
  }
};
```

---

### Phase 3: Improve Subject Selection UI Layout

**File:** `src/pages/SubjectSelection.tsx`

Reduce vertical scrolling with a more compact, horizontal-first layout:

1. **Desktop Layout:** Use 3-4 column grid with compact subject cards
2. **Mobile Layout:** 2 columns or accordion-style collapsible sections
3. **Use Dropdowns:** For O/L baskets (1 selection each), use dropdown selects instead of radio buttons in a grid
4. **Fixed Summary Bar:** Keep the selected subjects summary at the bottom as a sticky footer

**Key UI Changes:**

```tsx
// For A/L streams - compact horizontal grid
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
  {subjects.map((subject) => (
    <label
      key={subject.id}
      className={`
        flex items-center gap-2 p-3 rounded-lg border transition-all text-sm
        ${isSelected ? 'bg-brand/10 border-brand/40' : 'bg-secondary/50 border-border'}
        cursor-pointer hover:border-brand/30
      `}
    >
      <Checkbox checked={isSelected} />
      <span className="truncate">{subject.subject_name}</span>
    </label>
  ))}
</div>

// For O/L baskets - use dropdown select instead of grid
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  {['basket1', 'basket2', 'basket3'].map((basket) => (
    <div key={basket} className="space-y-2">
      <Label>{BASKET_LABELS[basket]}</Label>
      <Select value={selectedFromBasket[basket]} onValueChange={(v) => selectFromBasket(basket, v)}>
        <SelectTrigger>
          <SelectValue placeholder="Select subject" />
        </SelectTrigger>
        <SelectContent>
          {subjectsByBasket[basket]?.map((subject) => (
            <SelectItem key={subject.id} value={subject.subject_name}>
              {subject.subject_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  ))}
</div>

// Sticky footer summary
<div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 -mx-4">
  <div className="flex flex-wrap items-center justify-between gap-4">
    <div className="flex flex-wrap gap-2">
      {selectedSubjects.map((s) => (
        <Badge key={s} variant="secondary">{s}</Badge>
      ))}
    </div>
    <Button disabled={!validation.valid}>Confirm Selection</Button>
  </div>
</div>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| Database Migration | Update `validate_access_code` function to check `status = 'active'` |
| `src/components/dashboard/PrintRequestDialog.tsx` | Fix `loadSubjects` with fallback to `stream_subjects` table |
| `src/pages/SubjectSelection.tsx` | Redesign layout for horizontal-first, use dropdowns for O/L baskets |
| `src/hooks/useSubjectSelection.ts` | (Optional) Add helper methods for dropdown-based selection |

---

## Summary

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| Access code "Invalid" | Function checks `status = 'unused'` but codes are now `'active'` | Update function to check `status = 'active'` |
| Empty subjects dropdown | Query may fail or return empty due to JSONB filter | Add fallback to `stream_subjects` table |
| Excessive vertical scrolling | Grid layout with large cards | Compact horizontal grid + dropdowns + sticky footer |

---

## Testing Checklist

- [ ] Create new access code - validates successfully
- [ ] Existing `'active'` codes work for signup
- [ ] PrintRequestDialog shows subjects for users with/without locked subjects
- [ ] Subject selection page renders compactly on desktop
- [ ] Mobile layout still usable with less scrolling
- [ ] O/L basket dropdowns work correctly
