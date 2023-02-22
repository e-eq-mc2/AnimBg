import AnimBgBase, {AnimBg} from './base.js'
import Matter from 'matter-js'

AnimBg.NewtonsCradle = class NewtonsCradle extends AnimBgBase {
  static run(options) {
    const nc = new NewtonsCradle(options)
  }

  constructor(options) {
    const opt = Object.assign({
      mouseControls: false,
      touchControls: false,
      gyroControls:  false,
      minHeight:  200,
    }, options)
    super(opt)
  }

  onInitRenderer() {
    // create engine
    const engine = Matter.Engine.create({
      constraintIterations: 20,
      positionIterations: 20,
      velocityIterations: 20,
    })

    // create renderer
    // https://github.com/liabru/matter-js/wiki/Rendering
    this.render = Matter.Render.create({
      element: this.el,
      engine: engine,
      options: {
        background: '#ffffff',
        //wireframeBackground: '#ffffff',
        width: 1,
        height: 1,
        wireframes: false,
        //showDebug: true,
      }
    })

    // create runner
    this.runner = Matter.Runner.create({
      //isFixed: true,
      fps: 90,
    })

    const world   = engine.world
    const newtonsCradles = this.options.newtonsCradles

    for(let i=0; i < newtonsCradles.length; ++i) {
      const options = newtonsCradles[i]
      options.label = `line${i}`

      const nc = this.createNewtonsCradle(options)
      Matter.Composite.add(world, nc)
    }

    // add mouse control
    const mouse = Matter.Mouse.create(this.el)
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.1,
        render: {
          visible: false
        }
      }
    })

    Matter.Composite.add(world, mouseConstraint)

    // keep the mouse in sync with rendering
    this.render.mouse = mouse
  }

	getCanvasElement()  {
    return this.render.canvas
	}

  onUpdate (time) {
    Matter.Render.update(this.render, time)

    const newtonsCradles = this.options.newtonsCradles
    for(let i=0; i < newtonsCradles.length; ++i) {
      const options = newtonsCradles[i]
      this.renderText(options)
    }

    if( this.runner.enabled ) {
      Matter.Runner.tick(this.runner, this.render.engine, time)
    }
  }

  onResize() {
    this.render.bounds.max.x   = this.width
    this.render.bounds.max.y   = this.height
    this.render.options.width  = this.width
    this.render.options.height = this.height
    this.render.canvas.width   = this.width
    this.render.canvas.height  = this.heigh
    Matter.Render.setPixelRatio(this.render, window.devicePixelRatio); // added this
  }

  createNewtonsCradle(options) {
    const {baseX, baseY, size, length, label, text, font} = options

    const newtonsCradle = Matter.Composite.create()

    options.textColor  = []
    options.textOffset = []
    const num = options.text.length
    for (let i = 0; i < num; i++) {
      const color = choose(['#f19648', '#f5d259', '#f55a3c', '#063e7b', '#00cc66', '#ff6699'])
      options.textColor.push(color)

      const char = text[i]
      const csz  = getCharSize(char, font)

      options.textOffset.push({x: - csz.x * 0.5, y: csz.y * 0.25})

      //const separation = 1.9
      const separation = 1.95
      const x = baseX + i * (size * separation)
      const y = baseY + length

      const circle = Matter.Bodies.circle(
        x,
        y,
        size,
        { 
          inertia: Infinity, restitution: 1, friction: 0, frictionAir: 0, slop: size * 0.005, label: label,
          render: {
            fillStyle: '#ffffff',
            strokeStyle: '#a6a6a6',
            lineWidth: 8,
          },
        },
      )

      const constraint = Matter.Constraint.create({pointA: { x: x, y: baseY }, bodyB: circle, 
        render:{
          strokeStyle: '#a6a6a6',
          lineWidth: 3,
      }})

      Matter.Composite.addBody(newtonsCradle, circle)
      Matter.Composite.addConstraint(newtonsCradle, constraint)
    }

    const angle = 160
    const dx = Math.cos( angle * Math.PI / 180 ) *   length
    const dy = Math.sin( angle * Math.PI / 180 ) * - length - length
    Matter.Body.translate(newtonsCradle.bodies[0], {x: dx, y: dy})
    return newtonsCradle

  }

  renderText(options) {
    const {label, text, font, textColor, textOffset} = options

    const engine  = this.render.engine
    const context = this.render.context
    const bodies  = this.getBodiesByLabel(label, engine)

    for(let i = 0; i < bodies.length; ++i) {
      const char = text[i]
      if ( !char ) break 

      const body  = bodies[i]
      const color = textColor[i]
      const off   = textOffset[i]

      const x = body.position.x + off.x
      const y = body.position.y + off.y

      context.font = font
      context.fillStyle = color
      context.fillText(char, x, y)
    }
  }

  getBodiesByLabel(label, engine) {
    return Matter.Composite.allBodies(engine.world).filter(body => body.label === label)
  }
}

Matter.Render.update = function(render, time) {
  _updateTiming(render, time)
  this.world(render, time)

  if (render.options.showStats || render.options.showDebug) {
    this.stats(render, render.context, time);
  }

  if (render.options.showPerformance || render.options.showDebug) {
    this.performance(render, render.context, time);
  }

  function _updateTiming(render, time) {
    var engine = render.engine,
      timing = render.timing,
      historySize = timing.historySize,
      timestamp = engine.timing.timestamp;

    timing.delta = time - timing.lastTime || Matter.Render._goodDelta;
    timing.lastTime = time;

    timing.timestampElapsed = timestamp - timing.lastTimestamp || 0;
    timing.lastTimestamp = timestamp;

    timing.deltaHistory.unshift(timing.delta);
    timing.deltaHistory.length = Math.min(timing.deltaHistory.length, historySize);

    timing.engineDeltaHistory.unshift(engine.timing.lastDelta);
    timing.engineDeltaHistory.length = Math.min(timing.engineDeltaHistory.length, historySize);

    timing.timestampElapsedHistory.unshift(timing.timestampElapsed);
    timing.timestampElapsedHistory.length = Math.min(timing.timestampElapsedHistory.length, historySize);

    timing.engineElapsedHistory.unshift(engine.timing.lastElapsed);
    timing.engineElapsedHistory.length = Math.min(timing.engineElapsedHistory.length, historySize);

    timing.elapsedHistory.unshift(timing.lastElapsed);
    timing.elapsedHistory.length = Math.min(timing.elapsedHistory.length, historySize);
  };
}

const choose = (choices) => {
  return choices[Math.floor(Math.random() * choices.length)];
}

const getCharSize = (char, font) => {
  const parent = document.body
  const id = `to-get-char-size-${Math.random().toString(32).substring(2)}`

  parent.insertAdjacentHTML('beforeend', `<p id="${id}" style="font:${font}; display:inline">${char}</p>`)
  const elm = document.getElementById(id)

  const width  = elm.offsetWidth
  const height = elm.offsetHeight

  elm.remove()

  return {x: width, y: height}
}


