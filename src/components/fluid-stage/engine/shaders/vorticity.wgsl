// Vorticity confinement: re-injects the small swirls that numerical diffusion kills.
// This pass is what makes the flow look silky instead of smeared.

@group(0) @binding(0) var<uniform> params: SimParams;
@group(0) @binding(1) var velocity_in: texture_2d<f32>;
@group(0) @binding(2) var curl_in: texture_2d<f32>;
@group(0) @binding(3) var velocity_out: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (f32(id.x) >= params.sim_size.x || f32(id.y) >= params.sim_size.y) {
    return;
  }
  let coord = vec2i(id.xy);
  let size = params.sim_size;
  let left = abs(textureLoad(curl_in, clamp_coord(coord + vec2i(-1, 0), size), 0).x);
  let right = abs(textureLoad(curl_in, clamp_coord(coord + vec2i(1, 0), size), 0).x);
  let up = abs(textureLoad(curl_in, clamp_coord(coord + vec2i(0, -1), size), 0).x);
  let down = abs(textureLoad(curl_in, clamp_coord(coord + vec2i(0, 1), size), 0).x);
  let center = textureLoad(curl_in, coord, 0).x;

  var gradient = 0.5 * vec2f(right - left, down - up);
  gradient = gradient / (length(gradient) + 0.0001);
  // Deadband: confinement on numerical noise speckles still water — only amplify
  // swirls that actually exist.
  let presence = smoothstep(0.01, 0.045, abs(center));
  let force = params.vorticity * center * presence * vec2f(gradient.y, -gradient.x);

  let vel = textureLoad(velocity_in, coord, 0).xy + force * params.dt;
  textureStore(velocity_out, coord, vec4f(vel, 0.0, 0.0));
}
