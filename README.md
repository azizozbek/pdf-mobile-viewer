# PDF.js for WordPress File Block

In the File Block of WordPress Full Site Editor, if you use inline embed option, you will see following hint:

*Note: Most phone and tablet browsers won't display embedded PDFs.*

Mozilla Foundation has an Javascript Library for PDF viewing.

## How it works:
Plugin check if the device is a touch-oriented device (mobile, tablet) and replaces the <object> tag with PDF.js.

It checks whether the primary input device has a coarse pointer.

A “coarse” pointer usually means:

- finger touch input
- less precise interaction

Typical devices:

- phones
- tablets
- some touch laptops

It returns:
- true → touch-oriented device
- false → mouse/trackpad precision pointer
    
You can set the breakpoint in the pdf-mobile-viewer.js:12. Default: 1024px

## How to use?

Download as zip file and upload in your plugin folder. 