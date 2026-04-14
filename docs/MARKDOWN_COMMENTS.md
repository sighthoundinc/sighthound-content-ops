# Markdown Comments Guide

This document explains how to use markdown formatting in comments across the application (blogs, social posts, ideas, etc.).

## Overview

Comments now support basic markdown formatting to help you write more structured, readable feedback. You can use formatting like bold text, lists, headings, code blocks, and links without needing to rely on plain text.

## Supported Formatting

### Bold Text
Use two asterisks before and after text to make it bold.

**Syntax:** `**bold text**`

**Example:** "This is **really important** to fix before launch."

**Renders as:** "This is **really important** to fix before launch."

---

### Italic Text
Use single asterisks before and after text to italicize it.

**Syntax:** `*italic text*`

**Example:** "This is a *suggested* improvement."

**Renders as:** "This is a *suggested* improvement."

---

### Headings
Use `#` to create heading hierarchy (up to 6 levels). Use more `#` for smaller headings.

**Syntax:**
```
# Heading 1
## Heading 2
### Heading 3
```

**Example:**
```
## What needs to change
The current design is confusing. Here's why:

### Visual Issues
The spacing is off.

### Copy Issues
The labels are ambiguous.
```

**Rendering:** Creates a hierarchical structure with styled headings.

---

### Lists
Use `-`, `*`, or `•` followed by a space to create a list. Each item must be on its own line.

**Syntax:**
```
- First item
- Second item
- Third item
```

**Example:**
```
- Clarify the button label
- Add an icon next to it
- Test with users before launch
```

**Renders as:**
- Clarify the button label
- Add an icon next to it
- Test with users before launch

---

### Code (Inline)
Use backticks to highlight code, technical terms, or variables inline.

**Syntax:** `` `code here` ``

**Example:** "The `email` field is missing validation."

**Renders as:** "The `email` field is missing validation." (in a styled code block)

---

### Links
Create clickable links using bracket notation.

**Syntax:** `[link text](https://example.com)`

**Example:** "See [our brand guidelines](https://example.com) for more details."

**Renders as:** A clickable blue link that opens in a new tab.

**Note:** Links automatically open in new tabs for external URLs.

---

### Line Breaks
Use blank lines (just hit Enter twice) to create paragraph breaks. Single line breaks within a paragraph are automatically preserved.

**Example:**
```
First paragraph here.

Second paragraph here with **formatting**.
```

---

## Real-World Examples

### Example 1: Structured Feedback
```
## Revision Feedback

The post looks great overall, but I noticed:

### Changes Needed
- Reword the headline for clarity
- Add supporting stat in second paragraph
- Update the call-to-action button text

### Optional Improvements
- Consider moving the image to the top
- Add internal `utm` parameters to links

See the [updated brief](https://example.com) for reference.
```

### Example 2: Approval with Notes
```
**Approved!** ✅

Just a couple of quick notes:

- The `brand-colors` hex code needs updating to #2563EB
- Please test the links before publishing

## Next Steps
Schedule the post for Tuesday and add to the calendar.
```

### Example 3: Technical Notes
```
## QA Review

Status: **Waiting for revision**

Issues found:
- The API endpoint `/api/users` is returning `null` values
- Missing validation on `email` input field
- Need to handle timezone conversion in `formatDate()`

Please review [the implementation](https://example.com) and let me know when ready for re-test.
```

---

## Best Practices

1. **Use structure for clarity**
   - Break up long comments into sections with headings
   - Use lists instead of comma-separated text
   - Use bold for important terms or calls-to-action

2. **Keep it readable**
   - Avoid nesting lists deeply (2-3 levels max)
   - Use blank lines to separate logical sections
   - Don't over-format; use bold/italic sparingly

3. **Be consistent**
   - Use the same formatting style across similar comments
   - Use headings consistently for recurring comment types (e.g., "Revision Feedback")

4. **Include context**
   - Use links to reference related documents
   - Bold key action items
   - Use code blocks for technical references

5. **For handoffs**
   - Use clear headings to signal purpose (e.g., "## Review Feedback")
   - Highlight what needs action with **bold**
   - Prioritize items with bullet lists
   - Make next steps explicit

---

## Common Patterns

### Review Comment
```
## Review Feedback

**Status:** Needs revision

Changes requested:
- Item 1
- Item 2
- Item 3

See [review notes](link) for details.
```

### Approval
```
**✓ Approved** — Ready to move to next stage.

Minor notes:
- Consider X for future posts
- Nice work on Y
```

### Context/Explanation
```
## Why This Matters
This change is **critical** because:
1. It improves performance
2. It fixes a compliance issue
3. It aligns with brand guidelines
```

---

## Limitations

The markdown comment renderer supports **only these features**:
- **Bold** (`**text**`)
- *Italic* (`*text*`)
- `Code` (`` `text` ``)
- Headings (`# Text`)
- Lists (`- item`)
- [Links](`[text](url)`)
- Line breaks (blank lines)

**Not supported:**
- Tables
- Code blocks with syntax highlighting
- Strikethrough
- Blockquotes
- HTML tags
- Images

If you need unsupported formatting, describe it in plain text or provide links to external documents.

---

## Troubleshooting

### Formatting isn't appearing
- Check your syntax carefully (e.g., `**bold**` not `*bold*`)
- Make sure there's text between the markers
- Ensure blank lines separate paragraphs/lists

### Link isn't showing
- Check that the URL starts with `http://` or `https://`
- Use the format `[text](url)` exactly

### Apostrophes or quotes breaking formatting
- Use `'` or `"` as usual—they won't interfere
- If text contains asterisks, use code formatting instead: `` `text*with*asterisks` ``

---

## Technical Details

**Where comments are used:**
- Blog detail pages
- Social post detail pages
- Ideas and other content types

**Component:** `MarkdownComment` in `src/components/markdown-comment.tsx`

**No external dependencies:** The markdown parser is lightweight and built into the component with no external markdown libraries.
