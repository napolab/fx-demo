// Final grade: cover-fit the video source into the viewport. The stage is
// grayscale by default; color is REVEALED only inside part boxes that are
// moving fast (intensity from the session's velocity tracker). No
// feedback/accumulation — every frame is graded fresh (scanlines, grain,
// vignette).

// Up to 16 motion-tracked part boxes (rect in content UV, info.x = intensity).
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
  let luma = dot(source, vec3f(0.2126, 0.7152, 0.0722));

  // Color reveal: fast-moving part boxes keep their color, the rest is mono.
  var reveal = 0.0;
  for (var index = 0u; index < 16u; index = index + 1u) {
    if (f32(index) >= glow.count.x) { break; }
    let box = glow.boxes[index];
    reveal = max(reveal, boxGlow(uv, box.rect) * box.info.x);
  }
  let graded = mix(vec3f(luma), source, clamp(reveal, 0.0, 1.0));

  var color = graded * 0.6;

  let scan = 0.95 + 0.05 * sin(in.uv.y * params.resolution.y * 3.14159265);
  color *= scan;
  let grain = hash21(in.uv * params.resolution + vec2f(fract(params.time) * 61.0, 0.0));
  color += (grain - 0.5) * 0.03;
  let vignette = 1.0 - smoothstep(0.6, 0.98, distance(in.uv, vec2f(0.5))) * 0.4;
  color *= vignette;

  return vec4f(color, 1.0);
}
