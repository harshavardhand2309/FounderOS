import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { smoothBall } from './smoothBall.js'

// Premium 3D tennis ball (uses the supplied GLB). Slow auto-rotation, gentle float,
// PBR studio reflections, themed rim glow, and a subtle mouse-parallax tilt.

export default function TennisBall({ onReveal, prompt = 'Touch the ball to reveal athlete profiles' }) {
  const mountRef = useRef(null)
  const target = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let w = mount.clientWidth || 380
    let h = mount.clientHeight || 380

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    } catch {
      // WebGL unavailable — fail gracefully (keep the app alive; reveal still works on click)
      mount.classList.add('is-error')
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(w, h)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.32
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block'
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 100)
    camera.position.set(0, 0, 6)

    // realistic PBR reflections from a neutral room
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = envTex

    // cinematic, slightly purple-tinted studio lighting
    const key = new THREE.DirectionalLight(0xffffff, 3); key.position.set(3, 5, 4); scene.add(key)
    const fill = new THREE.DirectionalLight(0xffffff, 1.5); fill.position.set(-4, -1, 3); scene.add(fill)
    const rim = new THREE.PointLight(0xffffff, 13, 40); rim.position.set(-2.5, 2, -3); scene.add(rim)
    const rim2 = new THREE.PointLight(0xdddde2, 8, 40); rim2.position.set(3, -2, -2); scene.add(rim2)
    scene.add(new THREE.AmbientLight(0x222226, 0.8))

    const group = new THREE.Group()
    scene.add(group)

    let appear = 0 // 0→1 fade/scale-in once the model loads
    let baseScale = 1
    const loader = new GLTFLoader()
    loader.load(
      '/assets/tennis_ball.glb',
      (gltf) => {
        const ball = gltf.scene
        const maxAniso = renderer.capabilities.getMaxAnisotropy()
        ball.traverse((o) => {
          if (!o.isMesh) return
          const smoothed = smoothBall(o.geometry, 2)
          o.geometry.dispose()
          o.geometry = smoothed
          // the felt is viewed at a grazing angle around most of the ball, where
          // bilinear filtering smears it into a flat wash
          for (const slot of ['map', 'normalMap', 'roughnessMap', 'metalnessMap']) {
            const tex = o.material?.[slot]
            if (tex) { tex.anisotropy = maxAniso; tex.needsUpdate = true }
          }
        })
        const box = new THREE.Box3().setFromObject(ball)
        const size = new THREE.Vector3(); box.getSize(size)
        const center = new THREE.Vector3(); box.getCenter(center)
        ball.position.sub(center) // center the model
        const maxDim = Math.max(size.x, size.y, size.z) || 1
        baseScale = 2.5 / maxDim
        group.add(ball)
        mount.classList.add('is-loaded')
      },
      undefined,
      () => { mount.classList.add('is-error') },
    )

    let raf = 0
    const clock = new THREE.Clock()
    const animate = () => {
      raf = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()
      appear += (1 - appear) * 0.05
      group.scale.setScalar(baseScale * (0.85 + 0.15 * appear))
      group.rotation.y += 0.052 // fast, sporty spin
      group.rotation.x += (target.current.x - group.rotation.x) * 0.05
      group.rotation.z += (target.current.y * 0.4 - group.rotation.z) * 0.05
      group.position.y = Math.sin(t * 1.7) * 0.14 // livelier float
      renderer.render(scene, camera)
    }
    animate()

    const onPointerMove = (e) => {
      const r = mount.getBoundingClientRect()
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1
      target.current = { x: ny * 0.3, y: nx * 0.34 }
    }
    const onLeave = () => { target.current = { x: 0, y: 0 } }
    mount.addEventListener('pointermove', onPointerMove)
    mount.addEventListener('pointerleave', onLeave)

    const onResize = () => {
      w = mount.clientWidth || w; h = mount.clientHeight || h
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      mount.removeEventListener('pointermove', onPointerMove)
      mount.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('resize', onResize)
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose()
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material]
          mats.forEach((m) => { for (const k in m) { if (m[k] && m[k].isTexture) m[k].dispose() } m.dispose() })
        }
      })
      envTex.dispose(); pmrem.dispose(); renderer.dispose()
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div className="ep-ball-wrap" onClick={onReveal} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onReveal && onReveal() }}>
      <div className="ep-ball-glow" />
      <div className="ep-ball-energy" />
      <div ref={mountRef} className="ep-ball-canvas" />
      <div className="ep-ball-shadow" />
      <div className="ep-ball-prompt">
        <span className="ep-ball-ring" />
        {prompt}
      </div>
    </div>
  )
}
