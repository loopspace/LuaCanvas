
/*
Set up Lua output to a div with id #output
*/
var Module = {
    print: function(x) {
	var txt = $('#output').text();
	txt = (txt ? txt + '\n' : '') + x;
	$('#output').text(txt);
    }
}

/*
This holds our code for each tab
 */
var tabs = {};

/*
Initialise code editor and lua interpreter
*/
function init() {
    var cm = CodeMirror.fromTextArea(document.getElementById('code'),
				 {
				     lineNumbers: true,
				     tabSize: 2,
				     electricChars: true,
				     autoCloseBrackets: true,
				     matchBrackets: true,
				 }
				);
    cm.setValue($('#lua_template').text());
    var cvs = $('#cvs')[0];
    var ctx = cvs.getContext('2d');
    var lc = new LuaCanvas(ctx,$('#output'),$('#parameters'));

    $('#execute').click(function() {runCode(lc,cm)});
    $('#edit').click(function() { startEditing(lc) });
    $('#pause').click(lc.pauseCode);
    $('#restart').click(function() {restartCode(lc,cm)});
    $('#save').click(function(e) {saveCode(e,cm)});
    $('#load').change(function(e) {loadCode(e,cm)});
    $('#add').click(addTab);
    $('#theme').change(function() {selectTheme(cm) });
    $('.handle').click(function(e) {switchTab(e,cm) });
    $('.tabtitle').change(renameTab);
    $('#cvs').mousedown(lc.startTouch);
    $('#cvs').mouseup(lc.stopTouch);
    $('#cvs').mouseleave(lc.stopTouch);
    $('.tabtitle').on('focus', startRename).on('blur keyup paste input', renameTab);

    $('#tabs').sortable({
	axis: "x",
	distance: 5,
	handle: ".handle",
	cancel: ".control",
	stop: function(e, ui) {
	    if (ui.position.left - $('#add').position().left > 0) {
		if (ui.item.attr('id') == 'Main') {
		    $('#tabs').sortable("cancel");
		} else {
		    if (ui.item.children().last().hasClass('current')) {
			$('#Main').children().first().trigger('click');
		    }
		    ui.item.remove();
		}
	    }
	},
    });
    startEditing(lc);
    var theme = localStorage.getItem('theme');
    if (theme != '') {
	$('#theme option').filter(function () { return $(this).html() == theme}).attr('selected', 'selected');
    };
    $('#theme').trigger('change');
}

$(document).ready(init);

/*
  Apply selected theme to codemirror editor
*/
function selectTheme(cm) {
    var theme = $('#theme option:selected').text();
    localStorage.setItem("theme",theme);
    cm.setOption("theme",theme);
}

/*
Start editing: ensure that the lua draw cycle isn't running and show the relevant divs.
*/
function startEditing(lc) {
    lc.stopLua();
    $('#run').css('display','none');
    $('#runButtons').css('display','none');
    $('#editButtons').css('display','block');
    $('#editor').css('display','block');
    setEditorSize();
}

/*
Set the editor size to be as big as possible on the screen.
*/
function setEditorSize() {
    var w = $('#container').width();
    $('#codediv').width(w - 6);
    $('#codediv').height($(window).height());
    var h = 2*$(window).height() - $(document).height();
    $('#codediv').height(h);
    $('.CodeMirror').height(h);
}

/*
Set the canvas to be as big as possible on the screen.
*/
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

/*
Get the code from the editor and pass it to the interpreter
*/
function runCode(lc,cm) {
    $('#editor').css('display','none');
    $('#editButtons').css('display','none');
    $('#runButtons').css('display','block');
    $('#run').css('display','block');
    setExecuteSize();
    var code = '';
    var ctab = $('.current').text().trim();
    tabs[ctab] = cm.getValue().trim() + '\n';
    $('.tabtitle').each(function(e) {
	if (tabs[$(this).last().text()])
	    code += '\n--## ' + $(this).last().text() + '\ndo\n' + tabs[$(this).last().text()] + '\nend\n';
    });
    lc.executeLua(code,true);
}

/*
Restart the code from fresh
*/
function restartCode(lc,cm) {
    lc.stopLua();
    $('#pause').text('Pause');
    var code = '';
    var ctab = $('.current').text().trim();
    tabs[ctab] = cm.getValue().trim() + '\n';
    $('.tabtitle').each(function(e) {
	if (tabs[$(this).last().text()])
	    code += '\ndo\n' + tabs[$(this).last().text()] + '\nend\n';
    });
    lc.executeLua(code,true);
}

/*
Save the code to a file
*/
function saveCode(e,cm) {
    var code = '';
    var ctab = $('.current').text().trim();
    tabs[ctab] = cm.getValue().trim() + '\n';
    $('.tabtitle').each(function(e) {
	if (tabs[$(this).last().text()])
	    code += '\n--## ' + $(this).last().text() + '\n\n' + tabs[$(this).last().text()] + '\n\n';
    });
    var title = $('#title').text().trim();
    var blob = new Blob([code], {'type':'text/plain'});
    var a = $(e.currentTarget);
    a.attr('href', window.URL.createObjectURL(blob));
    a.attr('download', title + '.lua');
}

/*
Load the code from a file
*/
function loadCode(f,cm) {
    var reader = new FileReader();

    reader.onload = function(e){
	var code = e.target.result.split(/\n(--## [^\n]*)\n/);
	var i = 0;
	var match;
	var tab;
	var curr;
	var first = true;
	tabs = {};
	$('.tab').remove();
	while(i < code.length) {
	    match = code[i].match(/^--## ([^\n]+)/);
	    if (match !== null) {
		tabs[match[1]] = code[++i].trim();
		if (first || match[1] == "Main" ) {
		    curr = true;
		    cm.setValue(code[i].trim());
		} else {
		    curr = false;
		}
		tab = makeTab(match[1],curr);
		tab.insertBefore($("#add").parent());
		first = false;
	    }
	    i++;
	}
	$('current').parent().attr('id','Main');
    }
    var t = f.target.files[0].name;
    t = t.replace(/\.[^/.]+$/, "");
    $('#title').text(t);
    reader.readAsText(f.target.files[0]);
}

/*
Add a tab to the list
*/
function addTab(e) {
    var tab = makeTab('New Tab');
    tab.insertBefore($(e.target).parent());
    tab.children()[0].trigger('click');
}

/*
Auxiliary for making a tab
*/
function makeTab(t,b) {
    var tab = $('<li>');
    var hdle = $('<span>');
    hdle.text("⇔");
    hdle.addClass("handle");
    hdle.click(switchTab);
    tab.append(hdle);
    var title = $('<span>');
    title.text(t);
    title.attr('contenteditable','true');
    title.addClass('tabtitle');
    title.on('focus', startRename).on('blur keyup paste input', renameTab);
    if (b) {
	$('current').removeClass('current');
	title.addClass('current');
    }
    tab.append(title);
    tab.addClass('tab');
    tab.addClass('tabstyle');
    return tab;
}

/*
When renaming a tab, we need to save the old name first
*/
function startRename() {
    var $this = $(this);
    $this.data('before', $this.html());
    return $this;
}

/*
Rename a tab, transfering its contents in the tabs object
*/
function renameTab() {
    var $this = $(this);
    if ($this.data('before') !== $this.html()) {
	tabs[$this.html()] = tabs[$this.data('before')];
	tabs[$this.data('before')] = '';
    }
    return $this;
}

/*
Switch tab
*/
function switchTab(e,cm) {
    var ctab = $('.current').text().trim();
    var ntab = $(e.target).next().text().trim();
    if (ctab != ntab) {
	tabs[ctab] = cm.getValue().trim() + '\n';
	if (tabs[ntab]) {
	    cm.setValue(tabs[ntab]);
	} else {
	    cm.setValue('');
	}
	$('.current').removeClass('current');
	$(e.target).next().addClass('current');
    }
}

/*
This is our wrapper around the lua interpreter
*/
function LuaCanvas(c,o,p) {
    var self = this; // keep hold of this
    var ctx = c; // canvas context
    var output = o; // output pane
    var params = p; // parameters pane
    var luaDraw; // the draw cycle timer
    var LuaState; // matrix and style and similar
    var LuaExt; // our extensions
    var LuaG; // Lua's _G table
    var sTime; // time at which the script started
    var inTouch; // used for handling touches
    var blendmodes = { // all the various blend modes
	sourceOver: 'source-over',
	sourceIn: 'source-in',
	sourceOut: 'source-out',
	sourceAtop: 'source-atop',
	destinationOver: 'destination-over',
	destinationIn: 'destination-in',
	destinationOut: 'destination-out',
	destinationAtop: 'destination-atop',
	lighter: 'lighter',
	copy: 'copy',
	xor: 'xor',
	multiply: 'multiply',
	screen: 'screen',
	overlay: 'overlay',
	darken: 'darken',
	lighten: 'lighten',
	colorDodge: 'color-dodge',
	colorBurn: 'color-burn',
	hardLight: 'hard-light',
	softLight: 'soft-light',
	difference: 'difference',
	exclusion: 'exclusion',
	hue: 'hue',
	saturation: 'saturation',
	color: 'color',
	luminosity: 'luminosity'
    };
    
    /*
      This does the actual execution
     */
    this.executeLua = function(code,cl) {
	var lcode = self.prelua();
	var offset = lcode.split('\n').length - 1;
	lcode += '\n' + code + '\n' + self.postlua();
	if (cl) {
	    output.text('');
	    output.css('color',null);
	    self.clear();
	}
	var L = new Lua.State;
	LuaG = L._G;
	self.initialiseLua();
	self.applyStyle(LuaState.defaultStyle);
	sTime = Date.now();
	try {
	    L.execute(lcode);
	} catch(e) {
	    var emsg;
	    if (e.toString().search(/:(\d+):/) != -1) {
		var eline = e.toString().match(/:(\d+):/)[1];
		var lines = lcode.split('\n');
		var tab,m,n = 0;
		for (var i = 0; i< eline; i++) {
		    if (lines[i].search(/^--##/) != -1) {
			m = lines[i].match(/^--## (.*)/);
			tab = m[1];
			n = i;
		    }
		}
		emsg = e.toString().replace(/.*:(\d+):\s*/, function(a,b) { return 'Tab: ' + tab + '\nLine: ' + (parseInt(b,10) - n - 2) + '\n' });
	    } else {
		emsg = e.toString();
	    }
	    output.css('color','red');
	    output.text(emsg);
	}
    }
    
    /*
      Stops the draw cycle
     */
    this.stopLua = function() {
	if (luaDraw) {
	    luaDraw.stop();
	}
    }
    
    /*
      Pauses the draw cycle
      TODO: adjust sTime accordingly
    */
    this.pauseCode = function(e) {
	if (luaDraw) {
	    if (luaDraw.isPaused) {
		luaDraw.resume();
		$(e.target).text('Pause');
	    } else {
		luaDraw.pause();
		$(e.target).text('Resume');
	    }
	}
    }
    
    /*
      Returns a vanilla state (matrix,styles,etc)
     */
    this.getLuaState = function() {
	return {
	    matrix: [
		new Matrix(),
	    ],
	    style: [
		{
		    fill: true,
		    stroke: true,
		    fillColour: new Colour(0,0,0,255),
		    strokeColour: new Colour(255,255,255,255),
		    strokeWidth: 1,
		    rectMode: 0,
		    ellipseMode: 0,
		    textMode: 0,
		    lineCapMode: 0,
		    font: 'sans-serif',
		    fontSize: 12,
		    textAlign: 0,
		    blendMode: 'source-over'
		}
	    ],
	    defaultStyle: {
		fill: true,
		stroke: true,
		fillColour: new Colour(0,0,0,255),
		strokeColour: new Colour(255,255,255,255),
		strokeWidth: 1,
		rectMode: 0,
		ellipseMode: 0,
		textMode: 0,
		lineCapMode: 0,
		font: 'sans-serif',
		fontSize: 12,
		textAlign: 0,
		blendMode: 'source-over'
	    },
	    touches: [],
	    watches: [],
	}
    }
    
    LuaState = this.getLuaState();

    /*
      Apply a style
    */
this.applyStyle = function(s) {
    ctx.lineWidth = s.strokeWidth;
    ctx.fillStyle = s.fillColour.toCSS();
    ctx.strokeStyle = s.strokeColour.toCSS();
    ctx.font = s.fontSize + 'px ' + s.font;
    if (s.lineCapMode == 0) {
	ctx.lineCap = "round";
    } else if (s.lineCapMode == 1) {
	ctx.lineCap = "butt";
    } else if (s.lineCapMode == 2) {
	ctx.lineCap = "square";
    }
    ctx.globalCompositeOperation = s.blendMode;
}

this.applyTransform = function(x,y) {
    var p = LuaState.matrix[0].applyTransform(x,y);
    var ch = ctx.canvas.height;
    p.y *= -1;
    p.y += ch;
    return p;
}

this.applyTransformNoShift = function(x,y) {
    var p = LuaState.matrix[0].applyTransformNoShift(x,y);
    p.y *= -1;
    return p;
}

    this.clear = function() {
	ctx.save();
	ctx.setTransform(1,0,0,1,0,0);
	ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
	ctx.restore();
    }

    this.startTouch = function(e) {
	self.recordTouch(e);
	inTouch = true;
	$(ctx.canvas).mousemove(recordTouch);
    }

    this.stopTouch = function(e) {
	if (inTouch)
	    self.recordTouch(e);
	$(ctx.canvas).off('mousemove');
	inTouch = false;
    }

    this.recordTouch = (function() {
	var prevTouch;
	return function(e) {
	    var s;
	    var px,py,dx,dy,x,y;
	    x = Math.floor(e.pageX - $(ctx.canvas).offset().left);
	    y = $(ctx.canvas).offset().top + parseInt($(ctx.canvas).attr('height'),10) - e.pageY;
	    if (e.type == 'mousedown') {
		s = 'BEGAN';
	    } else if (e.type == 'mousemove') {
		s = 'MOVING';
		px = prevTouch.x;
		py = prevTouch.y;
		dx = x - px;
		dy = x - py;
	    } else if (e.type == 'mouseup' || e.type == 'mouseleave') {
		s = 'ENDED';
		px = prevTouch.x;
		py = prevTouch.y;
		dx = x - px;
		dy = x - py;
	    }
	    var t = {
		state: s,
		time: e.timestamp - sTime,
		x: x,
		y: y,
		prevX: px,
		prevY: py,
		deltaX: dx,
		deltaY: dy
	    };
	    prevTouch = t;
	    LuaState.touches.push(t);
	}
    })();

    this.prelua = function() {
	return $('#lua_class').text() +
	    $('#lua_parameters').text() +
	    'do ' +
	    'stroke(255,255,255) ' +
	    'fill(0,0,0) ' +
	    'do ';
    }

    this.postlua = function() {
	return 'end ' +
	    'setup() ' +
	    'do initCycle(draw,function (...) touched(select(2,...)) end) end ' +
	    'end';
    }

    this.initCycle = (function () {
	var time;
	var itime;
	var draw;
	var touched;

	function doCycle() {
	    var t = Date.now();
	    var dt = t - time;
	    LuaG.set('ElapsedTime',t - itime);
	    LuaG.set('DeltaTime',t - time);
	    time = t;
	    luaDraw = new Timer(
		function() {
		    LuaState.matrix = [new Matrix()];
		    draw();
		    LuaState.touches.forEach(touched);
		    LuaState.touches = [];
		    LuaState.watches.forEach(function(v) {v()});
		    doCycle();
		},
		Math.max(10 - dt,0)
	    );
	}
    
	return function(d,t) {
	    draw = d;
	    touched = t;
	    time = sTime;
	    itime = sTime;
	    etime = 0;
	    doCycle();
	}
	
    })();

this.initialiseLua = function() {
    var g = LuaG;
	params.empty()
	g.set('WIDTH',$(ctx.canvas).attr('width'));
	g.set('HEIGHT',$(ctx.canvas).attr('height'));
	g.set('CORNER',0);
	g.set('CORNERS',1);
	g.set('CENTER',2);
	g.set('CENTRE',2);
	g.set('RADIUS',3);
	g.set('ROUND',0);
	g.set('SQUARE',1);
	g.set('PROJECT',2);
	Object.keys(LuaExt).forEach(function(v,i,a) {
	    g.set(v, LuaExt[v]);
	})
	g.set('blendmodes',blendmodes);
	g.set('setup', function() {});
	g.set('draw', function() {});
	g.set('touched', function() {});
    }

/*
  First argument is passed as 'this'.
*/
LuaExt = {
    initCycle: function(t) {
	var d = this;
	self.initCycle(d,t);
    },
	rect: function(y,w,h) {
	    var x = this;
	    if (LuaState.style[0].rectMode == 1) {
		w -=x;
		h -=y;
	    } else if (LuaState.style[0].rectMode == 2) {
		x -= w/2;
		y -= h/2;
	    } else if (LuaState.style[0].rectMode == 3) {
		x -= w/2;
		y -= h/2;
		w *= 2;
		h *= 2;
	    }
	    var p = self.applyTransform(x,y);
	    var r = self.applyTransformNoShift(w,0);
	    var s = self.applyTransformNoShift(0,h);
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
	rectMode: function() {
	    var m = this;
	    if (typeof(m) !== "undefined") {
		LuaState.style[0].rectMode = m;
	    } else {
		return LuaState.style[0].rectMode;
	    }
	},
	blendMode: function() {
	    var m = this;
	    if (typeof(m) !== "undefined") {
		LuaState.style[0].blendMode = m;
		ctx.globalCompositeOperation = m;
	    } else {
		return LuaState.style[0].blendMode;
	    }
	},
	background: function(g,b,a) {
	    var r = this;
	    var c = new Colour(r,g,b,a);
	    ctx.save();
	    ctx.globalCompositeOperation = 'source-over';
	    ctx.fillStyle = c.toCSS();
	    ctx.setTransform(1,0,0,1,0,0);
	    ctx.beginPath();
	    ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
	    ctx.restore();
	},
	fill: function (g,b,a) {
	    var r = this;
	    if (typeof(r) !== 'undefined') {
		var c = new Colour(r,g,b,a);
		ctx.fillStyle = c.toCSS();
		LuaState.style[0].fillColour = c;
		LuaState.style[0].fill = true;
	    } else {
		return ctx.fillStyle;
	    }
	},
	stroke: function (g,b,a) {
	    var r = this;
	    if (typeof(r) !== 'undefined') {
		var c = new Colour(r,g,b,a);
		ctx.strokeStyle = c.toCSS();
		LuaState.style[0].strokeColour = c;
		LuaState.style[0].stroke = true;
	    } else {
		return ctx.strokeStyle;
	    }
	},
	strokeWidth: function () {
	    var w = this;
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
	line: function (y,xx,yy) {
	    var x = this;
	    if (LuaState.style[0].stroke) {
		var p = self.applyTransform(x,y);
		var pp = self.applyTransform(xx,yy);
		ctx.beginPath();
		ctx.moveTo(p.x,p.y);
		ctx.lineTo(pp.x,pp.y);
		ctx.stroke();
	    }
	},
	lineCapMode: function() {
	    var m = this;
	    if (typeof(m) !== "undefined") {
		if (m == 0) {
		    ctx.lineCap = "round";
		} else if (m == 1) {
		    ctx.lineCap = "butt";
		} else if (m == 2) {
		    ctx.lineCap = "square";
		}
		LuaState.style[0].lineCapMode = m;
	    } else {
		return LuaState.style[0].lineCapMode;
	    }
	},
	text: function (x,y) {
	    var s = this;
	    if (LuaState.style[0].textMode == 2) {
		var tm = ctx.measureText(s);
		x -= tm.width;
	    }
	    var p = self.applyTransform(x,y);
	    var q = self.applyTransformNoShift(1,0);
	    var ql = Math.sqrt(q.x*q.x + q.y*q.y);
	    var r = self.applyTransformNoShift(0,-1);
	    var rl = Math.sqrt(r.x*r.x + r.y*r.y);
	    ctx.save();
	    ctx.beginPath();
	    ctx.setTransform(q.x/ql,q.y/ql,r.x/rl,r.y/rl,p.x,p.y);
	    ctx.fillText(s,0,0);
	    ctx.restore();
	},
	textSize: function() {
	    var s = this;
	    var tm = ctx.measureText(s);
	    return tm.width;
	},
	font: function () {
	    var f = this;
	    LuaState.style[0].font = f;
	    ctx.font = LuaState.style[0].fontSize + 'px ' + f;
	},
	fontSize: function () {
	    var f = this;
	    LuaState.style[0].fontSize = f;
	    ctx.font = f + 'px ' + LuaState.style[0].font;
	},
	ellipse: function (y,w,h) {
	    var x = this;
	    if (typeof(h) === "undefined") {
		h = w;
	    }
	    if (LuaState.style[0].ellipseMode == 1) {
		w -=x;
		h -=y;
	    } else if (LuaState.style[0].ellipseMode == 2) {
		x -= w/2;
		y -= h/2;
	    } else if (LuaState.style[0].ellipseMode == 3) {
		x -= w/2;
		y -= h/2;
		w *= 2;
		h *= 2;
	    }
	    var p = self.applyTransform(x,y);
	    var r = self.applyTransformNoShift(w,0);
	    var s = self.applyTransformNoShift(0,h);
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
	ellipseMode: function() {
	    var m = this;
	    if (typeof(m) !== "undefined") {
		LuaState.style[0].ellipseMode = m;
	    } else {
		return LuaState.style[0].ellipseMode;
	    }
	},
	pushStyle: function() {
	    var s = {};
	    Object.keys(LuaState.style[0]).forEach(function(v) {
		s[v] = LuaState.style[0][v];
	    })
	    LuaState.style.unshift(s);
	},
	popStyle: function() {
	    LuaState.style.shift();
	    applyStyle(LuaState.style[0]);
	},
	resetStyle: function() {
	    Object.keys(LuaState.defaultStyle).forEach(function(v) {
		LuaState.style[0][v] = LuaState.defaultStyle[v];
	    })
	    applyStyle(LuaState.style[0]);
	},
	pushMatrix: function() {
	    LuaState.matrix.unshift(new Matrix(LuaState.matrix[0]));
	},
	popMatrix: function() {
	    LuaState.matrix.shift();
	},
	resetMatrix: function() {
	    LuaState.matrix[0] = new Matrix();
	},
	translate: function(y) {
	    var x = this;
	    LuaState.matrix[0].translate(x,y);
	},
	scale: function(b) {
	    var a = this;
	    LuaState.matrix[0].scale(a,b);
	},
	xsheer: function() {
	    var a = this;
	    LuaState.matrix[0].xsheer(a);
	},
	ysheer: function() {
	    var a = this;
	    LuaState.matrix[0].ysheer(a);
	},
	rotate: function(x,y) {
	    var ang = this;
	    LuaState.matrix[0].rotate(ang,x,y);
	},
	applyMatrix: function() {
	    LuaState.matrix[0].applyMatrix(this);
	},
	modelMatrix: function() {
	    if (typeof(this) !== "undefined") {
		 LuaState.matrix[0] = new Matrix(this);
	    } else {
		return LuaState.matrix[0];
	    }
	},
	clearState: function() {
	    LuaState = self.getLuaState();
	},
	colour: function(g,b,a) {
	    var r = this;
	    return new Colour(r,g,b,a);
	},
	color: function(g,b,a) {
	    var r = this;
	    return new Colour(r,g,b,a);
	},
	matrix: function(b,c,d,e,f) {
	    var a = this;
	    return new Matrix(a,b,c,d,e,f);
	},
    vec2: function(y) {
	var x = this;
	return new Vec2(x,y);
    },
    log: function() {
	console.log(this);
    },
	parameter: {
	    text: function(i,f) {
		var name = this;
		if (typeof(i) === "undefined")
		    i = '';
		LuaG.set(name,i);
		var tname = $('<span>');
		tname.text(name + ':');
		tname.addClass('parameter');
		tname.addClass('text');
		var tfield = $('<input>');
		tfield.addClass('parameter');
		tfield.addClass('text');
		tfield.attr('type','text');
		tfield.val(i);
		var cfn;
		if (typeof(f) === "function") {
		    cfn = function(e) {
			LuaG.set(name,$(e.target).val());
			f($(e.target).val());
		    }
		} else {
		    cfn = function(e) {
			LuaG.set(name,$(e.target).val());
		    }
		}
		tfield.change(cfn);
		params.append(tname);
		params.append(tfield);
	    },
	    number: function(a,b,i,v,f) {
		var name = this;
		LuaG.set(name,i);
		var slider = $('<div>');
		var sfn,cfn;
		cfn = function(e,u) {
		    LuaG.set(name,u.value);
		}
		if (typeof(f) === "function") {
		    sfn = function(e,u) {
			LuaG.set(name,u.value);
			f(u.value);
		    }
		}
		slider.slider({
		    slide: cfn,
		    stop: sfn,
		    min: a,
		    max: b,
		    value: i,
		    step: v
		});
		var tname = $('<span>');
		tname.text(name + ':');
		tname.addClass('parameter');
		tname.addClass('text');
		params.append(tname);
		params.append(slider);
	    },
	    watch: function() {
		var wexp = this;
		var tname = $('<span>');
		tname.text(wexp + ':');
		tname.addClass('parameter');
		tname.addClass('watch_title');
		var tfield = $('<span>');
		tfield.addClass('parameter');
		tfield.addClass('watch_expression');
		params.append(tname);
		params.append(tfield);
		return function() {
		    tfield.text(this);
		}
	    },
	    watchfn: function() {
		var fn = this;
		LuaState.watches.push(fn);
	    },
	    colour: function(ic,f) {
		var c = this;
		LuaG.set(c,ic);
		var tname = $('<span>');
		tname.text(c + ':');
		tname.addClass('parameter');
		tname.addClass('colour');
		var tfield = $('<input>');
		tfield.addClass('parameter');
		tfield.addClass('colour');
		tfield.attr('type','color');
		tfield.val(ic.toHex());
		var cfn;
		if (typeof(f) === "function") {
		    cfn = function(e) {
			LuaG.set(c,new Colour($(e.target).val()));
	 		f(new Colour($(e.target).val()));
		    }
		} else {
		    cfn = function(e) {
			LuaG.set(c,new Colour($(e.target).val()));
		    }
		}
		tfield.change(cfn);
		params.append(tname);
		params.append(tfield);
	    },
	    clear: function() {
		params.empty();
	    },
	    action: function(f) {
		var name = this;
		var tfield = $('<input>');
		tfield.addClass('parameter');
		tfield.addClass('action');
		tfield.attr('type','button');
		tfield.val(name);
		tfield.click(f);
		params.append(tfield);
	    },
	    bool: function(i,f) {
		var name = this;
		if (typeof(i) === "undefined")
		    i = true;
		LuaG.set(name,i);
		var tname = $('<span>');
		tname.text(name + ':');
		tname.addClass('parameter');
		tname.addClass('boolean');
		var tfield = $('<input>');
		tfield.addClass('parameter');
		tfield.addClass('boolean');
		tfield.addClass('onoffswitch-checkbox');
		tfield.attr('type','checkbox');
		tfield.attr('checked',i);
		tfield.uniqueId();
		var lbl = $('<label>');
		lbl.addClass('onoffswitch-label');
		lbl.attr('for',tfield.attr('id'));
		var spna = $('<div>');
		spna.addClass('onoffswitch-inner');
		var spnb = $('<span>');
		spnb.addClass('onoffswitch-switch');
		var dv = $('<div>');
		dv.addClass('onoffswitch');
		var cfn;
		if (typeof(f) === "function") {
		    cfn = function(e) {
			LuaG.set(name,$(e.target).is(':checked'));
			f($(e.target).is(':checked'));
		    }
		} else {
		    cfn = function(e) {
			LuaG.set(name,$(e.target).is(':checked'));
		    }
		}
		tfield.change(cfn);
		params.append(tname);
		params.append(dv);
		dv.append(tfield);
		dv.append(lbl);
		lbl.append(spna);
		lbl.append(spnb);
	    }
	},
	output: {
	    clear: function() {
		output.text('');
	    }
	}
    }
}
/*
Userdata
*/

function Colour(r,g,b,a) {
    if (r instanceof String || typeof(r) === "string") {
	if (r.substr(0,1) == '#') {
	    if (r.length == 7) {
		b = parseInt(r.substr(5,2),16);
		g = parseInt(r.substr(3,2),16);
		r = parseInt(r.substr(1,2),16);
	    } else if (r.length === 4) {
		b = parseInt(r.substr(3,1),16);
		g = parseInt(r.substr(2,1),16);
		r = parseInt(r.substr(1,1),16);
	    } else if (r.length === 1) {
		b = parseInt(r.substr(1,1),16);
		g = parseInt(r.substr(1,1),16);
		r = parseInt(r.substr(1,1),16);
	    }
	} else if (r.substr(0,3) == 'rgb') {
	    var m = r.match(/(\d+)/g);
	    r = m[0];
	    g = m[1];
	    b = m[2];
	    a = m[3];
	}
    } else if (r instanceof Colour) {
	a = r.a;
	b = r.b;
	g = r.g;
	r = r.r;
    } else if (!(r instanceof Number) && !(typeof(r) === "number")) {
	r = 255;
    }
    if (typeof(b) === "undefined") {
	a = g;
	g = r;
	b = r;
    }
    if (typeof(a) === "undefined") {
	a = 255;
    }
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;

    this.toString = function() {
	return '(' + this.r + ',' + this.g + ',' + this.b + ',' + this.a + ')';
    }

    this.toCSS = function() {
	var al = a/255;
	return 'rgba(' + this.r + ',' + this.g + ',' + this.b + ',' + al + ')';
    }

    this.toHex = function() {
	return '#' + toHex(this.r) + toHex(this.g) + toHex(this.b);
    }
    
    this.is_a = function(c) {
	return (c instanceof Colour);
    }
    
    this.mix = function(c,t) {
	var r,g,b,a,s;
	s = 1 - t;
	r = t*c.r + s*this.r;
	g = t*c.g + s*this.g;
	b = t*c.b + s*this.b;
	a = t*c.a + s*this.a;
	return new Colour(r,g,b,a);
    }

    this.blend = function(c) {
	var r,g,b,a,s,t;
	s = this.a/255;
	t = 1 - s;
	r = t*c.r + s*this.r;
	g = t*c.g + s*this.g;
	b = t*c.b + s*this.b;
	a = t*c.a + s*this.a;
	return new Colour(r,g,b,a);
    }

    return this;
}

function Matrix(a,b,c,d,e,f) {
    if (typeof(a) !== 'undefined') {
	if (a instanceof Matrix || typeof(a) === 'array') {
	    for (var i = 0; i < 6; i++) {
		this[i] = a[i];
	    }
	} else if (typeof(a) === 'number' || a instanceof Number) {
	    this[0] = a;
	    this[1] = b;
	    this[2] = c;
	    this[3] = d;
	    this[4] = e;
	    this[5] = f;
	} else {
	    this[0] = 1;
	    this[1] = 0;
	    this[2] = 0;
	    this[3] = 1;
	    this[4] = 0;
	    this[5] = 0;
	}
    } else {
	this[0] = 1;
	this[1] = 0;
	this[2] = 0;
	this[3] = 1;
	this[4] = 0;
	this[5] = 0;
    }

    this.applyTransform = function(x,y) {
	if (x instanceof Vec2 ) {
	    y = x.y;
	    x = x.x;
	}
	var xx = this[0]*x + this[2]*y + this[4];
	var yy = this[1]*x + this[3]*y + this[5];
	return new Vec2(xx,yy)
    }

    this.applyTransformNoShift = function(x,y) {
	if (x instanceof Vec2 ) {
	    y = x.y;
	    x = x.x;
	}
	var xx = this[0]*x + this[2]*y;
	var yy = this[1]*x + this[3]*y;
	return new Vec2(xx, yy)
    }

    this.applyMatrix = function(mr) {
	var nm = [];
	nm[0] = this[0] * mr[0] + this[2] * mr[1];
	nm[1] = this[1] * mr[0] + this[3] * mr[1];
	nm[2] = this[0] * mr[2] + this[2] * mr[3];
	nm[3] = this[1] * mr[2] + this[3] * mr[3];
	nm[4] = this[0] * mr[4] + this[2] * mr[5] + this[4];
	nm[5] = this[1] * mr[4] + this[3] * mr[5] + this[5];
	this[0] = nm[0];
	this[1] = nm[1];
	this[2] = nm[2];
	this[3] = nm[3];
	this[4] = nm[4];
	this[5] = nm[5];
    }

    this.translate = function(x,y) {
	this[4] += x;
	this[5] += y;
    }
    
    this.scale = function(a,b) {
	if (typeof(b) === "undefined")
	    b = a;
	this[0] *= a;
	this[1] *= a;
	this[2] *= b;
	this[3] *= b;
    }
    
    this.xsheer = function(a) {
	this[2] += this[0] * a;
	this[3] += this[1] * a;
    }
    
    this.ysheer = function(a) {
	this[0] += this[2] * a;
	this[1] += this[3] * a;
    }
    
    this.rotate = function(ang,x,y) {
	if (x instanceof Vec2) {
	    y = x.y;
	    x = x.x;
	}
	if (typeof(x) === "undefined")
	    x = 0;
	if (typeof(y) === "undefined")
	    y = 0;
	ang *= Math.PI/180;
	var cs = Math.cos(ang);
	var sn = Math.sin(ang);
	this.applyMatrix([cs,sn,-sn,cs,x - cs * x + sn * y,y - sn * x - cs * y]);
    }
    
    return this;
}

function Vec2(a,b) {
    if (typeof(a) !== 'undefined') {
	if (typeof(a) === 'number' || a instanceof Number) {
	    this.x = a;
	    this.y = b;
	} else if (typeof(a) === 'array') {
	    this.x = a[0];
	    this.y = a[1];
	} else {
	    this.x = 0;
	    this.y = 0;
	}
    } else {
	this.x = 0;
	this.y = 0;
    }

    this.__add = function(v) {
	return new Vec2(this.x + v.x, this.y + v.y);
    }
    
    this.__sub = function(v) {
	return new Vec2(this.x - v.x, this.y - v.y);
    }
    
    this.len = function() {
	return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
    this.lenSqr = function() {
	return this.x * this.x + this.y * this.y;
    }

    this.dist = function(v) {
	var x = this.x - v.x;
	var y = this.y - v.y;
	return Math.sqrt(x*x + y*y);
    }

    this.distSqr = function(v) {
	var x = this.x - v.x;
	var y = this.y - v.y;
	return x*x + y*y;
    }

    this.toString = function() {
	return '(' + this.x + ',' + this.y + ')';
    }
    
    return this;
}

/*
Utilities
*/

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

function toHex(d) {
    return  ("0"+(Number(d).toString(16))).slice(-2).toUpperCase()
}
