// MacCormack step 3: error-corrected advection, clamped to the local neighborhood
// so the correction cannot overshoot. Keeps dye filaments crisp.

@group(0) @binding(0) var<uniform> params: SimParams;
@group(0) @binding(1) var lin_sampler: sampler;
@group(0) @binding(2) var velocity_in: texture_2d<f32>;
@group(0) @binding(3) var dye_in: texture_2d<f32>;
@group(0) @binding(4) var phi1_in: texture_2d<f32>;
@group(0) @binding(5) var phi2_in: texture_2d<f32>;
@group(0) @binding(6) var dye_out: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (f32(id.x) >= params.dye_size.x || f32(id.y) >= params.dye_size.y) {
    return;
  }
  let coord = vec2i(id.xy);
  let uv = texel_uv(id.xy, params.dye_size);
  let vel = textureSampleLevel(velocity_in, lin_sampler, uv, 0.0).xy;
  let back = uv - vel * params.dt;

  let phi0 = textureLoad(dye_in, coord, 0);
  let phi1 = textureLoad(phi1_in, coord, 0);
  let phi2 = textureLoad(phi2_in, coord, 0);
  var corrected = phi1 + 0.5 * (phi0 - phi2);

  // Clamp against the bilinear footprint of the source at the backtraced position.
  let pos = back * params.dye_size - vec2f(0.5);
  let base = vec2i(floor(pos));
  let size = params.dye_size;
  let c00 = textureLoad(dye_in, clamp_coord(base, size), 0);
  let c10 = textureLoad(dye_in, clamp_coord(base + vec2i(1, 0), size), 0);
  let c01 = textureLoad(dye_in, clamp_coord(base + vec2i(0, 1), size), 0);
  let c11 = textureLoad(dye_in, clamp_coord(base + vec2i(1, 1), size), 0);
  let lo = min(min(c00, c10), min(c01, c11));
  let hi = max(max(c00, c10), max(c01, c11));
  corrected = clamp(corrected, lo, hi);

  let result = max(corrected * params.dye_dissipation, vec4f(0.0));
  textureStore(dye_out, coord, result);
}
