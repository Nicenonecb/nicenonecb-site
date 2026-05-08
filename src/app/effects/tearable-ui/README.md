# Tearable UI

Reference implementation of the Pushmatrix tearable page. Canvas-rendered page layers are mapped to a deformable `BufferGeometry` cloth mesh. The active layer runs a simple Verlet solver in a Web Worker; when constraints stretch beyond the tear threshold, the worker marks them broken and rebuilds the triangle index buffer so lower layers become visible through real mesh holes.

Notes:

- Desktop uses a 100x100 grid; mobile uses 40x40.
- The final layer sets `tearThreshold` extremely high.
- Layers match the reference sequence: intro, inputs, products, video, indestructible.
- Inputs are drawn into the canvas texture, then resolved through UV hit regions. Text fields use a hidden real input only for keyboard capture.
- Product hover states and the video frame are redrawn back into the active canvas texture.
