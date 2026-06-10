// Velocity divergence — the right-hand side of the pressure Poisson equation.

@group(0) @binding(0) var<uniform> params: SimParams;
@group(0) @binding(1) var velocity_in: texture_2d<f32>;
@group(0) @binding(2) var divergence_out: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (f32(id.x) >= params.sim_size.x || f32(id.y) >= params.sim_size.y) {
    return;
  }
  let coord = vec2i(id.xy);
  let size = params.sim_size;
  let left = textureLoad(velocity_in, clamp_coord(coord + vec2i(-1, 0), size), 0).x;
  let right = textureLoad(velocity_in, clamp_coord(coord + vec2i(1, 0), size), 0).x;
  let up = textureLoad(velocity_in, clamp_coord(coord + vec2i(0, -1), size), 0).y;
  let down = textureLoad(velocity_in, clamp_coord(coord + vec2i(0, 1), size), 0).y;
  let divergence = 0.5 * ((right - left) + (down - up));
  textureStore(divergence_out, coord, vec4f(divergence, 0.0, 0.0, 0.0));
}
