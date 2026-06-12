# SPRINT 2: Data Integrity & Forms — Implementation Plan

**Status**: STARTING  
**Duration**: Week 2  
**Effort**: 28-32 hours  
**Dependency**: Sprint 1 ✅ Complete

---

## SCOPE

Four high-priority issues to fix:

### Issue #4: Bulk Actions Lack Field Validation (DASHBOARD_002)
**Status**: READY  
**Effort**: 8-10 hours  

**Problem**: Submit button is enabled even with empty required fields  
**Solution**: Add validation, disable submit if required fields empty, show inline errors

### Issue #5: Bulk Actions Lack Preview/Confirmation (GLOBAL_004)
**Status**: READY  
**Effort**: 10-12 hours  

**Problem**: No preview shown before applying changes  
**Solution**: Create preview modal, require explicit confirmation, show success/failure breakdown

### Issue #6: Platform Field Not Enforced (SOCIAL_POSTS_001)
**Status**: READY  
**Effort**: 4-6 hours  

**Problem**: Platforms field is optional but should be required  
**Solution**: Make platforms mandatory, disable Next until selected, show error

### Issue #7: Canva URL Not Validated (SOCIAL_POSTS_003)
**Status**: READY  
**Effort**: 6-8 hours  

**Problem**: Invalid URLs accepted  
**Solution**: Add URL validation (HTTP/HTTPS), show inline errors

---

## IMPLEMENTATION SEQUENCE

**Day 1**: Issues #4 & #5 (Bulk Actions) — 18-22 hours  
**Day 2-3**: Issues #6 & #7 (Social Posts) — 10-14 hours

---

## FILES TO MODIFY

### Bulk Actions
- `src/app/dashboard/page.tsx` (lines 2743-2852)
- Create: `src/components/bulk-action-preview-modal.tsx`
- Create: `src/lib/bulk-action-validation.ts`

### Social Posts
- Social post editor component (TBD)
- Update validation helpers

---

## SUCCESS CRITERIA

All 4 issues complete when:
- [ ] Validation prevents invalid submissions
- [ ] Bulk preview modal works
- [ ] Platform field mandatory
- [ ] URL validation working
- [ ] All tests pass
- [ ] No breaking changes

