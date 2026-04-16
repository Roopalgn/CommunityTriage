# Desktop and Mobile Walkthrough Checklist

Use this checklist before recording demos or sharing judges links.

## Clean-session checklist

- Open in a clean browser profile or incognito window.
- Hard refresh once.
- Confirm no stale cached assets.
- Confirm `GET /api/health` is reachable.

## Desktop checklist

- Sidebar content is fully readable and scroll behavior is intentional.
- Hero, metrics, case list, intake, and audit sections render without overlap.
- Analyze action works for at least one quick starter and one custom report.
- Override, assign, and unassign all work and update audit trail.
- Request IDs and event IDs appear in audit entries.

## Mobile and short-viewport checklist

- Layout collapses to one column without clipped controls.
- Form controls remain reachable without hidden overflow.
- Case detail actions remain tappable and readable.
- Status banners and audit entries wrap correctly.
- Keyboard focus order remains logical.

## Accessibility checklist

- All interactive controls are keyboard reachable.
- Focus ring is visible on links, buttons, and form controls.
- Inputs and filters have accessible labels.
- Status updates are announced through aria-live regions.
- Color contrast remains readable for text and chips.

## Metrics and story checklist

- `npm run evaluate` executed recently.
- `evaluation/latest-metrics.json` is up to date.
- README metrics table matches latest output.
- Judging script aligns with current UI labels and flow.
