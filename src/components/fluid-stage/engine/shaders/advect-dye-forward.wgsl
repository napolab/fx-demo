// MacCormack step 1: plain semi-Lagrangian advection of the dye (phi0 -> phi1).

@group(0) @binding(0) var<uniform> params: SimParams;
@group(0) @binding(1) var lin_sampler: sampler;
@group(0) @binding(2) var velocity_in: texture_2d<f32>;
@group(0) @binding(3) var dye_in: texture_2d<f32>;
@group(0) @binding(4) var dye_out: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (f32(id.x) >= params.dye_size.x || f32(id.y) >= params.dye_size.y) {
    return;
  }
  let uv = texel_uv(id.xy, params.dye_size);
  let vel = textureSampleLevel(velocity_in, lin_sampler, uv, 0.0).xy;
  let back = uv - vel * params.dt;
  let phi1 = textureSampleLevel(dye_in, lin_sampler, back, 0.0);
  textureStore(dye_out, vec2i(id.xy), phi1);
}
