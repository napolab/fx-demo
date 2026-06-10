// MacCormack step 2: advect phi1 backwards in time (phi1 -> phi2) to estimate the error.

@group(0) @binding(0) var<uniform> params: SimParams;
@group(0) @binding(1) var lin_sampler: sampler;
@group(0) @binding(2) var velocity_in: texture_2d<f32>;
@group(0) @binding(3) var phi1_in: texture_2d<f32>;
@group(0) @binding(4) var dye_out: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (f32(id.x) >= params.dye_size.x || f32(id.y) >= params.dye_size.y) {
    return;
  }
  let uv = texel_uv(id.xy, params.dye_size);
  let vel = textureSampleLevel(velocity_in, lin_sampler, uv, 0.0).xy;
  let forward = uv + vel * params.dt;
  let phi2 = textureSampleLevel(phi1_in, lin_sampler, forward, 0.0);
  textureStore(dye_out, vec2i(id.xy), phi2);
}
