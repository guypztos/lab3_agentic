# Sprites

Flat vector sprites: no outlines, rounded shapes, and shading in a darker tone of the same colour.
Each sprite is an SVG plus a PNG with a transparent background. Characters are 128×128; food is 64×64.

| File | What it is | Points |
| --- | --- | --- |
| `player_idle` | Player standing | — |
| `player_walk` | Player walking | — |
| `player_jump` | Player jumping | — |
| `enemy_walk` | Enemy walking | — |
| `enemy_hit` | Enemy hit (stunned) | — |
| `food_apple` | Apple, common | 10 |
| `food_banana` | Banana | 20 |
| `food_cake` | Cake, sparkly | 50 |
| `food_golden_star` | Golden star, glowing, rarest | 100 |

`make_sprites.py <out-dir>` regenerates the SVGs. `preview.html` shows every sprite on
`preview_background.svg`, a stand-in drawn in the same style as the game background.
