import AnimBgBase, {AnimBg} from './base.js'
import Matter from 'matter-js'


AnimBg.NewtonsCradle = class NewtonsCradle extends AnimBgBase {
  static run(options) {
    const nc = new NewtonsCradle(options)
  }

  constructor(options) {
    super(options)
  }

  onInitRenderer() {
    // create engine
    const engine = Matter.Engine.create({
      constraintIterations: 20,
      positionIterations: 20,
      velocityIterations: 20,
    })

    const world = engine.world
    const optsList = this.options.newtonsCradles

    for(let i=0; i < optsList.length; ++i) {
      const opts = optsList[i]

      // inject
      opts.bodyColors = this.options.bodyColors
      opts.textColors = this.options.textColors

      const nc = this.createNewtonsCradle(opts)
      Matter.Composite.add(world, nc)
    }

    // create renderer
    // https://github.com/liabru/matter-js/wiki/Rendering
    const bounds = this.findBounds( Matter.Composite.allBodies(engine.world) )
    const boundsScale = this.options.boundsScale //|| {x: 1.1, y: 1.1}
    this.render = Matter.Render.create({
      element: this.el,
      engine: engine,
      options: {
        background: '',
        width:  bounds.max.x * boundsScale.x,
        height: bounds.max.y * boundsScale.y,
        wireframes: false,
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

  createNewtonsCradle(options) {
    const {
      baseX, baseY, size, length,
      bodyColor,
      bodyLineWidth      , bodyLineColor,
      constraintLineWidth, constraintLineColor,
      text, font,
      bodyColors, textColors,
    } = options

    const newtonsCradle = Matter.Composite.create()
    for (let i = 0; i < text.length; i++) {
      // ---- body -----
      const separation = 1.95
      const x  = baseX + i * (size * separation)
      const y  = baseY + length
      const bodyColor = bodyColors[0]
      const body = Matter.Bodies.circle(
        x,
        y,
        size,
        { 
          inertia: Infinity, restitution: 1, friction: 0, frictionAir: 0, slop: size * 0.005,
          collisionFilter: {category: 0x0001, mask: 0xFFFFFFFF},
          render: {
            fillStyle: bodyColor,
            strokeStyle: bodyLineColor,
            lineWidth: bodyLineWidth,
          },
        },
      )

      const constraint = Matter.Constraint.create({pointA: { x: x, y: baseY }, bodyB: body, 
        render:{
          strokeStyle: constraintLineColor,
          lineWidth: constraintLineWidth,
        }
      })
      Matter.Composite.addBody(newtonsCradle, body)
      Matter.Composite.addConstraint(newtonsCradle, constraint)

      // ---- char ----
      const char  = text[i]
      const textColor = choose(textColors)

      const charSize = getCharSize(char, font)
      const offset = {x: - charSize.x / 2, y: charSize.y / 4}
      const charData = {char: char, offset: offset, color: textColor, font: font}
      // inject 
      body.charData = charData
    }

    // swing
    const angle = 160
    const dx = Math.cos( angle * Math.PI / 180 ) *   length
    const dy = Math.sin( angle * Math.PI / 180 ) * - length - length
    Matter.Body.translate(newtonsCradle.bodies[0], {x: dx, y: dy})
    return newtonsCradle
  }



  findBounds (bodies) {
    // find bounds of all objects
    const bounds = {
      min: { x: Infinity, y: Infinity },
      max: { x: -Infinity, y: -Infinity }
    }

    for (const body of bodies) {
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
    const mouse  = this.mouse

    Matter.Events.on(engine, 'beforeUpdate', (e) => {
      if ( ! ( mouse.sourceEvents.mousedown && mouse.button == 0 ) ) return

      const foundBodies = Matter.Query.point(
        Matter.Composite.allBodies(engine.world), 
        mouse.position
      )

      if ( foundBodies.length === 0 ) return

      const fb = foundBodies[0]
      const allBodies = Matter.Composite.allBodies(engine.world)
      if ( ! this.currentBodyColor || allBodies.every(b => b.render.fillStyle === fb.render.fillStyle) ) {
        const bodyColors = this.options.bodyColors.filter(b => b !== fb.render.fillStyle)
        this.currentBodyColor = choose( bodyColors )
      }
      fb.render.fillStyle = this.currentBodyColor

      //const textColors = this.options.textColors.filter( c => c !== fb.charData.color )
      //fb.charData.color = choose( textColors )
    })
  }

  getCanvasElement()  {
    return this.render.canvas
  }

  onUpdate (time) {
    Matter.Render.update(this.render, time)

    this.renderText()

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


  renderText() {
    const engine  = this.render.engine
    const context = this.render.context
    const bodies  = Matter.Composite.allBodies(engine.world)

    Matter.Render.startViewTransform(this.render);
    for( const body of bodies ) {
      const charData = body.charData

      const char   = charData.char
      const offset = charData.offset
      const color  = charData.color
      const font   = charData.font

      const x = body.position.x + offset.x
      const y = body.position.y + offset.y

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
