import { useEffect, useRef, useState, type RefObject } from 'react'

export type WelcomeGarden3DProps = {
  reducedMotion: boolean
  arrived: boolean
  leaving: boolean
  entered?: boolean
  onArrived: () => void
  onOpen: () => void
  onComplete: () => void
  targetRef: RefObject<HTMLElement | null>
}

// Aspect ratio 3:4 matching FrontCover (420 x 560)
const BOOK_BASE_WIDTH = 1.5
const BOOK_BASE_HEIGHT = 2.0

export default function WelcomeGarden3D({
  reducedMotion,
  arrived,
  leaving,
  entered = false,
  onArrived,
  onOpen,
  onComplete,
  targetRef,
}: WelcomeGarden3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gardenLayerRef = useRef<HTMLDivElement>(null)
  const bookLayerRef = useRef<HTMLDivElement>(null)
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  // Keep callback and prop refs fresh
  const arrivedRef = useRef(arrived)
  arrivedRef.current = arrived
  const leavingRef = useRef(leaving)
  leavingRef.current = leaving
  const onArrivedRef = useRef(onArrived)
  onArrivedRef.current = onArrived
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const onOpenRef = useRef(onOpen)
  onOpenRef.current = onOpen

  // Flight animation state refs
  const flightActiveRef = useRef(false)
  const flightDoneRef = useRef(false)
  const flightStartRef = useRef<number | null>(null)

  useEffect(() => {
    if (leaving && !flightActiveRef.current && !flightDoneRef.current) {
      flightActiveRef.current = true
      flightStartRef.current = null
    }
  }, [leaving])

  useEffect(() => {
    if (arrived) {
      const timer = window.setTimeout(() => setShowPrompt(true), 250)
      return () => window.clearTimeout(timer)
    }
  }, [arrived])

  useEffect(() => {
    const container = containerRef.current
    const gardenLayer = gardenLayerRef.current
    const bookLayer = bookLayerRef.current
    if (!container || !gardenLayer || !bookLayer) return

    let disposed = false
    let cleanup: (() => void) | undefined

    void import('three').then((THREE) => {
      if (disposed) return

      // Verify WebGL availability
      let gardenRenderer: import('three').WebGLRenderer
      let bookRenderer: import('three').WebGLRenderer
      try {
        gardenRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
        try {
          bookRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
        } catch (error) {
          gardenRenderer.dispose()
          throw error
        }
      } catch {
        setWebglAvailable(false)
        return
      }

      setWebglAvailable(true)
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75)
      gardenRenderer.setPixelRatio(pixelRatio)
      gardenRenderer.setClearColor(0x93a57a, 1)
      gardenRenderer.outputColorSpace = THREE.SRGBColorSpace
      gardenRenderer.domElement.setAttribute('aria-hidden', 'true')
      gardenLayer.appendChild(gardenRenderer.domElement)

      bookRenderer.setPixelRatio(pixelRatio)
      bookRenderer.setClearColor(0x000000, 0)
      bookRenderer.outputColorSpace = THREE.SRGBColorSpace
      bookRenderer.domElement.setAttribute('aria-hidden', 'true')
      bookLayer.appendChild(bookRenderer.domElement)

      // ==========================================
      // 1. SCENES & CAMERAS
      // ==========================================
      const gardenScene = new THREE.Scene()
      gardenScene.fog = new THREE.FogExp2(0x93a57a, 0.034)

      const bookScene = new THREE.Scene()

      const baseFov = 32
      const gardenCamera = new THREE.PerspectiveCamera(baseFov, 1, 0.1, 160)
      const bookCamera = new THREE.PerspectiveCamera(baseFov, 1, 0.1, 100)

      // Lighting for Garden
      const ambientLight = new THREE.AmbientLight(0xfff6ea, 1.6)
      gardenScene.add(ambientLight)

      const sunLight = new THREE.DirectionalLight(0xffe2a4, 3.2)
      sunLight.position.set(6, 10, 8)
      gardenScene.add(sunLight)

      const rimLight = new THREE.DirectionalLight(0xffd596, 2.2)
      rimLight.position.set(-6, 4, -8)
      gardenScene.add(rimLight)

      const fillLight = new THREE.DirectionalLight(0xaad2ff, 1.1)
      fillLight.position.set(-4, -2, 4)
      gardenScene.add(fillLight)

      // Lighting for Book (warm golden light)
      const bookAmbient = new THREE.AmbientLight(0xfffaf0, 2.2)
      bookScene.add(bookAmbient)

      const bookSun = new THREE.DirectionalLight(0xfff0d0, 3.8)
      bookSun.position.set(4, 8, 6)
      bookScene.add(bookSun)

      const bookFill = new THREE.DirectionalLight(0xaec8e6, 1.8)
      bookFill.position.set(-5, 3, 4)
      bookScene.add(bookFill)

      const bookBackLight = new THREE.DirectionalLight(0xfff5e0, 2.4)
      bookBackLight.position.set(0, -3, -5)
      bookScene.add(bookBackLight)

      // ==========================================
      // 2. ENDLESS-FEELING LAWN (grass everywhere, no path)
      // ==========================================
      const GROUND_SIZE = 240
      const narrowScreen = window.innerWidth < 760
      const windUniform = { value: 0 }

      // Shared wind: bends instanced vertices in world space, so every stem leans the same way
      const windify = (mat: import('three').Material) => {
        if (mat.userData.xWind) return
        mat.userData.xWind = true
        mat.onBeforeCompile = (shader) => {
          shader.uniforms.uWindTime = windUniform
          shader.vertexShader = `uniform float uWindTime;\n${shader.vertexShader.replace(
            '#include <project_vertex>',
            `vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  vec3 windBase = vec3( instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2] );
  mvPosition = instanceMatrix * mvPosition;
  float windH = max( mvPosition.y - windBase.y, 0.0 );
  float windPh = uWindTime * 1.3 - windBase.z * 0.5 + windBase.x * 0.15;
  mvPosition.x += windH * 0.06 * ( 0.75 + sin( windPh ) );
  mvPosition.z += windH * 0.02 * cos( windPh * 0.8 );
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,
          )}`
        }
        mat.customProgramCacheKey = () => 'xime-wind'
      }

      // Gentle rolling ground, flat around the notebook
      const groundHeight = (x: number, z: number) => {
        const open = THREE.MathUtils.smoothstep(Math.hypot(x, (z - 1.5) * 0.6), 1.4, 4.5)
        return open * 0.1 * (Math.sin(x * 0.33 + 0.7) * Math.cos(z * 0.27) + 0.5 * Math.sin(x * 0.11 + z * 0.19))
      }

      const TEX = 1024
      const groundCanvas = document.createElement('canvas')
      groundCanvas.width = TEX
      groundCanvas.height = TEX
      const gCtx = groundCanvas.getContext('2d')
      if (gCtx) {
        gCtx.fillStyle = '#4e7039'
        gCtx.fillRect(0, 0, TEX, TEX)

        // Every mark is drawn wrapped so the repeating tile has no visible seams
        const wrapped = (x: number, y: number, r: number, draw: (px: number, py: number) => void) => {
          for (const ox of [-TEX, 0, TEX]) {
            for (const oy of [-TEX, 0, TEX]) {
              const px = x + ox
              const py = y + oy
              if (px + r > 0 && px - r < TEX && py + r > 0 && py - r < TEX) draw(px, py)
            }
          }
        }

        for (let i = 0; i < 90; i++) {
          const r = 40 + Math.random() * 90
          gCtx.fillStyle = Math.random() > 0.5 ? 'rgba(120, 160, 82, 0.13)' : 'rgba(40, 70, 34, 0.15)'
          wrapped(Math.random() * TEX, Math.random() * TEX, r, (px, py) => {
            gCtx.beginPath()
            gCtx.arc(px, py, r, 0, Math.PI * 2)
            gCtx.fill()
          })
        }

        for (let i = 0; i < 3200; i++) {
          const r = Math.random() * 3 + 1
          gCtx.fillStyle = Math.random() > 0.5 ? 'rgba(106, 147, 78, 0.28)' : 'rgba(46, 74, 36, 0.3)'
          wrapped(Math.random() * TEX, Math.random() * TEX, r, (px, py) => {
            gCtx.beginPath()
            gCtx.arc(px, py, r, 0, Math.PI * 2)
            gCtx.fill()
          })
        }

        gCtx.lineWidth = 1.3
        gCtx.lineCap = 'round'
        for (let i = 0; i < 2800; i++) {
          const len = 6 + Math.random() * 9
          const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.1
          const dx = Math.cos(a) * len
          const dy = Math.sin(a) * len
          gCtx.strokeStyle = Math.random() > 0.5 ? 'rgba(138, 178, 92, 0.45)' : 'rgba(38, 64, 30, 0.45)'
          wrapped(Math.random() * TEX, Math.random() * TEX, len, (px, py) => {
            gCtx.beginPath()
            gCtx.moveTo(px, py)
            gCtx.lineTo(px + dx, py + dy)
            gCtx.stroke()
          })
        }

        // Tiny flower flecks: far away the lawn already reads as a meadow
        const fleckColors = ['#fbf8ee', '#f5c2d2', '#ffd33d', '#c9b8f0', '#ff9a4a', '#f0757d']
        for (let i = 0; i < 900; i++) {
          const r = 3 + Math.random() * 4
          gCtx.fillStyle = fleckColors[Math.floor(Math.random() * fleckColors.length)]
          gCtx.globalAlpha = 0.55 + Math.random() * 0.35
          wrapped(Math.random() * TEX, Math.random() * TEX, r, (px, py) => {
            gCtx.beginPath()
            gCtx.arc(px, py, r, 0, Math.PI * 2)
            gCtx.fill()
          })
        }
        gCtx.globalAlpha = 1
      }

      const groundTexture = new THREE.CanvasTexture(groundCanvas)
      groundTexture.wrapS = THREE.RepeatWrapping
      groundTexture.wrapT = THREE.RepeatWrapping
      groundTexture.repeat.set(GROUND_SIZE / 6, GROUND_SIZE / 6)
      groundTexture.colorSpace = THREE.SRGBColorSpace
      groundTexture.anisotropy = Math.min(8, gardenRenderer.capabilities.getMaxAnisotropy())

      const groundGeo = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE, 110, 110)
      const posAttr = groundGeo.attributes.position
      for (let i = 0; i < posAttr.count; i++) {
        // The plane is rotated flat and centred at z = 7: local y maps to world z = 7 - y
        posAttr.setZ(i, groundHeight(posAttr.getX(i), 7 - posAttr.getY(i)))
      }
      groundGeo.computeVertexNormals()

      const groundMat = new THREE.MeshStandardMaterial({
        map: groundTexture,
        roughness: 0.95,
        metalness: 0.0,
      })
      const groundMesh = new THREE.Mesh(groundGeo, groundMat)
      groundMesh.rotation.x = -Math.PI / 2
      groundMesh.position.set(0, 0, 7)
      gardenScene.add(groundMesh)

      // ==========================================
      // 4. DETAILED 3D FLOWERS
      // ==========================================
      // Shared materials for flowers
      const stemMat = new THREE.MeshStandardMaterial({ color: 0x416834, roughness: 0.6 })
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x3d6330, roughness: 0.55, side: THREE.DoubleSide })
      const daisyCenterMat = new THREE.MeshStandardMaterial({ color: 0xf5be32, roughness: 0.65 })
      const daisyPetalMat = new THREE.MeshStandardMaterial({ color: 0xfbf8ee, roughness: 0.45, side: THREE.DoubleSide })
      const sunflowerCenterMat = new THREE.MeshStandardMaterial({ color: 0x4f351f, roughness: 0.85 })
      const sunflowerPetalMat = new THREE.MeshStandardMaterial({ color: 0xfcb420, roughness: 0.45, side: THREE.DoubleSide })
      const rosePetalMat1 = new THREE.MeshStandardMaterial({ color: 0xe5777c, roughness: 0.5, side: THREE.DoubleSide })
      const rosePetalMat2 = new THREE.MeshStandardMaterial({ color: 0xd65e67, roughness: 0.55, side: THREE.DoubleSide })
      const lavenderMat = new THREE.MeshStandardMaterial({ color: 0x9b98d9, roughness: 0.6 })
      const buttercupMat = new THREE.MeshStandardMaterial({ color: 0xffd33d, roughness: 0.35, side: THREE.DoubleSide })
      const pollenMat = new THREE.MeshStandardMaterial({ color: 0xb77a25, roughness: 0.72 })
      const petalHighlightMat = new THREE.MeshStandardMaterial({ color: 0xfffdf4, roughness: 0.42, side: THREE.DoubleSide })

      // Leaf helper geometry
      const leafShape = new THREE.Shape()
      leafShape.moveTo(0, 0)
      leafShape.quadraticCurveTo(0.08, 0.12, 0.04, 0.28)
      leafShape.quadraticCurveTo(0, 0.32, -0.04, 0.28)
      leafShape.quadraticCurveTo(-0.08, 0.12, 0, 0)
      const leafGeo = new THREE.ShapeGeometry(leafShape, 4)

      // Petal helper shape
      const petalShape = new THREE.Shape()
      petalShape.moveTo(0, 0)
      petalShape.quadraticCurveTo(0.045, 0.08, 0.04, 0.22)
      petalShape.quadraticCurveTo(0, 0.26, -0.04, 0.22)
      petalShape.quadraticCurveTo(-0.045, 0.08, 0, 0)
      const petalGeo = new THREE.ShapeGeometry(petalShape, 4)

      // Stem helper with curved tube
      const createCurvedStem = (height: number, curveX = 0.06) => {
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(curveX, height * 0.5, 0),
          new THREE.Vector3(0, height, 0),
        )
        return new THREE.TubeGeometry(curve, 7, 0.016, 5, false)
      }

      // Flower 1: Daisy (Marguerite)
      const createDaisy = () => {
        const group = new THREE.Group()
        const h = 0.65 + Math.random() * 0.25
        const stem = new THREE.Mesh(createCurvedStem(h, 0.04), stemMat)
        group.add(stem)

        // Leaves
        const leaf1 = new THREE.Mesh(leafGeo, leafMat)
        leaf1.position.set(0.02, h * 0.35, 0)
        leaf1.rotation.set(0.4, 0, -0.6)
        leaf1.scale.set(0.7, 0.7, 0.7)
        group.add(leaf1)

        const leaf2 = new THREE.Mesh(leafGeo, leafMat)
        leaf2.position.set(-0.02, h * 0.55, 0)
        leaf2.rotation.set(-0.3, 0, 0.7)
        leaf2.scale.set(0.65, 0.65, 0.65)
        group.add(leaf2)

        // Flower Head
        const head = new THREE.Group()
        head.position.set(0, h, 0)
        head.rotation.x = -0.25 + Math.random() * 0.4
        head.rotation.z = -0.15 + Math.random() * 0.3

        // Calyx
        const calyx = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.02, 0.04, 8), stemMat)
        calyx.rotation.x = Math.PI / 2
        head.add(calyx)

        // Center
        const center = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 6), daisyCenterMat)
        center.scale.set(1, 0.5, 1)
        center.position.z = 0.025
        center.rotation.x = Math.PI / 2
        head.add(center)

        // Petals
        const petalCount = 14
        for (let i = 0; i < petalCount; i++) {
          const angle = (i * Math.PI * 2) / petalCount
          const petal = new THREE.Mesh(petalGeo, daisyPetalMat)
          petal.scale.set(0.85, 0.95, 0.85)
          petal.rotation.z = angle
          petal.rotation.x = 0.15 + (i % 2) * 0.08
          head.add(petal)
        }
        // Short inner whorl and tiny pollen grains give the flower head more depth.
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI * 2) / 10 + 0.16
          const innerPetal = new THREE.Mesh(petalGeo, petalHighlightMat)
          innerPetal.scale.set(0.43, 0.55, 0.45)
          innerPetal.rotation.z = angle
          innerPetal.rotation.x = 0.24
          innerPetal.position.z = 0.012
          head.add(innerPetal)

          const seed = new THREE.Mesh(new THREE.SphereGeometry(0.012, 5, 4), pollenMat)
          const radius = 0.045 + Math.random() * 0.025
          seed.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.07)
          head.add(seed)
        }
        group.add(head)
        return group
      }

      // Flower 2: Sunflower
      const createSunflower = () => {
        const group = new THREE.Group()
        const h = 0.9 + Math.random() * 0.35
        const stem = new THREE.Mesh(createCurvedStem(h, 0.05), stemMat)
        stem.scale.set(1.4, 1, 1.4)
        group.add(stem)

        // Leaves
        const leaf1 = new THREE.Mesh(leafGeo, leafMat)
        leaf1.position.set(0.03, h * 0.4, 0)
        leaf1.rotation.set(0.3, 0.4, -0.7)
        leaf1.scale.set(1.1, 1.1, 1.1)
        group.add(leaf1)

        const leaf2 = new THREE.Mesh(leafGeo, leafMat)
        leaf2.position.set(-0.03, h * 0.6, 0)
        leaf2.rotation.set(-0.2, -0.4, 0.8)
        leaf2.scale.set(1.0, 1.0, 1.0)
        group.add(leaf2)

        const head = new THREE.Group()
        head.position.set(0, h, 0)
        head.rotation.x = 0.2 + Math.random() * 0.25

        // Center
        const center = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.17, 0.05, 16), sunflowerCenterMat)
        center.rotation.x = Math.PI / 2
        center.position.z = 0.02
        head.add(center)

        // Two whorls of golden petals
        for (let ring = 0; ring < 2; ring++) {
          const count = 18
          const offset = ring * (Math.PI / count)
          const scale = ring === 0 ? 1.05 : 0.88
          for (let i = 0; i < count; i++) {
            const angle = (i * Math.PI * 2) / count + offset
            const petal = new THREE.Mesh(petalGeo, sunflowerPetalMat)
            petal.scale.set(scale, scale * 1.1, scale)
            petal.rotation.z = angle
            petal.rotation.x = 0.12 + ring * 0.08
            petal.position.z = ring * 0.015
            head.add(petal)
          }
        }
        group.add(head)
        return group
      }

      // Flower 3: Rose / Carnation
      const createRose = () => {
        const group = new THREE.Group()
        const h = 0.7 + Math.random() * 0.2
        const stem = new THREE.Mesh(createCurvedStem(h, -0.04), stemMat)
        group.add(stem)

        const leaf = new THREE.Mesh(leafGeo, leafMat)
        leaf.position.set(0.02, h * 0.45, 0)
        leaf.rotation.set(0.2, 0, -0.6)
        leaf.scale.set(0.8, 0.8, 0.8)
        group.add(leaf)

        const head = new THREE.Group()
        head.position.set(0, h, 0)
        head.rotation.x = 0.15 + Math.random() * 0.3

        // Layered ruffled petals
        const layers = [
          { count: 5, scale: 0.55, mat: rosePetalMat2, curl: 0.4 },
          { count: 8, scale: 0.75, mat: rosePetalMat1, curl: 0.28 },
          { count: 11, scale: 0.95, mat: rosePetalMat2, curl: 0.15 },
        ]
        layers.forEach((layer, lIdx) => {
          for (let i = 0; i < layer.count; i++) {
            const angle = (i * Math.PI * 2) / layer.count + lIdx * 0.4
            const petal = new THREE.Mesh(petalGeo, layer.mat)
            petal.scale.set(layer.scale, layer.scale, layer.scale)
            petal.rotation.z = angle
            petal.rotation.x = layer.curl
            petal.position.z = lIdx * 0.02
            head.add(petal)
          }
        })
        group.add(head)
        return group
      }

      // Flower 4: Lavender Spire
      const createLavender = () => {
        const group = new THREE.Group()
        const h = 0.8 + Math.random() * 0.25
        const stem = new THREE.Mesh(createCurvedStem(h, 0.03), stemMat)
        group.add(stem)

        // Cluster of florets along top half
        const floretGeo = new THREE.SphereGeometry(0.04, 5, 4)
        const levels = 7
        for (let l = 0; l < levels; l++) {
          const y = h * 0.55 + (l / levels) * (h * 0.45)
          const count = 4
          for (let c = 0; c < count; c++) {
            const angle = (c * Math.PI * 2) / count + l * 0.5
            const floret = new THREE.Mesh(floretGeo, lavenderMat)
            floret.position.set(Math.cos(angle) * 0.05, y, Math.sin(angle) * 0.05)
            floret.scale.set(1, 1.4, 1)
            group.add(floret)
          }
        }
        return group
      }

      // Flower 5: Buttercup
      const createButtercup = () => {
        const group = new THREE.Group()
        const h = 0.55 + Math.random() * 0.2
        const stem = new THREE.Mesh(createCurvedStem(h, 0.05), stemMat)
        group.add(stem)

        const head = new THREE.Group()
        head.position.set(0, h, 0)
        head.rotation.x = 0.2

        const center = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), stemMat)
        center.position.z = 0.015
        head.add(center)

        const petalCount = 5
        for (let i = 0; i < petalCount; i++) {
          const angle = (i * Math.PI * 2) / petalCount
          const petal = new THREE.Mesh(petalGeo, buttercupMat)
          petal.scale.set(0.7, 0.75, 0.7)
          petal.rotation.z = angle
          petal.rotation.x = 0.35
          head.add(petal)
        }
        group.add(head)
        return group
      }

      // Flower 6: Cosmos (broad, soft petals)
      const cosmosPetalMat = new THREE.MeshStandardMaterial({ color: 0xf08fc0, roughness: 0.5, side: THREE.DoubleSide })
      const createCosmos = () => {
        const group = new THREE.Group()
        const h = 0.55 + Math.random() * 0.25
        group.add(new THREE.Mesh(createCurvedStem(h, 0.05), stemMat))
        const leaf = new THREE.Mesh(leafGeo, leafMat)
        leaf.position.set(0.02, h * 0.4, 0)
        leaf.rotation.set(0.3, 0, -0.65)
        leaf.scale.set(0.6, 0.6, 0.6)
        group.add(leaf)

        const head = new THREE.Group()
        head.position.set(0, h, 0)
        head.rotation.x = -0.2 + Math.random() * 0.45
        head.rotation.z = -0.2 + Math.random() * 0.4
        for (let i = 0; i < 8; i++) {
          const petal = new THREE.Mesh(petalGeo, cosmosPetalMat)
          petal.scale.set(1.3, 0.9, 1.3)
          petal.rotation.z = (i * Math.PI * 2) / 8
          petal.rotation.x = 0.2
          head.add(petal)
        }
        const center = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 5), daisyCenterMat)
        center.scale.set(1, 1, 0.55)
        center.position.z = 0.02
        head.add(center)
        group.add(head)
        return group
      }

      // Flower 7: Poppy (cupped petals, dark heart)
      const poppyPetalMat = new THREE.MeshStandardMaterial({ color: 0xe0452f, roughness: 0.42, side: THREE.DoubleSide })
      const createPoppy = () => {
        const group = new THREE.Group()
        const h = 0.5 + Math.random() * 0.2
        group.add(new THREE.Mesh(createCurvedStem(h, -0.05), stemMat))
        const leaf = new THREE.Mesh(leafGeo, leafMat)
        leaf.position.set(-0.02, h * 0.35, 0)
        leaf.rotation.set(0.2, 0, 0.7)
        leaf.scale.set(0.6, 0.6, 0.6)
        group.add(leaf)

        const head = new THREE.Group()
        head.position.set(0, h, 0)
        head.rotation.x = 0.1 + Math.random() * 0.4
        for (let i = 0; i < 5; i++) {
          const petal = new THREE.Mesh(petalGeo, poppyPetalMat)
          petal.scale.set(1.3, 1.0, 1.3)
          petal.rotation.z = (i * Math.PI * 2) / 5 + 0.3
          petal.rotation.x = 0.75
          head.add(petal)
        }
        const heart = new THREE.Mesh(new THREE.SphereGeometry(0.04, 7, 5), sunflowerCenterMat)
        heart.position.z = 0.02
        head.add(heart)
        group.add(head)
        return group
      }

      // ==========================================
      // 4b. INSTANCED GARDEN: merged flower variants, grass tufts and a far meadow
      // ==========================================
      type Bucket = { p: number[]; n: number[] }
      const appendGeo = (bucket: Bucket, source: import('three').BufferGeometry, matrix?: import('three').Matrix4) => {
        let geo = source.clone()
        if (matrix) geo.applyMatrix4(matrix)
        if (geo.index) geo = geo.toNonIndexed()
        const pos = geo.getAttribute('position')
        const nor = geo.getAttribute('normal')
        for (let i = 0; i < pos.count; i++) {
          bucket.p.push(pos.getX(i), pos.getY(i), pos.getZ(i))
          bucket.n.push(nor.getX(i), nor.getY(i), nor.getZ(i))
        }
        geo.dispose()
      }
      const bucketToGeo = (bucket: Bucket) => {
        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.Float32BufferAttribute(bucket.p, 3))
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(bucket.n, 3))
        return geo
      }

      const tintCache = new Map<string, import('three').Material>()
      const tinted = (mat: import('three').Material, hex: number) => {
        const key = `${mat.uuid}-${hex}`
        let out = tintCache.get(key)
        if (!out) {
          out = mat.clone()
          ;(out as import('three').MeshStandardMaterial).color.setHex(hex)
          tintCache.set(key, out)
        }
        return out
      }

      type VariantDef = { create: () => import('three').Group; remap?: Array<[import('three').Material, number]>; tall?: boolean }
      const variantDefs: VariantDef[] = [
        { create: createDaisy },
        { create: createDaisy, remap: [[daisyPetalMat, 0xf7d4e1], [petalHighlightMat, 0xffeef5]] },
        { create: createDaisy, remap: [[daisyPetalMat, 0xe3d8f7], [petalHighlightMat, 0xf6f0ff]] },
        { create: createSunflower, tall: true },
        { create: createSunflower, tall: true, remap: [[sunflowerPetalMat, 0xf08a1c]] },
        { create: createRose },
        { create: createRose, remap: [[rosePetalMat1, 0xf2a6b8], [rosePetalMat2, 0xd77a98]] },
        { create: createRose, remap: [[rosePetalMat1, 0xf4e2c0], [rosePetalMat2, 0xe6c996]] },
        { create: createRose, remap: [[rosePetalMat1, 0xc6404c], [rosePetalMat2, 0xa82f3f]] },
        { create: createLavender, tall: true },
        { create: createLavender, tall: true, remap: [[lavenderMat, 0x6f6cc4]] },
        { create: createButtercup },
        { create: createButtercup, remap: [[buttercupMat, 0xff9f3a]] },
        { create: createButtercup, remap: [[buttercupMat, 0xff8fb3]] },
        { create: createCosmos },
        { create: createCosmos, remap: [[cosmosPetalMat, 0xfbf0f4]] },
        { create: createCosmos, remap: [[cosmosPetalMat, 0xc2559a]] },
        { create: createPoppy },
        { create: createPoppy, remap: [[poppyPetalMat, 0xff9a3c]] },
      ]
      const allVariants = variantDefs.map((_, i) => i)
      const lowVariants = allVariants.filter((i) => !variantDefs[i].tall)

      const variantParts = variantDefs.map((def) => {
        const group = def.create()
        group.updateMatrixWorld(true)
        const remap = new Map(def.remap ?? [])
        const buckets = new Map<import('three').Material, Bucket>()
        group.traverse((obj) => {
          const mesh = obj as import('three').Mesh
          if (!mesh.isMesh) return
          let mat = mesh.material as import('three').Material
          const hex = remap.get(mat)
          if (hex !== undefined) mat = tinted(mat, hex)
          let bucket = buckets.get(mat)
          if (!bucket) {
            bucket = { p: [], n: [] }
            buckets.set(mat, bucket)
          }
          appendGeo(bucket, mesh.geometry, mesh.matrixWorld)
        })
        const parts: Array<{ geo: import('three').BufferGeometry; mat: import('three').Material }> = []
        buckets.forEach((bucket, mat) => {
          windify(mat)
          parts.push({ geo: bucketToGeo(bucket), mat })
        })
        return parts
      })

      const cellRand = (cx: number, cz: number) => {
        const s = Math.sin(cx * 127.1 + cz * 311.7) * 43758.5453
        return s - Math.floor(s)
      }
      // Notebook clearing: an open patch of lawn just around the book, not a path
      const inBookClearing = (x: number, z: number) => (x / 1.35) ** 2 + ((z - 1.9) / 2.8) ** 2 < 1

      // Detailed flower meadow around the notebook and below the camera descent
      const NEAR_X = 9
      const NEAR_Z0 = -8
      const NEAR_Z1 = 21
      const nearCell = narrowScreen ? 1.05 : 0.9
      type Placement = { x: number; z: number; s: number; sy: number; w: number; yaw: number }
      const placements: Placement[][] = variantDefs.map(() => [])
      for (let gx = -NEAR_X; gx <= NEAR_X; gx += nearCell) {
        for (let gz = NEAR_Z0; gz <= NEAR_Z1; gz += nearCell) {
          if (Math.random() < 0.1) continue
          const x = gx + (Math.random() - 0.5) * nearCell * 0.9
          const z = gz + (Math.random() - 0.5) * nearCell * 0.9
          if (inBookClearing(x, z)) continue
          // Low blooms along the camera line so the walk glides over, not through, the stems
          const lane = Math.abs(x) < 1.4 && z > 1.2
          const pool = lane ? lowVariants : allVariants
          const patch = cellRand(Math.floor(x / 2.6), Math.floor(z / 2.6))
          const pick = Math.random() < 0.62 ? Math.floor(patch * pool.length) : Math.floor(Math.random() * pool.length)
          placements[pool[Math.min(pick, pool.length - 1)]].push({
            x,
            z,
            s: lane ? 0.72 + Math.random() * 0.23 : 0.95 + Math.random() * 0.5,
            sy: 0.85 + Math.random() * 0.35,
            w: 0.9 + Math.random() * 0.25,
            yaw: Math.random() * Math.PI * 2,
          })
        }
      }

      const dummy = new THREE.Object3D()
      placements.forEach((list, vi) => {
        if (list.length === 0) return
        variantParts[vi].forEach(({ geo, mat }) => {
          const mesh = new THREE.InstancedMesh(geo, mat, list.length)
          list.forEach((pl, k) => {
            dummy.position.set(pl.x, groundHeight(pl.x, pl.z), pl.z)
            dummy.rotation.set(0, pl.yaw, 0)
            dummy.scale.set(pl.s * pl.w, pl.s * pl.sy, pl.s * pl.w)
            dummy.updateMatrix()
            mesh.setMatrixAt(k, dummy.matrix)
          })
          mesh.frustumCulled = false
          gardenScene.add(mesh)
        })
      })

      // Field sampler: a wedge that widens with distance from the camera start, well past the fog
      const sampleField = () => {
        const d = 3 + 62 * Math.pow(Math.random(), 1.5)
        const half = 9 + 0.58 * d
        return { x: (Math.random() * 2 - 1) * half, z: 24 - d }
      }
      const inNearRect = (x: number, z: number) => Math.abs(x) <= NEAR_X + 0.6 && z >= NEAR_Z0 - 0.6 && z <= NEAR_Z1 + 0.6

      const bladeShape = new THREE.Shape()
      bladeShape.moveTo(0, 0)
      bladeShape.quadraticCurveTo(0.025, 0.12, 0.015, 0.28)
      bladeShape.quadraticCurveTo(0, 0.35, -0.015, 0.28)
      bladeShape.quadraticCurveTo(-0.025, 0.12, 0, 0)
      const grassBladeGeo = new THREE.ShapeGeometry(bladeShape, 3)

      // Grass tufts: one merged geometry (crossed blades), tinted per instance
      const tuftBucket: Bucket = { p: [], n: [] }
      const tuftMatrix = new THREE.Matrix4()
      const tuftQuat = new THREE.Quaternion()
      const tuftEuler = new THREE.Euler()
      for (let b = 0; b < 6; b++) {
        const angle = (b * Math.PI * 2) / 6 + (Math.random() - 0.5) * 0.5
        const scale = 0.8 + Math.random() * 0.6
        tuftEuler.set(0.12 + Math.random() * 0.25, angle, 0)
        tuftQuat.setFromEuler(tuftEuler)
        tuftMatrix.compose(
          new THREE.Vector3(Math.cos(angle) * 0.04, 0, Math.sin(angle) * 0.04),
          tuftQuat,
          new THREE.Vector3(scale, scale * (0.9 + Math.random() * 0.5), scale),
        )
        appendGeo(tuftBucket, grassBladeGeo, tuftMatrix)
      }
      const tuftMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65, side: THREE.DoubleSide })
      windify(tuftMat)
      const tuftSpots: Array<{ x: number; z: number }> = []
      const tuftFar = narrowScreen ? 2600 : 3600
      for (let i = 0; i < tuftFar; i++) tuftSpots.push(sampleField())
      const tuftNear = narrowScreen ? 700 : 1000
      for (let i = 0; i < tuftNear; i++) {
        tuftSpots.push({ x: (Math.random() * 2 - 1) * NEAR_X, z: NEAR_Z0 + Math.random() * (NEAR_Z1 - NEAR_Z0) })
      }
      const tuftSpotsOk = tuftSpots.filter((s) => !((s.x / 0.95) ** 2 + ((s.z - 1.35) / 1.3) ** 2 < 1))
      const tuftMesh = new THREE.InstancedMesh(bucketToGeo(tuftBucket), tuftMat, tuftSpotsOk.length)
      const tuftColors = [0x5a8342, 0x486c33, 0x69944c, 0x7aa356, 0x3f6330].map((c) => new THREE.Color(c))
      tuftSpotsOk.forEach((s, k) => {
        const far = Math.max(0, (24 - s.z) / 60)
        const sc = 0.9 + Math.random() * 0.9 + far * 0.6
        dummy.position.set(s.x, groundHeight(s.x, s.z), s.z)
        dummy.rotation.set(0, Math.random() * Math.PI * 2, 0)
        dummy.scale.set(sc, sc * (0.8 + Math.random() * 0.6), sc)
        dummy.updateMatrix()
        tuftMesh.setMatrixAt(k, dummy.matrix)
        tuftMesh.setColorAt(k, tuftColors[Math.floor(Math.random() * tuftColors.length)])
      })
      tuftMesh.frustumCulled = false
      gardenScene.add(tuftMesh)

      // Far meadow: cheap stem + petal ring + centre, 3 draw calls for thousands of blooms
      const farHeadBucket: Bucket = { p: [], n: [] }
      const headMatrix = new THREE.Matrix4()
      const headQuat = new THREE.Quaternion()
      const headEuler = new THREE.Euler()
      for (let i = 0; i < 7; i++) {
        headEuler.set(0.2, 0, (i * Math.PI * 2) / 7)
        headQuat.setFromEuler(headEuler)
        headMatrix.compose(new THREE.Vector3(), headQuat, new THREE.Vector3(0.75, 0.75, 0.75))
        appendGeo(farHeadBucket, petalGeo, headMatrix)
      }
      const farHeadGeo = bucketToGeo(farHeadBucket)
      farHeadGeo.rotateX(-0.9)
      const farCenterGeo = new THREE.SphereGeometry(0.03, 5, 4)
      farCenterGeo.scale(1, 0.6, 1)
      const farStemGeo = new THREE.CylinderGeometry(0.009, 0.013, 1, 3, 1, true)
      farStemGeo.translate(0, 0.5, 0)

      const farPalette = [0xfbf8ee, 0xf5c2d2, 0xffd33d, 0xc9b8f0, 0xff9a4a, 0xe5535c, 0xffffff, 0xf08fc0, 0xb7a7ec].map((c) => new THREE.Color(c))
      const farHeadMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, side: THREE.DoubleSide })
      const farCenterMat = new THREE.MeshStandardMaterial({ color: 0xf5be32, roughness: 0.65 })
      const farStemMat = new THREE.MeshStandardMaterial({ color: 0x477a36, roughness: 0.7, side: THREE.DoubleSide })
      windify(farHeadMat)
      windify(farCenterMat)
      windify(farStemMat)

      const farSpots: Array<{ x: number; z: number }> = []
      const farTarget = narrowScreen ? 3000 : 4200
      while (farSpots.length < farTarget) {
        const s = sampleField()
        if (!inNearRect(s.x, s.z)) farSpots.push(s)
      }
      const farStems = new THREE.InstancedMesh(farStemGeo, farStemMat, farSpots.length)
      const farHeads = new THREE.InstancedMesh(farHeadGeo, farHeadMat, farSpots.length)
      const farCenters = new THREE.InstancedMesh(farCenterGeo, farCenterMat, farSpots.length)
      farSpots.forEach((s, k) => {
        const gy = groundHeight(s.x, s.z)
        const far = Math.max(0, (24 - s.z) / 60)
        const sc = 1 + far * 0.9
        const h = (0.4 + Math.random() * 0.4) * sc
        const yaw = Math.random() * Math.PI * 2
        dummy.position.set(s.x, gy, s.z)
        dummy.rotation.set(0, yaw, 0)
        dummy.scale.set(sc, h, sc)
        dummy.updateMatrix()
        farStems.setMatrixAt(k, dummy.matrix)
        dummy.position.set(s.x, gy + h, s.z)
        dummy.scale.setScalar(sc * (0.9 + Math.random() * 0.4))
        dummy.updateMatrix()
        farHeads.setMatrixAt(k, dummy.matrix)
        farCenters.setMatrixAt(k, dummy.matrix)
        const patch = cellRand(Math.floor(s.x / 3.4), Math.floor(s.z / 3.4))
        const pick = Math.random() < 0.7 ? Math.floor(patch * farPalette.length) : Math.floor(Math.random() * farPalette.length)
        farHeads.setColorAt(k, farPalette[Math.min(pick, farPalette.length - 1)])
      })
      for (const m of [farStems, farHeads, farCenters]) {
        m.frustumCulled = false
        gardenScene.add(m)
      }

      // Tiny 3D bees hover over the flower beds, mostly behind the book's resting spot.
      const beeFlights: Array<{ group: import('three').Group; origin: import('three').Vector3; phase: number; speed: number; spread: number }> = []
      const beeBodyMat = new THREE.MeshStandardMaterial({ color: 0xf2bd35, roughness: 0.55 })
      const beeStripeMat = new THREE.MeshStandardMaterial({ color: 0x382b1d, roughness: 0.6 })
      const beeWingMat = new THREE.MeshStandardMaterial({ color: 0xf8f4e8, roughness: 0.35, transparent: true, opacity: 0.82, side: THREE.DoubleSide })
      const beeBodyGeo = new THREE.SphereGeometry(0.052, 10, 8)
      const beeWingGeo = new THREE.SphereGeometry(0.035, 8, 6)
      for (let i = 0; i < 10; i++) {
        const bee = new THREE.Group()
        const body = new THREE.Mesh(beeBodyGeo, beeBodyMat)
        body.scale.set(1.35, 0.8, 0.78)
        bee.add(body)
        for (const x of [-0.025, 0.018]) {
          const stripe = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 5), beeStripeMat)
          stripe.position.set(x, 0, 0.038)
          stripe.scale.set(0.65, 0.88, 0.55)
          bee.add(stripe)
        }
        const wings: import('three').Mesh[] = []
        for (const side of [-1, 1]) {
          const wing = new THREE.Mesh(beeWingGeo, beeWingMat)
          wing.position.set(0, side * 0.035, -0.035)
          wing.scale.set(0.72, 1.4, 0.28)
          bee.add(wing)
          wings.push(wing)
        }
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 5), beeStripeMat)
        eye.position.set(0.052, 0, 0.018)
        bee.add(eye)

        const origin = new THREE.Vector3((i % 2 === 0 ? -1 : 1) * (1.5 + Math.random() * 4.5), 0.8 + Math.random() * 0.8, -5 + Math.random() * 18)
        bee.position.copy(origin)
        bee.scale.setScalar(0.72 + Math.random() * 0.28)
        bee.userData.wings = wings
        gardenScene.add(bee)
        beeFlights.push({ group: bee, origin, phase: Math.random() * Math.PI * 2, speed: 0.85 + Math.random() * 0.45, spread: 0.22 + Math.random() * 0.18 })
      }

      // ==========================================
      // 5. FLOATING PETALS / POLLEN IN AIR
      // ==========================================
      const petalParticles: Array<{
        mesh: import('three').Mesh
        speedZ: number
        speedY: number
        rotSpeed: number
        seed: number
      }> = []
      const airPetalGeo = new THREE.PlaneGeometry(0.06, 0.08)
      const airPetalMat = new THREE.MeshStandardMaterial({
        color: 0xffeed8,
        roughness: 0.6,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      })

      for (let i = 0; i < 55; i++) {
        const pMesh = new THREE.Mesh(airPetalGeo, airPetalMat)
        pMesh.position.set((Math.random() - 0.5) * 14, 0.3 + Math.random() * 2.2, -2 + Math.random() * 24)
        pMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
        gardenScene.add(pMesh)
        petalParticles.push({
          mesh: pMesh,
          speedZ: 0.6 + Math.random() * 0.5,
          speedY: 0.08 + Math.random() * 0.1,
          rotSpeed: 0.8 + Math.random() * 1.2,
          seed: Math.random() * 100,
        })
      }

      // ==========================================
      // 6. 3D NOTEBOOK MODEL (Three.js Geometries)
      // ==========================================
      // Cover Texture generated on HTML5 canvas matching FrontCover
      const coverCanvas = document.createElement('canvas')
      coverCanvas.width = 840
      coverCanvas.height = 1120
      const cCtx = coverCanvas.getContext('2d')

      const drawCoverCanvas = () => {
        if (!cCtx) return
        cCtx.save()
        cCtx.setTransform(1, 0, 0, 1, 0, 0)
        cCtx.clearRect(0, 0, 840, 1120)

        // Warm kraft / gold cardstock background
        cCtx.fillStyle = '#dfbd6e'
        cCtx.fillRect(0, 0, 840, 1120)

        // Fine linear grain
        cCtx.strokeStyle = 'rgba(91, 69, 40, 0.035)'
        cCtx.lineWidth = 1
        for (let y = 0; y < 1120; y += 6) {
          cCtx.beginPath()
          cCtx.moveTo(0, y)
          cCtx.lineTo(840, y + 2)
          cCtx.stroke()
        }

        // 2x coordinate scale from 420x560 viewBox
        cCtx.scale(2, 2)

        // Sketch outline paths
        const outlinePath = new Path2D(
          'M22 25 C92 20 161 28 218 23 C286 19 342 27 398 22 C393 91 401 150 396 215 C392 296 402 371 397 431 C394 480 401 518 396 536 C323 531 259 540 199 535 C127 531 74 541 23 535 C27 462 18 407 24 341 C29 271 18 204 24 143 C28 93 19 58 22 25 Z',
        )
        const echoPath = new Path2D(
          'M29 31 C90 27 148 34 211 30 C279 26 337 33 390 29 C386 102 393 158 389 220 C385 295 394 369 390 429 C387 477 394 511 389 528 C321 524 258 532 198 528 C132 524 78 532 30 528 C34 461 25 404 31 340 C36 270 25 203 31 145 C34 97 27 62 29 31 Z',
        )
        const flowerPath = new Path2D(
          'M65 85 C53 75 58 64 68 70 C73 55 85 60 82 72 C96 66 101 77 89 84 C100 93 91 103 81 94 C74 108 63 101 70 91 C56 98 50 88 65 85 Z',
        )
        const flowerStemPath = new Path2D(
          'M74 99 C71 110 81 117 74 128 M75 113 C64 108 60 112 58 118 M76 120 C85 114 89 117 91 123',
        )
        const sparkPath = new Path2D(
          'M345 96 C347 108 352 112 364 114 C352 116 347 121 345 134 C343 121 338 116 326 114 C338 112 343 108 345 96 Z',
        )
        const heartPath = new Path2D(
          'M350 451 C337 439 320 451 329 466 L350 486 L371 466 C380 451 363 439 350 451 Z',
        )
        const underlinePath = new Path2D('M132 361 C180 368 236 359 287 364')

        cCtx.strokeStyle = '#554432'
        cCtx.lineWidth = 2.15
        cCtx.lineCap = 'round'
        cCtx.lineJoin = 'round'
        cCtx.stroke(outlinePath)

        cCtx.strokeStyle = 'rgba(85, 68, 50, 0.48)'
        cCtx.lineWidth = 1.15
        cCtx.stroke(echoPath)

        cCtx.strokeStyle = '#554432'
        cCtx.lineWidth = 2.15
        cCtx.stroke(flowerPath)
        cCtx.stroke(flowerStemPath)

        cCtx.fillStyle = '#dfbd6e'
        cCtx.beginPath()
        cCtx.arc(75, 84, 4, 0, Math.PI * 2)
        cCtx.fill()
        cCtx.stroke()

        cCtx.fillStyle = 'rgba(255, 249, 224, 0.32)'
        cCtx.fill(sparkPath)
        cCtx.stroke(sparkPath)

        cCtx.fill(heartPath)
        cCtx.stroke(heartPath)

        cCtx.lineWidth = 2.4
        cCtx.stroke(underlinePath)

        // Title text "Nuestra historia" styled with Caveat cursive
        cCtx.save()
        cCtx.translate(210, 285)
        cCtx.rotate((-3 * Math.PI) / 180)
        cCtx.font = "600 50px 'Caveat', cursive, sans-serif"
        cCtx.fillStyle = '#4f4030'
        cCtx.textAlign = 'center'
        cCtx.textBaseline = 'middle'
        cCtx.fillText('Nuestra historia', 0, 0)
        cCtx.restore()

        cCtx.restore()
      }

      drawCoverCanvas()
      const coverTexture = new THREE.CanvasTexture(coverCanvas)
      coverTexture.colorSpace = THREE.SRGBColorSpace

      // Refresh texture once webfont Caveat is fully ready
      if (typeof document !== 'undefined' && 'fonts' in document) {
        void document.fonts.ready.then(() => {
          drawCoverCanvas()
          coverTexture.needsUpdate = true
        })
      }

      // Notebook Root Group
      const notebook = new THREE.Group()
      bookScene.add(notebook)

      // Initial resting position physically on the garden path
      const restPos = new THREE.Vector3(0, 0.065, 1.35)
      const restRot = new THREE.Euler(-Math.PI / 2 + 0.12, 0, -0.08, 'XYZ')
      notebook.position.copy(restPos)
      notebook.rotation.copy(restRot)

      // Contact shadow beneath notebook
      const shadowCanvas = document.createElement('canvas')
      shadowCanvas.width = 256
      shadowCanvas.height = 256
      const sCtx = shadowCanvas.getContext('2d')
      if (sCtx) {
        const radGrad = sCtx.createRadialGradient(128, 128, 20, 128, 128, 120)
        radGrad.addColorStop(0, 'rgba(42, 28, 18, 0.55)')
        radGrad.addColorStop(0.5, 'rgba(42, 28, 18, 0.25)')
        radGrad.addColorStop(1, 'rgba(42, 28, 18, 0)')
        sCtx.fillStyle = radGrad
        sCtx.fillRect(0, 0, 256, 256)
      }
      const shadowTex = new THREE.CanvasTexture(shadowCanvas)
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      })
      const shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.7), shadowMat)
      shadowMesh.rotation.x = -Math.PI / 2
      shadowMesh.position.set(0, 0.008, 1.35)
      gardenScene.add(shadowMesh)

      // Notebook Structure:
      // 1. Back Cover
      const backCoverMat = new THREE.MeshStandardMaterial({ color: 0xd5b369, roughness: 0.68 })
      const backCoverGeo = new THREE.BoxGeometry(BOOK_BASE_WIDTH, BOOK_BASE_HEIGHT, 0.016)
      const backCoverMesh = new THREE.Mesh(backCoverGeo, backCoverMat)
      backCoverMesh.position.set(0, 0, -0.06)
      notebook.add(backCoverMesh)

      // 2. Paper Stack / Block of pages
      const paperStackMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e3, roughness: 0.85 })
      const paperStackGeo = new THREE.BoxGeometry(BOOK_BASE_WIDTH - 0.04, BOOK_BASE_HEIGHT - 0.04, 0.052)
      const paperStackMesh = new THREE.Mesh(paperStackGeo, paperStackMat)
      paperStackMesh.position.set(0.01, 0, -0.026)
      notebook.add(paperStackMesh)

      // 3. Front Cover Pivot (hinged along spine at x = -BOOK_BASE_WIDTH / 2)
      const spineX = -BOOK_BASE_WIDTH / 2 // -0.75
      const coverPivot = new THREE.Group()
      coverPivot.position.set(spineX, 0, 0.005)
      notebook.add(coverPivot)

      // Front Cover Face
      const coverMatFront = new THREE.MeshStandardMaterial({ map: coverTexture, roughness: 0.52 })
      // The underside is the same warm cover stock; a white inner face looked like
      // an extra loose page sticking out when the notebook rested on the path.
      const coverMatBack = new THREE.MeshStandardMaterial({ color: 0xdfbd6e, roughness: 0.68 })
      const coverMatSide = new THREE.MeshStandardMaterial({ color: 0xc29e5e, roughness: 0.65 })
      // [right, left, top, bottom, front, back]
      const coverMaterials = [
        coverMatSide,
        coverMatSide,
        coverMatSide,
        coverMatSide,
        coverMatFront,
        coverMatBack,
      ]
      const frontCoverGeo = new THREE.BoxGeometry(BOOK_BASE_WIDTH, BOOK_BASE_HEIGHT, 0.014)
      const frontCoverMesh = new THREE.Mesh(frontCoverGeo, coverMaterials)
      frontCoverMesh.position.set(BOOK_BASE_WIDTH / 2, 0, 0)
      coverPivot.add(frontCoverMesh)

      // 4. Turning Leaves (inside the book that flutter in the wind and open during flight)
      const leafPivot = new THREE.Group()
      leafPivot.position.set(spineX, 0, 0.001)
      notebook.add(leafPivot)

      const leafPaperMat = new THREE.MeshStandardMaterial({
        color: 0xfaf4ea,
        roughness: 0.78,
        side: THREE.DoubleSide,
      })
      const leafPaperGeo = new THREE.PlaneGeometry(BOOK_BASE_WIDTH - 0.04, BOOK_BASE_HEIGHT - 0.04)
      const leafPaperMesh = new THREE.Mesh(leafPaperGeo, leafPaperMat)
      leafPaperMesh.position.set((BOOK_BASE_WIDTH - 0.04) / 2 + 0.01, 0, 0)
      // Keep the page block tucked beneath the closed cover during the intro.
      // The full designed pages appear when the actual reader takes over.
      leafPaperMesh.visible = false
      leafPivot.add(leafPaperMesh)

      // 5. Metallic Spiral Helix (matching SpiralBinding3D along spine)
      const turns = 24
      class NotebookSpineHelix extends THREE.Curve<InstanceType<typeof THREE.Vector3>> {
        constructor() {
          super()
        }
        getPoint(t: number, target = new THREE.Vector3()) {
          const angle = t * turns * Math.PI * 2
          return target.set(
            spineX + Math.cos(angle) * 0.048,
            (BOOK_BASE_HEIGHT - 0.08) * (0.5 - t),
            Math.sin(angle) * 0.052,
          )
        }
      }
      const spiralCurve = new NotebookSpineHelix()
      const spiralGeo = new THREE.TubeGeometry(spiralCurve, turns * 16, 0.0085, 8, false)
      const spiralMat = new THREE.MeshStandardMaterial({
        color: 0xc4c3bf,
        metalness: 0.92,
        roughness: 0.24,
      })
      const spiralMesh = new THREE.Mesh(spiralGeo, spiralMat)
      notebook.add(spiralMesh)

      // ==========================================
      // 7. CAMERA SETUP & SIZING
      // ==========================================
      // Initial camera walk: starts far and high over the garden, glides toward the book
      const camWalkStartOffset = new THREE.Vector3(0, 3.9, 15.5)
      const camWalkCtrlOffset = new THREE.Vector3(0, 1.5, 6.2)
      const camWalkLookOffset = new THREE.Vector3(0, -0.1, 6.2)
      const camStopBase = new THREE.Vector3(0, 1.05, 3.4)
      const camStopPos = camStopBase.clone()
      const camStopLook = new THREE.Vector3(0, 0.22, 1.35)
      let renderStatic: (() => void) | null = null

      let canvasW = container.clientWidth || window.innerWidth
      let canvasH = container.clientHeight || window.innerHeight

      const updateSizes = () => {
        const w = container.clientWidth || window.innerWidth
        const h = container.clientHeight || window.innerHeight
        if (!w || !h) return
        canvasW = w
        canvasH = h

        gardenRenderer.setSize(w, h, false)
        bookRenderer.setSize(w, h, false)

        const aspect = w / h
        gardenCamera.aspect = aspect
        bookCamera.aspect = aspect

        // Portrait: widen the fov a little, then dolly back until the whole 1.5-wide book
        // (plus margin) fits the horizontal frustum at the resting distance
        const aspectFactor = Math.min(Math.max(1, 0.78 / Math.max(aspect, 0.45)), 1.3)
        const fov = baseFov * aspectFactor
        gardenCamera.fov = fov
        bookCamera.fov = fov
        const restDistance = camStopBase.distanceTo(camStopLook)
        const halfWidthNeeded = (BOOK_BASE_WIDTH / 2) * 1.35
        const halfWidthVisible = Math.tan((fov * Math.PI) / 360) * aspect * restDistance
        const dolly = Math.max(1, halfWidthNeeded / halfWidthVisible)
        camStopPos.copy(camStopLook).addScaledVector(camStopBase.clone().sub(camStopLook), dolly)
        renderStatic?.()

        gardenCamera.updateProjectionMatrix()
        bookCamera.updateProjectionMatrix()
      }

      const observer = new ResizeObserver(updateSizes)
      observer.observe(container)
      updateSizes()


      let walkTime = reducedMotion ? 1 : 0
      const walkDuration = 6.6 // seconds
      const walkStart = new THREE.Vector3()
      const walkCtrl = new THREE.Vector3()
      const walkLook = new THREE.Vector3()

      // Reading camera destination at end of flight
      const readingCamZ = 6.2
      const readingCamPos = new THREE.Vector3(0, 0, readingCamZ)
      const readingCamLook = new THREE.Vector3(0, 0, 0)

      // Cached target world transform to avoid jitter at completion
      let lastTargetWorldPos = new THREE.Vector3(0, 0, 0)
      let lastFinalUniformScale = 1.0

      // ==========================================
      // 8. RAYCASTER FOR CLICKING 3D NOTEBOOK
      // ==========================================
      const raycaster = new THREE.Raycaster()
      const mouse = new THREE.Vector2()

      const onPointerDown = (e: PointerEvent) => {
        if (!arrivedRef.current || leavingRef.current || flightActiveRef.current || flightDoneRef.current) return
        const rect = container.getBoundingClientRect()
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
        raycaster.setFromCamera(mouse, bookCamera)
        const intersects = raycaster.intersectObjects(notebook.children, true)
        if (intersects.length > 0) {
          onOpenRef.current()
        }
      }
      container.addEventListener('pointerdown', onPointerDown)

      // ==========================================
      // 9. MASTER ANIMATION LOOP
      // ==========================================
      let rafId = 0
      let lastTime = performance.now()
      let arrivedSignaled = reducedMotion

      const animateLoop = (now: number) => {
        if (!reducedMotion) rafId = requestAnimationFrame(animateLoop)
        const delta = reducedMotion ? 0 : Math.min((now - lastTime) / 1000, 0.1)
        lastTime = now
        const timeSec = reducedMotion ? 0 : now / 1000

        // A. Gentle wind: one uniform drives every instanced flower and tuft
        windUniform.value = timeSec

        // Drifting Petals in air
        for (let i = 0; i < petalParticles.length; i++) {
          const p = petalParticles[i]
          p.mesh.position.z -= delta * p.speedZ
          p.mesh.position.y -= delta * p.speedY
          p.mesh.position.x += Math.sin(timeSec + p.seed) * 0.003
          p.mesh.rotation.x += delta * p.rotSpeed
          p.mesh.rotation.y += delta * (p.rotSpeed * 0.8)
          if (p.mesh.position.z < -3 || p.mesh.position.y < 0.05) {
            p.mesh.position.z = 22 + Math.random() * 2
            p.mesh.position.y = 0.5 + Math.random() * 2.0
            p.mesh.position.x = (Math.random() - 0.5) * 14
          }
        }

        // Small looping bee flights with fast wing beats and gentle vertical bobbing.
        for (const bee of beeFlights) {
          const phase = timeSec * bee.speed + bee.phase
          bee.group.position.set(
            bee.origin.x + Math.sin(phase) * bee.spread,
            bee.origin.y + Math.sin(phase * 2.1) * 0.09,
            bee.origin.z + Math.cos(phase * 0.72) * bee.spread * 1.4,
          )
          bee.group.rotation.y = Math.sin(phase) * 0.32
          const wings = bee.group.userData.wings as import('three').Mesh[]
          wings.forEach((wing, index) => {
            wing.rotation.x = Math.sin(timeSec * 34 + bee.phase + index) * 0.55
          })
        }

        // B. A soft passing gust nudges the cover on its hinge, then lets it settle.
        if (!flightActiveRef.current && !flightDoneRef.current) {
          const gustPhase = (timeSec % 7.2) - 1.4
          const gust = Math.exp(-((gustPhase / 0.48) ** 2))
          coverPivot.rotation.y = reducedMotion ? 0 : -gust * 0.055
          leafPivot.rotation.y = 0
        }

        // C. Camera Walk-in sequence
        if (walkTime < 1) {
          walkTime += delta / walkDuration
          if (walkTime >= 1) {
            walkTime = 1
            if (!arrivedSignaled) {
              arrivedSignaled = true
              onArrivedRef.current()
            }
          }
          // Gentle start, long glide, soft landing
          const u = walkTime
          const t = 0.55 * ((1 - Math.cos(Math.PI * u)) / 2) + 0.45 * (1 - Math.pow(1 - u, 3))
          const sway = Math.sin(t * Math.PI)
          walkStart.copy(camStopPos).add(camWalkStartOffset)
          walkCtrl.copy(camStopPos).add(camWalkCtrlOffset)
          const inv = 1 - t
          gardenCamera.position
            .copy(walkStart).multiplyScalar(inv * inv)
            .addScaledVector(walkCtrl, 2 * inv * t)
            .addScaledVector(camStopPos, t * t)
          gardenCamera.position.x += sway * 0.55
          walkLook.copy(camStopLook).add(camWalkLookOffset)
          const curLook = new THREE.Vector3().lerpVectors(walkLook, camStopLook, t)
          curLook.x += sway * 0.2
          gardenCamera.lookAt(curLook)

          bookCamera.position.copy(gardenCamera.position)
          bookCamera.lookAt(curLook)

          // Soft focus on garden as camera nears notebook
          if (gardenLayerRef.current) {
            const blur = t * 2.0
            gardenLayerRef.current.style.filter = `blur(${blur.toFixed(1)}px)`
          }
        } else if (!flightActiveRef.current && !flightDoneRef.current) {
          gardenCamera.position.copy(camStopPos)
          gardenCamera.lookAt(camStopLook)
          bookCamera.position.copy(camStopPos)
          bookCamera.lookAt(camStopLook)
        }

        // D. 3D Flight & Reading Docking Sequence
        if (flightActiveRef.current) {
          if (flightStartRef.current === null) {
            flightStartRef.current = now
          }

          const flightElapsed = (now - flightStartRef.current) / 1000
          const flightDuration = 1.08 // seconds
          const p = Math.min(flightElapsed / flightDuration, 1)

          // Easing: inOutCubic
          const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2

          // Measure destination rect from .closed-cover
          const target = targetRef.current?.querySelector<HTMLElement>('.closed-cover')
          let targetRect = target?.getBoundingClientRect()
          if (!targetRect || targetRect.width === 0) {
            // Fallback measurement from bookWrapRef
            const wrap = targetRef.current
            const wrapRect = wrap?.getBoundingClientRect()
            if (wrapRect && wrapRect.width > 0) {
              targetRect = {
                left: wrapRect.left + wrapRect.width / 2,
                top: wrapRect.top,
                width: wrapRect.width / 2,
                height: wrapRect.height,
                right: wrapRect.right,
                bottom: wrapRect.bottom,
              } as DOMRect
            } else {
              const defW = Math.min(canvasW * 0.42, 420)
              const defH = defW / 0.75
              targetRect = {
                left: canvasW / 2,
                top: (canvasH - defH) / 2,
                width: defW,
                height: defH,
                right: canvasW / 2 + defW,
                bottom: (canvasH + defH) / 2,
              } as DOMRect
            }
          }

          // Compute destination position and scale in Three.js world space
          const frustumH = 2 * Math.tan(((bookCamera.fov / 2) * Math.PI) / 180) * readingCamZ
          const frustumW = frustumH * (canvasW / canvasH)

          const targetCenterX = targetRect.left + targetRect.width / 2
          const targetCenterY = targetRect.top + targetRect.height / 2
          const ndcX = (targetCenterX / canvasW) * 2 - 1
          const ndcY = -(targetCenterY / canvasH) * 2 + 1

          const targetWorldX = ndcX * (frustumW / 2)
          const targetWorldY = ndcY * (frustumH / 2)
          const targetWorldPos = new THREE.Vector3(targetWorldX, targetWorldY, 0)
          lastTargetWorldPos = targetWorldPos

          // Strict uniform scale matching height without distortion
          const targetWorldH = (targetRect.height / canvasH) * frustumH
          const targetWorldW = (targetRect.width / canvasW) * frustumW
          const finalUniformScale = Math.min(targetWorldH / BOOK_BASE_HEIGHT, targetWorldW / BOOK_BASE_WIDTH)
          lastFinalUniformScale = finalUniformScale

          // Interpolate Book Camera to reading position
          bookCamera.position.lerpVectors(camStopPos, readingCamPos, ease)
          const lookAtTarget = new THREE.Vector3().lerpVectors(camStopLook, readingCamLook, ease)
          bookCamera.lookAt(lookAtTarget)

          // Interpolate Notebook Position with gentle flight arc
          const flightArcY = Math.sin(ease * Math.PI) * 0.48
          notebook.position.lerpVectors(restPos, targetWorldPos, ease)
          notebook.position.y += flightArcY

          // Interpolate Rotation: tilts upright and rotates to face reader squarely
          notebook.rotation.x = THREE.MathUtils.lerp(restRot.x, 0, ease)
          notebook.rotation.y = THREE.MathUtils.lerp(restRot.y, 0, ease)
          notebook.rotation.z = THREE.MathUtils.lerp(restRot.z, 0, ease)

          // Uniform scale throughout entire flight
          const curScale = THREE.MathUtils.lerp(1.0, finalUniformScale, ease)
          notebook.scale.setScalar(curScale)

          // Opening & fluttering of leaves and cover during flight
          const openArc = Math.sin(ease * Math.PI)
          coverPivot.rotation.y = -openArc * 0.45
          leafPivot.rotation.y = -openArc * 0.32

          // Fade out contact shadow on ground
          shadowMat.opacity = Math.max(0, 0.6 * (1 - ease * 1.5))

          // Blur and attenuate garden layer
          if (gardenLayerRef.current) {
            const blur = 2.0 + ease * 15.0
            const brightness = 1.0 - ease * 0.45
            const opacity = 1.0 - ease * 0.75
            gardenLayerRef.current.style.filter = `blur(${blur.toFixed(1)}px) brightness(${brightness.toFixed(2)})`
            gardenLayerRef.current.style.opacity = opacity.toFixed(2)
          }

          // Complete flight
          if (p >= 1) {
            flightActiveRef.current = false
            flightDoneRef.current = true
            // Exact snap to final transform before handover
            notebook.position.copy(targetWorldPos)
            notebook.rotation.set(0, 0, 0)
            notebook.scale.setScalar(finalUniformScale)
            coverPivot.rotation.y = 0
            leafPivot.rotation.y = 0
            bookCamera.position.copy(readingCamPos)
            bookCamera.lookAt(readingCamLook)
            bookRenderer.render(bookScene, bookCamera)
            requestAnimationFrame(() => {
              onCompleteRef.current()
            })
          }
        } else if (flightDoneRef.current) {
          // Lock final transform while React commits handover
          bookCamera.position.copy(readingCamPos)
          bookCamera.lookAt(readingCamLook)
          notebook.position.copy(lastTargetWorldPos)
          notebook.rotation.set(0, 0, 0)
          notebook.scale.setScalar(lastFinalUniformScale)
          coverPivot.rotation.y = 0
          leafPivot.rotation.y = 0
        }

        // Render both scenes
        gardenRenderer.render(gardenScene, gardenCamera)
        bookRenderer.render(bookScene, bookCamera)
      }

      if (reducedMotion) {
        // Static final state: one frame now, plus one per resize; no RAF, wind, particles or flight
        gardenLayer.style.filter = 'blur(2px)'
        renderStatic = () => animateLoop(lastTime)
        renderStatic()
      } else {
        rafId = requestAnimationFrame(animateLoop)
      }

      // Cleanup on unmount
      cleanup = () => {
        cancelAnimationFrame(rafId)
        observer.disconnect()
        container.removeEventListener('pointerdown', onPointerDown)

        // Dispose geometries & materials
        const disposeObject = (obj: import('three').Object3D) => {
          if ('geometry' in obj && obj.geometry) {
            (obj.geometry as import('three').BufferGeometry).dispose()
          }
          if ('material' in obj && obj.material) {
            const mat = obj.material as import('three').Material | import('three').Material[]
            if (Array.isArray(mat)) {
              mat.forEach((m) => m.dispose())
            } else {
              mat.dispose()
            }
          }
        }

        gardenScene.traverse(disposeObject)
        bookScene.traverse(disposeObject)

        groundTexture.dispose()
        coverTexture.dispose()
        shadowTex.dispose()

        gardenRenderer.dispose()
        bookRenderer.dispose()
        gardenRenderer.domElement.remove()
        bookRenderer.domElement.remove()
      }
    }).catch(() => {
      if (!disposed) setWebglAvailable(false)
    })

    return () => {
      disposed = true
      cleanup?.()
    }
  }, [reducedMotion, targetRef])

  // Once the reader is in place the garden stays as a calm, softly blurred backdrop.
  useEffect(() => {
    const layer = gardenLayerRef.current
    if (!entered || !layer) return
    layer.style.filter = 'blur(5px) brightness(0.82) saturate(0.95)'
    layer.style.opacity = '1'
  }, [entered])

  // Static fallback: nothing animates, so mark arrival and finish the exit with a short timer.
  useEffect(() => {
    if (webglAvailable === false) onArrivedRef.current()
  }, [webglAvailable])

  useEffect(() => {
    if (webglAvailable !== false || !leaving) return
    const timer = window.setTimeout(() => onCompleteRef.current(), 420)
    return () => window.clearTimeout(timer)
  }, [webglAvailable, leaving])

  // WebGL unavailable fallback
  if (webglAvailable === false) {
    return (
      <div className={`welcome-fallback ${leaving ? 'welcome-fallback--leaving' : ''}`} role="region" aria-label="Abre nuestra historia">
        <div className="welcome-fallback-book" aria-hidden="true">Nuestra historia</div>
        <h2>Para Xime</h2>
        <p>Un libro de recuerdos para nuestro aniversario.</p>
        <button type="button" className="welcome-invitation-btn" onClick={onOpen} disabled={leaving}>
          Abrir nuestra historia
        </button>
      </div>
    )
  }

  return (
    <div className="welcome-garden-container" ref={containerRef}>
      {/* Layer 1: Background Garden Layer (blurred and attenuated during approach & flight) */}
      <div className="welcome-garden-layer" ref={gardenLayerRef} />

      {/* Layer 2: Foreground 3D Book Layer (stays focused and pin-sharp) */}
      <div
        className={`welcome-book-layer ${entered ? 'welcome-book-layer--gone' : ''}`}
        ref={bookLayerRef}
        style={{ cursor: arrived && !leaving ? 'pointer' : 'default' }}
        title={arrived && !leaving ? 'Toca el cuaderno para abrirlo' : undefined}
      />

      {/* Layer 3: Accessible UI invitation prompt */}
      <div className="welcome-ui-layer" aria-hidden={leaving || entered}>
        <button
          type="button"
          className={`welcome-invitation-btn ${showPrompt && arrived && !leaving ? 'welcome-invitation-btn--visible' : ''} ${leaving ? 'welcome-invitation-btn--leaving' : ''}`}
          onClick={onOpen}
          disabled={!arrived || leaving}
          aria-label="Toca el cuaderno para abrirlo"
        >
          Toca el cuaderno para abrirlo
        </button>
      </div>
    </div>
  )
}
