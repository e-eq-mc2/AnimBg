import AnimBgBase from './base.js'
import Matter from 'matter-js'

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

const AnimBg  =  {}

AnimBg.NewtonsCradle = class extends AnimBgBase{
  onInitRenderer() {
    // create engine
    const engine = Matter.Engine.create()

    // create renderer
    this.render = Matter.Render.create({
      element: this.el,
      engine: engine,
      options: {
        showVelocity: true
      }
    })

    // create runner
    this.runner = Matter.Runner.create()

    const world  = engine.world
    // see newtonsCradle function defined later in this file
    const cradle0 = this.createComposite(280, 100, 5, 30, 200)
    Matter.Composite.add(world, cradle0)
    Matter.Body.translate(cradle0.bodies[0], { x: -180, y: -100 })

    const cradle1 = this.createComposite(280, 380, 7, 20, 140)
    Matter.Composite.add(world, cradle1)
    Matter.Body.translate(cradle1.bodies[0], { x: -140, y: -100 })

    // add mouse control
    const mouse = Matter.Mouse.create(this.render.canvas)
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: {
          visible: false
        }
      }
    })

    Matter.Composite.add(world, mouseConstraint)

    // keep the mouse in sync with rendering
    this.render.mouse = mouse

    // fit the render viewport to the scene
    Matter.Render.lookAt(this.render, {
      min: { x: 0, y: 50 },
      max: { x: 800, y: 600 }
    })

  }

	getCanvasElement()  {
    return this.render.canvas
	}

  onUpdate (time) {
    Matter.Render.update(this.render, time)

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

  /**
   * Creates a composite with a Newton's Cradle setup of bodies and constraints.
   * @method newtonsCradle
   * @param {number} xx
   * @param {number} yy
   * @param {number} number
   * @param {number} size
   * @param {number} length
   * @return {composite} A new composite newtonsCradle body
   */
  createComposite(xx, yy, number, size, length) {
    const newtonsCradle = Matter.Composite.create({ label: 'Newtons Cradle' });

    for (var i = 0; i < number; i++) {
      var separation = 1.9,
        circle = Matter.Bodies.circle(xx + i * (size * separation), yy + length, size, 
          { inertia: Infinity, restitution: 1, friction: 0, frictionAir: 0, slop: size * 0.02 }),
        constraint = Matter.Constraint.create({ pointA: { x: xx + i * (size * separation), y: yy }, bodyB: circle });

      Matter.Composite.addBody(newtonsCradle, circle);
      Matter.Composite.addConstraint(newtonsCradle, constraint);
    }

    return newtonsCradle
  }
}

export default AnimBg
