// Final grade: cover-fit the video source into the viewport and dim it just
// enough that the monochrome overlay lines stay readable. The video keeps its
// color; only the line work above is grayscale. No feedback/accumulation —
// every frame is graded fresh (scanlines, film grain, vignette).

// Up to 16 velocity-lit part boxes (rect in content UV, info.x = intensity).
struct GlowBox {
  rect: vec4f,
  info: vec4f,
};

struct GlowData {
  // count.x = number of active boxes.
  count: vec4f,
  boxes: array<GlowBox, 16>,
};

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var sourceTexture: texture_2d<f32>;
@group(0) @binding(3) var<uniform> glow: GlowData;

fn hash21(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453123);
}

// Soft rounded-box falloff from the box SDF: 1 inside, fading just outside.
fn boxGlow(uv: vec2f, rect: vec4f) -> f32 {
  let center = (rect.xy + rect.zw) * 0.5;
  let half = (rect.zw - rect.xy) * 0.5;
  let d = abs(uv - center) - half;
  let dist = length(max(d, vec2f(0.0))) + min(max(d.x, d.y), 0.0);
  return 1.0 - smoothstep(-0.015, 0.05, dist);
}

@fragment
fn fsMain(in: VSOut) -> @location(0) vec4f {
  // Screen → content (video) space; matches math/contentToScreen inverse.
  let uv = (in.uv - vec2f(0.5)) * params.coverScale + vec2f(0.5);

  let source = textureSample(sourceTexture, linearSampler, uv).rgb * params.sourceReady;

  // Dimmed color stage — visible image, but the white lines carry the look.
  var color = source * 0.6;

  // Velocity glow: moving part boxes light their patch of video back up.
  for (var index = 0u; index < 16u; index = index + 1u) {
    if (f32(index) >= glow.count.x) { break; }
    let box = glow.boxes[index];
    let amount = boxGlow(uv, box.rect) * box.info.x;
    color += source * amount * 0.9 + vec3f(0.06) * amount;
  }

  let scan = 0.95 + 0.05 * sin(in.uv.y * params.resolution.y * 3.14159265);
  color *= scan;
  let grain = hash21(in.uv * params.resolution + vec2f(fract(params.time) * 61.0, 0.0));
  color += (grain - 0.5) * 0.03;
  let vignette = 1.0 - smoothstep(0.6, 0.98, distance(in.uv, vec2f(0.5))) * 0.4;
  color *= vignette;

  return vec4f(color, 1.0);
}
