// Pass 1: camera RGB -> YCbCr at processing resolution.
// Luma is sampled exactly; chroma is snapped to a coarse cell grid with a
// per-cell random offset — the "chroma subsampling collapse".

@group(0) @binding(0) var<uniform> params: GlitchParams;
@group(0) @binding(1) var camera_tex: texture_2d<f32>;
@group(0) @binding(2) var camera_sampler: sampler;
@group(0) @binding(3) var ycbcr_out: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let size = vec2u(params.proc_size);
  if (gid.x >= size.x || gid.y >= size.y) {
    return;
  }
  let texel = vec2f(gid.xy);
  let uv = (texel + vec2f(0.5)) / params.proc_size;

  let luma_uv = camera_uv(uv, params.cam_aspect, params.canvas_aspect);
  let luma_rgb = textureSampleLevel(camera_tex, camera_sampler, luma_uv, 0.0).rgb;
  let luma = rgb_to_ycbcr(luma_rgb).x;

  // 4:2:0 always (cell = 2); the chroma slider widens cells up to 32 texels and
  // adds a random per-cell wobble so color bleeds across block boundaries.
  let cell = 2.0 + floor(params.chroma * 30.0);
  let cell_id = vec2u(floor(texel / cell));
  let cell_hash = hash_combine(cell_id.x * 1973u + cell_id.y * 9277u + 1u, u32(params.seed));
  let wobble = (vec2f(hash01(cell_hash), hash01(cell_hash ^ 0x68bc21u)) - vec2f(0.5)) * params.chroma * 48.0;
  let chroma_texel = (floor(texel / cell) + vec2f(0.5)) * cell + wobble;
  let chroma_pos = clamp(chroma_texel / params.proc_size, vec2f(0.0), vec2f(1.0));
  let chroma_uv = camera_uv(chroma_pos, params.cam_aspect, params.canvas_aspect);
  let chroma_rgb = textureSampleLevel(camera_tex, camera_sampler, chroma_uv, 0.0).rgb;
  let cbcr = rgb_to_ycbcr(chroma_rgb).yz;

  textureStore(ycbcr_out, vec2i(gid.xy), vec4f(luma, cbcr, 1.0));
}
