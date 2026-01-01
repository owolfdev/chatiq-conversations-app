# Blog Post Image Specifications

## Aspect Ratio

**Required: 16:9 (1.78:1)**

The blog UI uses `aspect-video` CSS class, which enforces a 16:9 aspect ratio. Images are displayed with `object-cover`, meaning they will be cropped to fit this ratio.

## Recommended Dimensions

| Size | Width | Height | Use Case |
|------|-------|--------|----------|
| **Large** | 1920px | 1080px | High-resolution displays, featured images |
| **Medium** | 1280px | 720px | Standard web displays |
| **Small** | 1024px | 576px | Minimum recommended size |
| **DALL-E 3** | 1792px | 1024px | Generated images (closest to 16:9) |

## DALL-E 3 Supported Sizes

When using DALL-E 3 for image generation:

- ✅ **`1792x1024`** - 16:9 ratio (recommended, matches UI)
- ✅ **`1024x1024`** - 1:1 ratio (square, will be cropped in UI)
- ✅ **`1024x1792`** - 9:16 ratio (portrait, not recommended)

**Note**: The image generator uses `1792x1024` by default, which is the closest DALL-E 3 size to 16:9.

## Display Behavior

Images are displayed with:
- **Container**: `aspect-video` (16:9 ratio)
- **Image**: `object-cover` (crops to fit, maintains aspect ratio)
- **Position**: Centered

This means:
- **16:9 images**: Display perfectly without cropping
- **Square images (1:1)**: Cropped on left/right to fit 16:9
- **Wider images**: Cropped on top/bottom
- **Taller images**: Cropped on left/right

## File Format

- **Format**: JPG/JPEG (recommended for photos)
- **Alternative**: PNG (for images with transparency)
- **File naming**: `{slug}.jpg` (e.g., `my-post.jpg`)
- **Location**: `/public/blog/images/{slug}.jpg`

## Image Quality

- **DALL-E 3 Quality**: `standard` (faster, good quality)
- **Alternative**: `hd` (higher quality, slower, more expensive)
- **Compression**: Use appropriate compression (80-90% quality for JPG)

## Example Image Paths

```typescript
// In metadata
image: "/blog/images/my-post.jpg"  // ✅ Correct
image: "/blog/images/my-post.png"  // ✅ Also valid
image: null                         // ✅ No image
```

## For Blog Creation Service

When generating or providing images:

1. **Aspect Ratio**: Ensure 16:9 (or close to it)
2. **Minimum Size**: 1024×576px
3. **Recommended Size**: 1920×1080px or 1792×1024px
4. **Format**: JPG (or PNG if transparency needed)
5. **File Name**: Match post slug: `{slug}.jpg`
6. **Path**: Save to `public/blog/images/{slug}.jpg`

## Manual Image Creation

If creating images manually (not using DALL-E):

1. Create image at 16:9 aspect ratio
2. Recommended dimensions: 1920×1080px
3. Save as JPG with slug as filename
4. Place in `public/blog/images/` directory
5. Reference in metadata: `image: "/blog/images/{slug}.jpg"`

## Image Generator Default

The blog image generator creates images at **1792×1024px** (16:9 ratio), which:
- ✅ Matches the UI aspect ratio perfectly
- ✅ No cropping needed
- ✅ Optimal for blog post cards and featured images
- ✅ Works well on all screen sizes

