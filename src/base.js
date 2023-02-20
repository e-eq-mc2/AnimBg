//  Based  on  https://github.com/tengbao/vanta

const win = typeof window == 'object'
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

class AnimBgBase {
  constructor(userOptions  =  {})  {
    if  (!win)  return  false

    this.windowMouseMoveWrapper  =  this.windowMouseMoveWrapper.bind(this)
    this.windowTouchWrapper  =  this.windowTouchWrapper.bind(this)
    this.windowGyroWrapper  =  this.windowGyroWrapper.bind(this)
    this.resize  =  this.resize.bind(this)
    this.animationLoop  =  this.animationLoop.bind(this)
    this.restart  =  this.restart.bind(this)

    const  defaultOptions  =  (typeof  this.getDefaultOptions  ===  'function')  ?  this.getDefaultOptions()  :  this.defaultOptions
    this.options  =  Object.assign({
      mouseControls:  true,
      touchControls:  true,
      gyroControls:  false,
      minHeight:  200,
      minWidth:  200,
      scale:  1,
      scaleMobile:  1,
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
    this.initRenderer()
    this.setSize()  //  Init  needs  size

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
      ad('scroll',  this.windowMouseMoveWrapper)
      ad('mousemove',  this.windowMouseMoveWrapper)
    }
    if  (this.options.touchControls)  {
      ad('touchstart',  this.windowTouchWrapper)
      ad('touchmove',  this.windowTouchWrapper)
    }
    if  (this.options.gyroControls)  {
      ad('deviceorientation',  this.windowGyroWrapper)
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
    const  rect  =  this.getCanvasRect()
    if  (!rect)  return  false
    const  x  =  e.clientX  -  rect.left
    const  y  =  e.clientY  -  rect.top
    if  (x>=0  &&  y>=0  &&  x<=rect.width  &&  y<=rect.height)  {
      this.mouseX  =  x
      this.mouseY  =  y
      if  (!this.options.mouseEase)  this.triggerMouseMove(x,  y)
    }
  }
  windowTouchWrapper(e){
    const  rect  =  this.getCanvasRect()
    if  (!rect)  return  false
    if  (e.touches.length  ===  1)  {
      const  x  =  e.touches[0].clientX  -  rect.left
      const  y  =  e.touches[0].clientY  -  rect.top
      if  (x>=0  &&  y>=0  &&  x<=rect.width  &&  y<=rect.height)  {
        this.mouseX  =  x
        this.mouseY  =  y
        if  (!this.options.mouseEase)  this.triggerMouseMove(x,  y)
      }
    }
  }
  windowGyroWrapper(e){
    const  rect  =  this.getCanvasRect()
    if  (!rect)  return  false
    const  x  =  Math.round(e.alpha  *  2)  -  rect.left
    const  y  =  Math.round(e.beta  *  2)  -  rect.top
    if  (x>=0  &&  y>=0  &&  x<=rect.width  &&  y<=rect.height)  {
      this.mouseX  =  x
      this.mouseY  =  y
      if  (!this.options.mouseEase)  this.triggerMouseMove(x,  y)
    }
  }

  triggerMouseMove(x,  y)  {
    if  (x  ===  undefined  &&  y  ===  undefined)  {  //  trigger  at  current  position
      if  (this.options.mouseEase)  {
        x  =  this.mouseEaseX
        y  =  this.mouseEaseY
      }  else  {
        x  =  this.mouseX
        y  =  this.mouseY
      }
    }
    if  (this.uniforms)  {
      this.uniforms.iMouse.value.x  =  x  /  this.scale  //  pixel  values
      this.uniforms.iMouse.value.y  =  y  /  this.scale  //  pixel  values
    }
    const  xNorm  =  x  /  this.width  //  0  to  1
    const  yNorm  =  y  /  this.height  //  0  to  1
    typeof  this.onMouseMove  ===  "function"  ?  this.onMouseMove(xNorm,  yNorm)  :  void  0
  }

  setSize()  {
    this.scale  ||  (this.scale  =  1)
    if  (mobileCheck()  &&  this.options.scaleMobile)  {
      this.scale  =  this.options.scaleMobile
    }  else  if  (this.options.scale)  {
      this.scale  =  this.options.scale
    }
    this.width  =  Math.max(this.el.offsetWidth,  this.options.minWidth)
    this.height  =  Math.max(this.el.offsetHeight,  this.options.minHeight)
  }

  initMouse()  {
    //  Init  mouseX  and  mouseY
    if  ((!this.mouseX  &&  !this.mouseY)  ||
      (this.mouseX  ===  this.options.minWidth/2  &&  this.mouseY  ===  this.options.minHeight/2))  {
      this.mouseX  =  this.width/2
      this.mouseY  =  this.height/2
      this.triggerMouseMove(this.mouseX,  this.mouseY)
    }
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
    if  (this.options.mouseEase)  {
      this.mouseEaseX  =  this.mouseEaseX  ||  this.mouseX  ||  0
      this.mouseEaseY  =  this.mouseEaseY  ||  this.mouseY  ||  0
      if  (Math.abs(this.mouseEaseX-this.mouseX)  +  Math.abs(this.mouseEaseY-this.mouseY)  >  0.1)  {
        this.mouseEaseX  +=  (this.mouseX  -  this.mouseEaseX)  *  0.05
        this.mouseEaseY  +=  (this.mouseY  -  this.mouseEaseY)  *  0.05
        this.triggerMouseMove(this.mouseEaseX,  this.mouseEaseY)
      }
    }

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
    rm('touchstart',  this.windowTouchWrapper)
    rm('touchmove',  this.windowTouchWrapper)
    rm('scroll',  this.windowMouseMoveWrapper)
    rm('mousemove',  this.windowMouseMoveWrapper)
    rm('deviceorientation',  this.windowGyroWrapper)
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
