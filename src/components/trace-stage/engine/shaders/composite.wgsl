// Final grade: cover-fit the video source into the viewport and dim it just
// enough that the monochrome overlay lines stay readable. The video keeps its
// color; only the line work above is grayscale. No feedback/accumulation —
// every frame is graded fresh (scanlines, film grain, vignette).

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var sourceTexture: texture_2d<f32>;

fn hash21(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453123);
}

@fragment
fn fsMain(in: VSOut) -> @location(0) vec4f {
  // Screen → content (video) space; matches math/contentToScreen inverse.
  let uv = (in.uv - vec2f(0.5)) * params.coverScale + vec2f(0.5);

  let source = textureSample(sourceTexture, linearSampler, uv).rgb * params.sourceReady;

  // Dimmed color stage — visible image, but the white lines carry the look.
  var color = source * 0.6;

  let scan = 0.95 + 0.05 * sin(in.uv.y * params.resolution.y * 3.14159265);
  color *= scan;
  let grain = hash21(in.uv * params.resolution + vec2f(fract(params.time) * 61.0, 0.0));
  color += (grain - 0.5) * 0.03;
  let vignette = 1.0 - smoothstep(0.6, 0.98, distance(in.uv, vec2f(0.5))) * 0.4;
  color *= vignette;

  return vec4f(color, 1.0);
}
