var plask = require('plask');

var glu = require('pex-glu');
var color = require('pex-color');
var gen = require('pex-gen');
var geom = require('pex-geom');
var materials = require('pex-materials');
var merge = require('merge');

var Texture2D = glu.Texture2D;
var Color = color.Color;
var Mesh = glu.Mesh;
var Plane = gen.Plane;
var Textured = materials.Textured;
var Vec2 = geom.Vec2;
var Vec3 = geom.Vec3;
var Quat = geom.Quat;

function TextBox(text, fontFamily, fontSize, options) {
	this.mesh = null;
	this.material = null;
	this.texture = null;
	this.options = {};
	this.width = null;
	this.height = null;

	this.text = text ? text : "";
	this.fontFamily = fontFamily ? fontFamily : "Arial";
	this.fontSize = fontSize ? fontSize : 14;
	this._position = Vec3.create(0,0,0);
	this._rotation = Quat.create();
	this._origin = Vec2.create(0,0);

	this.set(this.text, this.fontFamily, this.fontSize, options);
}

TextBox.prototype.set = function(text, fontFamily, fontSize, options) {
	var defaultOptions = {
		width: 0,
		height: 0,
		color: Color.White,
		background: Color.Transparent,
		lineHeight: 1.0,
		maxLines: 0,
		overflow: TextBox.Overflow.Scale,
		align: TextBox.Align.Left,
		alignVertical: TextBox.Align.Top,
		marginLeft: 0,
		marginTop: 0,
		marginRight: 0,
		marginBottom: 0,
		origin: TextBox.Origin.Auto,
		originOffset: Vec2.create(0,0),
		scale: 1,
		antialias: true,
		anisotropy: 0,
		textureOptions: null,
		drawDebug: false,
		drawFontMetrics: false
	};
	this.options = options = merge(defaultOptions, options);
	this.fontFamily = fontFamily ? fontFamily : this.fontFamily;
	this.fontSize = fontSize ? fontSize : this.fontSize;
	this.text = text;

	// setup SkPaint
	var paint = new plask.SkPaint();
    paint.setAntiAlias(this.options.antialias);
    paint.setFontFamilyPostScript(this.fontFamily);
    paint.setTextSize(this.fontSize);
    paint.setLCDRenderText(true);

    // multiline text
    var textLines = text.split("\r");

    if(options.overflow == TextBox.Overflow.BreakText) {
	    // split to separate lines
		var lineLimit = options.width - options.marginLeft - options.marginRight;
		if(options.width) {
			var lines = [];

			for(li in textLines) {
				var words = textLines[li].split(" ");

				var i = 0;
				var line = "";
				var line_length = 0;
				while(i < words.length) {
					if(line_length + paint.measureText(words[i]) > options.width) {
						lines.push(line);
						line = "";
						line += words[i]+" ";
					} else {
						line += words[i]+" ";
					}
					line_length = paint.measureText(line);
					i++;
				}
				if(line.length > 0)
					lines.push(line);
			}
			
			textLines = lines;
		}
	}

	// cut off lines if exceeds maxLines
	if(options.maxLines > 0) {
		textLines.splice(options.maxLines, Number.MAX_VALUE);
	}

    // get font metrics
    var metrics = paint.getFontMetrics();
	var lineHeight = 0;

	lineHeight = Math.abs(metrics.top) + Math.abs(metrics.bottom);
	lineHeight *= options.lineHeight;

	// calculate bounds
    var bb_left = [];
    var bb_bottom = [];
    var bb_right = [];
    var bb_top = [];

    var bb_left_min = Number.MAX_VALUE;
    var bb_right_max = -Number.MAX_VALUE;

	for(var i = 0; i < textLines.length; i++) {
		var bounds = paint.measureTextBounds(textLines[i]);
		bb_left[i] = bounds[0];
		bb_top[i] = bounds[1];
		bb_right[i] = bounds[2];
		bb_bottom[i] = bounds[3];
		bb_left_min = Math.min(bb_left_min, bb_left[i]);
		bb_right_max = Math.max(bb_right_max, bb_right[i]);
	}

    var w = bb_right_max - bb_left_min;
    var h = textLines.length*(lineHeight+metrics.leading);

    if(options.overflow == TextBox.Overflow.BreakText) {
		this.width = options.width;
	} else {
		this.width = Math.max(options.width,w);
	}
	this.height = Math.max(options.height,h);

	// overflow behaviors
	if(options.overflow == TextBox.Overflow.ScaleText) {
		
		if(options.width > 0) {
			this.width = options.width;
		}
		if(options.height > 0) {
			this.height = options.height;
		}

		var s = 1.0;
		if(options.width > 0) {
			s = options.width / w;
			s = Math.min(1.0,s);
		}
		if(options.height > 0) {
			var sh = options.height / h;
			s = Math.min(sh,s);
		}

		fontSize *= s;
		fontSize = Math.floor(fontSize);
		paint.setTextSize(fontSize);
    
    	// update font metrics
    	metrics = paint.getFontMetrics();

		lineHeight = Math.abs(metrics.top) + Math.abs(metrics.bottom);
		lineHeight *= options.lineHeight;

		// update bounds
		bb_left_min = Number.MAX_VALUE;
    	bb_right_max = -Number.MAX_VALUE;

		for(var i = 0; i < textLines.length; i++) {
			var bounds = paint.measureTextBounds(textLines[i]);
			bb_left[i] = bounds[0];
			bb_top[i] = bounds[1];
			bb_right[i] = bounds[2];
			bb_bottom[i] = bounds[3];
			bb_left_min = Math.min(bb_left_min, bb_left[i]);
			bb_right_max = Math.max(bb_right_max, bb_right[i]);
		}

		// update width and height
		w = bb_right_max - bb_left_min;
    	h = textLines.length*(lineHeight+metrics.leading);

	} else if(options.overflow == TextBox.Overflow.Limit) {
		if(options.width > 0) {
			this.width = options.width;
		}
		if(options.height > 0) {
			this.height = options.height;
		}
	}

	this.width += options.marginLeft + options.marginRight;
	this.height += options.marginTop + options.marginBottom;

	this.width = Math.ceil( this.width );
	this.height = Math.ceil( this.height );

	this.width = Math.max(1,this.width);
	this.height = Math.max(1,this.height);

	// Create canvas
	var canvas = new plask.SkCanvas(this.width, this.height);
	
	// Align
	var px = 0;
	var py = 0;

	// Align Horizontal
	if(options.align == TextBox.Align.Left) {
		px = -bb_left_min + options.marginLeft;
	} else if(options.align == TextBox.Align.Right) {
		px =  - options.marginRight;
	} else {
		// centered
		px =  0 - bb_left_min + (this.width-w)/2;
	}

	// Align Vertical
	if(options.alignVertical == TextBox.Align.Top) {
		py = -metrics.top + options.marginTop;
	} else if(options.alignVertical == TextBox.Align.Bottom) {
		py = this.height - metrics.top - h - options.marginBottom;
	} else {
		// centered
		py = (this.height - h)/2 - metrics.top + options.marginTop;
	}

	// Origin
	if(this.options.origin == TextBox.Origin.Center) {
		this._origin.x = 0;
		this._origin.y = 0;
	} else if(this.options.origin == TextBox.Origin.Left) {
		this._origin.x = -this.width/2;
		this._origin.y = 0;
	} else if(this.options.origin == TextBox.Origin.Right) {
		this._origin.x = +this.width/2;
		this._origin.y = 0;
	} else if(this.options.origin == TextBox.Origin.Top) {
		this._origin.x = 0;
		this._origin.y = -this.height/2;
	} else if(this.options.origin == TextBox.Origin.Bottom) {
		this._origin.x = 0;
		this._origin.y = +this.height/2;
	} else if(this.options.origin == TextBox.Origin.TopLeft) {
		this._origin.x = -this.width/2;
		this._origin.y = -this.height/2;
	} else if(this.options.origin == TextBox.Origin.TopRight) {
		this._origin.x = +this.width/2;
		this._origin.y = -this.height/2;
	} else if(this.options.origin == TextBox.Origin.BottomLeft) {
		this._origin.x = -this.width/2;
		this._origin.y = +this.height/2;
	} else if(this.options.origin == TextBox.Origin.BottomRight) {
		this._origin.x = +this.width/2;
		this._origin.y = +this.height/2;
	} else { // TextBox.Origin.Auto
		
		if(this.options.align == TextBox.Align.Left) {
			this._origin.x = -this.width/2;
		} else if(this.options.align == TextBox.Align.Right) {
			this._origin.x = +this.width/2;
		} else {
			this._origin.x = 0;
		}

		if(this.options.alignVertical == TextBox.Align.Top) {
			this._origin.y = -this.height/2;
		} else if(this.options.alignVertical == TextBox.Align.Bottom) {
			this._origin.y = +this.height/2;
		} else {
			this._origin.y = 0;
		}

	} 

	// offser origin
	this._origin.x += this.options.originOffset.x;
	this._origin.y += this.options.originOffset.y;

	// draw to canvas
	canvas.clear(options.background.r*255, options.background.g*255, options.background.b*255, options.background.a*255);

	paint.setFill();
	paint.setColor(options.color.r*255,options.color.g*255,options.color.b*255,options.color.a*255);
	
	// draw text
	var row = 0;
	for(li in textLines) {
		canvas.drawText(paint, textLines[li], px, py+(row*(lineHeight+metrics.leading)));
		row++;
	}
	
	// Draw debug informations
	if(options.drawDebug) {
    	paint.setAntiAlias(false);

		paint.setStroke();

		// margins
		paint.setColor(0,255,0,255);
		canvas.drawLine(paint, options.marginLeft, 0, options.marginLeft, this.height);
		canvas.drawLine(paint, 0, options.marginTop, this.width, options.marginTop);
		canvas.drawLine(paint, this.width-options.marginRight, 0, this.width-options.marginRight, this.height);
		canvas.drawLine(paint, 0, this.height-options.marginBottom, this.width, this.height-options.marginBottom);

		// font metrics
		if(options.drawFontMetrics) {
			var row = 0;
			for(li in textLines) {
				var ly = (row*lineHeight);
				// baseline
				paint.setColor(255,255,0,255);
				canvas.drawLine(paint, 0, py+ly, this.width, py+ly);
				// ascent
				paint.setColor(0,0,255,255);
				canvas.drawLine(paint, 0, py+ly+metrics.ascent, this.width, py+ly+metrics.ascent);
				// descent
				paint.setColor(0,255,255,255);
				canvas.drawLine(paint, 0, py+ly+metrics.descent, this.width, py+ly+metrics.descent);
				// x-height
				paint.setColor(255,0,255,255);
				canvas.drawLine(paint, 0, py+ly-metrics.xheight, this.width, py+ly-metrics.xheight);
				row++;
			}
		}

		// borders
		paint.setColor(255,0,0,255);
		canvas.drawRect(paint, 0,0, this.width-1, this.height-1); 

		// origin
		paint.setColor(255,0,0,255);
		paint.setFill();
		var ox = this.width/2+this._origin.x;
		var oy = this.height/2+this._origin.y;
		canvas.drawRect(paint,  ox-3,
								oy-3, 
								ox+3, 
								oy+3); 

		paint.setStroke();
		canvas.drawRect(paint,  ox-5,
								oy-5, 
								ox+5, 
								oy+5);


	}

	// create drawable
	if(this.texture) {
		this.texture.dispose();
	}
	this.texture = this.canvasToTexture(canvas, options.anisotropy, options.textureOptions);

	if(this.material) {
		this.material.uniforms.texture = this.texture;
	} else {
    	this.material = new Textured({scale: Vec2.create(1,-1), offset: Vec2.create(0,-1), texture: this.texture});
	}
	if(this.mesh) {
		this.mesh.dispose();
	}
	this.mesh = new Mesh(new Plane(this.width, this.height, 1,1), this.material);
	this.mesh.scale = Vec3.create(options.scale,options.scale,options.scale);
	this.setPosition(this._position);
	this.setRotation(this._rotation);
}

TextBox.prototype.update = function(text, fontFamily, fontSize, options) {
	var _fontFamily = fontFamily ? fontFamily : this.fontFamily;
	var _fontSize = fontSize ? fontSize : this.fontSize;
	var _options = this.options;
	if(options) {
		_options = merge(this.options, options);
	}

	this.set(text, _fontFamily, _fontSize, _options);
}

TextBox.prototype.canvasToTexture = function(canvas, anisotropy, options) {
	var gl = glu.Context.currentContext;

	var aniso = anisotropy || this.options.anisotropy;

	var texture = new Texture2D.create(this.width, this.height, options);
	texture.bind();
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
	gl.texImage2DSkCanvas(gl.TEXTURE_2D, 0, canvas);
	texture.anisotropy(aniso);
	texture.generateMipmap();
	gl.bindTexture(gl.TEXTURE_2D, null);

	return texture;
}

TextBox.prototype.getTexture = function() {
	return this.texture;
}

TextBox.prototype.setPosition = function() {
	return this._position;
}

TextBox.prototype.setPosition = function(x,y,z) {
	if(typeof(x) == 'number') {
		this._position.x = x;
		this._position.y = y;
		this._position.z = z ? z : 0;
	} else {
		this._position = x.clone();
	}

	this.updatePositionRotation();
}

TextBox.prototype.getRotation = function() {
	return this._rotation;
}

TextBox.prototype.setRotation = function(rot) {
	if(typeof(rot) == 'number') {
		this._rotation = Quat.fromAxisAngle(Vec3.create(0,0,1), rot);
	} else {
		this._rotation = rot.clone();
	}

	this.updatePositionRotation();
}

TextBox.prototype.updatePositionRotation = function() {
	if(this.mesh) {

		// calculate rotation for origin as an anchor
		var d = Vec3.create(this._origin.x*this.options.scale, this._origin.y*this.options.scale, 0);
		d.transformQuat(this._rotation);

		// set mesh position and rotation
		this.mesh.position.x = this._position.x - d.x;
		this.mesh.position.y = this._position.y - d.y;
		this.mesh.position.z = this._position.z - d.z;
		this.mesh.rotation = this._rotation.clone();
	}
}

TextBox.prototype.draw = function(camera) {
	if(this.mesh) {
		this.mesh.draw(camera);
	}
}

TextBox.prototype.dispose = function() {
	if(this.mesh) {
		this.mesh.dispose();
	}
	if(this.material) {
		if(this.material.uniforms.texture)
			this.material.uniforms.texture.dispose();
		this.material.dispose();
	}
}

TextBox.Align = { Left: 'left', Right: 'right', Top: 'top', bottom: 'bottom', Center: 'center' };
TextBox.Origin = { Auto: 'auto', Center: 'center', Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom', TopLeft: 'topLeft', TopRight: 'topRight', BottomLeft: 'bottomLeft', BottomRight: 'bottomRight' };
TextBox.Overflow = {Scale: 'scale', Limit: 'limit', ScaleText: 'scaleText', BreakText: 'breakText' };

module.exports = TextBox;
