// Pass 3: present. Block-row horizontal displacement (broken scanlines),
// then YCbCr -> RGB. Nearest sampling keeps the 8x8 blocks crisp when the
// processing grid is upscaled to the canvas.

@group(0) @binding(0) var<uniform> params: GlitchParams;
@group(0) @binding(1) var glitch_tex: texture_2d<f32>;
@group(0) @binding(2) var glitch_sampler: sampler;

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vs_main(@builtin(vertex_index) index: u32) -> VertexOut {
  var positions = array<vec2f, 3>(vec2f(-1.0, -3.0), vec2f(-1.0, 1.0), vec2f(3.0, 1.0));
  let pos = positions[index];
  var output: VertexOut;
  output.position = vec4f(pos, 0.0, 1.0);
  output.uv = vec2f(pos.x * 0.5 + 0.5, 0.5 - pos.y * 0.5);
  return output;
}

@fragment
fn fs_main(frag: VertexOut) -> @location(0) vec4f {
  if (params.camera_ready < 0.5) {
    return vec4f(0.0, 0.0, 0.0, 1.0);
  }

  // Block-row displacement: each 8-texel row band may tear horizontally.
  let row = u32(frag.uv.y * params.proc_size.y / 8.0);
  let row_hash = hash_combine(row + 31u, u32(params.seed) ^ 0x51edu);
  var uv = frag.uv;
  if (hash01(row_hash) < params.shift * 0.6) {
    let magnitude = (hash01(row_hash ^ 0x9d3au) - 0.5) * params.shift;
    uv.x = fract(uv.x + magnitude);
  }

  let ycc = textureSampleLevel(glitch_tex, glitch_sampler, uv, 0.0).xyz;
  let rgb = ycbcr_to_rgb(ycc);
  return vec4f(clamp(rgb, vec3f(0.0), vec3f(1.0)), 1.0);
}
