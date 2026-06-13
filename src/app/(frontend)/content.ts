export type EffectEntry = {
  no: string;
  name: string;
  href: string;
  tagline: string;
  doing: string;
  thumb: string;
  thumbAlt: string;
};

// main にマージ済みの FX のみを掲載する。PolyTrace / Bounding Mask は
// それぞれのブランチが main にマージされた時点でここへ追記する。
export const effects = [
  {
    no: '01',
    name: 'Liquid Mirror',
    href: '/liquid-mirror',
    tagline: 'WebGPU/WGSL の stable-fluids が webcam を液体の鏡に変える。',
    doing: 'webcam 映像が液体になり、ポインタのドラッグで自由に攪拌して絹のような渦を起こせる。',
    thumb: '/thumbs/liquid-mirror.jpg',
    thumbAlt: 'VRChat の情景が液体に溶け、翡翠と銀の渦を描くサムネイル',
  },
  {
    no: '02',
    name: 'JPEG Glitch',
    href: '/jpeg-glitch',
    tagline: 'After Effects の JPEG Glitch を WebGPU 上の実コーデックで再現する。',
    doing: 'YCbCr 変換・8×8 DCT・量子化を実際に通し、係数破壊のパラメータでコーデックの壊れ方をライブ制御できる。',
    thumb: '/thumbs/jpeg-glitch.jpg',
    thumbAlt: 'アバター milfy の顔が JPEG コーデックの破壊で断片化したサムネイル',
  },
  {
    no: '03',
    name: 'Trace',
    href: '/trace',
    tagline: '身体輪郭をモノクロのワイヤーフレームでトレースする p5.js × WebGPU の FX。',
    doing: 'カメラに映る身体の輪郭がワイヤーフレーム化され、残像とトラッキング HUD の重なりを楽しめる。',
    thumb: '/thumbs/trace.jpg',
    thumbAlt: 'アバター milfy の輪郭がワイヤーフレームでトレースされたサムネイル',
  },
] satisfies readonly EffectEntry[];
