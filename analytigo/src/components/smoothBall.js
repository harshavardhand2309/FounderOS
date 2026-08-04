import * as THREE from 'three'

// The GLB ships 1,664 triangles and a radius that wanders 8.361–8.516 — a 1.8%
// wobble that shows up as a visibly faceted, lumpy outline. Its UVs are a custom
// unwrap (v spans 0.014–0.654), so a stock SphereGeometry cannot be dropped in;
// the texture would not line up. Instead each triangle is split into four with
// its UVs interpolated linearly — correct here, because every triangle is
// already mapped linearly and the seam vertices are duplicated, so no triangle
// straddles the u wrap — and then every vertex is pushed out to one radius.
// Normals are replaced with exact sphere normals rather than interpolated face
// normals. Two passes takes it to 26,624 triangles and a clean silhouette.
//
// Measured: 4K and even 2K textures are indistinguishable from the shipped 1K
// at this element's 440px size (mean difference 1.88/255, 0.86% of pixels off
// by more than 8), so the geometry is the whole win and it costs no bytes.
export function smoothBall(src, passes = 2) {
  let g = src.index ? src.toNonIndexed() : src.clone()
  const centre = new THREE.Vector3()
  g.computeBoundingBox()
  g.boundingBox.getCenter(centre)
  let R = 0
  {
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      R = Math.max(R, Math.hypot(p.getX(i) - centre.x, p.getY(i) - centre.y, p.getZ(i) - centre.z))
    }
  }

  for (let pass = 0; pass < passes; pass++) {
    const pos = g.attributes.position.array
    const uv = g.attributes.uv.array
    const tris = pos.length / 9
    const P = new Float32Array(tris * 4 * 9)
    const U = new Float32Array(tris * 4 * 6)
    let pi = 0
    let ui = 0
    const mid = (a, b, o, s) => { for (let k = 0; k < s; k++) o[k] = (a[k] + b[k]) / 2 }
    const v0 = [0, 0, 0], v1 = [0, 0, 0], v2 = [0, 0, 0]
    const m01 = [0, 0, 0], m12 = [0, 0, 0], m20 = [0, 0, 0]
    const t0 = [0, 0], t1 = [0, 0], t2 = [0, 0]
    const n01 = [0, 0], n12 = [0, 0], n20 = [0, 0]
    const push = (a, b, c, ta, tb, tc) => {
      P.set(a, pi); P.set(b, pi + 3); P.set(c, pi + 6); pi += 9
      U.set(ta, ui); U.set(tb, ui + 2); U.set(tc, ui + 4); ui += 6
    }
    for (let t = 0; t < tris; t++) {
      for (let k = 0; k < 3; k++) { v0[k] = pos[t * 9 + k]; v1[k] = pos[t * 9 + 3 + k]; v2[k] = pos[t * 9 + 6 + k] }
      for (let k = 0; k < 2; k++) { t0[k] = uv[t * 6 + k]; t1[k] = uv[t * 6 + 2 + k]; t2[k] = uv[t * 6 + 4 + k] }
      mid(v0, v1, m01, 3); mid(v1, v2, m12, 3); mid(v2, v0, m20, 3)
      mid(t0, t1, n01, 2); mid(t1, t2, n12, 2); mid(t2, t0, n20, 2)
      push(v0, m01, m20, t0, n01, n20)
      push(m01, v1, m12, n01, t1, n12)
      push(m20, m12, v2, n20, n12, t2)
      push(m01, m12, m20, n01, n12, n20)
    }
    g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(P, 3))
    g.setAttribute('uv', new THREE.BufferAttribute(U, 2))
  }

  const p = g.attributes.position
  const N = new Float32Array(p.count * 3)
  for (let i = 0; i < p.count; i++) {
    const dx = p.getX(i) - centre.x, dy = p.getY(i) - centre.y, dz = p.getZ(i) - centre.z
    const d = Math.hypot(dx, dy, dz) || 1
    const nx = dx / d, ny = dy / d, nz = dz / d
    p.setXYZ(i, centre.x + nx * R, centre.y + ny * R, centre.z + nz * R)
    N[i * 3] = nx; N[i * 3 + 1] = ny; N[i * 3 + 2] = nz
  }
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3))
  return g
}
