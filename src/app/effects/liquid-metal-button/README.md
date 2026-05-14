# Liquid Metal Button

Reference: <https://codepen.io/Majoramari/pen/pvbzpoa>

The original pen uses `@paper-design/shaders` to mount a liquid metal shader into a circular button. This local version keeps the same composition:

- black capsule track with a top inset highlight
- two oversized muted icons on the left
- circular liquid metal button on the right
- tonal metal conic ring that brightens on hover/focus

Implementation notes:

- The shader is implemented directly with WebGL2 so the effect does not depend on a runtime `https://esm.sh` import.
- Pointer position and hover intensity are eased before being sent into the shader, which prevents abrupt chrome highlights.
- CSS variables scale the track and button separately for the gallery preview and full detail route.
