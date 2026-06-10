// Feeds the dye field with pointer stroke pigment. The camera is no longer
// accumulated here — the render pass warps the live frame through the offset field
// instead — so the dye carries only ink.

@group(0) @binding(0) var<uniform> params: SimParams;
@group(0) @binding(1) var<uniform> splats: SplatList;
@group(0) @binding(2) var lin_sampler: sampler;
@group(0) @binding(3) var dye_in: texture_2d<f32>;
@group(0) @binding(4) var camera_tex: texture_2d<f32>;
@group(0) @binding(5) var dye_out: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (f32(id.x) >= params.dye_size.x || f32(id.y) >= params.dye_size.y) {
    return;
  }
  let coord = vec2i(id.xy);
  let uv = texel_uv(id.xy, params.dye_size);
  var dye = textureLoad(dye_in, coord, 0).rgb;

  let cam = textureSampleLevel(camera_tex, lin_sampler, camera_uv(uv, params.canvas_aspect, params.cam_aspect), 0.0).rgb;
  let proc = procedural_color(uv, params.time, params.canvas_aspect);
  let source = clamp(select(proc, cam, params.camera_ready > 0.5), vec3f(0.0), vec3f(1.0));
  let mirror_mode = i32(params.grade_mode) == 2;

  let aspect = vec2f(params.canvas_aspect, 1.0);
  let count = u32(params.splat_count);
  for (var i = 0u; i < count; i = i + 1u) {
    let s = splats.items[i];
    let d = (uv - s.pos) * aspect;
    let falloff = exp(-dot(d, d) / max(s.radius * s.radius, 0.000001));
    // Mirror strokes echo the source image; ink strokes stay pigment-pure with a
    // faint camera tint so the drop subtly carries the viewer's colors.
    let echo = select(0.12, 0.45, mirror_mode);
    let stroke = mix(s.color.rgb, source * 1.4, echo);
    dye = dye + stroke * (falloff * s.dye_amount);
  }

  dye = clamp(dye, vec3f(0.0), vec3f(4.0));
  textureStore(dye_out, coord, vec4f(dye, 1.0));
}
