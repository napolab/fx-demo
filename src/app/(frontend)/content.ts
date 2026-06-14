export type EffectEntry = {
  no: string;
  name: string;
  href: string;
  tagline: string;
  doing: string;
  thumb: string;
  thumbAlt: string;
};

// main にマージ済みの 5 つの camera FX を掲載する。
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
  {
    no: '04',
    name: 'PolyTrace',
    href: '/polytrace',
    tagline: 'After Effects の Polytrace を WGSL の特徴点抽出で再現する。',
    doing: 'カメラ映像が Delaunay 三角形のローポリメッシュになり、点の数やノイズで質感をライブ制御できる。',
    thumb: '/thumbs/polytrace.jpg',
    thumbAlt: 'アバター alice の顔がローポリ三角形メッシュでトレースされたサムネイル',
  },
  {
    no: '05',
    name: 'Bounding Mask',
    href: '/bounding-mask',
    tagline: 'MediaPipe のポーズ検出で身体部位を単色マスクで覆う FX。',
    doing: '顔・手・腰・脚を検出し、選んだ部位をボックス／シルエットの単色マスクでリアルタイムに覆える。',
    thumb: '/thumbs/bounding-mask.jpg',
    thumbAlt: 'アバター alice の頭部がシアンの単色マスクで覆われたサムネイル',
  },
] satisfies readonly EffectEntry[];
