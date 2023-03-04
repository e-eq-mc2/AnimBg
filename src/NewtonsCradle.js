import AnimBgBase, {AnimBg} from './base.js'
import Matter from 'matter-js'


AnimBg.NewtonsCradle = class NewtonsCradle extends AnimBgBase {
  static run(options) {
    const nc = new NewtonsCradle(options)
  }

  onInitRenderer() {
    // create engine
    const engine = Matter.Engine.create({
      constraintIterations: 20,
      positionIterations: 20,
      velocityIterations: 20,
    })

    this.fillColors = ['#999999',  '#ffffff', '#000000', '#ff0066', '#ff66cc', '#0099ff', '#009900', '#ffcc00',]
    this.textColors = ['#f19648', '#f5d259', '#f55a3c', '#063e7b', '#00cc66', '#ff6699']

    const world = engine.world
    const optsList = this.options.newtonsCradles

    for(let i=0; i < optsList.length; ++i) {
      const opts = optsList[i]
      opts.label = `line${i}`

      const nc = this.createNewtonsCradle(opts)
      Matter.Composite.add(world, nc)

      this.setTextStyle(opts)
    }

    // create renderer
    // https://github.com/liabru/matter-js/wiki/Rendering
    const bounds = this.findBounds( Matter.Composite.allBodies(engine.world) )
    this.render = Matter.Render.create({
      element: this.el,
      engine: engine,
      options: {
        background: '#ffffff',
        //wireframeBackground: '#ffffff',
        width:  bounds.max.x * 1.1,
        height: bounds.max.y * 1.1,
        //pixelRatio: 'auto',
        wireframes: false,
        //showPerformance: true,
      }
    })

    this.render.options.pixelRatio = window.devicePixelRatio
    this.render.canvas.width  *=  this.render.options.pixelRatio
    this.render.canvas.height *=  this.render.options.pixelRatio

    // create runner
    this.runner = Matter.Runner.create({
      //isFixed: true,
      fps: 90,
    })
  }

  findBounds (bodies) {
    // find bounds of all objects
    const bounds = {
      min: { x: Infinity, y: Infinity },
      max: { x: -Infinity, y: -Infinity }
    }

    for (const body of bodies) {
      console.log(body.bounds)
      const min = body.bounds.min
      const max = body.bounds.max

      if (min.x < bounds.min.x)
        bounds.min.x = min.x

      if (max.x > bounds.max.x)
        bounds.max.x = max.x;

      if (min.y < bounds.min.y)
        bounds.min.y = min.y;

      if (max.y > bounds.max.y)
        bounds.max.y = max.y;
    }

    return bounds
  } 

  onInitMouse() {
    const engine = this.render.engine
    const world  = engine.world

    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse: this.mouse,
      constraint: {
        stiffness: 0.2,
        render: {
          visible: false
        },
      },
      collisionFilter: {category: 0x0001, mask: 0xFFFFFFFF},
    })
    Matter.Composite.add(world, mouseConstraint)

    Matter.Events.on(mouseConstraint, 'mousedown', (event) => {
      if ( mouseConstraint.body ) return
      mouseConstraint.collisionFilter.category = 0x0000 
    })
    Matter.Events.on(mouseConstraint, 'mouseup', (event) => {
      mouseConstraint.collisionFilter.category = 0x0001
    })

    //Add event with 'mousemove'
    Matter.Events.on(mouseConstraint, 'mousemove', (event) => {
      const mouse = event.mouse
      const foundBodies = Matter.Query.point(
        Matter.Composite.allBodies(engine.world), 
        mouse.position
      )

      //const r = this.render
      //const m = this.mouse
      //console.log(r.options.pixelRatio, r.options.width, r.bounds.max.x, r.canvas.width, m.absolute.x, m.position.x)

      if ( foundBodies.length === 0 ) return

      const fb = foundBodies[0]
      const allBodies = Matter.Composite.allBodies(engine.world)
      if ( 
        ! this.currentColor ||
        allBodies.every( e => e.render.fillStyle === fb.render.fillStyle ) 
      ) {
        const colors = this.fillColors.filter( e => e !== fb.render.fillStyle)
        this.currentColor = choose( colors )
      }

      fb.render.fillStyle = this.currentColor
    })
  }

  getCanvasElement()  {
    return this.render.canvas
  }

  onUpdate (time) {
    Matter.Render.update(this.render, time)

    const optsList = this.options.newtonsCradles
    for(let i=0; i < optsList.length; ++i) {
      const opts = optsList[i]
      this.renderText(opts)
    }

    if( this.runner.enabled ) {
      Matter.Runner.tick(this.runner, this.render.engine, time)
    }
  }

  onResize() {
    const render = this.render
    const rect =  this.getCanvasRect()

    const ow = render.options.width  
    const oh = render.options.height

    const oHpW = oh / ow
    const oWpH = ow / oh

    const cw = rect.width
    const ch = rect.height
    const cHpW = ch / cw
    const cWpH = cw / ch

    let bw, bh
    if ( cHpW > oHpW ) {
     // +--------+        +----+
     // |        |   ->   |    |
     // +--------+        +----+
     const scaleH = cHpW / oHpW
      bw = ow
      bh = oh * scaleH
    } else {
     // +----+        +--------+
     // |    |   ->   |        |
     // +----+        +--------+
      const scaleW = cWpH / oWpH
      bw = ow * scaleW
      bh = oh
    }

    render.options.hasBounds = true
    render.bounds.min.x = 0 
    render.bounds.min.y = 0 
    render.bounds.max.x = bw
    render.bounds.max.y = bh

    const pr = render.options.pixelRatio
    Matter.Mouse.setScale(this.mouse, {x: (bw / ow) / pr, y: (bh / oh) / pr});
  }

  createNewtonsCradle({baseX, baseY, size, length, label, text, font}) {

    const newtonsCradle = Matter.Composite.create()
    for (let i = 0; i < text.length; i++) {
      const separation = 1.95
      const fc = this.fillColors[0]
      const x  = baseX + i * (size * separation)
      const y  = baseY + length
      const body = Matter.Bodies.circle(
        x,
        y,
        size,
        { 
          inertia: Infinity, restitution: 1, friction: 0, frictionAir: 0, slop: size * 0.005, label: label,
          collisionFilter: {category: 0x0001, mask: 0xFFFFFFFF},
          render: {
            fillStyle: fc,
            strokeStyle: '#a6a6a6',
            lineWidth: 8,
          },
        },
      )

      const constraint = Matter.Constraint.create({pointA: { x: x, y: baseY }, bodyB: body, 
        render:{
          strokeStyle: '#a6a6a6',
          lineWidth: 3,
        }
      })

      Matter.Composite.addBody(newtonsCradle, body)
      Matter.Composite.addConstraint(newtonsCradle, constraint)
    }

    // swing
    const angle = 160
    const dx = Math.cos( angle * Math.PI / 180 ) *   length
    const dy = Math.sin( angle * Math.PI / 180 ) * - length - length
    Matter.Body.translate(newtonsCradle.bodies[0], {x: dx, y: dy})
    return newtonsCradle
  }

  setTextStyle(options) {
    options.textColor  = []
    options.textOffset = []
    for (let i = 0; i < options.text.length; i++) {
      const tc = choose(this.textColors)
      options.textColor.push(tc)

      const char = options.text[i]
      const sz   = getCharSize(char, options.font)
      options.textOffset.push({x: - sz.x * 0.5, y: sz.y * 0.25})
    }
  }

  renderText(options) {
    const {label, text, font, textColor, textOffset} = options

    const engine  = this.render.engine
    const context = this.render.context
    const bodies  = this.getBodiesByLabel(label, engine)

    Matter.Render.startViewTransform(this.render);
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
    Matter.Render.endViewTransform(this.render)
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
  }
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
