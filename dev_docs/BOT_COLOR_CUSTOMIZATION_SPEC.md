# Bot Color Customization Specification

This document describes all bot page customization properties available for configuration in the main ChatIQ application. These properties allow full control over the visual appearance of public bot pages rendered at `/[slug]` routes.

## Overview

Bot pages support comprehensive color customization through semantic color fields stored in the `bot_bots` table. All color fields use hex color format (`#RRGGBB`) and are optional, allowing for partial or complete theme customization.

## Database Schema

**Table:** `bot_bots`

### Color Properties

| Field Name | Type | Required | Validation | Description |
|------------|------|----------|------------|-------------|
| `primary_color` | `text` | No | Hex format `^#[0-9A-Fa-f]{6}$` | Primary brand color |
| `secondary_color` | `text` | No | Hex format `^#[0-9A-Fa-f]{6}$` | Secondary/accent color |
| `color_background` | `text` | No | Hex format `^#[0-9A-Fa-f]{6}$` | Page background color |
| `color_container_background` | `text` | No | Hex format `^#[0-9A-Fa-f]{6}$` | Chat container/card background |
| `color_text` | `text` | No | Hex format `^#[0-9A-Fa-f]{6}$` | Primary text color |
| `color_border` | `text` | No | Hex format `^#[0-9A-Fa-f]{6}$` | Border color |
| `color_message_user` | `text` | No | Hex format `^#[0-9A-Fa-f]{6}$` | User message bubble background |
| `color_message_assistant` | `text` | No | Hex format `^#[0-9A-Fa-f]{6}$` | Assistant/bot message bubble background |

### Navigation Properties

| Field Name | Type | Required | Default | Description |
|------------|------|----------|---------|-------------|
| `back_link_url` | `text` | No | `null` | URL for "Back" link navigation |
| `back_link_text` | `text` | No | `"Back to Site"` | Text displayed for back link |

## Property Details

### Brand Colors

#### `primary_color`
- **Purpose**: Main brand color used for interactive elements and accents
- **Applies To**:
  - Bot title/heading
  - Links and hover states
  - Button colors
  - Tooltip backgrounds
  - Primary accent elements
  - Focus rings
- **Usage**: Used as the primary brand identity color throughout the bot page
- **Example**: `#4A6FA5`
- **Recommendation**: Choose a color that represents your brand and works well with your background colors

#### `secondary_color`
- **Purpose**: Secondary/accent color for complementary elements
- **Applies To**:
  - Secondary accents
  - Muted elements
  - Additional visual hierarchy
- **Usage**: Provides visual variety while maintaining brand consistency
- **Example**: `#6B7C9F`
- **Recommendation**: Should complement `primary_color` and work with the overall color scheme

### Layout Colors

#### `color_background`
- **Purpose**: Overall page background color (the area behind the chat container)
- **Applies To**:
  - Main page background
  - Parent container wrapping the chat interface
  - Privacy mode toggle background
- **Usage**: Creates the base visual layer and contrast for the chat container
- **Example**: `#CBD5E0`
- **Recommendation**: 
  - Should contrast well with `color_container_background`
  - For light themes: Use light gray tones
  - For dark themes: Use dark gray/black tones
  - Common range: `#F8FAFC` (very light) to `#1A202C` (very dark)

#### `color_container_background`
- **Purpose**: Chat container/card background color
- **Applies To**:
  - Main chat card/container
  - Chat input area background
- **Usage**: The main content area that holds the chat interface
- **Example**: `#FFFFFF`
- **Recommendation**:
  - Should contrast significantly with `color_background`
  - For light themes: Typically white (`#FFFFFF`) or very light colors
  - For dark themes: Use darker shades that contrast with background
  - Ensure sufficient contrast with `color_text` for readability

### Text & Borders

#### `color_text`
- **Purpose**: Primary text color for all readable content
- **Applies To**:
  - Bot name/title
  - Bot description
  - Chat message text
  - Input text
  - All body text
- **Usage**: Ensures readability across all text elements
- **Example**: `#1A202C`
- **Recommendation**:
  - Must have sufficient contrast with `color_container_background` (WCAG AA: 4.5:1 minimum)
  - For light backgrounds: Use dark colors (`#1A202C` to `#2D3748`)
  - For dark backgrounds: Use light colors (`#E2E8F0` to `#FFFFFF`)
  - Test contrast ratios for accessibility compliance

#### `color_border`
- **Purpose**: Border color for UI elements
- **Applies To**:
  - Chat container borders
  - Input field borders
  - Divider lines
  - Privacy toggle borders
  - All border elements
- **Usage**: Defines boundaries and visual separation
- **Example**: `#A0AEC0`
- **Recommendation**:
  - Should be subtle but visible
  - Typically lighter/darker than background or container
  - Should complement the overall color scheme

### Message Bubble Colors

#### `color_message_user`
- **Purpose**: Background color for user message bubbles
- **Applies To**:
  - User-sent message bubbles
- **Usage**: Differentiates user messages from assistant messages
- **Example**: `#5B8FD9`
- **Recommendation**:
  - Often matches or complements `primary_color`
  - Should contrast with `color_text` for readability
  - Consider using a lighter or more saturated version of `primary_color`

#### `color_message_assistant`
- **Purpose**: Background color for assistant/bot message bubbles
- **Applies To**:
  - Bot/assistant-sent message bubbles
- **Usage**: Differentiates assistant messages from user messages
- **Example**: `#718096`
- **Recommendation**:
  - Should contrast with `color_message_user` for clear distinction
  - Often uses muted gray or neutral tones
  - Should contrast with `color_text` for readability
  - Typically less prominent than user message color

### Navigation Properties

#### `back_link_url`
- **Purpose**: URL destination for the "Back" link on bot pages
- **Applies To**: Back link navigation button
- **Format**: Valid URL (absolute or relative)
- **Example**: `https://example.com` or `/dashboard`
- **Recommendation**: Should point to the main website or relevant landing page

#### `back_link_text`
- **Purpose**: Customizable text for the back link
- **Applies To**: Back link button text
- **Default**: `"Back to Site"` (if not provided)
- **Example**: `"Back to Company Name"` or `"← Return to Home"`
- **Recommendation**: Keep concise and descriptive

## Format Requirements

### Color Format
- **Required Format**: Hex color code with 6 digits
- **Pattern**: `^#[0-9A-Fa-f]{6}$`
- **Examples**:
  - Valid: `#4A6FA5`, `#FFFFFF`, `#000000`, `#ff5733`
  - Invalid: `4A6FA5` (missing #), `#4A6` (too short), `#GGGGGG` (invalid characters), `rgb(255,0,0)` (wrong format)

### Validation
All color fields are validated at the database level with CHECK constraints:
- Must be `NULL` OR match the hex format pattern
- Case-insensitive (accepts both uppercase and lowercase hex digits)
- Requires the `#` prefix

### Normalization
The bot page application automatically normalizes colors:
- Adds `#` prefix if missing (when reading from database)
- Preserves existing format when writing
- Application handles both with and without `#` prefix during rendering

## Color Relationships & Recommendations

### Contrast Requirements
1. **Text Readability**: `color_text` must contrast with `color_container_background` (WCAG AA: 4.5:1)
2. **Background Separation**: `color_background` should contrast with `color_container_background` for visual depth
3. **Message Distinction**: `color_message_user` and `color_message_assistant` should be distinguishable
4. **Border Visibility**: `color_border` should be visible against both background and container

### Recommended Color Schemes

#### Light Theme (Default)
```json
{
  "primary_color": "#4A6FA5",
  "secondary_color": "#6B7C9F",
  "color_background": "#CBD5E0",
  "color_container_background": "#FFFFFF",
  "color_text": "#1A202C",
  "color_border": "#A0AEC0",
  "color_message_user": "#5B8FD9",
  "color_message_assistant": "#718096"
}
```

#### Dark Theme
```json
{
  "primary_color": "#7BA3D4",
  "secondary_color": "#9BB5D4",
  "color_background": "#1A202C",
  "color_container_background": "#2D3748",
  "color_text": "#E2E8F0",
  "color_border": "#4A5568",
  "color_message_user": "#4A90E2",
  "color_message_assistant": "#718096"
}
```

#### High Contrast Theme
```json
{
  "primary_color": "#2563EB",
  "secondary_color": "#64748B",
  "color_background": "#F1F5F9",
  "color_container_background": "#FFFFFF",
  "color_text": "#0F172A",
  "color_border": "#94A3B8",
  "color_message_user": "#3B82F6",
  "color_message_assistant": "#64748B"
}
```

## UI/UX Recommendations for Configuration Interface

### Color Picker Components
1. **Primary Input Method**: Use a color picker component (color input type or third-party library)
2. **Hex Input**: Provide a text input field with hex format validation
3. **Visual Preview**: Show real-time preview of the selected color
4. **Preset Swatches**: Offer common color swatches for quick selection

### Field Organization
Organize fields into logical groups:
1. **Brand Colors** section:
   - Primary Color
   - Secondary Color
2. **Layout** section:
   - Page Background
   - Container Background
   - Text Color
   - Border Color
3. **Messages** section:
   - User Message Color
   - Assistant Message Color
4. **Navigation** section:
   - Back Link URL
   - Back Link Text

### Validation & Feedback
1. **Real-time Validation**: Validate hex format as user types
2. **Contrast Warnings**: Warn if text/background contrast is insufficient
3. **Preview Mode**: Show live preview of bot page with selected colors
4. **Reset to Defaults**: Provide option to reset all colors to default theme

### Accessibility Considerations
1. **Contrast Checker**: Integrate contrast ratio validation (WCAG AA minimum 4.5:1)
2. **Color Blindness**: Warn if message colors are too similar
3. **Preview Test**: Allow preview in different viewing conditions

### Preset Themes
Consider providing preset theme options:
- Default Light
- Dark Mode
- High Contrast
- Brand Custom (user's brand colors)
- Easy on Eyes (muted, low saturation)

### Implementation Tips
1. **Progressive Enhancement**: Start with primary colors, add others progressively
2. **Save State**: Auto-save or provide clear save/discard options
3. **Undo/Redo**: Support for reverting changes
4. **Export/Import**: Allow exporting color schemes as JSON for reuse
5. **Template Library**: Provide color scheme templates users can apply

## API/Update Considerations

### Update Endpoint
When updating bot colors via API:
1. Validate all color fields before saving
2. Allow partial updates (only update provided fields)
3. Handle `NULL` values (clears custom color, uses defaults)
4. Return validation errors for invalid formats

### Example Update Request
```json
{
  "primary_color": "#4A6FA5",
  "color_background": "#CBD5E0",
  "color_container_background": "#FFFFFF",
  "color_text": "#1A202C",
  "back_link_url": "https://example.com",
  "back_link_text": "Back to Home"
}
```

## Default Behavior

If a color field is `NULL` (not set), the bot page application will:
- Use the default theme colors defined in the application CSS
- Fall back to theme-appropriate defaults based on light/dark mode
- Maintain accessibility and readability standards

## Migration Notes

### Existing Bots
- Existing bots without color customization will use default theme
- No breaking changes - all fields are optional
- Can be migrated gradually

### Color Field History
- `primary_color` and `secondary_color`: Added in migration `20251125000001_add_bot_customization_fields.sql`
- `color_*` fields: Added in migration `20251202000002_add_bot_color_styling_fields.sql`
- All fields follow consistent hex format validation

## Testing Checklist

When implementing the configuration interface, test:
- [ ] All color fields accept valid hex format
- [ ] Invalid formats are rejected with clear error messages
- [ ] NULL/empty values are handled correctly (uses defaults)
- [ ] Partial updates work (only update specified fields)
- [ ] Color contrast validation for text/background combinations
- [ ] Preview accurately reflects saved colors
- [ ] Back link URL and text work correctly
- [ ] Changes persist after save
- [ ] Mobile/responsive view of color picker

## Related Documentation

- Database migrations:
  - `supabase/migrations/20251125000001_add_bot_customization_fields.sql`
  - `supabase/migrations/20251202000002_add_bot_color_styling_fields.sql`
- Example theme: `scripts/apply-easy-on-eyes-theme.sql`
- Bot page implementation: `src/app/[slug]/page.tsx`

