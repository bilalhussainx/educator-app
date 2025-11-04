/*
 * =================================================================
 * 3D DEVELOPER PORTFOLIO - React Component
 * Bilal Hussain - Full-Stack Developer
 * =================================================================
 * A futuristic Times Square portfolio with billboards showcasing projects
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';

// Types for OrbitControls
declare global {
  interface Window {
    THREE: typeof THREE;
  }
}

const DeveloperPortfolio3D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showResume, setShowResume] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Start with no loading screen
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showZoomButton, setShowZoomButton] = useState(false);
  const [currentImageName, setCurrentImageName] = useState<string>('');
  const [currentBillboardIndex, setCurrentBillboardIndex] = useState(0);
  const [totalBillboards, setTotalBillboards] = useState(9);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Video configuration - ONE video per building
  const videoItem = { type: 'video', src: '/assets/portfolio/app-demo.mp4', name: 'App Demo Video' };

  // Portfolio images - Will be shown on 3 sides of each building
  const portfolioImages = [
    { type: 'image', src: '/assets/portfolio/dashboard1.jpg', name: 'Dashboard' },
    { type: 'image', src: '/assets/portfolio/educators-edge-dashboard.jpg', name: 'Educators Edge' },
    { type: 'image', src: '/assets/portfolio/Essay.jpg', name: 'Essay Editor' },
    { type: 'image', src: '/assets/portfolio/Leetcode-course.jpg', name: 'LeetCode Course' },
    { type: 'image', src: '/assets/portfolio/leetcode-enrichment.jpg', name: 'LeetCode Enrichment' },
    { type: 'image', src: '/assets/portfolio/leetcode-ide.jpg', name: 'LeetCode IDE' },
    { type: 'image', src: '/assets/portfolio/synergypost.jpg', name: 'SynergyPost' },
    { type: 'image', src: '/assets/portfolio/trustgraph.jpg', name: 'TrustGraph' },
    { type: 'image', src: '/assets/portfolio/writing.jpg', name: 'Writing Tool' }
  ];

  useEffect(() => {
    if (!canvasRef.current) return;

    // Detect mobile device for performance optimization
    const isMobile = window.innerWidth < 768;

    // Scene Setup - Times Square Futuristic City
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0a1a, 10, 150); // Lighter fog for city atmosphere

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 15, 40);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: !isMobile, // Disable antialiasing on mobile
      alpha: true,
      powerPreference: 'high-performance' // Prioritize performance
    });
    renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2)); // Lower pixel ratio on mobile
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = !isMobile; // Disable shadows on mobile
    if (!isMobile) {
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5; // Increased for brighter billboards

    // Lighting - Bright city lights
    const ambientLight = new THREE.AmbientLight(0x4488ff, 1.5);
    scene.add(ambientLight);

    // Main directional light (moonlight/skylight)
    const directionalLight = new THREE.DirectionalLight(0x88ccff, 2.0);
    directionalLight.position.set(50, 80, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024; // Reduced for better performance
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    // Additional fill light
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight2.position.set(-50, 60, -50);
    scene.add(directionalLight2);

    // City glow point lights
    const cityGlow1 = new THREE.PointLight(0x00ffff, 2.0, 100);
    cityGlow1.position.set(0, 20, 0);
    scene.add(cityGlow1);

    const cityGlow2 = new THREE.PointLight(0xff00ff, 1.5, 80);
    cityGlow2.position.set(30, 15, 30);
    scene.add(cityGlow2);

    const cityGlow3 = new THREE.PointLight(0xffff00, 1.5, 80);
    cityGlow3.position.set(-30, 15, -30);
    scene.add(cityGlow3);

    // Times Square night sky background
    scene.background = new THREE.Color(0x0a0a1a);

    // Neon light particles (city atmosphere) - reduced for mobile
    const particleCount = isMobile ? 100 : 400;
    const particles = new THREE.BufferGeometry();
    const particlePositions: number[] = [];
    const particleColors: number[] = [];

    for (let i = 0; i < particleCount; i++) {
      particlePositions.push(
        (Math.random() - 0.5) * 200,
        Math.random() * 80,
        (Math.random() - 0.5) * 200
      );

      // Random neon colors
      const color = new THREE.Color();
      color.setHSL(Math.random(), 1.0, 0.6);
      particleColors.push(color.r, color.g, color.b);
    }

    particles.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3));
    particles.setAttribute('color', new THREE.Float32BufferAttribute(particleColors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.4,
      transparent: true,
      opacity: 0.8,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    const particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);

    // City ground (wet street reflection effect)
    const groundGeometry = new THREE.PlaneGeometry(300, 300);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.3,
      metalness: 0.7,
      emissive: 0x0a0a1a,
      emissiveIntensity: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Architecturally Stunning Skyscrapers (Times Square Style)
    const buildings: THREE.Group[] = [];
    const billboardGroups: THREE.Group[] = [];

    // Define unique building architectures with varying designs
    const buildingConfigs = [
      { x: -45, z: 0, width: 15, height: 50, depth: 15, design: 'tower', color: 0x1a1a3e },
      { x: 45, z: 0, width: 18, height: 45, depth: 12, design: 'wide', color: 0x1e1a3a },
      { x: 0, z: -45, width: 12, height: 55, depth: 16, design: 'tall', color: 0x2a1a2e },
      { x: 0, z: 45, width: 16, height: 42, depth: 14, design: 'tower', color: 0x1a2a3e },
      { x: -32, z: -32, width: 14, height: 48, depth: 14, design: 'sleek', color: 0x2e1a2a },
      { x: 32, z: -32, width: 13, height: 52, depth: 15, design: 'tower', color: 0x1a2e3a },
      { x: -32, z: 32, width: 17, height: 40, depth: 13, design: 'wide', color: 0x3a1a2e },
      { x: 32, z: 32, width: 15, height: 46, depth: 15, design: 'tall', color: 0x1a3a2e },
      { x: 0, z: 0, width: 20, height: 38, depth: 18, design: 'central', color: 0x2a2a3e }
    ];

    buildingConfigs.forEach((config, index) => {
      const buildingGroup = new THREE.Group();

      // Main building structure with unique dimensions
      const buildingGeometry = new THREE.BoxGeometry(config.width, config.height, config.depth);
      const buildingMaterial = new THREE.MeshStandardMaterial({
        color: config.color,
        roughness: 0.3,
        metalness: 0.7,
        emissive: new THREE.Color().setHSL(index / buildingConfigs.length, 0.8, 0.15),
        emissiveIntensity: 0.4
      });

      const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
      building.position.y = config.height / 2;
      building.castShadow = true;
      building.receiveShadow = true;
      buildingGroup.add(building);

      // Add architectural details - antenna/spire for tall buildings
      if (config.design === 'tall' || config.design === 'tower') {
        const spireGeometry = new THREE.CylinderGeometry(0.5, 1, 8, 8);
        const spireMaterial = new THREE.MeshStandardMaterial({
          color: 0xff00ff,
          emissive: 0xff00ff,
          emissiveIntensity: 2.0,
          metalness: 1.0
        });
        const spire = new THREE.Mesh(spireGeometry, spireMaterial);
        spire.position.y = config.height + 4;
        buildingGroup.add(spire);

        // Blinking light on top
        const topLight = new THREE.PointLight(0xff00ff, 3, 20);
        topLight.position.set(0, config.height + 5, 0);
        buildingGroup.add(topLight);
      }

      // Neon edge lights
      const edgeGeometry = new THREE.EdgesGeometry(buildingGeometry);
      const edgeMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color().setHSL(index / buildingConfigs.length, 1.0, 0.7),
        linewidth: 3
      });
      const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      edges.position.y = config.height / 2;
      buildingGroup.add(edges);

      // Multiple floors with glowing windows on ALL 4 SIDES
      const floorsCount = Math.floor(config.height / 4);

      for (let floor = 0; floor < floorsCount; floor++) {
        // FRONT FACE - Windows
        for (let w = 0; w < 3; w++) {
          const windowGeometry = new THREE.PlaneGeometry(1.2, 1.2);
          const isLit = Math.random() > 0.3;
          const windowMaterial = new THREE.MeshStandardMaterial({
            color: isLit ? 0xffdd66 : 0x444444,
            emissive: isLit ? 0xffdd66 : 0x000000,
            emissiveIntensity: isLit ? 2.0 : 0,
            transparent: true,
            opacity: 0.95
          });
          const frontWindow = new THREE.Mesh(windowGeometry, windowMaterial);
          frontWindow.position.set(
            (w - 1) * 3,
            4 + floor * 4,
            config.depth / 2 + 0.01
          );
          buildingGroup.add(frontWindow);
        }

        // BACK FACE - Windows
        for (let w = 0; w < 3; w++) {
          const windowGeometry = new THREE.PlaneGeometry(1.2, 1.2);
          const isLit = Math.random() > 0.3;
          const windowMaterial = new THREE.MeshStandardMaterial({
            color: isLit ? 0xffdd66 : 0x444444,
            emissive: isLit ? 0xffdd66 : 0x000000,
            emissiveIntensity: isLit ? 2.0 : 0,
            transparent: true,
            opacity: 0.95
          });
          const backWindow = new THREE.Mesh(windowGeometry, windowMaterial);
          backWindow.position.set(
            (w - 1) * 3,
            4 + floor * 4,
            -config.depth / 2 - 0.01
          );
          backWindow.rotation.y = Math.PI;
          buildingGroup.add(backWindow);
        }

        // RIGHT FACE - Windows
        for (let w = 0; w < 3; w++) {
          const windowGeometry = new THREE.PlaneGeometry(1.2, 1.2);
          const isLit = Math.random() > 0.3;
          const windowMaterial = new THREE.MeshStandardMaterial({
            color: isLit ? 0xffdd66 : 0x444444,
            emissive: isLit ? 0xffdd66 : 0x000000,
            emissiveIntensity: isLit ? 2.0 : 0,
            transparent: true,
            opacity: 0.95
          });
          const rightWindow = new THREE.Mesh(windowGeometry, windowMaterial);
          rightWindow.position.set(
            config.width / 2 + 0.01,
            4 + floor * 4,
            (w - 1) * 3
          );
          rightWindow.rotation.y = Math.PI / 2;
          buildingGroup.add(rightWindow);
        }

        // LEFT FACE - Windows
        for (let w = 0; w < 3; w++) {
          const windowGeometry = new THREE.PlaneGeometry(1.2, 1.2);
          const isLit = Math.random() > 0.3;
          const windowMaterial = new THREE.MeshStandardMaterial({
            color: isLit ? 0xffdd66 : 0x444444,
            emissive: isLit ? 0xffdd66 : 0x000000,
            emissiveIntensity: isLit ? 2.0 : 0,
            transparent: true,
            opacity: 0.95
          });
          const leftWindow = new THREE.Mesh(windowGeometry, windowMaterial);
          leftWindow.position.set(
            -config.width / 2 - 0.01,
            4 + floor * 4,
            (w - 1) * 3
          );
          leftWindow.rotation.y = -Math.PI / 2;
          buildingGroup.add(leftWindow);
        }
      }

      // DOORS on ALL 4 SIDES (Ground Level)
      const doorMaterial = new THREE.MeshStandardMaterial({
        color: 0x654321,
        metalness: 0.5,
        roughness: 0.5
      });

      // FRONT Door
      const frontDoorGeometry = new THREE.BoxGeometry(1.5, 2.5, 0.1);
      const frontDoor = new THREE.Mesh(frontDoorGeometry, doorMaterial);
      frontDoor.position.set(0, 1.25, config.depth / 2 + 0.05);
      frontDoor.castShadow = true;
      buildingGroup.add(frontDoor);

      // Door frame (front)
      const frontFrameGeometry = new THREE.BoxGeometry(1.8, 2.8, 0.2);
      const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.7,
        roughness: 0.3
      });
      const frontFrame = new THREE.Mesh(frontFrameGeometry, frameMaterial);
      frontFrame.position.set(0, 1.4, config.depth / 2 + 0.02);
      buildingGroup.add(frontFrame);

      // BACK Door
      const backDoor = new THREE.Mesh(frontDoorGeometry, doorMaterial);
      backDoor.position.set(0, 1.25, -config.depth / 2 - 0.05);
      backDoor.castShadow = true;
      buildingGroup.add(backDoor);

      // Door frame (back)
      const backFrame = new THREE.Mesh(frontFrameGeometry, frameMaterial);
      backFrame.position.set(0, 1.4, -config.depth / 2 - 0.02);
      buildingGroup.add(backFrame);

      // RIGHT Door
      const rightDoor = new THREE.Mesh(frontDoorGeometry, doorMaterial);
      rightDoor.position.set(config.width / 2 + 0.05, 1.25, 0);
      rightDoor.rotation.y = Math.PI / 2;
      rightDoor.castShadow = true;
      buildingGroup.add(rightDoor);

      // Door frame (right)
      const rightFrame = new THREE.Mesh(frontFrameGeometry, frameMaterial);
      rightFrame.position.set(config.width / 2 + 0.02, 1.4, 0);
      rightFrame.rotation.y = Math.PI / 2;
      buildingGroup.add(rightFrame);

      // LEFT Door
      const leftDoor = new THREE.Mesh(frontDoorGeometry, doorMaterial);
      leftDoor.position.set(-config.width / 2 - 0.05, 1.25, 0);
      leftDoor.rotation.y = -Math.PI / 2;
      leftDoor.castShadow = true;
      buildingGroup.add(leftDoor);

      // Door frame (left)
      const leftFrame = new THREE.Mesh(frontFrameGeometry, frameMaterial);
      leftFrame.position.set(-config.width / 2 - 0.02, 1.4, 0);
      leftFrame.rotation.y = -Math.PI / 2;
      buildingGroup.add(leftFrame);

      buildingGroup.position.set(config.x, 0, config.z);
      buildingGroup.userData = { index, config };
      scene.add(buildingGroup);
      buildings.push(buildingGroup);
    });

    // Billboard Portfolio System - 4 BILLBOARDS PER BUILDING
    const portfolioPlanes: THREE.Mesh[] = [];
    const videoTextures: THREE.VideoTexture[] = []; // Store video textures for animation loop
    const textureLoader = new THREE.TextureLoader();
    let billboardCounter = 0;

    // VIDEO CACHE: Create one video element (will be reused on all buildings)
    const videoCache = new Map<string, { video: HTMLVideoElement; texture: THREE.VideoTexture }>();

    // Pre-create the single video element
    const video = document.createElement('video');
    video.src = videoItem.src;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata'; // Load only metadata first for faster initial load
    video.playbackRate = 1.0;

    // Start playing when ready (deferred to not block initial load)
    setTimeout(() => {
      video.play().catch((e) => console.warn('Video autoplay blocked:', e));
    }, 100);

    // Create video texture with optimized settings
    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter; // Faster than LinearMipmapLinear for video
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBFormat; // Faster format
    videoTexture.generateMipmaps = false; // Don't generate mipmaps for video (performance)

    videoTextures.push(videoTexture);
    videoCache.set(videoItem.src, { video, texture: videoTexture });

    // Create 4 billboards per building (front, right, back, left)
    buildings.forEach((building, buildingIndex) => {
      const config = building.userData.config;

      // Billboard configurations for each side
      const sides = [
        { name: 'front', position: [0, 0, config.depth / 2 + 0.5], rotation: [0, 0, 0] },
        { name: 'right', position: [config.width / 2 + 0.5, 0, 0], rotation: [0, Math.PI / 2, 0] },
        { name: 'back', position: [0, 0, -config.depth / 2 - 0.5], rotation: [0, Math.PI, 0] },
        { name: 'left', position: [-config.width / 2 - 0.5, 0, 0], rotation: [0, -Math.PI / 2, 0] }
      ];

      sides.forEach((side, sideIndex) => {
        // Assign video to first side (front), images to other 3 sides
        let item;
        if (sideIndex === 0) {
          // Front side: video
          item = videoItem;
        } else {
          // Other 3 sides: images (cycling through portfolioImages)
          const imageIndex = (buildingIndex * 3 + (sideIndex - 1)) % portfolioImages.length;
          item = portfolioImages[imageIndex];
        }
        const itemPath = item.src;
        const itemName = item.name;

        // Function to create billboard with texture
        const createBillboard = (texture: THREE.Texture | THREE.VideoTexture) => {
          // TEXTURE SETTINGS (optimized differently for images vs videos)
          if (texture instanceof THREE.VideoTexture) {
            // Video textures: already optimized in cache creation
            texture.encoding = THREE.sRGBEncoding;
          } else {
            // Image textures: maximum quality
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.generateMipmaps = true;
            texture.encoding = THREE.sRGBEncoding;
          }

          // Large, prominent billboard
          const billboardWidth = side.name === 'front' || side.name === 'back'
            ? Math.min(config.width * 0.75, 14)
            : Math.min(config.depth * 0.75, 14);
          const billboardHeight = billboardWidth * 0.6;

          // ULTRA-BRIGHT glowing frame border
          const frameGeometry = new THREE.PlaneGeometry(billboardWidth + 1, billboardHeight + 1);
          const frameMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 2.0, // Much brighter frame
            transparent: true,
            opacity: 0.95,
            toneMapped: false // Maximum brightness
          });
          const frame = new THREE.Mesh(frameGeometry, frameMaterial);
          frame.userData = { clickable: true, imagePath: itemPath, index: billboardCounter, buildingIndex, side: side.name, itemName };
          frame.name = `billboard-frame-${billboardCounter}`;

          // Main billboard with ULTRA-BRIGHT settings + HIGH CONTRAST
          const billboardGeometry = new THREE.PlaneGeometry(billboardWidth, billboardHeight);
          const billboardMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            side: THREE.DoubleSide,
            emissive: 0xffffff,
            emissiveMap: texture,
            emissiveIntensity: 1.3, // Increased brightness
            metalness: 0,
            roughness: 0.02, // Even smoother for sharper look
            transparent: false,
            toneMapped: false // Bypass tone mapping for maximum brightness
          });

          const billboard = new THREE.Mesh(billboardGeometry, billboardMaterial);
          billboard.position.z = 0.1;
          billboard.userData = { clickable: true, imagePath: itemPath, index: billboardCounter, buildingIndex, side: side.name, itemName };
          billboard.name = `billboard-${billboardCounter}`;

          // Group billboard + frame
          const billboardGroup = new THREE.Group();
          billboardGroup.add(frame);
          billboardGroup.add(billboard);

          // Position on building face
          const billboardHeight_pos = config.height * 0.55;
          billboardGroup.position.set(side.position[0], billboardHeight_pos + side.position[1], side.position[2]);
          billboardGroup.rotation.set(side.rotation[0], side.rotation[1], side.rotation[2]);
          billboardGroup.userData = { clickable: true, imagePath: itemPath, index: billboardCounter, buildingIndex, side: side.name, itemName };
          billboardGroup.name = `billboard-group-${billboardCounter}`;

          building.add(billboardGroup);
          billboardGroups.push(billboardGroup);
          portfolioPlanes.push(billboard);

          // Dedicated ULTRA-BRIGHT spotlight for each billboard
          const billboardSpotlight = new THREE.SpotLight(0xffffff, 4.0); // Increased intensity
          const spotOffset = side.name === 'front' ? [0, 8, 12] :
                            side.name === 'right' ? [12, 8, 0] :
                            side.name === 'back' ? [0, 8, -12] :
                            [-12, 8, 0];

          billboardSpotlight.position.set(
            side.position[0] + spotOffset[0],
            billboardHeight_pos + spotOffset[1],
            side.position[2] + spotOffset[2]
          );
          billboardSpotlight.target.position.set(side.position[0], billboardHeight_pos, side.position[2]);
          billboardSpotlight.angle = Math.PI / 5; // Wider angle
          billboardSpotlight.penumbra = 0.2; // Sharper edges
          billboardSpotlight.distance = 40;
          billboardSpotlight.decay = 1.5;
          building.add(billboardSpotlight);
          building.add(billboardSpotlight.target);

          billboardCounter++;
        };

        // Handle video or image
        if (item.type === 'video') {
          // Use cached video texture (already created above)
          const cachedVideo = videoCache.get(itemPath);
          if (cachedVideo) {
            createBillboard(cachedVideo.texture);
          } else {
            console.error(`Video not found in cache: ${itemPath}`);
            billboardCounter++;
          }
        } else {
          // Handle image
          textureLoader.load(
            itemPath,
            (texture) => {
              createBillboard(texture);
            },
            undefined,
            (error) => {
              console.error(`Failed to load image ${itemPath}:`, error);
              billboardCounter++;
            }
          );
        }
      });
    });

    // Update total billboards count
    setTotalBillboards(buildings.length * 4);

    // ROADS - Times Square Street Layout
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.9,
      metalness: 0.1
    });

    // Main streets
    const mainStreet1 = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 15),
      roadMaterial
    );
    mainStreet1.rotation.x = -Math.PI / 2;
    mainStreet1.position.y = 0.1;
    mainStreet1.receiveShadow = true;
    scene.add(mainStreet1);

    const mainStreet2 = new THREE.Mesh(
      new THREE.PlaneGeometry(15, 200),
      roadMaterial
    );
    mainStreet2.rotation.x = -Math.PI / 2;
    mainStreet2.position.y = 0.1;
    mainStreet2.receiveShadow = true;
    scene.add(mainStreet2);

    // Road markings (yellow lines)
    const lineMaterial = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 0.5
    });

    for (let i = -90; i < 90; i += 10) {
      const line = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 0.3),
        lineMaterial
      );
      line.rotation.x = -Math.PI / 2;
      line.position.set(i, 0.15, 0);
      scene.add(line);
    }

    // CITY TREES - Along streets
    const trees: THREE.Group[] = [];
    const treePositions = [
      // Along main street 1
      { x: -70, z: 10 }, { x: -50, z: 10 }, { x: -30, z: 10 }, { x: 30, z: 10 }, { x: 50, z: 10 }, { x: 70, z: 10 },
      { x: -70, z: -10 }, { x: -50, z: -10 }, { x: -30, z: -10 }, { x: 30, z: -10 }, { x: 50, z: -10 }, { x: 70, z: -10 },
      // Along main street 2
      { x: 10, z: -70 }, { x: 10, z: -50 }, { x: 10, z: -30 }, { x: 10, z: 30 }, { x: 10, z: 50 }, { x: 10, z: 70 },
      { x: -10, z: -70 }, { x: -10, z: -50 }, { x: -10, z: -30 }, { x: -10, z: 30 }, { x: -10, z: 50 }, { x: -10, z: 70 }
    ];

    treePositions.forEach((pos) => {
      const tree = new THREE.Group();

      // Tree trunk
      const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 4, 8);
      const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3520 });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.y = 2;
      trunk.castShadow = true;
      tree.add(trunk);

      // Tree foliage (3 spheres for fuller look)
      const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });

      const foliage1 = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 8), foliageMaterial);
      foliage1.position.y = 4.5;
      foliage1.castShadow = true;
      tree.add(foliage1);

      const foliage2 = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), foliageMaterial);
      foliage2.position.set(-0.8, 5, 0.5);
      foliage2.castShadow = true;
      tree.add(foliage2);

      const foliage3 = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), foliageMaterial);
      foliage3.position.set(0.8, 5, -0.5);
      foliage3.castShadow = true;
      tree.add(foliage3);

      tree.position.set(pos.x, 0, pos.z);
      scene.add(tree);
      trees.push(tree);
    });

    // SMALL PARKS - Green spaces
    const parkPositions = [
      { x: -65, z: -65, size: 15 },
      { x: 65, z: -65, size: 15 },
      { x: -65, z: 65, size: 15 },
      { x: 65, z: 65, size: 15 }
    ];

    parkPositions.forEach((park) => {
      // Grass area
      const grassGeometry = new THREE.PlaneGeometry(park.size, park.size);
      const grassMaterial = new THREE.MeshStandardMaterial({
        color: 0x2d5016,
        roughness: 0.9
      });
      const grass = new THREE.Mesh(grassGeometry, grassMaterial);
      grass.rotation.x = -Math.PI / 2;
      grass.position.set(park.x, 0.05, park.z);
      grass.receiveShadow = true;
      scene.add(grass);

      // Park benches
      for (let i = 0; i < 3; i++) {
        const benchGroup = new THREE.Group();

        // Bench seat
        const seatGeometry = new THREE.BoxGeometry(2, 0.1, 0.5);
        const benchMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const seat = new THREE.Mesh(seatGeometry, benchMaterial);
        seat.position.y = 0.5;
        benchGroup.add(seat);

        // Bench back
        const backGeometry = new THREE.BoxGeometry(2, 0.8, 0.1);
        const back = new THREE.Mesh(backGeometry, benchMaterial);
        back.position.set(0, 0.9, -0.2);
        benchGroup.add(back);

        // Bench legs
        const legGeometry = new THREE.BoxGeometry(0.1, 0.5, 0.1);
        const leg1 = new THREE.Mesh(legGeometry, benchMaterial);
        leg1.position.set(-0.8, 0.25, 0.2);
        benchGroup.add(leg1);

        const leg2 = new THREE.Mesh(legGeometry, benchMaterial);
        leg2.position.set(0.8, 0.25, 0.2);
        benchGroup.add(leg2);

        benchGroup.position.set(
          park.x + (i - 1) * 3,
          0,
          park.z
        );
        scene.add(benchGroup);
      }
    });

    // ANIMATED CARS
    const cars: THREE.Group[] = [];
    const carColors = [0xff0000, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffffff, 0x000000];

    // Create cars (reduced on mobile for performance)
    const carCount = isMobile ? 3 : 8;
    for (let i = 0; i < carCount; i++) {
      const car = new THREE.Group();

      // Car body
      const bodyGeometry = new THREE.BoxGeometry(2, 0.8, 1.2);
      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: carColors[i % carColors.length],
        metalness: 0.8,
        roughness: 0.2
      });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 0.6;
      body.castShadow = true;
      car.add(body);

      // Car roof
      const roofGeometry = new THREE.BoxGeometry(1.2, 0.5, 1);
      const roof = new THREE.Mesh(roofGeometry, bodyMaterial);
      roof.position.set(0, 1.15, 0);
      roof.castShadow = true;
      car.add(roof);

      // Windows (dark glass)
      const windowMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.5
      });
      const windowGeometry = new THREE.BoxGeometry(1.15, 0.45, 0.95);
      const windows = new THREE.Mesh(windowGeometry, windowMaterial);
      windows.position.set(0, 1.15, 0);
      car.add(windows);

      // Wheels
      const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 8);
      const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });

      const wheel1 = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel1.rotation.z = Math.PI / 2;
      wheel1.position.set(-0.7, 0.3, -0.6);
      car.add(wheel1);

      const wheel2 = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel2.rotation.z = Math.PI / 2;
      wheel2.position.set(-0.7, 0.3, 0.6);
      car.add(wheel2);

      const wheel3 = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel3.rotation.z = Math.PI / 2;
      wheel3.position.set(0.7, 0.3, -0.6);
      car.add(wheel3);

      const wheel4 = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel4.rotation.z = Math.PI / 2;
      wheel4.position.set(0.7, 0.3, 0.6);
      car.add(wheel4);

      // Headlights
      const headlightMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff99,
        emissive: 0xffff99,
        emissiveIntensity: 1.0
      });
      const headlightGeometry = new THREE.CircleGeometry(0.15, 8);

      const headlight1 = new THREE.Mesh(headlightGeometry, headlightMaterial);
      headlight1.position.set(1.01, 0.6, -0.4);
      headlight1.rotation.y = Math.PI / 2;
      car.add(headlight1);

      const headlight2 = new THREE.Mesh(headlightGeometry, headlightMaterial);
      headlight2.position.set(1.01, 0.6, 0.4);
      headlight2.rotation.y = Math.PI / 2;
      car.add(headlight2);

      // Random starting position and direction
      const isHorizontal = i % 2 === 0;
      if (isHorizontal) {
        car.position.set(Math.random() * 150 - 75, 0, Math.random() > 0.5 ? 3 : -3);
        car.rotation.y = Math.random() > 0.5 ? 0 : Math.PI;
      } else {
        car.position.set(Math.random() > 0.5 ? 3 : -3, 0, Math.random() * 150 - 75);
        car.rotation.y = Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2;
      }

      car.userData = {
        speed: 0.1 + Math.random() * 0.15,
        direction: isHorizontal ? (car.rotation.y === 0 ? 1 : -1) : 0,
        directionZ: !isHorizontal ? (car.rotation.y === Math.PI / 2 ? 1 : -1) : 0,
        lane: car.position.z
      };

      scene.add(car);
      cars.push(car);
    }

    // STREET VENDORS - Food carts and stands
    const vendorPositions = [
      { x: -25, z: 12 },
      { x: 25, z: 12 },
      { x: -25, z: -12 },
      { x: 25, z: -12 },
      { x: 12, z: -25 },
      { x: 12, z: 25 },
      { x: -12, z: -25 },
      { x: -12, z: 25 }
    ];

    vendorPositions.forEach((pos) => {
      const vendor = new THREE.Group();

      // Cart base
      const cartGeometry = new THREE.BoxGeometry(2, 1.5, 1.5);
      const cartMaterial = new THREE.MeshStandardMaterial({
        color: 0xff6600,
        metalness: 0.3,
        roughness: 0.7
      });
      const cart = new THREE.Mesh(cartGeometry, cartMaterial);
      cart.position.y = 0.75;
      cart.castShadow = true;
      vendor.add(cart);

      // Canopy/umbrella
      const canopyGeometry = new THREE.CylinderGeometry(1.5, 1.5, 0.2, 8);
      const canopyMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        side: THREE.DoubleSide
      });
      const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
      canopy.position.y = 2.5;
      vendor.add(canopy);

      // Pole
      const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8);
      const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
      const pole = new THREE.Mesh(poleGeometry, poleMaterial);
      pole.position.y = 1.75;
      vendor.add(pole);

      // Cart wheels
      const wheelGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 8);
      const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });

      const wheel1 = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel1.rotation.z = Math.PI / 2;
      wheel1.position.set(-0.6, 0.2, -0.8);
      vendor.add(wheel1);

      const wheel2 = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel2.rotation.z = Math.PI / 2;
      wheel2.position.set(-0.6, 0.2, 0.8);
      vendor.add(wheel2);

      vendor.position.set(pos.x, 0, pos.z);
      scene.add(vendor);
    });

    // PEOPLE/CROWD - Simple character sprites
    const people: THREE.Group[] = [];
    const crowdColors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf7dc6f, 0xbb8fce, 0x85c1e2, 0xf8b500];

    // Create people walking around (reduced on mobile for performance)
    const peopleCount = isMobile ? 5 : 20;
    for (let i = 0; i < peopleCount; i++) {
      const person = new THREE.Group();

      // Body (capsule-like)
      const bodyGeometry = new THREE.CapsuleGeometry(0.2, 0.8, 4, 8);
      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: crowdColors[i % crowdColors.length],
        metalness: 0.1,
        roughness: 0.8
      });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 1;
      body.castShadow = true;
      person.add(body);

      // Head
      const headGeometry = new THREE.SphereGeometry(0.25, 8, 8);
      const headMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd1a3,
        metalness: 0.1,
        roughness: 0.9
      });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.y = 1.8;
      head.castShadow = true;
      person.add(head);

      // Random position on sidewalks
      const onSidewalk = Math.random() > 0.5;
      if (onSidewalk) {
        person.position.set(
          Math.random() * 150 - 75,
          0,
          Math.random() > 0.5 ? 8 : -8
        );
      } else {
        person.position.set(
          Math.random() > 0.5 ? 8 : -8,
          0,
          Math.random() * 150 - 75
        );
      }

      // Walking animation data
      person.userData = {
        speed: 0.02 + Math.random() * 0.03,
        direction: Math.random() > 0.5 ? 1 : -1,
        isHorizontal: onSidewalk,
        walkOffset: Math.random() * Math.PI * 2
      };

      scene.add(person);
      people.push(person);
    }

    // OrbitControls (dynamically imported)
    let controls: any;
    let isAnimating = false;

    const initControls = async () => {
      try {
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enableZoom = true;
        controls.minDistance = 5;
        controls.maxDistance = 50;
        controls.maxPolarAngle = Math.PI / 2;
        controls.target.set(0, 5, 0);
      } catch (error) {
        console.error('OrbitControls failed to load:', error);
      }
    };

    initControls();

    // ENHANCED Navigation System - Billboard Click Detection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let localCurrentIndex = 0;

    const onMouseClick = (event: MouseEvent) => {
      if (isAnimating) return;

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Collect all clickable billboard objects
      const clickableObjects: THREE.Object3D[] = [];
      scene.traverse((obj) => {
        if (obj.userData.clickable && obj instanceof THREE.Mesh) {
          clickableObjects.push(obj);
        }
      });

      const intersects = raycaster.intersectObjects(clickableObjects, true);

      if (intersects.length > 0 && controls) {
        const clickedObject = intersects[0].object;
        const billboardData = clickedObject.userData;

        if (billboardData.imagePath) {
          isAnimating = true;
          localCurrentIndex = billboardData.index;
          setCurrentBillboardIndex(billboardData.index);

          // Get world position of the clicked billboard
          const worldPosition = new THREE.Vector3();
          clickedObject.getWorldPosition(worldPosition);

          const imagePath = billboardData.imagePath;
          const imageName = imagePath.split('/').pop().replace(/\.(jpg|png|jpeg)$/i, '');

          // Calculate optimal camera position based on which side of building
          const buildingPos = buildings[billboardData.buildingIndex].position;
          const config = buildings[billboardData.buildingIndex].userData.config;
          const side = billboardData.side;

          // Position camera directly in front of the specific billboard side
          let cameraTargetPosition = new THREE.Vector3();
          let lookAtPosition = new THREE.Vector3();

          const viewDistance = 12; // Closer for better view

          if (side === 'front') {
            cameraTargetPosition.set(buildingPos.x, worldPosition.y, buildingPos.z + config.depth / 2 + viewDistance);
            lookAtPosition.set(buildingPos.x, worldPosition.y, buildingPos.z + config.depth / 2);
          } else if (side === 'right') {
            cameraTargetPosition.set(buildingPos.x + config.width / 2 + viewDistance, worldPosition.y, buildingPos.z);
            lookAtPosition.set(buildingPos.x + config.width / 2, worldPosition.y, buildingPos.z);
          } else if (side === 'back') {
            cameraTargetPosition.set(buildingPos.x, worldPosition.y, buildingPos.z - config.depth / 2 - viewDistance);
            lookAtPosition.set(buildingPos.x, worldPosition.y, buildingPos.z - config.depth / 2);
          } else if (side === 'left') {
            cameraTargetPosition.set(buildingPos.x - config.width / 2 - viewDistance, worldPosition.y, buildingPos.z);
            lookAtPosition.set(buildingPos.x - config.width / 2, worldPosition.y, buildingPos.z);
          }

          controls.enabled = false;

          gsap.to(camera.position, {
            duration: 1.2,
            x: cameraTargetPosition.x,
            y: cameraTargetPosition.y,
            z: cameraTargetPosition.z,
            ease: "power2.inOut"
          });

          gsap.to(controls.target, {
            duration: 1.2,
            x: lookAtPosition.x,
            y: lookAtPosition.y,
            z: lookAtPosition.z,
            ease: "power2.inOut",
            onComplete: () => {
              isAnimating = false;
              controls.enabled = true;
              setShowZoomButton(true);
              setSelectedImage(imagePath);
              setCurrentImageName(imageName);
            }
          });
        }
      } else {
        setShowZoomButton(false);
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      if (isAnimating) return;

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Collect all clickable billboard objects
      const clickableObjects: THREE.Object3D[] = [];
      scene.traverse((obj) => {
        if (obj.userData.clickable && obj instanceof THREE.Mesh) {
          clickableObjects.push(obj);
        }
      });

      const intersects = raycaster.intersectObjects(clickableObjects, false);

      // Reset all billboards to default brightness
      portfolioPlanes.forEach(plane => {
        if (plane.material instanceof THREE.MeshStandardMaterial) {
          plane.material.emissiveIntensity = 1.3;
        }
      });

      // Highlight hovered billboard
      if (intersects.length > 0) {
        const hoveredObject = intersects[0].object;

        if (hoveredObject instanceof THREE.Mesh && hoveredObject.material instanceof THREE.MeshStandardMaterial) {
          hoveredObject.material.emissiveIntensity = 1.8; // Super bright on hover
        }

        // Also brighten the frame
        if (hoveredObject.parent) {
          hoveredObject.parent.children.forEach(child => {
            if (child instanceof THREE.Mesh && child.name.includes('frame')) {
              if (child.material instanceof THREE.MeshStandardMaterial) {
                child.material.emissiveIntensity = 2.5;
              }
            }
          });
        }

        document.body.style.cursor = 'pointer';
      } else {
        document.body.style.cursor = 'default';
      }
    };

    // Keyboard navigation between billboards
    const onKeyDown = (event: KeyboardEvent) => {
      if (isAnimating || !billboardGroups.length) return;

      let targetIndex = localCurrentIndex;

      if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
        targetIndex = (localCurrentIndex - 1 + billboardGroups.length) % billboardGroups.length;
      } else if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
        targetIndex = (localCurrentIndex + 1) % billboardGroups.length;
      } else {
        return;
      }

      // Navigate to the target billboard
      const targetGroup = billboardGroups[targetIndex];
      if (targetGroup) {
        localCurrentIndex = targetIndex;
        setCurrentBillboardIndex(targetIndex);
        isAnimating = true;

        const worldPosition = new THREE.Vector3();
        targetGroup.getWorldPosition(worldPosition);

        const billboardData = targetGroup.userData;
        const imagePath = billboardData.imagePath;
        const imageName = imagePath ? imagePath.split('/').pop().replace(/\.(jpg|png|jpeg)$/i, '') : 'Billboard';

        const buildingPos = buildings[billboardData.buildingIndex].position;
        const config = buildings[billboardData.buildingIndex].userData.config;
        const side = billboardData.side;

        // Position camera based on which side of the building
        let cameraTargetPosition = new THREE.Vector3();
        let lookAtPosition = new THREE.Vector3();

        const viewDistance = 12;

        if (side === 'front') {
          cameraTargetPosition.set(buildingPos.x, worldPosition.y, buildingPos.z + config.depth / 2 + viewDistance);
          lookAtPosition.set(buildingPos.x, worldPosition.y, buildingPos.z + config.depth / 2);
        } else if (side === 'right') {
          cameraTargetPosition.set(buildingPos.x + config.width / 2 + viewDistance, worldPosition.y, buildingPos.z);
          lookAtPosition.set(buildingPos.x + config.width / 2, worldPosition.y, buildingPos.z);
        } else if (side === 'back') {
          cameraTargetPosition.set(buildingPos.x, worldPosition.y, buildingPos.z - config.depth / 2 - viewDistance);
          lookAtPosition.set(buildingPos.x, worldPosition.y, buildingPos.z - config.depth / 2);
        } else if (side === 'left') {
          cameraTargetPosition.set(buildingPos.x - config.width / 2 - viewDistance, worldPosition.y, buildingPos.z);
          lookAtPosition.set(buildingPos.x - config.width / 2, worldPosition.y, buildingPos.z);
        }

        controls.enabled = false;

        gsap.to(camera.position, {
          duration: 1.0,
          x: cameraTargetPosition.x,
          y: cameraTargetPosition.y,
          z: cameraTargetPosition.z,
          ease: "power2.inOut"
        });

        gsap.to(controls.target, {
          duration: 1.0,
          x: lookAtPosition.x,
          y: lookAtPosition.y,
          z: lookAtPosition.z,
          ease: "power2.inOut",
          onComplete: () => {
            isAnimating = false;
            controls.enabled = true;
            setShowZoomButton(true);
            setSelectedImage(imagePath);
            setCurrentImageName(imageName);
          }
        });
      }
    };

    window.addEventListener('click', onMouseClick);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('keydown', onKeyDown);

    // Window resize
    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onWindowResize);

    // Animation loop - City atmosphere with moving cars
    const animate = () => {
      requestAnimationFrame(animate);

      if (controls) controls.update();

      // Update video textures (for playing videos on billboards)
      videoTextures.forEach((videoTexture) => {
        if (videoTexture.image && videoTexture.image.readyState >= videoTexture.image.HAVE_CURRENT_DATA) {
          videoTexture.needsUpdate = true;
        }
      });

      // Gentle particle drift
      particleSystem.rotation.y += 0.0003;

      // Subtle building sway (wind effect)
      buildings.forEach((building, index) => {
        building.rotation.y = Math.sin(Date.now() * 0.0003 + index) * 0.005;
      });

      // Pulsing city lights
      if (cityGlow1) cityGlow1.intensity = 2.0 + Math.sin(Date.now() * 0.002) * 0.5;
      if (cityGlow2) cityGlow2.intensity = 1.5 + Math.sin(Date.now() * 0.003 + 1) * 0.4;
      if (cityGlow3) cityGlow3.intensity = 1.5 + Math.sin(Date.now() * 0.0025 + 2) * 0.4;

      // Animate cars
      cars.forEach((car) => {
        // Move car in its direction
        if (car.userData.direction !== 0) {
          car.position.x += car.userData.direction * car.userData.speed;

          // Reset position when out of bounds
          if (car.position.x > 100) {
            car.position.x = -100;
          } else if (car.position.x < -100) {
            car.position.x = 100;
          }
        } else {
          car.position.z += car.userData.directionZ * car.userData.speed;

          // Reset position when out of bounds
          if (car.position.z > 100) {
            car.position.z = -100;
          } else if (car.position.z < -100) {
            car.position.z = 100;
          }
        }

        // Rotate wheels
        car.children.forEach((child) => {
          if (child.geometry && child.geometry.type === 'CylinderGeometry') {
            child.rotation.x += car.userData.speed * 0.5;
          }
        });
      });

      // Gentle tree sway
      trees.forEach((tree, index) => {
        tree.rotation.z = Math.sin(Date.now() * 0.001 + index) * 0.02;
      });

      // Animate people walking
      people.forEach((person) => {
        // Walking motion
        if (person.userData.isHorizontal) {
          person.position.x += person.userData.direction * person.userData.speed;

          // Reset position when out of bounds
          if (person.position.x > 90) {
            person.position.x = -90;
          } else if (person.position.x < -90) {
            person.position.x = 90;
          }
        } else {
          person.position.z += person.userData.direction * person.userData.speed;

          // Reset position when out of bounds
          if (person.position.z > 90) {
            person.position.z = -90;
          } else if (person.position.z < -90) {
            person.position.z = 90;
          }
        }

        // Walking animation (bobbing and swaying)
        const time = Date.now() * 0.005;
        person.position.y = Math.abs(Math.sin(time + person.userData.walkOffset)) * 0.1;
        person.rotation.y = Math.sin(time * 0.5 + person.userData.walkOffset) * 0.1;
      });

      renderer.render(scene, camera);
    };

    animate();

    // Hide loading immediately after scene is set up
    setIsLoading(false);

    // Cleanup
    return () => {
      window.removeEventListener('click', onMouseClick);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onWindowResize);
      renderer.dispose();
      document.body.style.cursor = 'default';
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Loading Screen */}
      {isLoading && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 via-blue-900 to-cyan-900">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-cyan-400"></div>
          <p className="mt-4 text-cyan-400 text-lg">Loading Times Square Portfolio...</p>
          <p className="mt-2 text-cyan-300 text-sm">Futuristic City Experience</p>
        </div>
      )}

      {/* Canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 z-[1]" />

      {/* Backdrop overlay for mobile menu - click to close */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[240] pointer-events-auto"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Toggle Button - Only visible when menu is closed */}
      {!isMobileMenuOpen && (
        <div className="lg:hidden fixed top-4 left-4 z-[200]">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-br from-cyan-900/95 to-blue-900/95 backdrop-blur-md rounded-lg border-2 border-cyan-400/50 flex items-center justify-center pointer-events-auto shadow-lg hover:from-cyan-800/95 hover:to-blue-800/95 transition-all"
          >
            <span className="text-cyan-300 text-sm font-bold tracking-wider">
              ☰ MENU
            </span>
          </button>

          {/* Indicator for new users */}
          <div className="absolute -bottom-8 left-0 right-0 flex items-center justify-center pointer-events-none">
            <div className="bg-cyan-500/90 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg animate-pulse whitespace-nowrap">
              📄 Tap for Resume
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Navigation Banner - Desktop only, mobile moved below */}
      <div className="hidden lg:block fixed top-4 left-1/2 transform -translate-x-1/2 z-[150] pointer-events-none">
        <div className="bg-gradient-to-r from-cyan-900/95 via-blue-900/95 to-purple-900/95 backdrop-blur-md px-8 py-4 rounded-2xl border-2 border-cyan-400/50 shadow-2xl">
          <p className="text-cyan-300 text-sm text-center font-semibold">
            🏙️ Times Square Portfolio • App Showcase for Fun & Demonstration 🏙️
          </p>
          <div className="flex items-center justify-center gap-6 mt-2 text-xs">
            <span className="text-cyan-400/90">🖱️ Click Billboards to Zoom</span>
            <span className="text-cyan-400/90">←→ Arrow Keys to Navigate</span>
            <span className="text-cyan-400/90">🖐️ Drag to Rotate View</span>
          </div>
        </div>
      </div>

      {/* Mobile Banner - Positioned below hamburger menu */}
      <div className="lg:hidden fixed top-20 left-4 right-4 z-[150] pointer-events-none">
        <div className="bg-gradient-to-r from-cyan-900/95 via-blue-900/95 to-purple-900/95 backdrop-blur-md px-4 py-3 rounded-xl border-2 border-cyan-400/50 shadow-2xl">
          <p className="text-cyan-300 text-xs text-center font-semibold">
            🏙️ Times Square Portfolio
          </p>
          <p className="text-cyan-400/80 text-[10px] text-center mt-1">
            Tap billboards • Swipe to rotate
          </p>
        </div>
      </div>

      {/* UI Overlay - Sidebar (Desktop: always visible, Mobile: toggle) */}
      <nav className={`fixed top-0 left-0 w-full sm:w-80 lg:w-72 h-screen bg-gradient-to-b from-black/95 via-blue-950/95 to-cyan-900/95 backdrop-blur-md p-6 flex flex-col justify-between border-r-2 border-cyan-400/30 shadow-2xl z-[250] pointer-events-auto transition-transform duration-300 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div>
          {/* Close button for mobile - inside sidebar */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden absolute top-4 right-4 w-10 h-10 bg-red-500/20 border-2 border-red-400/50 rounded-full text-red-300 hover:bg-red-500/40 transition-all text-2xl flex items-center justify-center"
          >
            ×
          </button>

          <h1 className="text-3xl font-bold text-cyan-400 mb-2 drop-shadow-lg">Bilal Hussain</h1>
          <p className="text-cyan-200 text-sm mb-8">Full-Stack Developer</p>

          <div className="space-y-3">
            <button
              onClick={() => {
                setShowResume(true);
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-cyan-400/30 rounded-lg text-cyan-200 hover:bg-cyan-400/20 hover:border-cyan-400/60 transition-all hover:translate-x-1"
            >
              <span className="text-xl">📄</span>
              <span>Resume</span>
            </button>

            <a
              href="https://educator-app.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-cyan-400/30 rounded-lg text-cyan-200 hover:bg-cyan-400/20 hover:border-cyan-400/60 transition-all hover:translate-x-1"
            >
              <span className="text-xl">🌐</span>
              <span>Live Demo</span>
            </a>

            <a
              href="https://github.com/bilalhussainx"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-cyan-400/30 rounded-lg text-cyan-200 hover:bg-cyan-400/20 hover:border-cyan-400/60 transition-all hover:translate-x-1"
            >
              <span className="text-xl">💻</span>
              <span>GitHub</span>
            </a>

            <a
              href="https://www.linkedin.com/in/bilal-hussain-921a04126/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-cyan-400/30 rounded-lg text-cyan-200 hover:bg-cyan-400/20 hover:border-cyan-400/60 transition-all hover:translate-x-1"
            >
              <span className="text-xl">🔗</span>
              <span>LinkedIn</span>
            </a>

            <a
              href="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-cyan-400/30 rounded-lg text-cyan-200 hover:bg-cyan-400/20 hover:border-cyan-400/60 transition-all hover:translate-x-1"
            >
              <span className="text-xl">🏠</span>
              <span>Back to Login</span>
            </a>
          </div>
        </div>

        <div className="pt-4 border-t border-cyan-400/30">
          <p className="text-cyan-300/80 text-xs text-center mb-2 font-semibold">🏙️ Navigation Controls</p>
          <p className="text-cyan-300/70 text-xs text-center mb-1">🖱️ Click billboards to view</p>
          <p className="text-cyan-300/70 text-xs text-center mb-1">⌨️ ←/→ keys to switch</p>
          <p className="text-cyan-300/70 text-xs text-center">🖐️ Drag to explore city</p>
        </div>
      </nav>

      {/* Billboard Navigation & Counter - Mobile responsive */}
      <div className="fixed bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2 z-[150] pointer-events-auto px-4">
        <div className="flex items-center gap-2 sm:gap-4 bg-gradient-to-r from-cyan-900/95 via-blue-900/95 to-purple-900/95 backdrop-blur-md px-3 sm:px-6 py-2 sm:py-3 rounded-full border-2 border-cyan-400/50 shadow-2xl">
          <button
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
              window.dispatchEvent(event);
            }}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400/50 rounded-full flex items-center justify-center transition-all hover:scale-110"
            title="Previous Billboard (←)"
          >
            <span className="text-cyan-300 text-lg sm:text-xl">←</span>
          </button>

          <div className="text-center px-2 sm:px-4">
            <p className="text-cyan-400 text-xs sm:text-sm font-semibold whitespace-nowrap">
              Billboard {currentBillboardIndex + 1} / {totalBillboards}
            </p>
            <p className="text-cyan-300/70 text-[10px] sm:text-xs mt-0.5 hidden sm:block">Use ←→ or click to navigate</p>
          </div>

          <button
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
              window.dispatchEvent(event);
            }}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400/50 rounded-full flex items-center justify-center transition-all hover:scale-110"
            title="Next Billboard (→)"
          >
            <span className="text-cyan-300 text-lg sm:text-xl">→</span>
          </button>
        </div>
      </div>

      {/* Floating Zoom In Button - Mobile responsive */}
      {showZoomButton && !showResume && selectedImage && (
        <div className="fixed bottom-20 sm:bottom-24 right-4 sm:right-8 z-[150] pointer-events-auto">
          <button
            onClick={() => {
              setShowZoomButton(false);
              // Open image modal
              const modal = document.getElementById('image-modal');
              if (modal) modal.style.display = 'flex';
            }}
            className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300 border-2 border-cyan-400 animate-pulse"
          >
            <span className="text-xl sm:text-2xl">🔍</span>
            <span className="font-semibold text-sm sm:text-lg whitespace-nowrap">View Full</span>
          </button>
          <button
            onClick={() => setShowZoomButton(false)}
            className="absolute -top-2 -right-2 w-7 h-7 sm:w-8 sm:h-8 bg-red-500/80 hover:bg-red-600 text-white rounded-full text-sm flex items-center justify-center transition-all shadow-lg"
          >
            ×
          </button>
        </div>
      )}

      {/* Image Modal - Futuristic Billboard View - Mobile responsive */}
      <div
        id="image-modal"
        className="fixed inset-0 z-[250] hidden items-center justify-center bg-black/90 backdrop-blur-sm pointer-events-auto p-2 sm:p-4"
        onClick={() => {
          const modal = document.getElementById('image-modal');
          if (modal) modal.style.display = 'none';
        }}
      >
        <div className="relative w-full max-w-7xl max-h-[95vh] p-2 sm:p-4" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              const modal = document.getElementById('image-modal');
              if (modal) modal.style.display = 'none';
            }}
            className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-10 h-10 sm:w-12 sm:h-12 bg-red-500/90 hover:bg-red-600 text-white rounded-full text-xl sm:text-2xl flex items-center justify-center transition-all z-10 shadow-lg"
          >
            ×
          </button>
          {selectedImage && (
            <div className="bg-gradient-to-b from-gray-900 via-blue-950 to-cyan-950 border-2 sm:border-4 border-cyan-400/50 rounded-lg sm:rounded-xl overflow-hidden shadow-2xl">
              <div className="bg-gradient-to-r from-cyan-900 to-blue-950 px-3 sm:px-6 py-2 sm:py-4 border-b-2 border-cyan-400/30">
                <h3 className="text-lg sm:text-2xl font-bold text-cyan-400 truncate">📺 {currentImageName}</h3>
                <p className="text-cyan-300/70 text-xs sm:text-sm mt-1">Times Square Billboard View</p>
              </div>
              <div className="p-2 sm:p-4 flex items-center justify-center bg-black/50">
                {selectedImage.endsWith('.mp4') || selectedImage.endsWith('.webm') || selectedImage.endsWith('.mov') ? (
                  <video
                    src={selectedImage}
                    controls
                    autoPlay
                    loop
                    muted
                    className="max-w-full max-h-[70vh] sm:max-h-[80vh] object-contain rounded-lg shadow-2xl"
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <img
                    src={selectedImage}
                    alt={currentImageName}
                    className="max-w-full max-h-[70vh] sm:max-h-[80vh] object-contain rounded-lg shadow-2xl"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resume Modal - Mobile responsive */}
      {showResume && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto p-2 sm:p-4" onClick={() => setShowResume(false)}>
          <div className="bg-gradient-to-b from-gray-900 via-blue-950 to-cyan-950 border-2 border-cyan-400/40 rounded-lg sm:rounded-xl p-4 sm:p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowResume(false)}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 w-9 h-9 sm:w-10 sm:h-10 bg-red-500/20 border-2 border-red-400/50 rounded-full text-red-300 hover:bg-red-500/40 transition-all text-xl sm:text-2xl flex items-center justify-center"
            >
              ×
            </button>

            <h2 className="text-2xl sm:text-3xl font-bold text-cyan-400 mb-2 text-center pr-10 sm:pr-0">Bilal Hussain</h2>
            <p className="text-center text-cyan-300 mb-2 text-xs sm:text-base px-2">Toronto, Ontario | 437-907-1483 | bilalhussain.v12@gmail.com</p>
            <div className="text-center mb-6 space-x-4">
              <a href="https://github.com/bilalhussainx" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline text-sm">GitHub</a>
              <a href="https://www.linkedin.com/in/bilal-hussain-921a04126/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline text-sm">LinkedIn</a>
            </div>

            <div className="space-y-6 text-gray-200">
              <div>
                <p className="leading-relaxed text-center">Harvard Computer Science graduate and Full-Stack Developer with expertise in building scalable, real-time applications using React, Python, and Node.js. Proven track record of architecting end-to-end solutions, leading technical teams, and delivering production systems serving 100+ users.</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-cyan-300 mb-3 border-b border-cyan-400/30 pb-2">Technical Skills</h3>
                <p className="mb-2"><strong className="text-cyan-400">Languages:</strong> Python, JavaScript, TypeScript, SQL, HTML5/CSS3, Java, Go</p>
                <p className="mb-2"><strong className="text-cyan-400">Frontend:</strong> React, Next.js, TypeScript, Tailwind CSS, Vite, Monaco Editor, Radix UI</p>
                <p className="mb-2"><strong className="text-cyan-400">Backend:</strong> Node.js, Express.js, Django, Flask, FastAPI, RESTful APIs, WebSockets</p>
                <p className="mb-2"><strong className="text-cyan-400">Databases:</strong> PostgreSQL, MongoDB, Redis</p>
                <p className="mb-2"><strong className="text-cyan-400">DevOps & Tools:</strong> Docker, Git, Azure Blob Storage, Vercel, Agora RTC SDK</p>
                <p className="mb-2"><strong className="text-cyan-400">AI/ML:</strong> Claude API, OpenAI API, Google Gemini, Prompt Engineering, AI Integration</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-cyan-300 mb-3 border-b border-cyan-400/30 pb-2">Key Projects</h3>

                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-cyan-200">Educators Edge - Full-Stack Learning Management Platform</h4>
                  <p className="text-sm italic text-cyan-400/70 mb-1">Lead Developer | React, Node.js, PostgreSQL, WebSockets, AI Integration</p>
                  <p className="text-sm mb-2">
                    <a href="https://educator-app.vercel.app" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">Live Demo</a> |
                    <a href="https://github.com/bilalhussainx/educator-app" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline ml-2">GitHub</a>
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                    <li>Architected and developed a comprehensive LMS enabling real-time video instruction, collaborative coding environments, and AI-powered course generation for 100+ educators and students</li>
                    <li><strong>Backend:</strong> Built scalable Node.js/Express API with 50+ RESTful endpoints, WebSocket real-time communication, PostgreSQL database design, Redis task queues (BullMQ), and Azure Blob Storage integration</li>
                    <li><strong>Frontend:</strong> Engineered responsive React/TypeScript SPA with Vite, Tailwind CSS, Monaco code editor, XTerm.js terminal emulation, and Agora RTC video streaming SDK</li>
                    <li><strong>AI Features:</strong> Integrated Google Gemini and Claude APIs for automated curriculum generation, AI writing assistance, resume optimization, and intelligent code execution analysis</li>
                    <li><strong>Real-Time Systems:</strong> Implemented WebSocket routing architecture for live session presence, collaborative editing, and instant messaging across distributed connections</li>
                    <li><strong>Authentication & Security:</strong> Designed JWT-based auth with Passport.js, role-based access control (teacher/student), and secure session management</li>
                    <li><strong>Key Features:</strong> Live video sessions, interactive coding IDE, LeetCode problem integration with 390+ enriched problems, session booking system, referral program, and earnings dashboard</li>
                  </ul>
                </div>

                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-cyan-200">SynergyPost.ca - Multi-Agent AI Content Platform</h4>
                  <p className="text-sm mb-2">
                    <a href="https://synergypost.ca" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">Live Demo</a> |
                    <a href="https://github.com/bilalhussainx/synergypost" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline ml-2">GitHub</a>
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                    <li>Developed a full-stack multi-agent AI workflow for automated content creation, demonstrating advanced prompt engineering and API orchestration</li>
                    <li>Built Python FastAPI backend with React frontend, integrating Google Vertex AI for intelligent content generation and processing</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-cyan-300 mb-3 border-b border-cyan-400/30 pb-2">Professional Experience</h3>

                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-cyan-200">Milton Academy, Milton, MA — Computer Science Instructor & Technical Lead</h4>
                  <p className="text-sm italic text-cyan-400/70 mb-2">August 2022 - August 2024</p>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                    <li>Architected and delivered a comprehensive 3-part CS curriculum for 100+ students, focusing on Python, JavaScript, and web development fundamentals with hands-on AI and game development projects</li>
                    <li>Mentored students through code reviews and guided development of full-stack capstone projects, resulting in 40% increase in advanced CS course enrollment</li>
                    <li>Developed and deployed a Python-based administrative tool to automate student progress tracking and curriculum management, reducing faculty administrative workload by 5+ hours per week</li>
                  </ul>
                </div>

                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-cyan-200">Healthynox (Remote Startup), Boston, MA — Lead Software Engineer</h4>
                  <p className="text-sm italic text-cyan-400/70 mb-2">January 2020 - March 2021</p>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                    <li>Architected and led the end-to-end development of a patient data management platform, utilizing Python (Django) for backend API and React for the user interface</li>
                    <li>Designed and implemented a secure PostgreSQL database schema for handling sensitive patient information with HIPAA compliance considerations</li>
                    <li>Built critical internal dashboard consolidating data from 5+ sources, reducing manual reporting time for operations team by 10+ hours weekly</li>
                    <li>Mentored a team of 3 junior engineers, establishing best practices for Git workflow, code reviews, and agile development processes</li>
                  </ul>
                </div>

                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-cyan-200">The Harvard Lampoon, Cambridge, MA — Advertisement & Finance Board</h4>
                  <p className="text-sm italic text-cyan-400/70 mb-2">September 2019 - May 2022</p>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                    <li>Generated $14,000 in new revenue over 5 months by leading full sales cycle including web scraping for lead generation, cold-calling executives, and securing event sponsorships</li>
                    <li>Developed Python automation scripts for prospect research and outreach tracking</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-cyan-300 mb-3 border-b border-cyan-400/30 pb-2">Technical Highlights</h3>
                <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                  <li><strong className="text-cyan-400">Full-Stack Architecture:</strong> Designed and deployed production-grade applications with React frontends, Node.js/Django backends, and PostgreSQL databases</li>
                  <li><strong className="text-cyan-400">Real-Time Systems:</strong> Implemented WebSocket-based live collaboration, video streaming, and instant messaging features</li>
                  <li><strong className="text-cyan-400">AI Integration:</strong> Built AI-powered features using Claude, OpenAI, and Gemini APIs for content generation, code analysis, and intelligent assistance</li>
                  <li><strong className="text-cyan-400">Database Design:</strong> Created complex relational schemas with PostgreSQL for multi-tenant applications with role-based access control</li>
                  <li><strong className="text-cyan-400">DevOps:</strong> Containerized applications with Docker, deployed to cloud platforms (Vercel, Azure), and managed CI/CD pipelines</li>
                  <li><strong className="text-cyan-400">Code Quality:</strong> Established TypeScript strict mode, ESLint configurations, and comprehensive error handling across 20,000+ lines of code</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-cyan-300 mb-3 border-b border-cyan-400/30 pb-2">Education</h3>
                <p><strong className="text-cyan-400">Harvard College, Cambridge, USA</strong> — Bachelor of Arts in Computer Science</p>
                <p className="text-sm italic text-cyan-400/70">August 2016 - May 2022</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-cyan-300 mb-3 border-b border-cyan-400/30 pb-2">Additional Information</h3>
                <p className="mb-1"><strong className="text-cyan-400">Languages:</strong> English (Native), Urdu (Fluent)</p>
                <p className="mb-1"><strong className="text-cyan-400">Interests:</strong> EdTech Innovation, AI/ML Applications, Open Source Contribution</p>
                <p><strong className="text-cyan-400">Availability:</strong> Immediately available for full-time positions</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeveloperPortfolio3D;
