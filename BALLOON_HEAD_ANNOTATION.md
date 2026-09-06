# Balloon head — SVG morph annotation spec

One-page guide for adding `Fennimal_head_balloon` to `SVG/Heads.svg`, matching tomato / bun / bell / cloud conventions so **feature_anchored_mesh** (and mesh_landmark) work out of the box.

---

## Design target

| Property | Target |
|----------|--------|
| Silhouette | Near-circle (~1:1), slightly wider than tall is OK |
| Crown | Short **string + knot** on top only (like tomato stem / bell handle) |
| Lateral features | **No ears**, no snout, no side blobs |
| Face | Standard Fennimal eyes (mid-face), small nose optional, mouth lower third |
| Distinctiveness | **Shape + string** — not texture alone (see colour note below) |
| ViewBox | Same head artboard as other heads (~400×400 occupied region, centred like tomato) |

Copy an existing head group (`Fennimal_head_tomato` or `Fennimal_head_bell`), rename, redraw art, keep helper classes.

---

## Colour / multi-area art (keep it simple)

Morph stimuli are rendered **grayscale** in the experiment (`morphOmitTextures`), so fancy multi-colour balloon art will not survive to the jumbler.

**Recommended approach:**

1. **One body fill** on the main balloon path (use `Fennimal_primary_color` class like other heads).
2. **One optional highlight** — a single soft oval path with ~30% opacity, no separate hue (same fill class, lower opacity). Tag with `data-morph="highlight"` inside a `morph_group` if you want it composited; otherwise keep it subtle and non-essential.
3. **String/knot** as separate `morph_group` with `data-morph="string"` or `handle`, wrapped by the `crown` morph_poly.
4. **Do not** rely on stripes, gradients, or multi-hue patches for identity — the **string knot + round silhouette** must read in gray.

For Inkscape drafting you can use colour for your own clarity; flatten to the class scheme above before export.

---

## Required group structure

```xml
<g id="Fennimal_head_balloon" class="Fennimal_head" display="inline" name="Party Balloon">
  <!-- visible art: balloon body, face, string -->
  <g class="morph_anchors" display="inline">
    <!-- morph_lm + morph_poly below -->
  </g>
</g>
```

- `id` must be `Fennimal_head_balloon` (morph pipeline uses `Fennimal_head_<id>`).
- Include `Fennimal_head_mouth_point`, `Fennimal_head_neck_point`, `Fennimal_head_hat_point` (hat point ≈ top of string knot).

---

## `morph_lm` landmarks (circles, class `morph_lm invisible_element`, `data-morph="…"`)

Place on the **balloon body outline** (not on the string). Match tomato landmark layout.

| `data-morph` | Role |
|--------------|------|
| `outline_bottom` | Lowest point of balloon body (above string attachment) |
| `outline_widest_left` | Leftmost point of body |
| `outline_widest_right` | Rightmost point of body |
| `outline_top_left` | Upper-left curve of body (below knot) |
| `outline_top_right` | Upper-right curve of body |
| `brow_mid` | Between eyes, on forehead |
| `chin` | Below mouth |
| `cheek_left` | Left cheek (optional but recommended) |
| `cheek_right` | Right cheek |
| `nose` | Nose centre (if drawn) |
| `ear_left_base_upper` | On left outline where an “ear” would be — **on shell, not a flap** |
| `ear_left_base_lower` | Lower left outline |
| `ear_right_base_upper` | Upper right outline |
| `ear_right_base_lower` | Lower right outline |

Ear landmarks are **mesh homologues only**; do not draw ear geometry.

---

## `morph_poly` regions (paths, class `morph_poly invisible_element`)

| `data-morph` | Required? | Notes |
|--------------|-----------|--------|
| `head_shell` | **Yes** | Closed path around **balloon body only** (exclude string). Used for mesh alignment + outline ring in feature_anchored_mesh. |
| `crown` | **Yes** | Closed path around **string + knot** (small top accent). Keep &lt;15% of head height. |
| `ear_left` | Optional | Thin strip on left outline if you use regional morph later; can omit for v1. |
| `ear_right` | Optional | Same on right. |
| `nose` | Optional | Small region if nose is a separate morph_group. |

Do **not** add mouth poly — mouth uses `Fennimal_head_mouth_point` + singular zones.

---

## `morph_group` parts (visible art, `data-morph` for compositing)

| `data-morph` | Content |
|--------------|---------|
| `string` or `handle` | String and knot (crown art). Bell uses `handle`; tomato uses `stem`. Pick one convention and use it in `crown` poly. |
| `nose` | Optional nose path |
| `mouth` | Optional; happy/sad mouth groups as on other heads |

Keep balloon **body fill** on the main path (not a morph_group) or use `texture` only for a single soft highlight — avoid stripe patterns.

---

## Z-order (bottom → top)

1. Balloon body fill + stroke  
2. Face (eyes, brows, mouth)  
3. String / knot (`morph_group` crown)  
4. `morph_anchors` (landmarks + polys on top for Inkscape editing)

---

## Checklist before Morph Lab

- [ ] `head_shell` closed and roughly convex  
- [ ] `crown` poly wraps only string/knot  
- [ ] String does not extend outside `head_shell` far below chin  
- [ ] All required `morph_lm` present on **both** balloon and tomato (spot-check `_sharedMorphLandmarkSlots` in console if morph fails)  
- [ ] `display="inline"` on head group  
- [ ] Grayscale morph test: `morphOmitTextures` strips non-essential fills — shape must read without colour  

---

## Morph Lab smoke test

```
http://localhost:8765/morph_lab.html?v=morph-lab-27&heads=tomato,balloon&morphs=feature_anchored_mesh,mesh_landmark,mesh
```

At **50/50** tomato×balloon: should read as jumble of both (round body + stem vs string), not a third character.

---

## Name-quiz copy (add to `1_General_Parameters.js` when art is ready)

```javascript
balloon: [
    "A round head with a thin string tied in a knot on top",
    "A puffy party balloon face with a little string sticking up",
    "A circular head and a short string at the crown, like a floating balloon"
]
```

---

## Memorizable set (target)

**tomato · bun · bell · cloud · balloon** — all round-face family, five semantic domains (garden, bakery, metal, weather, toy).
