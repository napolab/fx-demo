// Warm-start the pressure solve: reuse 80% of last frame's solution instead of
// clearing, which lets ~35 Jacobi iterations converge much further.

@group(0) @binding(0) var<uniform> params: SimParams;
@group(0) @binding(1) var pressure_in: texture_2d<f32>;
@group(0) @binding(2) var pressure_out: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (f32(id.x) >= params.sim_size.x || f32(id.y) >= params.sim_size.y) {
    return;
  }
  let coord = vec2i(id.xy);
  let pressure = textureLoad(pressure_in, coord, 0).x * 0.8;
  textureStore(pressure_out, coord, vec4f(pressure, 0.0, 0.0, 0.0));
}
