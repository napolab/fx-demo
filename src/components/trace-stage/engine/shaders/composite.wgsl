// Final grade: cover-fit the camera into the viewport and dim it to a pure
// monochrome stage (scanlines, film grain, vignette). All line work is drawn
// by the p5 overlay — this layer stays grayscale by design.

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var cameraTexture: texture_2d<f32>;

fn hash21(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453123);
}

@fragment
fn fsMain(in: VSOut) -> @location(0) vec4f {
  // Screen → content (camera) space; matches math/contentToScreen inverse.
  let uv = (in.uv - vec2f(0.5)) * params.coverScale + vec2f(0.5);

  let cam = textureSample(cameraTexture, linearSampler, uv).rgb * params.cameraReady;
  let luma = dot(cam, vec3f(0.2126, 0.7152, 0.0722));

  // Dim monochrome stage — bright enough to read the body, dark enough that
  // the white overlay lines carry the image.
  var color = vec3f(luma) * 0.22;

  let scan = 0.93 + 0.07 * sin(in.uv.y * params.resolution.y * 3.14159265);
  color *= scan;
  let grain = hash21(in.uv * params.resolution + vec2f(fract(params.time) * 61.0, 0.0));
  color += (grain - 0.5) * 0.035;
  let vignette = 1.0 - smoothstep(0.55, 0.95, distance(in.uv, vec2f(0.5))) * 0.5;
  color *= vignette;

  return vec4f(color, 1.0);
}
