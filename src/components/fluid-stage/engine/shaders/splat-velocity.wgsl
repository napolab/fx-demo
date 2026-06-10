// Adds Gaussian force splats (pointers, idle orbits) into the velocity field.

@group(0) @binding(0) var<uniform> params: SimParams;
@group(0) @binding(1) var<uniform> splats: SplatList;
@group(0) @binding(2) var velocity_in: texture_2d<f32>;
@group(0) @binding(3) var velocity_out: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (f32(id.x) >= params.sim_size.x || f32(id.y) >= params.sim_size.y) {
    return;
  }
  let uv = texel_uv(id.xy, params.sim_size);
  var vel = textureLoad(velocity_in, vec2i(id.xy), 0).xy;
  let aspect = vec2f(params.canvas_aspect, 1.0);
  let count = u32(params.splat_count);
  for (var i = 0u; i < count; i = i + 1u) {
    let s = splats.items[i];
    let d = (uv - s.pos) * aspect;
    let falloff = exp(-dot(d, d) / max(s.radius * s.radius, 0.000001));
    vel = vel + s.vel * (falloff * s.strength);
    // Outward impulse: an ink drop hitting the surface blooms radially.
    let outward = d / (length(d) + 0.0001);
    vel = vel + outward * (falloff * s.radial_impulse);
  }
  textureStore(velocity_out, vec2i(id.xy), vec4f(vel, 0.0, 0.0));
}
