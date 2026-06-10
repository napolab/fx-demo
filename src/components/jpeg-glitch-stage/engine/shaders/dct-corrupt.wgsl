// Pass 2: the heart of the effect. One workgroup per 8x8 block, 64 threads.
// Forward DCT (rows then columns, orthonormal — see math/dct, the executable
// spec for this kernel) -> quantize with the quality-scaled JPEG tables ->
// stochastically corrupt coefficients (drop / steal / boost, seed-deterministic)
// -> inverse DCT.

@group(0) @binding(0) var<uniform> params: GlitchParams;
@group(0) @binding(1) var ycbcr_in: texture_2d<f32>;
@group(0) @binding(2) var ycbcr_out: texture_storage_2d<rgba16float, write>;
@group(0) @binding(3) var<storage, read> quant: array<f32, 128>;

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
  let safe = min(coord, size - vec2u(1u));

  block_data[local] = textureLoad(ycbcr_in, vec2i(safe), 0).xyz;
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

  // Corruption (amount): a hash gate picks which blocks break for this seed,
  // then each coefficient independently drops / steals / boosts. Donor reads
  // happen before the barrier below, so the shared array is stable here.
  let block_id = wid.y * 4096u + wid.x;
  let block_hash = hash_combine(block_id + 1u, u32(params.seed));
  let block_active = hash01(block_hash) < params.amount * 0.85;
  if (block_active) {
    let roll = hash01(hash_combine(block_hash, local + 1u));
    let strike = params.amount * 0.9;
    if (roll < strike * 0.45) {
      mutated = vec3f(0.0);
    } else if (roll < strike * 0.7) {
      let donor = hash_u32(hash_combine(block_hash, local + 101u)) % 64u;
      mutated = block_data[donor];
    } else if (roll < strike) {
      let boost = 1.0 + hash01(hash_combine(block_hash, local + 201u)) * 7.0;
      mutated = mutated * boost;
    }
    if (local == 0u) {
      // DC drift: whole-block brightness jumps, the classic broken-JPEG patchwork.
      mutated.x = mutated.x + (hash01(hash_combine(block_hash, 7u)) - 0.5) * params.amount * 5.0;
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
