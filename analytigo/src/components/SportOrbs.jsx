import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { smoothBall } from './smoothBall.js'

// A 3D object floating in each Pick Your Game card.
//
// ONE canvas and ONE WebGL context for all four, not four of each. Browsers cap
// live contexts (~8–16) and silently kill the oldest when you pass it, and this
// page already spends one on the tennis ball further down. So a single fixed
// canvas covers the viewport and each frame sets a scissor + viewport rectangle
// to the card's current getBoundingClientRect(). That also means the objects
// follow the cards for free through the pinned stage's fly-in transforms —
// there is no layout to keep in sync, only a rect to read.
//
// Cards opt in with data-orb="tennis|pickle|badminton|padel".

const ORBS = ['tennis', 'pickle', 'badminton', 'padel']

// A pickleball is a perforated shell. Rather than boolean-cutting 26 holes out
// of a sphere, the holes are drawn into a texture — at this size the read is
// identical and it costs one canvas instead of a CSG pass.
function pickleTexture() {
  const S = 512
  const c = document.createElement('canvas')
  c.width = S; c.height = S
  const g = c.getContext('2d')
  g.fillStyle = '#e8e341'
  g.fillRect(0, 0, S, S)
  // faint moulding seam around the equator
  g.strokeStyle = 'rgba(0,0,0,.10)'; g.lineWidth = 3
  g.beginPath(); g.moveTo(0, S / 2); g.lineTo(S, S / 2); g.stroke()
  // holes on staggered rows; radius shrinks toward the poles so they stay
  // round once the equirectangular map wraps onto the sphere
  const rows = 7
  for (let r = 0; r < rows; r++) {
    const v = (r + 0.5) / rows
    const y = v * S
    const shrink = Math.sin(v * Math.PI)
    const n = Math.max(3, Math.round(8 * shrink))
    for (let i = 0; i < n; i++) {
      const x = ((i + (r % 2 ? 0.5 : 0)) / n) * S
      const rad = 15 * shrink + 4
      const grd = g.createRadialGradient(x, y, rad * 0.3, x, y, rad)
      grd.addColorStop(0, '#141607')
      grd.addColorStop(0.72, '#2b2f10')
      grd.addColorStop(1, 'rgba(120,120,40,0)')
      g.fillStyle = grd
      g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill()
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = THREE.RepeatWrapping
  return t
}

function shuttlecock() {
  const g = new THREE.Group()
  // cork: a hemisphere, round side down
  const cork = new THREE.Mesh(
    new THREE.SphereGeometry(0.56, 40, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xf6f2e6, roughness: 0.85, metalness: 0 }),
  )
  cork.position.y = -0.62
  g.add(cork)
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.56, 0.56, 0.30, 40),
    new THREE.MeshStandardMaterial({ color: 0xe4ddcb, roughness: 0.72 }),
  )
  band.position.y = -0.47
  g.add(band)

  // The skirt. Each feather gets its own pivot: the blade is built pointing
  // +Y, leaned outward about Z, and the pivot then spins it around Y. Doing
  // the flare and the azimuth on one object fights Euler order and collapses
  // the skirt into a tube, which is exactly what happened first time.
  const feather = new THREE.MeshStandardMaterial({
    color: 0xfcfcfa, roughness: 0.6, metalness: 0, side: THREE.DoubleSide,
  })
  const shape = new THREE.Shape()
  shape.moveTo(-0.055, 0)
  shape.lineTo(0.055, 0)
  shape.lineTo(0.20, 1.25)
  shape.lineTo(-0.20, 1.25)
  shape.lineTo(-0.055, 0)
  const quill = new THREE.ShapeGeometry(shape)
  const FEATHERS = 16
  for (let i = 0; i < FEATHERS; i++) {
    const pivot = new THREE.Group()
    const f = new THREE.Mesh(quill, feather)
    f.position.set(0.40, -0.34, 0)
    f.rotation.z = -0.36            // lean the blade outward
    pivot.add(f)
    pivot.rotation.y = (i / FEATHERS) * Math.PI * 2
    g.add(pivot)
  }
  g.position.y = -0.05
  g.scale.setScalar(0.92)
  return g
}

// A padel ball is a tennis ball with less pressure, so two identical balls in
// one row would read as a bug rather than a distinction. The paddle is what
// actually identifies the sport: a solid perforated bat, no strings.
function paddle() {
  const g = new THREE.Group()
  const S = 256
  const c = document.createElement('canvas')
  c.width = S; c.height = S
  const x = c.getContext('2d')
  x.fillStyle = '#12161c'; x.fillRect(0, 0, S, S)
  for (let r = 0; r < 7; r++) {
    for (let i = 0; i < 7; i++) {
      const px = (i + 0.5) / 7 * S
      const py = (r + 0.5) / 7 * S
      x.fillStyle = '#05070a'
      x.beginPath(); x.arc(px, py, 9, 0, Math.PI * 2); x.fill()
      x.strokeStyle = 'rgba(214,246,55,.35)'; x.lineWidth = 2
      x.beginPath(); x.arc(px, py, 9, 0, Math.PI * 2); x.stroke()
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace

  const face = new THREE.Shape()
  face.moveTo(0, 0.95)
  face.bezierCurveTo(0.62, 0.95, 0.78, 0.30, 0.66, -0.20)
  face.bezierCurveTo(0.56, -0.62, 0.30, -0.80, 0, -0.80)
  face.bezierCurveTo(-0.30, -0.80, -0.56, -0.62, -0.66, -0.20)
  face.bezierCurveTo(-0.78, 0.30, -0.62, 0.95, 0, 0.95)
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(face, { depth: 0.13, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.035, bevelSegments: 3, curveSegments: 28 }),
    [
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.44, metalness: 0.15 }),
      new THREE.MeshStandardMaterial({ color: 0x1a1f26, roughness: 0.5, metalness: 0.2 }),
    ],
  )
  body.position.z = -0.065
  body.position.y = 0.22
  g.add(body)

  const grip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.115, 0.135, 0.62, 24),
    new THREE.MeshStandardMaterial({ color: 0x0d1014, roughness: 0.88 }),
  )
  grip.position.y = -0.86
  g.add(grip)
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.10, 24),
    new THREE.MeshStandardMaterial({ color: 0xd6f637, roughness: 0.4, metalness: 0.3 }),
  )
  collar.position.y = -0.53
  g.add(collar)
  g.scale.setScalar(0.86)
  g.position.y = 0.30
  return g
}

export default function SportOrbs() {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canvas = canvasRef.current
    if (!canvas) return

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' })
    } catch {
      return // no WebGL — the cards simply keep their photo, nothing breaks
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.24
    renderer.setScissorTest(true)

    const pmrem = new THREE.PMREMGenerator(renderer)
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

    const scene = new THREE.Scene()
    scene.environment = envTex
    const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(3, 5, 4); scene.add(key)
    const fill = new THREE.DirectionalLight(0xffffff, 1.2); fill.position.set(-4, -1, 3); scene.add(fill)
    const rim = new THREE.PointLight(0xffffff, 9, 40); rim.position.set(-2.5, 2, -3); scene.add(rim)
    scene.add(new THREE.AmbientLight(0x2a2c30, 0.9))

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
    camera.position.set(0, 0, 6.9)

    const holder = new THREE.Group()
    scene.add(holder)

    const objects = {}
    const pickTex = pickleTexture()

    objects.pickle = new THREE.Mesh(
      new THREE.SphereGeometry(1.24, 72, 54),
      new THREE.MeshStandardMaterial({ map: pickTex, roughness: 0.42, metalness: 0.02 }),
    )
    objects.badminton = shuttlecock()
    objects.padel = paddle()

    let disposed = false
    new GLTFLoader().load('/assets/tennis_ball.glb', (gltf) => {
      if (disposed) return
      let src = null
      gltf.scene.traverse((o) => { if (o.isMesh && !src) src = o })
      if (!src) return
      const geo = smoothBall(src.geometry, 2)
      const maxAniso = renderer.capabilities.getMaxAnisotropy()
      for (const slot of ['map', 'normalMap', 'roughnessMap', 'metalnessMap']) {
        const t = src.material?.[slot]
        if (t) { t.anisotropy = maxAniso; t.needsUpdate = true }
      }
      // normalise to the same on-screen size as the procedural objects
      geo.computeBoundingSphere()
      const s = 1.3 / (geo.boundingSphere?.radius || 1)
      const base = new THREE.Mesh(geo, src.material)
      base.scale.setScalar(s)
      objects.tennis = base
    })

    const spin = { tennis: 0.010, pickle: 0.008, badminton: 0.006, padel: 0.010 }
    const clock = new THREE.Clock()
    let raf = 0

    const draw = () => {
      raf = requestAnimationFrame(draw)
      const w = window.innerWidth
      const h = window.innerHeight
      if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) ||
          canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
        renderer.setSize(w, h, false)
      }
      // Full clear first, outside the scissor. Without it, a card that scrolls
      // away leaves its last frame painted in place — each scissored render
      // only ever clears its own rectangle.
      renderer.setScissorTest(false)
      renderer.clear()
      renderer.setScissorTest(true)
      const t = clock.getElapsedTime()

      let drew = false
      for (const name of ORBS) {
        const obj = objects[name]
        if (!obj) continue
        const el = document.querySelector(`[data-orb="${name}"]`)
        if (!el) continue
        const r = el.getBoundingClientRect()
        // fully off-screen or collapsed — skip it entirely
        if (r.bottom < 0 || r.top > h || r.right < 0 || r.left > w || r.width < 8 || r.height < 8) continue
        // ...and skip it while the card is still flying in. The rect lands in
        // frame well before the card is visible, which painted the objects over
        // the hero section.
        const card = el.closest('.h-sportcard')
        if (!card) continue
        const cr = card.getBoundingClientRect()
        if (cr.top > h || cr.bottom < 0) continue
        let vis = 1
        for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
          const o = Number(getComputedStyle(n).opacity)
          if (!Number.isNaN(o)) vis *= o
          if (vis < 0.02) break
        }
        if (vis < 0.35) continue

        const bottom = h - r.bottom
        renderer.setViewport(r.left, bottom, r.width, r.height)
        renderer.setScissor(r.left, bottom, r.width, r.height)
        camera.aspect = r.width / r.height
        camera.updateProjectionMatrix()

        holder.clear()
        holder.add(obj)
        obj.rotation.y += spin[name]
        obj.rotation.x = Math.sin(t * 0.6) * 0.12
        obj.position.y = Math.sin(t * 1.25 + ORBS.indexOf(name)) * 0.10
        renderer.render(scene, camera)
        drew = true
      }
      canvas.style.opacity = drew ? '1' : '0'
    }
    draw()

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      holder.clear()
      Object.values(objects).forEach((o) => {
        o.traverse?.((n) => {
          if (n.geometry) n.geometry.dispose()
          if (n.material) (Array.isArray(n.material) ? n.material : [n.material]).forEach((m) => m.dispose())
        })
        if (o.geometry) o.geometry.dispose()
        if (o.material) o.material.dispose()
      })
      pickTex.dispose()
      envTex.dispose()
      pmrem.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, width: '100%', height: '100%',
        zIndex: 5, pointerEvents: 'none', opacity: 0, transition: 'opacity .5s ease',
      }}
    />
  )
}
