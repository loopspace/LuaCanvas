/* Template:
function setup()
	x = 3
end

function draw()
  pushStyle()
  background(40,40,50)
  line(x,0,100,100)
  fill(0,0,0)
  ellipse(200,200,50,100)
  translate(200,200)
  fill(255,0,0)
  ellipse(200,200,50,100)
  text("hello world",300,300)
  x = x + 1
  popStyle()
end
*/

var cm;
var prelua;
var postlua;
var ctx;
var luaDraw;
var LuaState;
var LuaExt;
var Module;

function Timer(callback, delay) {
    var timerId, start, remaining = delay;
    var self = this;
    
    this.isPaused = false;
    
    this.pause = function() {
        window.clearTimeout(timerId);
        remaining -= new Date() - start;
	self.isPaused = true;
    };

    this.resume = function() {
        start = new Date();
        window.clearTimeout(timerId);
        timerId = window.setTimeout(callback, remaining);
	self.isPaused = false;
    };

    this.stop = function() {
	window.clearTimeout(timerId);
    }
   
    this.resume();
}

function init() {
    $('#execute').click(runCode);
    $('#edit').click(startEditing);
    $('#pause').click(pauseCode);
    $('#restart').click(restartCode);
    startEditing();
    cm = CodeMirror.fromTextArea(document.getElementById('code'),
				 {
				     value: template(),
				     lineNumbers: true
				 }
				);
    var cvs = $('#cvs')[0];
    ctx = cvs.getContext('2d');
}

$(document).ready(init);

function executeLua(code,cl) {
    var lcode = prelua() + '\n' + code + '\n' + postlua();
    if (cl) {
	$('#output').text('');
	$('#output').css('color',null);
	clear(ctx);
    }
    try {
	L.execute(lcode);
    } catch(e) {
	$('#output').css('color','red');
	$('#output').text(e.toString());
    }
}

function stopLua() {
    if (luaDraw) {
	luaDraw.stop();
    }
}

function startEditing() {
    stopLua();
    $('#run').css('display','none');
    $('#runButtons').css('display','none');
    $('#editButtons').css('display','block');
    $('#editor').css('display','block');
    setEditorSize();
}

function runCode() {
    $('#editor').css('display','none');
    $('#editButtons').css('display','none');
    $('#runButtons').css('display','block');
    $('#run').css('display','block');
    setExecuteSize();
    executeLua(cm.getValue(),true);
}

function restartCode() {
    stopLua();
    executeLua(cm.getValue(),true);
}

function pauseCode() {
    if (luaDraw) {
	if (luaDraw.isPaused) {
	    luaDraw.resume();
	    $('#pause').text('Pause');
	} else {
	    luaDraw.pause();
	    $('#pause').text('Resume');
	}
    }
}

function setEditorSize() {
    var w = $('#container').width();
    $('#codediv').width(w - 6);
    $('#codediv').height($(window).height());
    $('#codediv').height(2*$(window).height() - $(document).height());
}

function setExecuteSize() {
    var w = $('#container').width();
    w -= $('#panel').outerWidth() + 30;
    $('#canvas').height($(window).height());
    var h = 2*$(window).height() - $(document).height();
    $('#canvas').height(h);
    $('#panel').height(h);
    $('#cvs').attr('width',w);
    $('#cvs').attr('height',h - 6); // not sure why 6 here
}

function executeClicked() {
    setMode(false);
}

function editClicked() {
    setMode(true);
}

Module = {
    print: function(x) {
	var txt = $('#output').text();
	txt = (txt ? txt + '\n' : '') + x;
	$('#output').text(txt);
    }
}

function getLuaState() {
    return {
	matrix: [
	    [1,0,0,1,0,0],
	],
	style: [
	    {
		fill: true,
		stroke: true,
		fillColour: [0,0,0,255],
		strokeColour: [255,255,255,255],
		strokeWidth: 1,
	    }
	],
	defaultStyle: {
	    fill: true,
	    stroke: true,
	    fillColour: [0,0,0,255],
	    strokeColour: [255,255,255,255],
	    strokeWidth: 1,
	}
    }
}

function identityMatrix() {
    return [1,0,0,1,0,0];
}

LuaState = getLuaState();

function applyTransform(x,y) {
    var m = LuaState.matrix[0];
    var ch = ctx.canvas.height;
    var xx = m[0]*x + m[2]*y + m[4];
    var yy = m[1]*x + m[3]*y + m[5];
    return {x: xx, y: ch - yy}
}

function applyTransformNoShift(x,y) {
    var m = LuaState.matrix[0];
    var ch = ctx.canvas.height;
    var xx = m[0]*x + m[2]*y;
    var yy = m[1]*x + m[3]*y;
    return {x: xx, y: - yy}
}

function clear(c) {
    c.save();
    c.setTransform(1,0,0,1,0,0);
    c.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
    c.restore();
}

function prelua() {
    var str =
	'do ' +
	'WIDTH = ' + $('#cvs').attr('width') + ' ' +
	'HEIGHT = ' + $('#cvs').attr('height') + ' ';
    Object.keys(LuaExt).forEach(function(v,i,a) {
	str += 'function ' + v + '(...) return js.global.LuaExt:' + v + '(...) end '
    })
    str += 'stroke(255,255,255) ' +
	'fill(0,0,0) ' +
	'function setup() end ' +
	'function draw() end ' +
	'function touched() end ' +
	'do ';
    return str;
}

function postlua() {
	return 'end ' +
	'setup() ' +
	'do js.global:doCycle(draw,touched) end ' +
	'end';
}

function doCycle(d,t) {
    luaDraw = new Timer(
	function() {
	    LuaState.matrix = [identityMatrix()];
	    d();
	    doCycle(d,t);
	},
	10);
}

function template() {
    var str = 'function setup()\n' +
	'x = 0\n' +
	'print(strokeWidth())\n' +
	'print("hello")\n' +
	'end\n\n' +
	'function draw()\n' +
	'background(40,40,50)\n' +
	'fill(150,200,30)\n' + 
	'stroke(200,30,150)\n' +
	'strokeWidth(10)\n' +
	'rect(x,20,100,100)\n' + 
	'x = x + 1\n' +
	'end\n'
    return str;
}

LuaExt = {
    rect: function(x,y,w,h) {
	var p = applyTransform(x,y);
	var r = applyTransformNoShift(w,0);
	var s = applyTransformNoShift(0,h);
	if (LuaState.style[0].fill) {
	    ctx.beginPath();
	    ctx.save();
	    ctx.setTransform(r.x,r.y,s.x,s.y,p.x,p.y);
	    ctx.rect(0,0,1,1);
	    ctx.restore();
	    ctx.fill();
	}
	if (LuaState.style[0].stroke) {
	    ctx.beginPath();
	    ctx.save();
	    ctx.setTransform(r.x,r.y,s.x,s.y,p.x,p.y);
	    ctx.rect(0,0,1,1);
	    ctx.restore();
	    ctx.stroke();
	}
    },
    background: function(r,g,b,a = 255) {
	var al = a/255;
	ctx.save();
	ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
	ctx.setTransform(1,0,0,1,0,0);
	ctx.beginPath();
	ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
	ctx.restore();
    },
    fill: function (r,g,b,a = 255) {
	if (typeof(r) !== 'undefined') {
	    var al = a/255;
	    ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
	    LuaState.style[0].fillColour = [r,g,b,a];
	    LuaState.style[0].fill = true;
	} else {
	    return ctx.fillStyle;
	}
    },
    stroke: function (r,g,b,a = 255) {
	if (typeof(r) !== 'undefined') {
	    var al = a/255;
	    ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
	    LuaState.style[0].strokeColour = [r,g,b,a];
	    LuaState.style[0].stroke = true;
	} else {
	    return ctx.strokeStyle;
	}
    },
    strokeWidth: function (w) {
	if (typeof(w) !== 'undefined') {
	    ctx.lineWidth = w;
	    LuaState.style[0].strokeWidth = w;
	    LuaState.style[0].stroke = true;
	} else {
	    return ctx.lineWidth;
	}
    },
    noFill: function() {
	    LuaState.style[0].fill = false;
    },
    noStroke: function() {
	    LuaState.style[0].stroke = false;
    },
    line: function (x,y,xx,yy) {
	if (LuaState.style[0].stroke) {
	    var p = applyTransform(x,y);
	    var pp = applyTransform(xx,yy);
	    ctx.beginPath();
	    ctx.moveTo(p.x,p.y);
	    ctx.lineTo(pp.x,pp.y);
	    ctx.stroke();
	}
    },
    text: function (s,x,y) {
	var p = applyTransform(x,y);
	ctx.beginPath();
	ctx.fillText(s,p.x,p.y);
    },
    ellipse: function (x,y,w,h) {
	if (typeof(h) === "undefined") {
	    h = w;
	}
	var p = applyTransform(x,y);
	var r = applyTransformNoShift(w,0);
	var s = applyTransformNoShift(0,h);
	if (LuaState.style[0].fill) {
	    ctx.save();
	    ctx.beginPath();
	    ctx.setTransform(r.x,r.y,s.x,s.y,p.x,p.y);
	    ctx.arc(0,0,1,0, 2 * Math.PI,false);
	    ctx.restore();
	    ctx.fill();
	}
	if (LuaState.style[0].stroke) {
	    ctx.save();
	    ctx.beginPath();
	    ctx.setTransform(r.x,r.y,s.x,s.y,p.x,p.y);
	    ctx.arc(0,0,1,0, 2 * Math.PI,false);
	    ctx.restore();
	    ctx.stroke();
	}
    },
    pushMatrix: function() {
	var m = [];
	LuaState.matrix[0].forEach(function(v,k) {
	    m[k] = v;
	})
	LuaState.matrix.push(m)
    },
    popMatrix: function() {
	LuaState.matrix.pop()
    },
    resetMatrix: function() {
	LuaState.matrix[0] = [1,0,0,1,0,0];
    },
    pushStyle: function() {
	var s = {};
	Object.keys(LuaState.style[0]).forEach(function(v) {
	    s[v] = LuaState.style[0][v];
	})
	LuaState.style.push(s)
    },
    popStyle: function() {
	LuaState.style.pop()
    },
    resetStyle: function() {
	Object.keys(LuaState.defaultStyle).forEach(function(v) {
	    LuaState.style[0][v] = LuaState.defaultStyle[v];
	})
    },
    translate: function(x,y) {
	LuaState.matrix[0][4] += x;
	LuaState.matrix[0][5] += y;
    },
    scale: function(a,b) {
	if (typeof(b) === "undefined")
	    b = a;
	LuaState.matrix[0][0] *= a;
	LuaState.matrix[0][1] *= a;
	LuaState.matrix[0][2] *= b;
	LuaState.matrix[0][3] *= b;
    },
    xsheer: function(a) {
	LuaState.matrix[0][2] += LuaState.matrix[0][0] * a;
	LuaState.matrix[0][3] += LuaState.matrix[0][1] * a;
    },
    ysheer: function(a) {
	LuaState.matrix[0][0] += LuaState.matrix[0][2] * a;
	LuaState.matrix[0][1] += LuaState.matrix[0][3] * a;
    },
    clearState: function() {
	LuaState = getLuaState();
    }
}
