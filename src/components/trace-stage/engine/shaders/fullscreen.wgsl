// Shared fullscreen-triangle vertex stage and uniform block.

struct Params {
  coverScale: vec2f,
  resolution: vec2f,
  time: f32,
  cameraReady: f32,
  pad0: f32,
  pad1: f32,
};

struct VSOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vsMain(@builtin(vertex_index) index: u32) -> VSOut {
  var positions = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  let p = positions[index];
  var out: VSOut;
  out.position = vec4f(p, 0.0, 1.0);
  out.uv = vec2f(p.x * 0.5 + 0.5, 1.0 - (p.y * 0.5 + 0.5));
  return out;
}
