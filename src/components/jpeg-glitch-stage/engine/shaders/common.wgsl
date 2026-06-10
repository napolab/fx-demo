// Shared uniform struct + helpers for the JPEG glitch pipeline.
// CPU-side packing lives in math/glitch-params — keep field order in sync.

struct GlitchParams {
  proc_size: vec2f,
  amount: f32,
  chroma: f32,
  shift: f32,
  seed: f32,
  cam_aspect: f32,
  canvas_aspect: f32,
  camera_ready: f32,
  _pad0: f32,
  _pad1: vec2f,
};

// lowbias32 integer hash — mirrored in math/hash (TS). Keep both sides in sync.
fn hash_u32(value: u32) -> u32 {
  var h = value;
  h = h ^ (h >> 16u);
  h = h * 0x7feb352du;
  h = h ^ (h >> 15u);
  h = h * 0x846ca68bu;
  h = h ^ (h >> 16u);
  return h;
}

fn hash_combine(a: u32, b: u32) -> u32 {
  return hash_u32(a ^ (b * 0x9e3779b9u));
}

fn hash01(value: u32) -> f32 {
  return f32(hash_u32(value) & 0xffffffu) / 16777216.0;
}

// Full-range BT.601. Cb/Cr are centered at 0 (range -0.5..0.5).
fn rgb_to_ycbcr(rgb: vec3f) -> vec3f {
  let y = dot(rgb, vec3f(0.299, 0.587, 0.114));
  let cb = dot(rgb, vec3f(-0.168736, -0.331264, 0.5));
  let cr = dot(rgb, vec3f(0.5, -0.418688, -0.081312));
  return vec3f(y, cb, cr);
}

fn ycbcr_to_rgb(ycc: vec3f) -> vec3f {
  let y = ycc.x;
  let cb = ycc.y;
  let cr = ycc.z;
  return vec3f(
    y + 1.402 * cr,
    y - 0.344136 * cb - 0.714136 * cr,
    y + 1.772 * cb,
  );
}

// Cover-fit + horizontal mirror (the stage behaves like a mirror).
fn camera_uv(uv: vec2f, cam_aspect: f32, canvas_aspect: f32) -> vec2f {
  let ratio = canvas_aspect / cam_aspect;
  var centered = uv - vec2f(0.5);
  if (ratio > 1.0) {
    centered = vec2f(centered.x, centered.y / ratio);
  } else {
    centered = vec2f(centered.x * ratio, centered.y);
  }
  return vec2f(0.5 - centered.x, centered.y + 0.5);
}
