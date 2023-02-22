# AnimBg
## What's this?
Animation Background for webpages.

[![alt text](img/demo.png "AnimBg")](https://github.com/e-eq-mc2/AnimBg)


## How to use

```js
<script src="https://cdn.jsdelivr.net/gh/e-eq-mc2/AnimBg/dist/animbg.min.js"></script>
<script> 
AnimBg.NewtonsCradle.run({
  el: "#animation-bg",
  minHeight: 200.00,
  minWidth: 200.00,
  scale: 1.00,
  scaleMobile: 1.00,
  backgroundColor: 0x00ffff,
  newtonsCradles: [
    {
      baseX: 150, baseY: 20, size: 50, length: 300,
      text: "Animation", font: '800 80px Arial',
    },
    {
      baseX: 350, baseY: 500, size: 35, length: 200,
      text: "Background", font: '800 60px Arial',
    },
  ]
})
</script>
````

That's it!

## Credits
- Vanta JS from https://github.com/tengbao/vanta
- Matter.js from https://github.com/liabru/matter-js
