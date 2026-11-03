# Sources and scope

This ten-second character study is illustrative. The person, $450 monthly limit,
$540 lease offer, expressions and decision are authored. There is no approved
Sapien participant record, population result or model prediction in this clip.

## Character

VitruvianGodot, pinned revision
`8b643c3e72f39cb2f775ddeeac1612f70a9e1606`:
https://github.com/ibrews/VitruvianGodot

Source notice:
https://github.com/ibrews/VitruvianGodot/blob/8b643c3e72f39cb2f775ddeeac1612f70a9e1606/NOTICE.md

The notice supplies the Vitruvian/CharMorph character output data as CC0 1.0.
Credits include Sean Buckley, Olaf Delgado-Friedrichs, SirMaxim, Upliner,
Mindfront and J Hill. This adaptation uses head/body meshes, clothing, textures
and hair guides. No third-party source scripts, shaders or Mixamo clips are
executed, included in the public player or used in the rendered motion.

Changes include eye materials and gaze limits, original eyebrow and eyelash
fibers bound to the facial shapes, a fitted cloth simulation, continuous collar
skin, physical nail surfaces, and authored hand contact and release.

## Movement reference

CMU Graphics Lab Motion Capture Database:
https://mocap.cs.cmu.edu/

Subject 22, trial 18; original source data:
https://mocap.cs.cmu.edu/subjects/22/22.asf
https://mocap.cs.cmu.edu/subjects/22/22_18.amc

The database states that its data is free for all uses, including commercial
products, but the raw data may not be resold, including after conversion. This
review package includes rendered use only; it does not distribute motion data.

The data used in this project was obtained from mocap.cs.cmu.edu. The database
was created with funding from NSF EIA-0196217.

Only lower-back, upper-back and thorax angles contribute a retimed, attenuated
layer (16 percent amplitude, mean removed). Hands, finger contact, gaze,
expression and the paper gesture are authored. This is not a complete captured
performance, and the motion source does not establish the character's motives.

## Room, props, sound and render

Room and props are authored in the existing Blender scene. Environment lighting
uses the Venice Sunset 1K HDR from Poly Haven (CC0), obtained from the Three.js
example mirror: https://polyhaven.com/a/venice_sunset
License: https://polyhaven.com/license
Mirror: https://github.com/mrdoob/three.js/blob/dev/examples/textures/equirectangular/venice_sunset_1k.hdr
 Audio is original
procedural room tone and paper foley; there is no recorded voice or licensed
music. Hair response is an authored spring deformation, not full hair physics.
The cotton shirt uses a baked 276-frame cloth solve, including a 36-frame
pre-roll; the final ten seconds use scene frames 37 through 276.

Blender Cycles generates the movie. The browser is a simple video player;
playback tests do not establish real-time 3D performance. Rendered footage and
review notes are the intended sharing assets. This package does not include
raw character meshes, the Blender project or raw CMU data.

The final hand release uses an additional authored wrist turn and finger curl.
The affected lower half of frames 169–216 was physically re-rendered and
composited over the unchanged baseline outside that region. The visible skin uses a separate hand-animation rig. The garment and collision
body retain their original rig and validated motion, preserving the cloth bake.
The rendered region includes the hand shadows and reflections.
