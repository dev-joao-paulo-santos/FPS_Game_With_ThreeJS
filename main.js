import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r132/build/three.module.js'
import {PointerLockControls} from 'https://threejsfundamentals.org/threejs/resources/threejs/r132/examples/jsm/controls/PointerLockControls.js'
import {GLTFLoader} from 'https://threejsfundamentals.org/threejs/resources/threejs/r132/examples/jsm/loaders/GLTFLoader.js'
import {FBXLoader} from 'https://threejsfundamentals.org/threejs/resources/threejs/r132/examples/jsm/loaders/FBXLoader.js'


let scene, camera, renderer, txloader
let keys = []
let clock = new THREE.Clock()
let enemyHitCount = 0;
let requiredShots = 2;

//variáveis para movimentação e saltos
let speed = .4
let isJumping = false
let isChasing = false
let jumpStartTime = 0
let jumpStartHeight = 0
let maxH = 6
let duration = 0.5
let swayAmount = .05;
let enemy, gun
let glbLoader = new GLTFLoader()


function init(){

const shotnoise = new Audio('./audio/lasershot.wav')
const hitnoise = new Audio('./audio/hit.wav')
const enemyVoice = new Audio('./audio/monstervoice.mp3')
const footstep = new Audio('./audio/footstep.wav')
const footstepRun = new Audio('./audio/footstepRun.wav')
const enemyDying = new Audio('./audio/monsterdying.mp3')
const gameoverSound = new Audio('./audio/gotyou.mp3')
const jumpSound = new Audio('./audio/jump.wav')
scene = new THREE.Scene()
scene.background = new THREE.Color('#1C1C1C')
scene.fog = new THREE.FogExp2(0x1c1c1c, 0.008)
camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, .1, 1000)
scene.add(camera)
camera.position.z = 10

renderer = new THREE.WebGLRenderer({antialias: false})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement)

txloader = new THREE.TextureLoader()



//objetos 3d
const roof = new THREE.Mesh(
    new THREE.BoxGeometry(700, 1, 700),
    new THREE.MeshBasicMaterial({color: 'black'})
)
scene.add(roof)
roof.position.set(0, 25, 0)


const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1700, 1700),
    new THREE.MeshPhongMaterial({color: '#303030', roughness: .5})
)
scene.add(ground)
ground.rotation.x = -Math.PI /2
ground.position.y = -2


const wall = new THREE.Mesh(
  new THREE.BoxGeometry(6, 1, 6),
  new THREE.MeshStandardMaterial({
    color: 0x00ff00,
    emissive: 0x33ff33, // Cor da emissão
    emissiveIntensity: 1, // Intensidade da emissão
    roughness: 0.5,
    metalness: 0.1,
    receiveShadow: true
  })
);
wall.position.y = 24
scene.add(wall)

const wallLight = new THREE.PointLight(0x00ff00, 17, 27);
wall.add(wallLight); // Adicione a luz como filha do mesh wall
wallLight.position.set(0, -1, 0); // Posicione a luz no centro do mesh wall

const roofSize = 700;
const wallSize = 6;
const spacing = 210; // Espaçamento entre os clones

for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    // Clone do mesh wall
    const clonedWall = wall.clone();
    // Posiciona o clone
    clonedWall.position.set(
      (i - 1) * spacing,
      wall.position.y,
      (j - 1) * spacing
    );
    // Adiciona o clone à cena
    scene.add(clonedWall);

    // Clone da luz
    const clonedWallLight = wallLight.clone();
    // Posiciona a luz do clone no centro do mesh wall do clone
    clonedWallLight.position.set(0, -1, 0);
    // Adiciona a luz do clone como filha do mesh wall do clone
    clonedWall.children[0].add(clonedWallLight);
  }
}

//criação de arma

const gunSpawner = new THREE.Mesh(
  new THREE.BoxGeometry(.001,.001,.001),
  new THREE.MeshBasicMaterial({color:'white', transparent: true, opacity: 0})
)
camera.add(gunSpawner)
gunSpawner.position.set(.2, -.1, -.4)
//criação de arma
glbLoader.load('./assets/royce_krissVec.glb', (model)=>{

gun = model.scene.children[0]
gun.scale.set(2.3, 2.3, 2.3)
gun.rotateZ(Math.PI)
gun.position.set(.2, -.7, -.2)
gunSpawner.add(gun)
gun.position.z
})


//mecânica de tiros

let lastShotTime = 0;
const recoilDuration = 100; // Tempo em milissegundos para a animação de recoil
let recoilStartTime = 0;
let isRecoiling = false;

//anel de fogo

let fireRing = null;

function createFireRing() {



  const ringGeometry = new THREE.PlaneGeometry(0.4, 0.4);
  const ringMaterial = new THREE.MeshBasicMaterial({
    map: txloader.load('./img/fire_ring.png'),
    color: 0xffffff, // Cor laranja
    transparent: true,
    opacity: 0.8,
    depthWrite: false, // Evita que o anel de fogo interfira na renderização de outros objetos
  });

  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.position.set(.16, -.17, -1); // Ajuste a posição conforme necessário

  // Adicione mais personalizações se desejar

  setTimeout(() => {
    gunSpawner.remove(ring); // Remove o anel de fogo após 200 milissegundos
  }, 50);

  return ring;
}

const flash = new THREE.PointLight(0x00ff00, 1, 10)



document.addEventListener('mousedown', (a) => {
  const velocity = 5; // Adicione esta linha para definir a velocidade do tiro
  if (a.button == 0) {
      const currentTime = clock.getElapsedTime();
      const timeSinceLastShot = currentTime - lastShotTime;

      // Permita o tiro se o tempo desde o último tiro for maior que 0.12 segundos (por exemplo)
      if (timeSinceLastShot > 0.12) {
          isRecoiling = true;
          recoilStartTime = currentTime;

          // Vetor representando a direção do tiro com base na orientação da câmera
          const shotDirection = new THREE.Vector3(0, 0, -1);
          shotDirection.applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()));

          const shot = new THREE.Mesh(
              new THREE.SphereGeometry(0.1, 10, 10),
              new THREE.MeshBasicMaterial({ color: 0x00ff00 })
          );

          // Posição do tiro na ponta da arma
          shot.position.copy(gunSpawner.getWorldPosition(new THREE.Vector3()));

          // Velocidade do tiro na direção calculada
          shot.velocity = shotDirection.multiplyScalar(velocity);
          scene.add(shot);

          lastShotTime = currentTime; // Atualiza o tempo do último tiro
      }
  }
});


document.addEventListener('click', ()=>{
  shotnoise.play()
      // Cria um anel de fogo
      flash.position.set(.15, 0, -.8)
      gunSpawner.add(flash)
      
      setTimeout(() => {
        gunSpawner.remove(flash); // Remove o anel de fogo após 200 milissegundos
      }, 100);
      fireRing = createFireRing();
      gunSpawner.add(fireRing);
})


const mira = new THREE.Mesh(
  new THREE.PlaneGeometry(.08, .08),
  new THREE.MeshBasicMaterial({map: txloader.load('./img/mira.png'), transparent: true})
)
mira.position.z = -1
camera.add(mira)


//luz
const amblight = new THREE.AmbientLight(0x404040, 1, 100)
scene.add(amblight)
const pl1 = new THREE.PointLight(0xffffff, .8, 50)
camera.add(pl1)
pl1.position.y = 10




//criação de inimigos
const enemyHitBox = new THREE.Mesh(
new THREE.BoxGeometry(7, 10, 7),
new THREE.MeshBasicMaterial({
  side: THREE.DoubleSide, 
  transparent: true,
  opacity: 0
})
)
enemyHitBox.position.z = -200
enemyHitBox.position.y = 4
enemyHitBox.rotateY(Math.PI/2)
scene.add(enemyHitBox)

const fbxLoader = new FBXLoader();

fbxLoader.load('./assets/Run.fbx', (fbx) => {
  // Adicione a animação (se houver) ao modelo
  fbx.scale.set(0.1, 0.1, 0.1)
  fbx.position.y = -4
  fbx.castShadow = true
  const mixer = new THREE.AnimationMixer(fbx);
  const action = mixer.clipAction(fbx.animations[0]); // Assumindo que há uma animação

  // Adicione o modelo à cena
  enemyHitBox.add(fbx);

  // Animação (opcional)
  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    mixer.update(delta * 7);

    renderer.render(scene, camera);
  }

  // Inicie a animação
  action.play();

  // Inicie a renderização
  animate();
});




//controls
const controls = new PointerLockControls(camera, renderer.domElement)
window.addEventListener('click', ()=>{
    controls.lock()
})


document.addEventListener('keydown', (e)=>{  
   keys[e.keyCode] = true
  })
document.addEventListener('keyup', (e)=>{  
   keys[e.keyCode] = false
   footstepRun.loop = false
   footstep.loop = false
  })

//moving controls

function move(){
//chasing enemy condition
const distanceEnemy = enemyHitBox.position.distanceTo(camera.position) //cálculo de distância entre camera e enemy
const chaseDistance = 100

if (distanceEnemy < chaseDistance) {
  enemyVoice.play()
  enemyVoice.loop = true
  isChasing = true
  enemyHitBox.lookAt(camera.position)
  const direction = camera.position.clone().sub(enemyHitBox.position).normalize()
  enemyHitBox.position.add(direction.multiplyScalar(speed + .06))
}

//gameover



if (distanceEnemy < 1) {
    enemyVoice.pause()
    gameoverSound.play()
    setTimeout(()=>{
      scene.remove(enemyHitBox)
    },1500)
  controls.unlock()
  var restart = confirm("Gostaria de reiniciar?")
    if(restart === true){
      window.location.reload(true);
}
}

else {
  isChasing = false
  enemyVoice.loop = false
}


//moving camera
        if(keys[16] && keys[87]){
          controls.moveForward(speed + .02)
          footstepRun.play()
          footstepRun.loop = true
          footstep.loop = false
          camera.position.y += Math.sin(clock.getElapsedTime() * 5) * 0.002;
          camera.rotation.z += Math.sin(clock.getElapsedTime() * 15) * 0.001;
          gunSpawner.position.y += Math.sin(clock.getElapsedTime() * 15) * 0.005;
        }

        if(keys[87]){
          controls.moveForward(speed)
          footstep.play()
          footstep.loop = true
        }
        if(keys[65]){
          controls.moveRight(-speed)
          footstep.play()
          footstep.loop = true
        }
        if(keys[83]){
          controls.moveForward(-speed)
          footstep.play()
          footstep.loop = true
        }
        if(keys[68]){
          controls.moveRight(speed)
          footstep.play()
          footstep.loop = true
        }

        if (keys[32] && !isJumping) { 
          footstep.pause()
          footstepRun.pause()
          jumpSound.play()
            isJumping = true
            jumpStartTime = clock.getElapsedTime()
            jumpStartHeight = camera.position.y
          }
      
          if (isJumping) {
            const elapsed = clock.getElapsedTime() - jumpStartTime
            if (elapsed >= duration) {
              isJumping = false
              camera.position.y = jumpStartHeight
            } else {

              const jumpProgress = elapsed / duration
              const jumpHeightOffset = Math.sin(jumpProgress * Math.PI)* maxH
              camera.position.y = jumpStartHeight + jumpHeightOffset}}

        
}

//colisão de tiros com o inimigo

function checkCollisionWithEnemy(shot) {
  const distanceToEnemy = enemyHitBox.position.distanceTo(shot.position);
  return distanceToEnemy < 5; // Ajuste o valor conforme necessário para representar o raio de colisão.
}

function moveEnemyRandomly() {
  const radius = 200;
  const angle = Math.random() * Math.PI * 2;
  const newPosition = new THREE.Vector3(
    camera.position.x + Math.cos(angle) * radius,
    4,
    camera.position.z + Math.sin(angle) * radius
  );

  enemyHitBox.position.copy(newPosition);
  requiredShots *= 2; // Dobra o número de tiros necessários
  enemyHitCount = 0; // Reinicia a contagem de tiros
}


function hitCrosshair() {
  const hitGeo = new THREE.PlaneGeometry(0.05, 0.05);
  const hitMat = new THREE.MeshBasicMaterial({
    map: txloader.load('./img/damage.png'),
    color: 0xffffff, // Cor laranja
    transparent: true,
    opacity: 0.8,
    depthWrite: false, // Evita que o anel de fogo interfira na renderização de outros objetos
  });

  const damage = new THREE.Mesh(hitGeo, hitMat);
  damage.position.set(0, 0, -.6); // Ajuste a posição conforme necessário

  // Adicione mais personalizações se desejar

  setTimeout(() => {
    camera.remove(damage); // Remove o anel de fogo após 200 milissegundos
  }, 60);

  return damage;
}

let damageCross = null;


//laser

let laserBeam;

function initLaser() {
  const laserGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(.2, -.07, -.7),
    new THREE.Vector3(.2, -.07, -50), // Ajuste o comprimento do raio conforme necessário
  ]);

  const laserMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
  laserBeam = new THREE.Line(laserGeometry, laserMaterial);
  laserBeam.visible = false; // Inicialmente, o laser está invisível
  gunSpawner.add(laserBeam);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'l') {
    // Toggle visibilidade do laser
    laserBeam.visible = !laserBeam.visible;

    // Lógica adicional para atirar laser, se necessário
    if (laserBeam.visible) {
      // Lógica para o laser atirar (se necessário)
    }
  }
});

initLaser()


//Mirar

let isAiming = false;

document.addEventListener('keydown', (e) => {
  if (e.key === 'q') {
    isAiming = true;
    gunSpawner.position.set(-.1997, .0165, .03); // Posição de mira
    mira.position.y = 1
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'q') {
    isAiming = false;
    gunSpawner.position.set(.2, -.1, -.4); // Posição normal
    mira.position.y = 0
  }
});



function animate(){

    requestAnimationFrame(animate)
    move(clock.getDelta)

    gunSpawner.position.y -= Math.sin(clock.getElapsedTime() * 6) * .00008;
    // Verifica se está ocorrendo a animação de recoil
  if (isRecoiling) {
    const elapsedRecoilTime = (clock.getElapsedTime() - recoilStartTime) * 1000;

    // Verifica se a animação de recoil já foi concluída
    if (elapsedRecoilTime < recoilDuration) {
      const recoilProgress = elapsedRecoilTime / recoilDuration;
      const recoilDistance = 0.1 * Math.sin(recoilProgress * Math.PI);

      // Aplica o recoil na posição z do gunSpawner
      gunSpawner.position.z += recoilDistance;
    } else {
      // Reinicia as variáveis após a animação de recoil
      isRecoiling = false;
      gunSpawner.position.z = -.4;
    }
  }



    scene.children.forEach(function(child) {
      if (child instanceof THREE.Mesh && child.velocity) {
        child.position.add(child.velocity);
      }
    });

    // Dentro do loop de animação, antes de renderizar
scene.children.forEach(function (child) {
  if (child instanceof THREE.Mesh && child.velocity) {
    child.position.add(child.velocity);

 if (checkCollisionWithEnemy(child)) {
      hitnoise.play()
      damageCross = hitCrosshair();
      camera.add(damageCross);
      scene.remove(child); // Remove o tiro
      enemyHitCount++; // Incrementa a contagem de tiros


      if (enemyHitCount >= requiredShots) {
        enemyVoice.pause()
        enemyDying.play()
        moveEnemyRandomly(); // Mova o enemyHitBox para uma posição aleatória
      }
    }
  }
});
    
    renderer.render(scene, camera)

}
function resize(){
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.render(scene, camera)
}
  //Responsividade
document.addEventListener('resize', resize)
animate()


}
init()
