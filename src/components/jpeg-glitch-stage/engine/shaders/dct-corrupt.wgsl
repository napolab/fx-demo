// Pass 2: the heart of the effect. One workgroup per 8x8 block, 64 threads.
// Forward DCT (rows then columns, orthonormal — see math/dct, the executable
// spec for this kernel) -> quantize with the quality-scaled JPEG tables ->
// bitstream corruption -> inverse DCT (skippable via Advanced settings).
//
// Corruption model (the plugin's "Broken bytes"): the entropy stream is
// raster-ordered with no resync, so every block after a break decodes garbage
// and the difference-coded DC walks further off with every extra break.
// math/break-stream precomputes, per block, vec4(breaks_so_far, dc_walk.yz w)
// — the shader just reads its prefix entry.

@group(0) @binding(0) var<uniform> params: GlitchParams;
@group(0) @binding(1) var ycbcr_in: texture_2d<f32>;
@group(0) @binding(2) var ycbcr_out: texture_storage_2d<rgba16float, write>;
@group(0) @binding(3) var<storage, read> quant: array<f32, 128>;
@group(0) @binding(4) var<storage, read> breaks: array<vec4f>;

var<workgroup> block_data: array<vec3f, 64>;
var<workgroup> block_temp: array<vec3f, 64>;

const PI: f32 = 3.141592653589793;

// Orthonormal DCT-II basis: scale = sqrt(1/8) for k == 0, sqrt(2/8) otherwise.
fn basis(k: u32, n: u32) -> f32 {
  let scale = select(0.5, 0.35355339059327373, k == 0u);
  return scale * cos((2.0 * f32(n) + 1.0) * f32(k) * PI / 16.0);
}

@compute @workgroup_size(8, 8)
fn main(
  @builtin(workgroup_id) wid: vec3u,
  @builtin(local_invocation_id) lid: vec3u,
) {
  let local = lid.y * 8u + lid.x;
  let coord = vec2u(wid.xy * 8u + lid.xy);
  let size = vec2u(params.proc_size);

  let blocks_x = size.x / 8u;
  let stream_pos = wid.y * blocks_x + wid.x;
  let prefix = breaks[stream_pos];
  let break_count = u32(prefix.x);
  let corrupted = break_count > 0u;
  let run_hash = hash_combine(break_count, u32(params.seed) ^ 0x77a1u);

  // Desync: past a break the decoder reads "someone else's" content — slide
  // the source sideways; each new break re-rolls the offset.
  let slide = select(0.0, floor(hash01(run_hash) * 56.0), corrupted);
  let load_x = clamp(i32(coord.x) - i32(slide), 0, i32(size.x) - 1);
  let load_y = i32(min(coord.y, size.y - 1u));
  block_data[local] = textureLoad(ycbcr_in, vec2i(load_x, load_y), 0).xyz;
  workgroupBarrier();

  // Forward DCT, rows: thread = (frequency lid.x, row lid.y).
  var acc = vec3f(0.0);
  for (var n = 0u; n < 8u; n = n + 1u) {
    acc = acc + block_data[lid.y * 8u + n] * basis(lid.x, n);
  }
  block_temp[local] = acc;
  workgroupBarrier();

  // Forward DCT, columns: thread = (column lid.x, frequency lid.y).
  acc = vec3f(0.0);
  for (var m = 0u; m < 8u; m = m + 1u) {
    acc = acc + block_temp[m * 8u + lid.x] * basis(lid.y, m);
  }
  block_data[local] = acc;
  workgroupBarrier();

  // Quantize (compression) — always on, like a JPEG encoder saving the frame.
  let coeff = block_data[local];
  let q_luma = max(quant[local], 0.0001);
  let q_chroma = max(quant[local + 64u], 0.0001);
  var mutated = vec3f(
    round(coeff.x / q_luma) * q_luma,
    round(coeff.y / q_chroma) * q_chroma,
    round(coeff.z / q_chroma) * q_chroma,
  );

  // Mangle coefficients past a break. Donor reads happen before the barrier
  // below, so the shared array is stable here.
  if (corrupted) {
    let roll = hash01(hash_combine(run_hash, local + 1u));
    if (roll < 0.3) {
      mutated = vec3f(0.0);
    } else if (roll < 0.5) {
      let donor = hash_u32(hash_combine(run_hash, local + 101u)) % 64u;
      mutated = block_data[donor];
    }
    if (local == 0u) {
      // The accumulated DC random walk: with many breaks the chroma walk
      // saturates and whole regions flatten into acid-color fields.
      mutated = mutated + prefix.yzw;
    }
  }
  workgroupBarrier();
  block_data[local] = mutated;
  workgroupBarrier();

  // Inverse DCT, rows: pixel n of each row from its row spectrum.
  acc = vec3f(0.0);
  for (var k = 0u; k < 8u; k = k + 1u) {
    acc = acc + block_data[lid.y * 8u + k] * basis(k, lid.x);
  }
  block_temp[local] = acc;
  workgroupBarrier();

  // Inverse DCT, columns.
  acc = vec3f(0.0);
  for (var j = 0u; j < 8u; j = j + 1u) {
    acc = acc + block_temp[j * 8u + lid.x] * basis(j, lid.y);
  }

  // Advanced settings: with Inverse DCT off, expose the raw mangled spectrum.
  let stored = select(block_data[local], acc, params.inverse_dct > 0.5);
  if (coord.x < size.x && coord.y < size.y) {
    textureStore(ycbcr_out, vec2i(coord), vec4f(stored, 1.0));
  }
}
