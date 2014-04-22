var plask = require('plask');

var debugPaint = new plask.SkPaint();

//draws centered text stretched to fill the text box
exports.drawText = function(canvas, paint, text, rect, options) {
  var options = options || {};
  var debug = typeof(options.debug) != 'undefined' ? options.debug : false;
  var bounds = paint.measureTextBounds(text);

  var w = bounds[2] - bounds[0]; //right - left
  var h = bounds[3] - bounds[1]; //bottom - top

  var x = -w/2 - bounds[0];
  var y = h/2 - bounds[3];

  var scale = Math.min(rect.width/w, rect.height/h);
  //scale = 1;
  //scale = 2;

  canvas.save();
  canvas.translate(rect.x + rect.width/2, rect.y + rect.height/2);

  canvas.scale(scale, scale);

  canvas.translate(-bounds[0] - w/2, -bounds[1] - h + h/2);
  canvas.drawText(paint, text, 0, 0);

  if (debug) {
    debugPaint.setStroke();
    debugPaint.setAntiAlias(true);
    debugPaint.setStrokeWidth(1/scale);
    debugPaint.setColor(255, 0, 0, 255);
    canvas.drawRect(debugPaint, bounds[0], bounds[1], bounds[0] + w, bounds[1] + h);
  }

  canvas.restore();

  if (debug) {
    debugPaint.setStrokeWidth(1);
    debugPaint.setColor(255, 255, 0, 255);
    canvas.drawRect(debugPaint, rect.x, rect.y, rect.x + rect.width, rect.y + rect.height);
  }
}