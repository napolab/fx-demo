// Semi-Lagrangian self-advection of the velocity field (velocity in UV units / sec).

@group(0) @binding(0) var<uniform> params: SimParams;
@group(0) @binding(1) var lin_sampler: sampler;
@group(0) @binding(2) var velocity_in: texture_2d<f32>;
@group(0) @binding(3) var velocity_out: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (f32(id.x) >= params.sim_size.x || f32(id.y) >= params.sim_size.y) {
    return;
  }
  let uv = texel_uv(id.xy, params.sim_size);
  let vel = textureSampleLevel(velocity_in, lin_sampler, uv, 0.0).xy;
  let back = uv - vel * params.dt;
  var next = textureSampleLevel(velocity_in, lin_sampler, back, 0.0).xy * params.vel_dissipation;
  // Soft speed limit keeps the solver stable under violent stirring.
  let speed = length(next);
  if (speed > 2.5) {
    next = next * (2.5 / speed);
  }
  textureStore(velocity_out, vec2i(id.xy), vec4f(next, 0.0, 0.0));
}
