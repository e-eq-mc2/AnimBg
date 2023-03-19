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
    options = Object.assign({
      fps: 180,
      dropInterval: 500, // milliseconds
      maxBodies: 100,
      layers   :   1,
      restitution: 1.0,
      sizeFactors: { max: 0.5, mean: 0.3, sd: 0.6},
      colorChangeInterval: 1000, // milliseconds
    }, options)

    super(options)
  }

  onInitRenderer() {
    const {fps} = this.options

    // create engine
    const engine = Engine.create({
      constraintIterations: 2,
      positionIterations: 2,
      velocityIterations: 2,
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
      isFixed: true,
      fps: fps,
    })


    // create walls
    this.walls = new Walls(world, 100, bounds.max.x, bounds.max.y)
  }

  onInitMouse() {
    const {bodyColors, colorChangeInterval} = this.options

    const engine = this.render.engine
    const world  = engine.world
    const mouse  = this.mouse

    if ( ! this.collisionFilter )
    this.setupCollisionFilters() 


    for ( const cf of this.collisionFilters ) {
      const mouseConstraint = MouseConstraint.create(engine, {
        mouse: this.mouse,
        constraint: {
          stiffness: 0.2,
          render: {
            visible: false
          },
        },
        collisionFilter: cf,
      })
      Composite.add(world, mouseConstraint)
    }

    Events.on(engine, 'beforeUpdate', (e) => {
      const nonStaticBodies = this.collectNonStaticBodies()
      const foundBodies = Query.point(nonStaticBodies, mouse.position)

      const now = performance.now()
      for ( const fb of foundBodies )  {
        const dt = now - ( fb.colorChangedAt || 0 )
        if ( dt < colorChangeInterval ) continue
        fb.colorChangedAt = now

        const choice = choose( bodyColors.filter(bc => bc !== fb.render.fillStyle) )
        fb.render.fillStyle = choice
      }
    })
  }

  dropBall() {
    if ( ! this.needDrop() ) return

    const {
      restitution,
      bodyLineWidth      , bodyLineColor,
      bodyColors,
      sizeFactors,
    } = this.options
      
    const engine = this.render.engine
    const world  = engine.world

    this.droppedAt = this.now

    const bounds  = this.render.bounds.max
    const maxSize = Math.min(bounds.y, bounds.x)  * sizeFactors.max
    //const size = randomReal() * maxSize
    const mean = maxSize * sizeFactors.mean
    const sd   = mean * sizeFactors.sd
    const nd = normalDistribution(sd, mean) 
    const size = Math.abs( nd.z1 )

    const x = randomReal(0 + size, bounds.x - size)
    const y = 0 - size * 1.2

    const bodyColor = choose( bodyColors )

    const cf = this.chooseCollisionFilter()
    const body = Bodies.circle(x, y, size/2, {
      restitution: restitution,
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

  setupCollisionFilters() {
    const {
      layers
    } = this.options

    this.collisionFilters = [...Array(layers)].map((_, i) => i).map(  
      (v, i) => {
        const c = 2 ** v
        const m = c
        return {category: c, mask: m}
      }
    )

    return this.collisionFilters
  }

  chooseCollisionFilter() {
    if ( ! this.collisionFilters ) {
      this.setupCollisionFilters()
    }

    return choose(this.collisionFilters)
  }

  needDrop() {
    const { maxBodies, dropInterval, } = this.options
    const engine = this.render.engine

    const nonStaticBodies = this.collectNonStaticBodies()
    const mb = nonStaticBodies.length < maxBodies

    this.now = performance.now()
    const dt = this.now - ( this.droppedAt || 0 )
    const di = dt  > dropInterval

    return mb && di 
  }

  getCanvasElement()  {
    return this.render.canvas
  }

  onUpdate (time) {
    const engine = this.render.engine

    this.render.context.save(); //Freeze redraw
    Render.update(this.render, time)
    this.render.context.restore(); //And now do the redraw


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

    const cw = rect.width
    const ch = rect.height

    const bw = cw
    const bh = ch

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
