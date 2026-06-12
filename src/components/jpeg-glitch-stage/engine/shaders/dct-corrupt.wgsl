// Pass 2: the heart of the effect. One workgroup per 8x8 block, 64 threads.
// Forward DCT (rows then columns, orthonormal — see math/dct, the executable
// spec for this kernel) -> quantize with the quality-scaled JPEG tables ->
// bitstream-style cascade corruption -> inverse DCT.
//
// Corruption model (mirrors the aescripts plugin's "Broken bytes"): each block
// row rolls random break points; from a break to the end of the row the
// "stream" is desynced — content slides sideways, coefficients get mangled and
// the run picks up a persistent DC tint (the rainbow tears of a broken JPEG).

@group(0) @binding(0) var<uniform> params: GlitchParams;
@group(0) @binding(1) var ycbcr_in: texture_2d<f32>;
@group(0) @binding(2) var ycbcr_out: texture_storage_2d<rgba16float, write>;
@group(0) @binding(3) var<storage, read> quant: array<f32, 128>;

var<workgroup> block_data: array<vec3f, 64>;
var<workgroup> block_temp: array<vec3f, 64>;
var<workgroup> wg_break_at: i32;

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

  // Scan this block row for the most recent break point at or before us.
  // One thread scans; the whole workgroup shares the verdict.
  if (local == 0u) {
    var found = -1;
    let p_break = params.amount * params.amount * 0.08;
    for (var i = 0u; i <= wid.x; i = i + 1u) {
      let roll = hash01(hash_combine(wid.y * 8192u + i + 1u, u32(params.seed) ^ 0xb5e3u));
      if (roll < p_break) {
        found = i32(i);
      }
    }
    wg_break_at = found;
  }
  workgroupBarrier();
  let break_at = wg_break_at;
  let in_cascade = break_at >= 0;
  let run_hash = hash_combine(wid.y * 8192u + u32(break_at + 1), u32(params.seed) ^ 0x77a1u);

  // Desync: the rest of the run decodes "someone else's" content — slide the
  // source sideways for every block past the break.
  let slide = select(0.0, floor(hash01(run_hash) * 40.0 * params.amount), in_cascade);
  let load_x = clamp(i32(coord.x) - i32(slide), 0, i32(size.x) - 1i);
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

  // Quantize (quality crush) — always on, like a JPEG encoder saving the frame.
  let coeff = block_data[local];
  let q_luma = max(quant[local], 0.0001);
  let q_chroma = max(quant[local + 64u], 0.0001);
  var mutated = vec3f(
    round(coeff.x / q_luma) * q_luma,
    round(coeff.y / q_chroma) * q_chroma,
    round(coeff.z / q_chroma) * q_chroma,
  );

  // Mangle coefficients inside cascades, plus a sprinkle of isolated broken
  // blocks for texture. Donor reads happen before the barrier below, so the
  // shared array is stable here.
  let block_hash = hash_combine(wid.y * 4096u + wid.x + 1u, u32(params.seed));
  let salt_active = hash01(block_hash) < params.amount * 0.05;
  if (in_cascade || salt_active) {
    let mangle_hash = select(block_hash, run_hash, in_cascade);
    let roll = hash01(hash_combine(mangle_hash, local + 1u));
    if (roll < 0.3 + params.amount * 0.2) {
      mutated = vec3f(0.0);
    } else if (roll < 0.5 + params.amount * 0.2) {
      let donor = hash_u32(hash_combine(mangle_hash, local + 101u)) % 64u;
      mutated = block_data[donor];
    }
    if (in_cascade && local == 0u) {
      // Persistent DC drift for the whole run: luma jump + chroma tint, with a
      // slow walk so long runs slowly discolor — classic desynced-DC look.
      let walk = f32(i32(wid.x) - break_at) * (hash01(run_hash ^ 0x4444u) - 0.5) * 0.08;
      let drift = vec3f(
        (hash01(run_hash ^ 0x1111u) - 0.5) * 3.0 + walk,
        (hash01(run_hash ^ 0x2222u) - 0.5) * 1.4,
        (hash01(run_hash ^ 0x3333u) - 0.5) * 1.4,
      );
      mutated = mutated + drift * params.amount;
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

  if (coord.x < size.x && coord.y < size.y) {
    textureStore(ycbcr_out, vec2i(coord), vec4f(acc, 1.0));
  }
}
