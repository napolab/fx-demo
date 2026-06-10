// Advected UV-offset field: o(x) <- o(x - v dt) - v dt, relaxing toward identity.
// The render pass warps the LIVE camera frame through this field, so camera content
// is always current while its geometry is carried by the fluid (no feedback loop).

@group(0) @binding(0) var<uniform> params: SimParams;
@group(0) @binding(1) var lin_sampler: sampler;
@group(0) @binding(2) var velocity_in: texture_2d<f32>;
@group(0) @binding(3) var offset_in: texture_2d<f32>;
@group(0) @binding(4) var offset_out: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (f32(id.x) >= params.sim_size.x || f32(id.y) >= params.sim_size.y) {
    return;
  }
  let uv = texel_uv(id.xy, params.sim_size);
  let vel = textureSampleLevel(velocity_in, lin_sampler, uv, 0.0).xy;
  let back = uv - vel * params.dt;
  var offset = textureSampleLevel(offset_in, lin_sampler, back, 0.0).xy;
  offset = offset - vel * params.dt;
  // Ease back toward the undistorted image over a few seconds.
  offset = offset * exp(-params.dt * 0.4);
  // Cap the warp so the image never folds over itself completely.
  let mag = length(offset);
  if (mag > 0.35) {
    offset = offset * (0.35 / mag);
  }
  textureStore(offset_out, vec2i(id.xy), vec4f(offset, 0.0, 0.0));
}
