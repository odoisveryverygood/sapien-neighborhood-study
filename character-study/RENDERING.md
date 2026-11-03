# Rendering recipes and prerequisites

The public player consumes the included rendered movie. The Python files document the production work; the packed Blender scene is not included.

- `rendering/performance-proof/`: initial character setup, strand groom and fitting.
- `rendering/performance-refinement/`: eye/brow/lash preparation, authored motion with a CMU torso layer, cloth simulation, collar/nail repair, rendering and the isolated hand refinement.
- The hand uses a separate visible-skin rig. Garment and collision geometry retain the original rig and cached motion.
- Frames 169–216 receive a physical lower-region re-render, composited over the baseline elsewhere. This is described in SOURCES.md.

The scripts retain their staged `outputs/` contracts. Prepared scenes such as `outputs/sapien-performance-proof/performance-base.blend`, the earlier room/prop scene, the Vitruvian source tree and the derived CMU torso input must be supplied before running the corresponding stages. They are not part of this repository. Asset links and the pinned character revision are in SOURCES.md. Do not interpret the references as a complete standalone scene rebuild.

For the orchestrator, set `BLENDER_BIN` to your Blender executable. Rendering was done at 1920 × 1080, 32 Cycles samples. Use short batches on machines with limited memory/disk space; disk-backed tiles exhausted scratch space during development. No renderer installation or account setup is performed by the browser server.

No private brief PDF, messages, credentials, raw motion data or generated scratch caches are included here.
