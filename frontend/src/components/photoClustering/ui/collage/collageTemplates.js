/**
 * Predefined Collage Design Templates
 * 
 * Each template defines:
 *   - name: Display name
 *   - width / height: The canvas size the template was designed for (always 1920x1080)
 *   - layers: Array of { type: 'image' | 'text', ...props }
 *       Image layers define the bounding box where a photo should be placed.
 *       Text layers define decorative text overlays.
 * 
 * When a template is applied, available photos are assigned sequentially 
 * to the image-type layers.
 */

const COLLAGE_TEMPLATES = [
    {
        id: 'classic_grid',
        name: 'Classic Grid',
        width: 1920,
        height: 1080,
        layers: [
            { type: 'image', x: 20, y: 20, width: 930, height: 520 },
            { type: 'image', x: 970, y: 20, width: 930, height: 520 },
            { type: 'image', x: 20, y: 560, width: 930, height: 500 },
            { type: 'image', x: 970, y: 560, width: 930, height: 500 },
        ]
    },
    {
        id: 'hero_strip',
        name: 'Hero + Strip',
        width: 1920,
        height: 1080,
        layers: [
            { type: 'image', x: 20, y: 20, width: 1880, height: 620 },
            { type: 'image', x: 20, y: 660, width: 613, height: 400 },
            { type: 'image', x: 653, y: 660, width: 614, height: 400 },
            { type: 'image', x: 1287, y: 660, width: 613, height: 400 },
        ]
    },
    {
        id: 'mosaic',
        name: 'Mosaic',
        width: 1920,
        height: 1080,
        layers: [
            { type: 'image', x: 20, y: 20, width: 620, height: 1040 },
            { type: 'image', x: 660, y: 20, width: 620, height: 500 },
            { type: 'image', x: 660, y: 540, width: 620, height: 500 },
            { type: 'image', x: 1300, y: 20, width: 600, height: 340 },
            { type: 'image', x: 1300, y: 380, width: 600, height: 340 },
            { type: 'image', x: 1300, y: 740, width: 600, height: 320 },
        ]
    },
    {
        id: 'spotlight',
        name: 'Spotlight',
        width: 1920,
        height: 1080,
        layers: [
            { type: 'image', x: 360, y: 40, width: 1200, height: 700 },
            { type: 'image', x: 20, y: 760, width: 460, height: 300 },
            { type: 'image', x: 500, y: 760, width: 460, height: 300 },
            { type: 'image', x: 980, y: 760, width: 460, height: 300 },
            { type: 'image', x: 1460, y: 760, width: 440, height: 300 },
            {
                type: 'text',
                text: 'MY MEMORIES',
                fontSize: 28,
                fontStyle: 'bold',
                fill: '#94A3B8',
                x: 20,
                y: 16,
                align: 'left'
            }
        ]
    },
    {
        id: 'editorial',
        name: 'Editorial',
        width: 1920,
        height: 1080,
        layers: [
            { type: 'image', x: 20, y: 20, width: 1240, height: 1040 },
            { type: 'image', x: 1280, y: 20, width: 620, height: 340 },
            { type: 'image', x: 1280, y: 380, width: 620, height: 340 },
            {
                type: 'text',
                text: 'COLLECTION',
                fontSize: 36,
                fontStyle: 'bold',
                fill: '#1E293B',
                x: 1300,
                y: 780,
                align: 'left'
            },
            {
                type: 'text',
                text: 'A curated gallery of moments',
                fontSize: 18,
                fill: '#94A3B8',
                x: 1300,
                y: 830,
                align: 'left'
            }
        ]
    }
];

export default COLLAGE_TEMPLATES;
