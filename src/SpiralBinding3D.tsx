import { useEffect, useRef, useState } from 'react'

type SpiralBinding3DProps = {
  orientation: 'portrait' | 'landscape'
  flipSignal: number
  reducedMotion: boolean
}

/** A real 3D metal helix rendered over the book spine. */
export default function SpiralBinding3D({ orientation, flipSignal, reducedMotion }: SpiralBinding3DProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const springRef = useRef<import('three').Group | null>(null)
  const renderRef = useRef<() => void>(() => {})
  const animating = useRef(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    let cleanup: (() => void) | undefined

    void import('three').then((THREE) => {
      if (disposed) return
      const {
        AmbientLight, Curve, DirectionalLight, Group, Mesh,
        MeshStandardMaterial, PerspectiveCamera, Scene,
        TubeGeometry, Vector3, WebGLRenderer,
      } = THREE

      let renderer: import('three').WebGLRenderer
      try {
        renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
      } catch {
        host.dataset.webgl = 'unavailable'
        return
      }

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6))
      renderer.setClearColor(0x000000, 0)
      renderer.outputColorSpace = 'srgb'
      renderer.domElement.setAttribute('aria-hidden', 'true')
      host.appendChild(renderer.domElement)

      const scene = new Scene()
      const camera = new PerspectiveCamera(32, 1, 0.1, 100)
      const spring = new Group()
      springRef.current = spring
      setReady(true)
      scene.add(spring)
      scene.add(new AmbientLight(0xffffff, 2.2))
      const keyLight = new DirectionalLight(0xfff4dd, 4.4)
      keyLight.position.set(-4, 5, 8)
      scene.add(keyLight)
      const fillLight = new DirectionalLight(0x9eb7d5, 2.4)
      fillLight.position.set(4, -3, 5)
      scene.add(fillLight)
      const rimLight = new DirectionalLight(0xffffff, 3.5)
      rimLight.position.set(0, 2, -5)
      scene.add(rimLight)

      const turns = 25
      class HelixCurve extends Curve<InstanceType<typeof Vector3>> {
        constructor() { super() }
        getPoint(t: number, target = new Vector3()) {
          const angle = t * turns * Math.PI * 2
          return target.set(Math.cos(angle) * 0.36, 5.4 * (0.5 - t), Math.sin(angle) * 0.47)
        }
      }
      const curve = new HelixCurve()
      const wireGeometry = new TubeGeometry(curve, turns * 64, 0.038, 10, false)
      const wireMaterial = new MeshStandardMaterial({ color: 0xc5c4c0, metalness: 0.9, roughness: 0.28 })
      spring.add(new Mesh(wireGeometry, wireMaterial))

      const resize = () => {
        const { width, height } = host.getBoundingClientRect()
        if (!width || !height) return
        renderer.setSize(width, height, false)
        camera.aspect = width / height
        camera.position.set(0, 0, 12.4)
        camera.lookAt(0, 0, 0)
        camera.updateProjectionMatrix()
        const visibleHeight = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z
        const scale = (visibleHeight * 0.86) / 5.4
        spring.scale.setScalar(scale)
        renderRef.current = () => renderer.render(scene, camera)
        renderRef.current()
      }

      const observer = new ResizeObserver(resize)
      observer.observe(host)
      resize()
      cleanup = () => {
        observer.disconnect()
        springRef.current = null
        renderRef.current = () => {}
        wireGeometry.dispose()
        wireMaterial.dispose()
        renderer.dispose()
        renderer.domElement.remove()
      }
    })

    return () => {
      disposed = true
      cleanup?.()
    }
  }, [])

  useEffect(() => {
    let disposed = false
    const spring = springRef.current
    if (!ready || !spring || !flipSignal || reducedMotion || animating.current) return
    animating.current = true
    void import('animejs').then(({ animate }) => {
      if (disposed) return
      animate(spring.rotation, {
        // The binding stays anchored; only a restrained axial twist responds
        // to the page moving past it. No vertical bounce or side-to-side hop.
        y: [{ to: orientation === 'landscape' ? 0.08 : 0.055, duration: 250 }, { to: 0, duration: 500 }],
        ease: 'inOutSine',
        onUpdate: () => renderRef.current(),
        onComplete: () => { animating.current = false },
      })
    })
    return () => { disposed = true }
  }, [flipSignal, orientation, ready, reducedMotion])

  return <div ref={hostRef} className={`spiral-binding-3d spiral-binding-3d--${orientation}`} aria-hidden="true" />
}
