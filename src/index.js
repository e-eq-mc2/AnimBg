import AnimBg from './newtonsCradle.js'

console.log('Hello, Webpack!')

const n = new AnimBg.NewtonsCradle({
  el: "#animation-bg",
  mouseControls: false,
  touchControls: false,
  gyroControls: false,
  minHeight: 200.00,
  minWidth: 200.00,
  scale: 1.00,
  scaleMobile: 1.00,
  backgroundColor: 0x00ffff
})
