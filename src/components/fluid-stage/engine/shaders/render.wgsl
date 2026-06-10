// Final composite: dye + flow-aligned chromatic aberration + single-pass bloom +
// curl-driven iridescent shimmer + grade modes + vignette/grain, ACES tone-mapped.

@group(0) @binding(0) var<uniform> params: SimParams;
@group(0) @binding(1) var lin_sampler: sampler;
@group(0) @binding(2) var dye_tex: texture_2d<f32>;
@group(0) @binding(3) var velocity_tex: texture_2d<f32>;
@group(0) @binding(4) var curl_tex: texture_2d<f32>;
@group(0) @binding(5) var offset_tex: texture_2d<f32>;
@group(0) @binding(6) var camera_tex: texture_2d<f32>;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vs(@builtin(vertex_index) vertex_index: u32) -> VSOut {
  var positions = array<vec2f, 3>(vec2f(-1.0, -3.0), vec2f(3.0, 1.0), vec2f(-1.0, 1.0));
  let p = positions[vertex_index];
  var out: VSOut;
  out.pos = vec4f(p, 0.0, 1.0);
  out.uv = vec2f(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
  return out;
}

fn sample_dye(uv: vec2f) -> vec3f {
  return textureSampleLevel(dye_tex, lin_sampler, uv, 0.0).rgb;
}

fn bloom(uv: vec2f) -> vec3f {
  let radius = 7.0 / params.dye_size;
  var taps = array<vec2f, 8>(
    vec2f(-0.326, -0.406), vec2f(-0.840, -0.074), vec2f(-0.696, 0.457), vec2f(-0.203, 0.621),
    vec2f(0.962, -0.195), vec2f(0.473, -0.480), vec2f(0.519, 0.767), vec2f(0.185, -0.893),
  );
  var acc = vec3f(0.0);
  for (var i = 0u; i < 8u; i = i + 1u) {
    let tap_color = sample_dye(uv + taps[i] * radius);
    acc = acc + max(tap_color - vec3f(0.7), vec3f(0.0));
  }
  return acc * (0.45 / 8.0);
}

fn aces(x: vec3f) -> vec3f {
  let a = 2.51;
  let b = 0.03;
  let c = 2.43;
  let d = 0.59;
  let e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), vec3f(0.0), vec3f(1.0));
}

fn hash21(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

fn grade(color: vec3f, shimmer_color: vec3f, in: VSOut) -> vec3f {
  switch (i32(params.grade_mode)) {
    // Sumi: suminagashi — washi-white substrate, dye density becomes black ink
    // via Beer-Lambert absorption. Gray bleeding edges, lacquer-black cores.
    case 1: {
      let fiber = hash21(floor(in.uv * vec2f(640.0, 420.0)) * 0.173);
      let paper = vec3f(0.955, 0.94, 0.91) * (0.972 + 0.028 * fiber);
      // Max-channel density + strong absorption: thin washes read as soft gray,
      // stroke cores go lacquer-black.
      let density = max(color.r, max(color.g, color.b));
      let tone = exp(-density * 14.0);
      // Dense ink leans slightly cool, like wet sumi.
      let ink_tint = mix(vec3f(1.0), vec3f(0.82, 0.88, 1.0), 1.0 - tone);
      return clamp(paper * tone * ink_tint + shimmer_color * 0.03, vec3f(0.0), vec3f(1.0));
    }
    // Mirror: the webcam liquid-mirror — natural hues, gentle saturation lift.
    case 2: {
      return mix(vec3f(luma(color)), color, 1.12) + shimmer_color * 0.2;
    }
    // Ink: aged pigment settling in dark water — restrained, warm charcoal depths.
    default: {
      let c = mix(vec3f(luma(color)), color, 1.18) * 1.35;
      return max(c, vec3f(0.0)) + shimmer_color * 0.14 + vec3f(0.012, 0.01, 0.008);
    }
  }
}

@fragment
fn fs(in: VSOut) -> @location(0) vec4f {
  let uv = in.uv;
  let vel = textureSampleLevel(velocity_tex, lin_sampler, uv, 0.0).xy;

  // Chromatic aberration along the local flow direction.
  let shift = vel * 0.008;
  var color = vec3f(
    sample_dye(uv + shift).r,
    sample_dye(uv).g,
    sample_dye(uv - shift).b,
  );

  color = color + bloom(uv);

  // Mirror mode: the LIVE camera frame, warped through the advected offset field.
  // Content is always current; only its geometry is carried by the fluid.
  if (i32(params.grade_mode) == 2) {
    let warp = textureSampleLevel(offset_tex, lin_sampler, uv, 0.0).xy;
    let warped = clamp(uv + warp, vec2f(0.001), vec2f(0.999));
    let cam_live = textureSampleLevel(camera_tex, lin_sampler, camera_uv(warped, params.canvas_aspect, params.cam_aspect), 0.0).rgb;
    let base = select(procedural_color(warped, params.time, params.canvas_aspect), cam_live, params.camera_ready > 0.5);
    color = base + color * 0.85;
  }

  // Kintsugi: vortex cores glint with antique gold, like lacquer seams in the flow.
  let curl_value = textureSampleLevel(curl_tex, lin_sampler, uv, 0.0).x;
  // High threshold: only genuine vortex cores glint — residual curl noise stays dark.
  let shimmer = pow(smoothstep(0.12, 0.5, abs(curl_value)), 1.4);
  let shimmer_color = vec3f(1.0, 0.76, 0.42) * shimmer;

  color = grade(color, shimmer_color, in);

  // Vignette + animated film grain. The milk substrate takes a much lighter vignette.
  let centered = uv - vec2f(0.5);
  let vignette = smoothstep(0.92, 0.32, length(centered * vec2f(params.canvas_aspect * 0.72, 1.0)));
  let vignette_floor = select(0.42, 0.8, i32(params.grade_mode) == 1);
  color = color * mix(vignette_floor, 1.0, vignette);

  color = aces(max(color, vec3f(0.0)));
  // The swap chain is non-sRGB; encode gamma manually. Grain is added after the
  // gamma encode — in linear space it would blow up in the deep blacks.
  color = pow(color, vec3f(1.0 / 2.2));
  color = color + vec3f(hash21(uv * 941.7 + vec2f(params.time * 61.3, params.time * 12.7)) - 0.5) * 0.012;
  return vec4f(clamp(color, vec3f(0.0), vec3f(1.0)), 1.0);
}
