/*
 * =================================================================
 * 3D DEVELOPER PORTFOLIO - React Component
 * Bilal Hussain - Full-Stack Developer
 * =================================================================
 * A mystical 3D forest portfolio showcasing projects with Three.js
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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showZoomButton, setShowZoomButton] = useState(false);
  const [currentImageName, setCurrentImageName] = useState<string>('');

  // Portfolio images configuration - All your images
  const portfolioImages = [
    '/assets/portfolio/dashboard1.jpg',
    '/assets/portfolio/educators-edge-dashboard.jpg',
    '/assets/portfolio/Essay.jpg',
    '/assets/portfolio/EssayCoach.png',
    '/assets/portfolio/Leetcode-course.jpg',
    '/assets/portfolio/leetcode-enrichment.jpg',
    '/assets/portfolio/leetcode-ide.jpg',
    '/assets/portfolio/synergypost.jpg',
    '/assets/portfolio/trustgraph.jpg',
    '/assets/portfolio/writing.jpg'
  ];

  useEffect(() => {
    if (!canvasRef.current) return;

    // Scene Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x223322, 0.015);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 20);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    // Lighting - ENHANCED for better visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2); // Increased from 0.6
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // Increased from 0.8
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Additional directional light from the opposite side
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight2.position.set(-50, 30, -50);
    scene.add(directionalLight2);

    const pointLight = new THREE.PointLight(0x64ff96, 0.8, 100); // Increased from 0.5
    pointLight.position.set(0, 10, 0);
    scene.add(pointLight);

    // Add spotlight for portfolio planes
    const spotLight = new THREE.SpotLight(0xffffff, 1.5);
    spotLight.position.set(0, 30, 0);
    spotLight.angle = Math.PI / 3;
    spotLight.penumbra = 0.5;
    scene.add(spotLight);

    // Forest Background
    scene.background = new THREE.Color(0x1a3a2a);

    // Particles (mystical atmosphere)
    const particleCount = 500;
    const particles = new THREE.BufferGeometry();
    const particlePositions: number[] = [];

    for (let i = 0; i < particleCount; i++) {
      particlePositions.push(
        (Math.random() - 0.5) * 200,
        Math.random() * 50,
        (Math.random() - 0.5) * 200
      );
    }

    particles.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x64ff96,
      size: 0.3,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    const particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);

    // Simple Trees
    const treeTrunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 15, 8);
    const treeTrunkMaterial = new THREE.MeshStandardMaterial({ color: 0x3d2817 });
    const treeFoliageGeometry = new THREE.SphereGeometry(3, 8, 8);
    const treeFoliageMaterial = new THREE.MeshStandardMaterial({ color: 0x2d5016 });

    for (let i = 0; i < 30; i++) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(treeTrunkGeometry, treeTrunkMaterial);
      trunk.position.y = 7.5;
      tree.add(trunk);

      const foliage = new THREE.Mesh(treeFoliageGeometry, treeFoliageMaterial);
      foliage.position.y = 15;
      tree.add(foliage);

      tree.position.set(
        (Math.random() - 0.5) * 100,
        0,
        (Math.random() - 0.5) * 100
      );

      if (tree.position.length() > 20) {
        scene.add(tree);
      }
    }

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a2a1a,
      roughness: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Portfolio Planes
    const portfolioPlanes: THREE.Mesh[] = [];
    const textureLoader = new THREE.TextureLoader();

    portfolioImages.forEach((imagePath, index) => {
      textureLoader.load(
        imagePath,
        (texture) => {
          const material = new THREE.MeshStandardMaterial({
            map: texture,
            side: THREE.DoubleSide,
            emissive: 0x222222,
            emissiveIntensity: 0.2,
            metalness: 0.1,
            roughness: 0.4
          });

          const geometry = new THREE.PlaneGeometry(10, 6);
          const plane = new THREE.Mesh(geometry, material);

          const radius = 18; // Reduced from 25 for closer spacing
          const angle = (index / portfolioImages.length) * Math.PI * 2;
          plane.position.set(
            Math.cos(angle) * radius,
            5 + Math.sin(index * 0.5) * 2, // Reduced vertical variation
            Math.sin(angle) * radius
          );

          plane.lookAt(0, 5, 0);
          plane.userData = { imagePath, index };
          plane.name = `portfolio-${index}`;

          scene.add(plane);
          portfolioPlanes.push(plane);
        },
        undefined,
        () => {
          // Placeholder on error
          const placeholderMaterial = new THREE.MeshStandardMaterial({
            color: 0x64ff96,
            emissive: 0x64ff96,
            emissiveIntensity: 0.3
          });

          const geometry = new THREE.PlaneGeometry(10, 6);
          const plane = new THREE.Mesh(geometry, placeholderMaterial);

          const radius = 18; // Reduced from 25 for closer spacing
          const angle = (index / portfolioImages.length) * Math.PI * 2;
          plane.position.set(
            Math.cos(angle) * radius,
            5 + Math.sin(index * 0.5) * 2, // Reduced vertical variation
            Math.sin(angle) * radius
          );

          plane.lookAt(0, 5, 0);
          plane.userData = { imagePath, index };
          plane.name = `portfolio-${index}`;

          scene.add(plane);
          portfolioPlanes.push(plane);
        }
      );
    });

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

    // Raycasting for clicks
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseClick = (event: MouseEvent) => {
      if (isAnimating) return;

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(portfolioPlanes);

      if (intersects.length > 0 && controls) {
        const clickedObject = intersects[0].object as THREE.Mesh;
        isAnimating = true;

        const targetPosition = clickedObject.position.clone();

        // Get image path from userData
        const imagePath = clickedObject.userData.imagePath;
        const imageName = imagePath.split('/').pop().replace(/\.(jpg|png|jpeg)$/i, '');

        // Calculate direction from center (0,5,0) to the plane
        // This ensures we position camera between center and plane
        const centerToPlane = new THREE.Vector3().subVectors(targetPosition, new THREE.Vector3(0, 5, 0));
        centerToPlane.normalize();

        // Position camera 12 units in front of the plane (toward center)
        const cameraTargetPosition = targetPosition.clone().sub(centerToPlane.multiplyScalar(12));
        cameraTargetPosition.y = targetPosition.y; // Keep same height

        controls.enabled = false;

        gsap.to(camera.position, {
          duration: 2,
          x: cameraTargetPosition.x,
          y: cameraTargetPosition.y,
          z: cameraTargetPosition.z,
          ease: "power2.inOut"
        });

        gsap.to(controls.target, {
          duration: 2,
          x: targetPosition.x,
          y: targetPosition.y,
          z: targetPosition.z,
          ease: "power2.inOut",
          onComplete: () => {
            isAnimating = false;
            controls.enabled = true;
            // Show zoom button after animation completes
            setShowZoomButton(true);
            setSelectedImage(imagePath);
            setCurrentImageName(imageName);
          }
        });
      } else {
        // Clicked empty space - hide zoom button
        setShowZoomButton(false);
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      if (isAnimating) return;

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(portfolioPlanes);

      portfolioPlanes.forEach(plane => {
        if (plane.material instanceof THREE.MeshStandardMaterial) {
          plane.material.emissiveIntensity = 0.2;
        }
      });

      if (intersects.length > 0) {
        const material = intersects[0].object.material as THREE.MeshStandardMaterial;
        if (material) material.emissiveIntensity = 0.5;
      }
    };

    window.addEventListener('click', onMouseClick);
    window.addEventListener('mousemove', onMouseMove);

    // Window resize
    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onWindowResize);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      if (controls) controls.update();

      particleSystem.rotation.y += 0.0002;

      portfolioPlanes.forEach((plane, index) => {
        plane.position.y += Math.sin(Date.now() * 0.001 + index) * 0.002;
      });

      renderer.render(scene, camera);
    };

    animate();

    // Hide loading after 1 second
    setTimeout(() => setIsLoading(false), 1000);

    // Cleanup
    return () => {
      window.removeEventListener('click', onMouseClick);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onWindowResize);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Loading Screen */}
      {isLoading && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-green-900">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-green-400"></div>
          <p className="mt-4 text-green-400 text-lg">Loading 3D Portfolio...</p>
        </div>
      )}

      {/* Canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 z-[1]" />

      {/* UI Overlay */}
      <nav className="fixed top-0 left-0 w-72 h-screen bg-gradient-to-b from-black/95 to-green-900/95 backdrop-blur-md p-6 flex flex-col justify-between border-r-2 border-green-400/30 shadow-2xl z-[100] pointer-events-auto">
        <div>
          <h1 className="text-3xl font-bold text-green-400 mb-2 drop-shadow-lg">Bilal Hussain</h1>
          <p className="text-green-200 text-sm mb-8">Full-Stack Developer</p>

          <div className="space-y-3">
            <button
              onClick={() => setShowResume(true)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-green-400/30 rounded-lg text-green-200 hover:bg-green-400/20 hover:border-green-400/60 transition-all hover:translate-x-1"
            >
              <span className="text-xl">📄</span>
              <span>Resume</span>
            </button>

            <a
              href="https://github.com/bilalhussainx/educator-app"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-green-400/30 rounded-lg text-green-200 hover:bg-green-400/20 hover:border-green-400/60 transition-all hover:translate-x-1"
            >
              <span className="text-xl">🚀</span>
              <span>Educators Edge</span>
            </a>

            <a
              href="https://educator-app.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-green-400/30 rounded-lg text-green-200 hover:bg-green-400/20 hover:border-green-400/60 transition-all hover:translate-x-1"
            >
              <span className="text-xl">🌐</span>
              <span>Live Demo</span>
            </a>

            <a
              href="https://github.com/bilalhussainx"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-green-400/30 rounded-lg text-green-200 hover:bg-green-400/20 hover:border-green-400/60 transition-all hover:translate-x-1"
            >
              <span className="text-xl">💻</span>
              <span>GitHub</span>
            </a>

            <a
              href="https://www.linkedin.com/in/bilal-hussain-921a04126/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-green-400/30 rounded-lg text-green-200 hover:bg-green-400/20 hover:border-green-400/60 transition-all hover:translate-x-1"
            >
              <span className="text-xl">🔗</span>
              <span>LinkedIn</span>
            </a>

            <a
              href="/login"
              className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-green-400/30 rounded-lg text-green-200 hover:bg-green-400/20 hover:border-green-400/60 transition-all hover:translate-x-1"
            >
              <span className="text-xl">🏠</span>
              <span>Back to Login</span>
            </a>
          </div>
        </div>

        <div className="pt-4 border-t border-green-400/30">
          <p className="text-green-300/70 text-xs text-center mb-2">Click images to explore</p>
          <p className="text-green-300/70 text-xs text-center">Drag to look around</p>
        </div>
      </nav>

      {/* Floating Zoom In Button */}
      {showZoomButton && !showResume && selectedImage && (
        <div className="fixed bottom-8 right-8 z-[150] pointer-events-auto">
          <button
            onClick={() => {
              setShowZoomButton(false);
              // Open image modal
              const modal = document.getElementById('image-modal');
              if (modal) modal.style.display = 'flex';
            }}
            className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300 border-2 border-green-400"
          >
            <span className="text-2xl">🔍</span>
            <span className="font-semibold text-lg">View Full Image</span>
          </button>
          <button
            onClick={() => setShowZoomButton(false)}
            className="absolute -top-2 -right-2 w-8 h-8 bg-red-500/80 hover:bg-red-600 text-white rounded-full text-sm flex items-center justify-center transition-all"
          >
            ×
          </button>
        </div>
      )}

      {/* Image Modal */}
      <div
        id="image-modal"
        className="fixed inset-0 z-[250] hidden items-center justify-center bg-black/90 backdrop-blur-sm pointer-events-auto"
        onClick={() => {
          const modal = document.getElementById('image-modal');
          if (modal) modal.style.display = 'none';
        }}
      >
        <div className="relative max-w-7xl max-h-[95vh] p-4" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              const modal = document.getElementById('image-modal');
              if (modal) modal.style.display = 'none';
            }}
            className="absolute -top-4 -right-4 w-12 h-12 bg-red-500/90 hover:bg-red-600 text-white rounded-full text-2xl flex items-center justify-center transition-all z-10 shadow-lg"
          >
            ×
          </button>
          {selectedImage && (
            <div className="bg-gradient-to-b from-gray-900 to-green-950 border-4 border-green-400/50 rounded-xl overflow-hidden shadow-2xl">
              <div className="bg-gradient-to-r from-green-900 to-green-950 px-6 py-4 border-b-2 border-green-400/30">
                <h3 className="text-2xl font-bold text-green-400">{currentImageName}</h3>
              </div>
              <div className="p-4 flex items-center justify-center bg-black/50">
                <img
                  src={selectedImage}
                  alt={currentImageName}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resume Modal */}
      {showResume && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto" onClick={() => setShowResume(false)}>
          <div className="bg-gradient-to-b from-gray-900 to-green-950 border-2 border-green-400/40 rounded-xl p-8 max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowResume(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-red-500/20 border-2 border-red-400/50 rounded-full text-red-300 hover:bg-red-500/40 transition-all text-2xl flex items-center justify-center"
            >
              ×
            </button>

            <h2 className="text-3xl font-bold text-green-400 mb-2 text-center">Bilal Hussain</h2>
            <p className="text-center text-green-300 mb-6">Toronto, Ontario, M9L 2C5 | 437-907-1483 | bilalhussain.v12@gmail.com</p>

            <div className="space-y-6 text-gray-200">
              <div>
                <p className="leading-relaxed text-center">Harvard Computer Science graduate and Full-Stack Developer with expertise in React, Python, Node.js, and PostgreSQL. Proven ability to architect scalable applications, integrate AI services, and lead technical teams.</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-green-300 mb-3 border-b border-green-400/30 pb-2">Technical Skills</h3>
                <p className="mb-2"><strong className="text-green-400">Languages:</strong> Python, JavaScript, TypeScript, SQL, Java</p>
                <p className="mb-2"><strong className="text-green-400">Frontend:</strong> React, Next.js, Tailwind CSS, Monaco Editor</p>
                <p className="mb-2"><strong className="text-green-400">Backend:</strong> Node.js, Express, Django, Flask, RESTful APIs, WebSockets</p>
                <p className="mb-2"><strong className="text-green-400">Databases:</strong> PostgreSQL, MongoDB, Redis</p>
                <p className="mb-2"><strong className="text-green-400">DevOps:</strong> Docker, Git, Azure, Vercel</p>
                <p className="mb-2"><strong className="text-green-400">AI/ML:</strong> Claude API, OpenAI, Google Gemini, Prompt Engineering</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-green-300 mb-3 border-b border-green-400/30 pb-2">Professional Experience</h3>

                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-green-200">Milton Academy, Milton, MA — Computer Science Instructor & Technical Lead</h4>
                  <p className="text-sm italic text-green-400/70 mb-2">Aug 2022 - Aug 2024</p>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                    <li>Architected 3-part CS curriculum for 100+ students in Python, JavaScript, and web development, increasing advanced enrollment by 40%</li>
                    <li>Developed Python-based administrative tool automating student progress tracking, reducing faculty workload by 5+ hours/week</li>
                    <li>Mentored students through code reviews and guided full-stack capstone project development</li>
                  </ul>
                </div>

                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-green-200">Healthynox (Remote), Boston, MA — Lead Software Engineer</h4>
                  <p className="text-sm italic text-green-400/70 mb-2">Jan 2020 - Mar 2021</p>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                    <li>Architected patient data management platform using Django (Python) backend and React frontend with secure PostgreSQL schema</li>
                    <li>Built internal dashboard consolidating 5+ data sources, reducing manual reporting time by 10+ hours weekly</li>
                    <li>Mentored team of 3 junior engineers, establishing Git workflow, code review standards, and agile best practices</li>
                  </ul>
                </div>

                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-green-200">Harvard Graduate School of Design, Cambridge, MA — IT Coordinator</h4>
                  <p className="text-sm italic text-green-400/70 mb-2">Aug 2017 - Aug 2019</p>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                    <li>Provided high-level technical support for 200+ users across macOS and Windows environments</li>
                    <li>Managed Microsoft 365 systems including SharePoint, Active Directory, and Exchange</li>
                    <li>Implemented IT documentation system reducing issue resolution time by 25%</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-green-300 mb-3 border-b border-green-400/30 pb-2">Key Projects</h3>

                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-green-200">Educators Edge - Full-Stack Learning Management Platform</h4>
                  <p className="text-sm mb-2">
                    <a href="https://educator-app.vercel.app" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 underline">Live Demo</a> |
                    <a href="https://github.com/bilalhussainx/educator-app" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 underline ml-2">GitHub</a>
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                    <li>Architected comprehensive LMS with real-time video, collaborative coding, and AI-powered features serving 100+ users</li>
                    <li><strong>Backend:</strong> Node.js/Express API with 50+ endpoints, WebSocket routing, PostgreSQL, Redis queues, Azure Blob Storage</li>
                    <li><strong>Frontend:</strong> React/TypeScript SPA with Monaco Editor, Agora RTC video streaming, XTerm.js terminal, Tailwind CSS</li>
                    <li><strong>AI Integration:</strong> Claude, Gemini, and OpenAI APIs for curriculum generation, code analysis, and writing assistance</li>
                    <li><strong>Features:</strong> Live sessions, interactive IDE, 390+ LeetCode problems, session booking, messaging, referral system</li>
                  </ul>
                </div>

                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-green-200">SynergyPost.ca - Multi-Agent AI Platform</h4>
                  <p className="text-sm mb-2">
                    <a href="https://synergypost.ca" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 underline">Live Demo</a>
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                    <li>Developed AI workflow platform with Python FastAPI backend and React frontend using Google Vertex AI</li>
                    <li>Implemented agent coordination system for parallel content generation with quality control</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-green-300 mb-3 border-b border-green-400/30 pb-2">Education</h3>
                <p><strong className="text-green-400">Harvard College, Cambridge, USA</strong> — Bachelor of Arts in Computer Science | May 2022</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-green-300 mb-3 border-b border-green-400/30 pb-2">Additional</h3>
                <p><strong className="text-green-400">Languages:</strong> English (Native), Urdu (Fluent)</p>
                <p><strong className="text-green-400">Availability:</strong> Immediately available for full-time positions</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeveloperPortfolio3D;
