import AnimBgBase from './base.js'
import Matter from 'matter-js'

const 
  Engine          = Matter.Engine,
  Events          = Matter.Events,
  Runner          = Matter.Runner,
  Render          = Matter.Render,
  World           = Matter.World,
  Body            = Matter.Body,
  Mouse           = Matter.Mouse,
  MouseConstraint = Matter.MouseConstraint,
  Common          = Matter.Common,
  Composites      = Matter.Composites,
  Composite       = Matter.Composite,
  Bodies          = Matter.Bodies,
  Vertices        = Matter.Vertices,
  Query           = Matter.Query

export class Balls extends AnimBgBase {
  static run(options) {
    const nc = new Balls(options)
  }

  constructor(options) {
    super(options)

    this.options = Object.assign({
      dropInterval: 500, // milliseconds
      maxBodies: 100,
      layers   :   1,
    }, this.options)
  }

  onInitRenderer() {
    // create engine
    const engine = Engine.create({
      //constraintIterations: 10,
      //positionIterations: 10,
      //velocityIterations: 10,
    })

    const world = engine.world

   // create renderer
    // https://github.com/liabru/matter-js/wiki/Rendering
    const bounds = {min: {x: 0, y: 0}, max: {x: this.width, y: this.height}}
    const boundsScale = this.options.boundsScale //|| {x: 1.1, y: 1.1}
    this.render = Render.create({
      element: this.el,
      engine: engine,
      options: {
        background: '',
        width:  bounds.max.x,
        height: bounds.max.y,
        wireframes: false,
      }
    })

    this.render.options.pixelRatio = window.devicePixelRatio
    this.render.canvas.width  *=  this.render.options.pixelRatio
    this.render.canvas.height *=  this.render.options.pixelRatio

    // create runner
    this.runner = Runner.create({
      //isFixed: true,
      fps: 60,
    })


    // create walls
    this.walls = new Walls(world, 100, bounds.max.x, bounds.max.y)
  }

  onInitMouse() {
    const engine = this.render.engine
    const world  = engine.world
    const mouse  = this.mouse

    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: this.mouse,
      constraint: {
        stiffness: 0.2,
        render: {
          visible: false
        },
      },
      collisionFilter: {category: 0x0001, mask: 0xFFFFFFFF},
    })
    Composite.add(world, mouseConstraint)

    Events.on(mouseConstraint, 'mousedown', (event) => {
      if ( mouseConstraint.body ) return

      mouseConstraint.collisionFilter.category = 0x0000 
    })
    Events.on(mouseConstraint, 'mouseup', (event) => {
      mouseConstraint.collisionFilter.category = 0x0001
    })

    Events.on(engine, 'beforeUpdate', (e) => {
      //if ( ! ( mouse.sourceEvents.mousedown && mouse.button == 0 ) ) return

      const nonStaticBodies = this.collectNonStaticBodies()
      const foundBodies = Query.point(nonStaticBodies, mouse.position)

      if ( foundBodies.length === 0 ) return

      const fb = foundBodies[0]
      if ( fb === this.prevFoundBody ) return 
      if ( fb.isStatic               ) return

      const bodyColors = this.options.bodyColors.filter(b => b !== fb.render.fillStyle)
      this.currentBodyColor = choose( bodyColors )
      fb.render.fillStyle = this.currentBodyColor

      this.prevFoundBody = fb
    })
  }


  dropBall() {
    if ( ! this.needDrop() ) return

    const {
      bodyLineWidth      , bodyLineColor,
      bodyColors,
    } = this.options
      
    const engine = this.render.engine
    const world  = engine.world

    this.droppedAt = engine.timing.timestamp

    const bounds  = this.render.bounds.max
    const maxSize = bounds.y  * 0.5
    //const size = randomReal() * maxSize
    const mean = maxSize * 0.4
    const sd   = mean * 0.5
    const nd = normalDistribution(sd, mean) 
    const size = Math.abs( nd.z1 )

    const x = randomReal(0 + size, bounds.x - size)
    const y = 0 - size * 1.2

    const bodyColor = choose( bodyColors )

    const cf = this.chooseCollisionFilter()
    const body = Bodies.circle(x, y, size/2, {
      restitution: 1.0,
      collisionFilter: cf,
      render: {
        fillStyle: bodyColor,
        strokeStyle: bodyLineColor,
        lineWidth: bodyLineWidth,
      },
    })

    //Body.applyForce(body, {x: body.position.x, y: body.position.y}, this.initialForce)

    World.add(world, body)
    return body
  }

  chooseCollisionFilter() {
    const {
      layers
    } = this.options

    if ( ! this.collisionFilters ) {
      this.collisionFilter = [...Array(layers)].map((_, i) => i).map(  
        (v, i) => {
          const c = 2 ** v
          const m = c
          return {category: c, mask: m}
        }
      )

      console.log(this.collisionFilter)
    }

    return choose(this.collisionFilter)
  }

  needDrop() {
    const { maxBodies, dropInterval, } = this.options
    const engine = this.render.engine

    const nonStaticBodies = this.collectNonStaticBodies()
    const mb = nonStaticBodies.length < maxBodies

    const delta = engine.timing.timestamp - ( this.droppedAt || 0 )
    const di = delta  > dropInterval

    return mb && di 
  }

  getCanvasElement()  {
    return this.render.canvas
  }

  onUpdate (time) {
    const engine = this.render.engine

    Render.update(this.render, time)

    if( this.runner.enabled ) {
      Runner.tick(this.runner, this.render.engine, time)

      this.dropBall()
    }
  }

  collectNonStaticBodies () {
    const engine = this.render.engine
    const bodies = Composite.allBodies(engine.world).filter(b => ! b.isStatic )
    return bodies
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
     //bw = ow
     //bh = oh * scaleH
     bw = cw
     bh = oh
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

    this.walls.update(bw, bh)

    const pr = render.options.pixelRatio
    Mouse.setScale(this.mouse, {x: (bw / ow) / pr, y: (bh / oh) / pr});
  }
}

Render.update = function(render, time) {
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

    timing.delta = time - timing.lastTime || Render._goodDelta;
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

const randomReal = (min = 0, max = 1) => {
  const rnd = Math.random() * (max - min) + min
  return rnd
}

const normalDistribution = (sd, mean) => {
  const x = Math.random()
  const y = Math.random()
  
  const z1 = Math.sqrt(-2*Math.log(x))*Math.cos(2 * Math.PI  * y);
  const z2 = Math.sqrt(-2*Math.log(x))*Math.sin(2 * Math.PI  * y);
  
  return {z1:sd+z1*mean,z2:sd+z2*mean};
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


class Walls {
  constructor(world, th, w, h) {
    this.thickness = th

    this.shiftX = this.thickness / 2
    this.world = world

    const baseW = w + this.shiftX*2 + this.thickness
    const o = {isStatic: true, collisionFilter: { category: 0xFFFFFFFF, mask: 0xFFFFFFFF}}
    this.base  = Bodies.rectangle(            w/2, h + this.thickness/2,          baseW, this.thickness, o)
    this.left  = Bodies.rectangle(0 - this.shiftX,                  h/2, this.thickness,              h, o)
    this.right = Bodies.rectangle(w + this.shiftX,                  h/2, this.thickness,              h, o)

    World.add(this.world, this.array())
  }

  array() {
    return [this.base, this.left, this.right]
  }



  update(w, h) {
    const baseW = w + this.shiftX*2 + this.thickness
    Body.setPosition(this.base, {x: w/2, y: h + this.thickness/2}) 
    Body.setVertices(this.base, Vertices.fromPath(
      'L 0 0 L ' + baseW + ' 0 L ' + baseW + ' ' + this.thickness + ' L 0 ' + this.thickness 
    ))

    Body.setPosition(this.left, {x: 0 - this.shiftX, y: h/2}) 
    Body.setVertices(this.left, Vertices.fromPath(
      'L 0 0 L ' + this.thickness + ' 0 L ' + this.thickness + ' ' + h + ' L 0 ' + h 
    ))

    Body.setPosition(this.right, {x: w + this.shiftX, y: h/2}) 
    Body.setVertices(this.right, Vertices.fromPath(
      'L 0 0 L ' + this.thickness + ' 0 L ' + this.thickness + ' ' + h + ' L 0 ' + h 
    ))
  }
}
