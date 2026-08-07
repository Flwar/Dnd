# Art direction — “כרוניקה חרוטה אפלה”

The production scenes use full-scene native sources rather than atlas cells. The target is a restrained historical oil matte painting: visible canvas and dry-brush texture, plausible medieval construction, human-scale clutter, asymmetrical staging, physical light, local firelight, and deliberate story props.

Avoid glossy concept-art surfaces, cinematic teal/orange grading, perfect symmetry, repeated architecture, ornamental noise, modern objects, readable generated text, and magical cyan outside corruption or crown-shard beats.

Palette by region:

- Arfelon: rain grey, wet timber, weak amber.
- Interiors: soot, iron, copper, worn linen.
- Mine road: moss, slate, natural fog.
- Mine: iron dust, lamp umber, black water.
- Corruption: scarce cold cyan accents.
- Shard sanctum: cyan is reserved for the chapter climax.

All image-generation source masters are kept in `assets/art-v2/sources`. Runtime WebP variants are reproducibly built with:

```powershell
npm run assets:art-v2
```

The build adds a restrained saturation pass, native-scale sharpening, deterministic fine grain, and a fixed vignette. Mobile files use a separate 4:5 crop and are not atlas enlargements.
