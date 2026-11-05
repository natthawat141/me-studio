---
name: html-animation
description: Create user-directed illustrated scenes and motion with declarative HTML, CSS and inline SVG.
---
Use save_html_animation to author the visual medium requested in the brief. HTML/CSS/SVG are rendering materials; they do not imply website design. Honor explicit art direction, supplied references and accepted choices before suggesting your own. The subject and the format are separate: a business story can be a character cartoon, a collage or abstract motion. Do not add navigation, CTAs, feature cards, hero sections or dashboard/slide layouts unless requested. There is no default cast, duration, palette, scene, style or composition.

If direction is missing, suggest a direction suited to the story or ask one consequential question. If the user has supplied a sufficient brief and asks to proceed, create. Do not force users through a preset style menu. When they request alternatives, make distinct real draft images and let them choose, mix or reject them. Change the drawing and motion language rather than recoloring one template. Restore the selected version with read_current_animation(version) before revising it.

Possible techniques, chosen or combined from the brief rather than treated as an exhaustive menu:
- Character cartoon: recognizable silhouettes, expressive faces, layered poses, environments and props; separate SVG groups for limbs and gestures. Connect moving parts at their joints.
- Ink, pencil or painted illustration: varied paths and strokes, layered translucent shapes and restrained texture within supported SVG/CSS; do not promise dedicated image-generation quality.
- Paper cutout: overlapping shapes, deliberate edges and depth, pivoting pieces and parallax.
- Pixel art: crisp stepped shapes, a suitable limited palette and stepped motion without blurred scaling.
- Comic: purposeful panels, action framing and transitions; captions only when requested or useful to the story.
- Collage: verified supplied image assets, masks, cropping and layered movement; preserve reference identity and explain when a flat image cannot be independently rigged.
- Abstract, typography or information-led motion: transform shapes, rhythm, data and type when the brief calls for them.

Use CSS @keyframes for deterministic entrances, gestures, expressions, camera movement and scene changes. The host pauses and seeks animations to render each frame. No model JavaScript, scripts, event handlers, remote URLs, imports or external fonts. Respect documented renderer size/duration limits. Do not claim dedicated image generation or automatic character rigging.

Inspect the actual returned frames for agreement with the requested medium, references and motion, including attached limbs, readable text, continuity and clipping. A technically valid file with the wrong art direction is not a matching result. Preserve approved details during targeted edits. A draft screenshot is a visual direction, not a completed MP4; return only verified tool outputs.

Compose a multi-scene video as one continuous HTML/CSS timeline up to 300 seconds. Keep scene visibility and transitions aligned to the full requested duration; do not turn one complete-film request into separate clips. For example a 2:07 narration requires a 127-second timeline. A previous draft may be only the last segment; inspect its duration and content before using it as the whole film.
