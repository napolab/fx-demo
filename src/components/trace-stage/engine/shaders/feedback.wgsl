// Trail accumulation: every texel keeps the brighter of "fresh mask" and
// "decayed previous trail", producing the lingering silhouette glow.

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var maskTexture: texture_2d<f32>;
@group(0) @binding(3) var trailTexture: texture_2d<f32>;

@fragment
fn fsMain(in: VSOut) -> @location(0) vec4f {
  let mask = textureSample(maskTexture, linearSampler, in.uv).r;
  let previous = textureSample(trailTexture, linearSampler, in.uv).r;
  let trail = max(mask, previous * params.decay);
  return vec4f(trail, 0.0, 0.0, 1.0);
}
