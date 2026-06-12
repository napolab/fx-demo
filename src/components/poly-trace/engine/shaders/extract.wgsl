// Downsample the camera frame onto a coarse colour grid for PolyTrace. Each cell
// samples the frame at its centre through a linear sampler (which acts as the
// prefilter) and packs the colour into a u32, so the CPU needs only one small
// readback per frame to flat-fill the Delaunay triangles.

struct ExtractParams {
  grid: vec2u,
  pad: vec2u,
};

@group(0) @binding(0) var sourceTexture: texture_2d<f32>;
@group(0) @binding(1) var sourceSampler: sampler;
@group(0) @binding(2) var<uniform> params: ExtractParams;
@group(0) @binding(3) var<storage, read_write> colors: array<u32>;

@compute @workgroup_size(8, 8)
fn extract(@builtin(global_invocation_id) gid: vec3u) {
  if (gid.x >= params.grid.x || gid.y >= params.grid.y) {
    return;
  }

  let gridSize = vec2f(f32(params.grid.x), f32(params.grid.y));
  let uv = (vec2f(f32(gid.x), f32(gid.y)) + vec2f(0.5)) / gridSize;
  let color = textureSampleLevel(sourceTexture, sourceSampler, uv, 0.0);

  colors[gid.y * params.grid.x + gid.x] = pack4x8unorm(color);
}
