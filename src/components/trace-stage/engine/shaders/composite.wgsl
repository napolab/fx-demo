// Final grade: cover-fit the 16:9 content into the viewport, dim the live
// camera to a monochrome stage, add the green silhouette glow, then film
// texture (scanlines, grain, vignette, slight chromatic aberration).

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var cameraTexture: texture_2d<f32>;
@group(0) @binding(3) var maskTexture: texture_2d<f32>;
@group(0) @binding(4) var trailTexture: texture_2d<f32>;

fn hash21(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453123);
}

@fragment
fn fsMain(in: VSOut) -> @location(0) vec4f {
  // Screen → content (camera) space; matches math/contentToScreen inverse.
  let uv = (in.uv - vec2f(0.5)) * params.coverScale + vec2f(0.5);

  let aberration = 0.0016;
  let camR = textureSample(cameraTexture, linearSampler, uv + vec2f(aberration, 0.0)).r;
  let camG = textureSample(cameraTexture, linearSampler, uv).g;
  let camB = textureSample(cameraTexture, linearSampler, uv - vec2f(aberration, 0.0)).b;
  let cam = vec3f(camR, camG, camB) * params.cameraReady;
  let luma = dot(cam, vec3f(0.2126, 0.7152, 0.0722));

  let trail = textureSample(trailTexture, linearSampler, uv).r;
  let mask = textureSample(maskTexture, linearSampler, uv).r;

  // Dim monochrome stage with a whisper of the live color image.
  var color = vec3f(luma) * 0.16 + cam * 0.05;
  // Green silhouette glow: lingering trail plus a brighter fresh-mask core.
  let lineGreen = vec3f(0.486, 0.988, 0.0);
  color += lineGreen * (trail * 0.20 + mask * 0.10);

  let scan = 0.93 + 0.07 * sin(in.uv.y * params.resolution.y * 3.14159265);
  color *= scan;
  let grain = hash21(in.uv * params.resolution + vec2f(fract(params.time) * 61.0, 0.0));
  color += (grain - 0.5) * 0.035;
  let vignette = 1.0 - smoothstep(0.55, 0.95, distance(in.uv, vec2f(0.5))) * 0.5;
  color *= vignette;

  return vec4f(color, 1.0);
}
