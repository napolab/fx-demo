// Shared WGSL declarations prepended to every pass.
// Host-side packing lives in engine/uniforms — keep layouts in sync.

struct SimParams {
  sim_size: vec2f,
  dye_size: vec2f,
  dt: f32,
  time: f32,
  vel_dissipation: f32,
  dye_dissipation: f32,
  vorticity: f32,
  injection: f32,
  hue_shift: f32,
  camera_ready: f32,
  grade_mode: f32,
  splat_count: f32,
  cam_aspect: f32,
  canvas_aspect: f32,
}

struct Splat {
  pos: vec2f,
  vel: vec2f,
  color: vec4f,
  radius: f32,
  strength: f32,
  dye_amount: f32,
  radial_impulse: f32,
}

struct SplatList {
  items: array<Splat, 8>,
}

fn texel_uv(id: vec2u, size: vec2f) -> vec2f {
  return (vec2f(id) + vec2f(0.5)) / size;
}

fn clamp_coord(coord: vec2i, size: vec2f) -> vec2i {
  return clamp(coord, vec2i(0), vec2i(size) - vec2i(1));
}

// Rotate a color around the gray axis (Rodrigues rotation = classic hue rotate).
fn rotate_hue(color: vec3f, angle: f32) -> vec3f {
  let axis = vec3f(0.5773502691896258);
  let c = cos(angle);
  let s = sin(angle);
  return color * c + cross(axis, color) * s + axis * dot(axis, color) * (1.0 - c);
}

// Cheap saturated rainbow ramp over a normalized hue.
fn hue_ramp(h: f32) -> vec3f {
  let t = fract(h);
  let r = abs(t * 6.0 - 3.0) - 1.0;
  let g = 2.0 - abs(t * 6.0 - 2.0);
  let b = 2.0 - abs(t * 6.0 - 4.0);
  return clamp(vec3f(r, g, b), vec3f(0.0), vec3f(1.0));
}

fn luma(color: vec3f) -> f32 {
  return dot(color, vec3f(0.2126, 0.7152, 0.0722));
}

// Mirror horizontally (selfie view) and cover-fit the camera frame onto the canvas.
fn camera_uv(uv: vec2f, canvas_aspect: f32, cam_aspect: f32) -> vec2f {
  let mirrored = vec2f(1.0 - uv.x, uv.y);
  let ratio = canvas_aspect / max(cam_aspect, 0.0001);
  if (ratio > 1.0) {
    return vec2f(mirrored.x, (mirrored.y - 0.5) / ratio + 0.5);
  }
  return vec2f((mirrored.x - 0.5) * ratio + 0.5, mirrored.y);
}

// Drifting muted aurora blobs — the no-camera fallback source.
fn procedural_color(uv: vec2f, t: f32, aspect: f32) -> vec3f {
  var acc = vec3f(0.0);
  let p = (uv - vec2f(0.5)) * vec2f(aspect, 1.0);
  for (var i = 0u; i < 3u; i = i + 1u) {
    let fi = f32(i);
    let angle = t * (0.09 + 0.05 * fi) + fi * 2.0944;
    let center = 0.3 * vec2f(cos(angle), sin(angle * 1.31 + fi));
    let dist = distance(p, center);
    acc = acc + hue_ramp(fi / 3.0 + t * 0.015) * smoothstep(0.45, 0.04, dist);
  }
  return acc * 0.8;
}
