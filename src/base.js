//  Based  on  https://github.com/tengbao/vanta

const win = typeof window == 'object'

if (win && !window.AnimBg) window.AnimBg = {}
const AnimBg = (win && window.AnimBg) || {}

export {AnimBg}

class AnimBgBase {
  constructor(userOptions  =  {})  {
    if  (!win)  return  false

    this.windowMouseMoveWrapper = this.windowMouseMoveWrapper.bind(this)
    this.windowMouseDownWrapper = this.windowMouseDownWrapper.bind(this)
    this.windowMouseUpWrapper   = this.windowMouseUpWrapper.bind(this)

    this.resize  =  this.resize.bind(this)
    this.animationLoop  =  this.animationLoop.bind(this)
    this.restart  =  this.restart.bind(this)

    const  defaultOptions  =  (typeof  this.getDefaultOptions  ===  'function')  ?  this.getDefaultOptions()  :  this.defaultOptions
    this.options  =  Object.assign({
      mouseControls:  true,
      touchControls:  true,
    },  defaultOptions)

    if  (userOptions  instanceof  HTMLElement  ||  typeof  userOptions  ===  'string')  {
      userOptions  =  {el:  userOptions}
    }
    Object.assign(this.options,  userOptions)

    //  Set  element
    const  q  =  sel  =>  document.querySelector(sel)
    this.el  =  this.options.el
    if  (this.el  ==  null)  {
      error("Instance  needs  \"el\"  param!")
    }  else  if  (!(this.options.el  instanceof  HTMLElement))  {
      const  selector  =  this.el
      this.el  =  q(selector)
      if  (!this.el)  {
        error("Cannot  find  element",  selector)
        return
      }
    }

    this.prepareEl()
    this.setSize()  //  Init  needs  size
    this.initRenderer()

    try  {
      this.init()
    }  catch  (e)  {
      //  FALLBACK  -  just  use  color
      error('Init  error',  e)
      const  canvas  =  this.getCanvasElement()
      if  (  canvas  )  {
        this.el.removeChild(canvas)
      }
      if  (this.options.backgroundColor)  {
        this.el.style.background  =  color2Hex(this.options.backgroundColor)
      }
      return
    }

    //  After  init
    this.initMouse()  //  Triggers  mouse,  which  needs  to  be  called  after  init
    this.resize()
    this.animationLoop()

    //  Event  listeners
    const  ad  =  window.addEventListener
    ad('resize',  this.resize)
    window.requestAnimationFrame(this.resize)  //  Force  a  resize  after  the  first  frame

    //  Add  event  listeners  on  window,  because  this  element  may  be  below  other  elements,  which  would  block  the  element's  own  mousemove  event
    if  (this.options.mouseControls)  {
      //ad('scroll',  this.windowMouseMoveWrapper)
      ad('mousemove',  this.windowMouseMoveWrapper)
      ad('mousedown',  this.windowMouseDownWrapper)
      ad('mouseup',  this.windowMouseUpWrapper)
    }
    if  (this.options.touchControls)  {
      ad('touchmove' ,  this.windowMouseMoveWrapper, {passive: true})
      ad('touchstart',  this.windowMouseDownWrapper, {passive: true})
      ad('touchend'  ,  this.windowMouseUpWrapper  , {passive: true})
    }
  }

  setOptions(userOptions={}){
    Object.assign(this.options,  userOptions)
    this.triggerMouseMove()
  }

  prepareEl()  {
    let  i,  child
    //  wrapInner  for  text  nodes,  so  text  nodes  can  be  put  into  foreground
    if  (typeof  Node  !==  'undefined'  &&  Node.TEXT_NODE)  {
      for  (i  =  0;  i  <  this.el.childNodes.length;  i++)  {
        const  n  =  this.el.childNodes[i]
        if  (n.nodeType  ===  Node.TEXT_NODE)  {
          const  s  =  document.createElement('span')
          s.textContent  =  n.textContent
          n.parentElement.insertBefore(s,  n)
          n.remove()
        }
      }
    }
    //  Set  foreground  elements
    for  (i  =  0;  i  <  this.el.children.length;  i++)  {
      child  =  this.el.children[i]
      if  (getComputedStyle(child).position  ===  'static')  {
        child.style.position  =  'relative'
      }
      if  (getComputedStyle(child).zIndex  ===  'auto')  {
        child.style.zIndex  =  1
      }
    }
    //  Set  canvas  and  container  style
    if  (getComputedStyle(this.el).position  ===  'static')  {
      this.el.style.position  =  'relative'
    }
  }

  applyCanvasStyles(canvasEl,  opts={}){
    Object.assign(canvasEl.style,  {
      position:  'absolute',
      zIndex:  0,
      top:  0,
      left:  0,
      background:  '',
      width: '100%',
      height: '100%',
      //height: 'auto',
    })
    if  (this.options.pixelated)  {
      canvasEl.style.imageRendering  =  'pixelated'
    }
    Object.assign(canvasEl.style,  opts)
    canvasEl.classList.add('animbg-canvas')
  }

  initRenderer()  {
    //  Set  renderer    here
    this.onInitRenderer()

    const  canvas  =  this.getCanvasElement()
    this.el.appendChild(canvas)
    this.applyCanvasStyles(canvas)
    if  (isNaN(this.options.backgroundAlpha))  {
      this.options.backgroundAlpha  =  1
    }
  }

  onInitRenderer()  {
    error(`${arguments.callee}  must  be  override!`)
  }

  getCanvasElement()  {
    error(`${arguments.callee}  must  be  override!`)
  }

  getCanvasRect()  {
    const  canvas  =  this.getCanvasElement()
    if  (!canvas)  return  false
    return  canvas.getBoundingClientRect()
  }

  windowMouseMoveWrapper(e){
    this.onCanvas(e, (x, y) => {
      this.mouse.setPosition({x: x, y: y})

      const touches = e.changedTouches;
      if (touches) {
        //this.mouse.button = 0
        //e.preventDefault()
      }
      this.mouse.sourceEvents.mousemove = e;

      this.triggerMouseMove(x,  y, e)
    })
  }

  windowMouseDownWrapper(e){
    this.onCanvas(e, (x, y) => {
      this.mouse.setPosition({x: x, y: y})

      const touches = e.changedTouches
      if (touches) {
        this.mouse.button = 0;
        //e.preventDefault();
      } else {
        this.mouse.button = e.button;
      }
      this.mouse.sourceEvents.mousedown = e;

      this.triggerMouseDown(x,  y)
    })
  }

  windowMouseUpWrapper(e){
    this.onCanvas(e, (x, y) => {
      this.mouse.setPosition({x: x, y: y})

      const touches = e.changedTouches;
      if (touches) {
        //e.preventDefault()
      }
      this.mouse.button = -1;
      this.mouse.sourceEvents.mouseup = e;

      this.triggerMouseUp(x,  y)
    })
  }

  onCanvas(e, cb) {
    const  rect  =  this.getCanvasRect()
    if  (!rect)  return  false

    const touches = e.changedTouches;
    const clientX = (touches ) ? touches[0].clientX : e.clientX
    const clientY = (touches ) ? touches[0].clientY : e.clientY
    const  x = clientX - rect.left
    const  y = clientY - rect.top

    if  (x>=0  &&  y>=0  &&  x<=rect.width  &&  y<=rect.height)  {
      const canvas = this.getCanvasElement()
      const cx =  (x / rect.width ) * canvas.width
      const cy =  (y / rect.height) * canvas.height

      cb(cx, cy)
    }
  }

  triggerMouseMove(x,  y, e)  {
    if  (x  ===  undefined  &&  y  ===  undefined)  {  //  trigger  at  current  position
      x  =  this.mouse.position.x
      y  =  this.mouse.position.y
    }

    const  xNorm  =  x  /  this.width  //  0  to  1
    const  yNorm  =  y  /  this.height  //  0  to  1
    typeof  this.onMouseMove  ===  "function"  ?  this.onMouseMove(xNorm,  yNorm, e)  :  void  0
  }

  triggerMouseDown(x,  y, e)  {
    if  (x  ===  undefined  &&  y  ===  undefined)  {  //  trigger  at  current  position
      x  =  this.mouse.position.x
      y  =  this.mouse.position.y
    }

    const  xNorm  =  x  /  this.width  //  0  to  1
    const  yNorm  =  y  /  this.height  //  0  to  1
    typeof  this.onMouseDown  ===  "function"  ?  this.onMouseDown(xNorm,  yNorm, e)  :  void  0
  }

  triggerMouseUp(x,  y, e)  {
    if  (x  ===  undefined  &&  y  ===  undefined)  {  //  trigger  at  current  position
      x  =  this.mouse.position.x
      y  =  this.mouse.position.y
    }

    const  xNorm  =  x  /  this.width  //  0  to  1
    const  yNorm  =  y  /  this.height  //  0  to  1
    typeof  this.onMouseUp  ===  "function"  ?  this.onMouseUp(xNorm,  yNorm, e)  :  void  0
  }

  setSize()  {
    this.width   =  this.el.offsetWidth
    this.height  =  this.el.offsetHeight
  }

  initMouse()  {
    this.mouse = new Mouse() 
     
    typeof  this.onInitMouse  ===  "function"  ?  this.onInitMouse()  :  void  0
  }

  resize()  {
    this.setSize()
    typeof  this.onResize  ===  "function"  ?  this.onResize()  :  void  0
  }

  isOnScreen()  {
    const  elHeight  =  this.el.offsetHeight
    const  elRect  =  this.el.getBoundingClientRect()
    const  scrollTop  =  (window.pageYOffset  ||
      (document.documentElement  ||  document.body.parentNode  ||  document.body).scrollTop
    )
    const  offsetTop  =  elRect.top  +  scrollTop
    const  minScrollTop  =  offsetTop  -  window.innerHeight
    const  maxScrollTop  =  offsetTop  +  elHeight
    return  minScrollTop  <=  scrollTop  &&  scrollTop  <=  maxScrollTop
  }

  animationLoop(time)  {
    //  Only  animate  if  element  is  within  view
    if  (this.isOnScreen()  ||  this.options.forceAnimate)  {
      if  (typeof  this.onUpdate  ===  "function")  {
        this.onUpdate(time)
      }
      if  (typeof  this.afterRender  ===  "function")  this.afterRender()
    }
    return  this.req  =  window.requestAnimationFrame(this.animationLoop)
  }

  restart()  {
    if  (typeof  this.onRestart  ===  "function")  {
      this.onRestart()
    }
    this.init()
  }

  init()  {
    if  (typeof  this.onInit  ===  "function")  {
      this.onInit()
    }
    //  this.setupControls()
  }

  destroy()  {
    const  rm  =  window.removeEventListener
    rm('touchmove',  this.windowMouseMoveWrapper)
    rm('touchstart',  this.windowMouseDownWrapper)
    rm('touchend',  this.windowMouseUpWrapper)
    //rm('scroll',  this.windowMouseMoveWrapper)
    rm('mousemove',  this.windowMouseMoveWrapper)
    rm('mousedown',  this.windowMouseDownWrapper)
    rm('mouseup',  this.windowMouseUpWrapper)
    rm('resize',  this.resize)
    window.cancelAnimationFrame(this.req)

    const  canvas  =  this.getCanvasElement()
    this.el.removeChild(canvas)

    if  (typeof  this.onDestroy  ===  "function")  {
      this.onDestroy()
    }
  }
}

export default AnimBgBase

//  ----  Helper  functions  ----
const  error  =  function()  {
  Array.prototype.unshift.call(arguments,  '[ANIMBG]')
  return  console.error.apply(this,  arguments)
}

const  mobileCheck  =  function()  {
  if  (typeof  navigator  !==  'undefined')  {
    return  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera  Mini/i.test(navigator.userAgent)  ||  window.innerWidth  <  600
  }
  return  null
}

const  color2Hex  =  function(color)  {
  if  (typeof  color  ==  'number'){
    return  '#'  +    ('00000'  +  color.toString(16)).slice(-6)
  }  else  return  color
}
//  ----  ----------------  ----

class Mouse {
  constructor() {
      this.position     = {x: 0, y: 0}
      this.scale        = {x: 0, y: 0}
      this.absolute     = {x: 0, y: 0}
      this.offset       = {x: 0, y: 0}
      this.button       = -1
      this.sourceEvents = {
        mousemove: null,
        mousedown: null,
        mouseup: null,
        mousewheel: null,
      }
  }

  setPosition(position) {
    this.absolute.x = position.x
    this.absolute.y = position.y
    this.position.x = this.absolute.x * this.scale.x + this.offset.x
    this.position.y = this.absolute.y * this.scale.y + this.offset.y
  }

}
