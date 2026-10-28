# Asset provenance

## Human and motion

Microsoft Rocketbox, Copyright (c) 2020 Microsoft, MIT license.

- Library: https://github.com/microsoft/Microsoft-Rocketbox
- License: https://github.com/microsoft/Microsoft-Rocketbox/blob/master/LICENSE.md
- Avatar: `Assets/Avatars/Adults/Male_Adult_01/Export/Male_Adult_01_facial.fbx`.
- Original textures: `Assets/Avatars/Adults/Male_Adult_01/Textures/` (`m002_*`).
- Animation: `m_walk_neutral`, `m_walk_start`, `m_walk_stop` from `all_animations_max_motextr_xy`; `m_idle_breathe_01`, `m_idle_look_around_01`, `m_drink_idle` from `all_animations_max_motextr_static`.

Converted locally with Three.js FBXLoader/GLTFExporter. Units normalized from centimeters to meters. Retained the original 80-bone rig and six facial morph targets (blink, smile, squint); pruned other morph targets; consolidated material groups. TGA textures converted to WebP. A head roughness texture was derived from the source specular map. The source body proportions and clothing were retained. Animation rotations preserve the avatar's own limb lengths; root travel is sampled separately in the scene. Sole-height traces were measured offline on the converted rig.

The original license is redistributed in `public/licenses/Microsoft-Rocketbox-MIT.txt`.

## Surfaces

Selected brick and concrete base-color/normal maps from Quaternius Downtown City MegaKit Standard, CC0 1.0.

- https://quaternius.com/
- https://quaternius.itch.io/downtown-city-megakit
- Included license: `public/licenses/Quaternius-CC0.txt`.

The new scene does not reuse the prior Quaternius character models. Café architecture, paving arrangement, fixtures, plants, signs, furniture, interface and activity composition were created for this study.

## Environment lighting

Venice Sunset HDR environment from Poly Haven, CC0. The 1K HDR was obtained from the Three.js example asset mirror.

- Asset: https://polyhaven.com/a/venice_sunset
- License: https://polyhaven.com/license
- Mirror: https://github.com/mrdoob/three.js/blob/dev/examples/textures/equirectangular/venice_sunset_1k.hdr

## Runtime and fonts

Three.js (MIT), Vite (MIT), DM Sans and Manrope (SIL Open Font License). Redistributed runtime/font license texts are in `public/licenses/`.

No paid asset, video-generation subscription or generated video footage was used. This study does not imply endorsement by the asset creators or validation of a Sapien behavioral model.

## Study-opening interaction reference

The original tab controller in `src/study-opening.js` follows the W3C ARIA Authoring Practices manual-activation tab pattern: https://github.com/w3c/aria-practices/blob/main/content/patterns/tabs/examples/js/tabs-manual.js . W3C repository materials are distributed under the W3C Software and Document License: https://www.w3.org/Consortium/Legal/copyright-software . The controller is written for this application; the reference library is not a runtime dependency.

## Mercer neighborhood addition

Four distinct Microsoft Rocketbox avatars and compatible animations from official source commit `0943055db6ec570bcef9f2c8b41c9e5467c808f9`: Male_Adult_01, Female_Adult_01, Female_Adult_05 and Male_Adult_03. All use the existing Microsoft Rocketbox MIT notice included in public/licenses. New shelter, apartment details, trees, bus, rain and response UI are original procedural work.

## Street direction pass — 2026-10-28

- Scanned plaster: [Plastered Wall 02](https://polyhaven.com/a/plastered_wall_02), Charlotte Baglioni / Poly Haven, CC0. 1K diffuse, OpenGL normal and roughness maps, downloaded from official file URLs and checked against API MD5 values. Powered by Poly Haven (asset API used for offline acquisition; no live API dependency in the viewer).
- Expanded architecture, planting, morning sky and transit bus: original procedural geometry/shaders in this workspace. These are visual scenery, not additional simulated subjects or results.

- Pavement surface: [Concrete Floor 02](https://polyhaven.com/a/concrete_floor_02), Rob Tuytel / Poly Haven, CC0. 1K diffuse, normal and roughness maps; official file hashes verified.
