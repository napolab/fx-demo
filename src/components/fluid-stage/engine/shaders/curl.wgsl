// Scalar curl (vorticity) of the velocity field, central differences in texel space.

@group(0) @binding(0) var<uniform> params: SimParams;
@group(0) @binding(1) var velocity_in: texture_2d<f32>;
@group(0) @binding(2) var curl_out: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (f32(id.x) >= params.sim_size.x || f32(id.y) >= params.sim_size.y) {
    return;
  }
  let coord = vec2i(id.xy);
  let size = params.sim_size;
  let left = textureLoad(velocity_in, clamp_coord(coord + vec2i(-1, 0), size), 0).xy;
  let right = textureLoad(velocity_in, clamp_coord(coord + vec2i(1, 0), size), 0).xy;
  let up = textureLoad(velocity_in, clamp_coord(coord + vec2i(0, -1), size), 0).xy;
  let down = textureLoad(velocity_in, clamp_coord(coord + vec2i(0, 1), size), 0).xy;
  let curl = 0.5 * ((right.y - left.y) - (down.x - up.x));
  textureStore(curl_out, coord, vec4f(curl, 0.0, 0.0, 0.0));
}
