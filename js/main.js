
/*
Set up Lua output to a div with id #output
*/
var Module = {
    print: function(x) {
	if (!$('#output').is(':empty')) {
	    $('#output').append($('<br>'));
	}
/*	var txt = $('#output').text();
	txt = (txt ? txt + '\n' : '') + x;
	$('#output').text(txt);
*/
	$('#output').append(document.createTextNode(x));
    }
}

// shim layer with setTimeout fallback
/*
window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          function( callback ){
            window.setTimeout(callback, 1000 / 60);
          };
})();
*/

var qs = (function(a) {
    if (a == "") return {};
    var b = {};
    for (var i = 0; i < a.length; ++i)
    {
        var p=a[i].split('=', 2);
        if (p.length == 1)
            b[p[0]] = "";
        else
            b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
    }
    return b;
})(window.location.search.substr(1).split('&'));

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
    var cvs = $('#cvs')[0];
    var ctx = cvs.getContext('2d');
    var lc = new LuaCanvas(ctx,$('#output'),$('#parameters'));
    var tabs = new Tabs($('#tabs'),cm);
    if ($('#graphics').is(':checked')) {
	cm.setValue($('#lua_template').text().trim());
    }

    $('#panel').data('origWidth',$('#panel').width());

    $('#execute').click(function() {
	var g = $('#graphics').is(':checked');
	runCode(lc,cm,g);
	return false;
    });
    $('#graphics').change(function() {
	tabs.reset();
	if ($(this).is(':checked')) {
	    cm.setValue($('#lua_template').text().trim());
	} else {
	    cm.setValue('');
	}
    });
    $('#edit').click(function() { 
	startEditing(lc); 
	return false;
    });
    $('#pause').click(lc.pauseCode);
    $('#restart').click(function() {
	$('#pause').text('Pause');
	lc.restartCode();
	return false;
    });
    $('#save').click(function(e) {tabs.saveCode(e,cm)});
    $('#load').change(function(e) {tabs.loadCode(e,cm)});
    $('#theme').change(function() {
	selectTheme(cm);
	return false;
    });

    startEditing(lc);
    var theme = localStorage.getItem('theme');
    if (theme != '') {
	$('#theme option').filter(function () { return $(this).html() == theme}).attr('selected', 'selected');
    };
    $('#theme').trigger('change');

    if (qs['project']) {
	var project = qs['project'];
	if (project.slice(-1) == '/') {
	    project = project.slice(0,-1);
	}
	$.ajax({
	    url: "projects/" + project + ".lua",
	}).done(function(data) {
	    tabs.setCode(data);
	}).fail(function() { alert("Failed to get project " + project); });
    }
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
    return false;
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
function setExecuteSize(g) {
    $('#panel').height($(window).height());
    var h = 2*$(window).height() - $(document).height();
    $('#panel').height(h);
    if (g) {
	$('#panel').width($('#panel').data('origWidth'));
	$('#canvas').css('display','block');
	var w = $('#container').width();
	w -= $('#panel').outerWidth() + 30;
	$('#canvas').height(h);
	$('#cvs').attr('width',w);
	$('#cvs').attr('height',h - 6); // not sure why 6 here
	$('#restart').css('display','inline');
	$('#pause').css('display','inline');
	$('#paramdiv').css('display','block');
	$('#outdiv').css('height','50%');
    } else {
	$('#canvas').css('display','none');
	$('#panel').width($('#container').width() - 40);
	$('#restart').css('display','inline');
	$('#pause').css('display','none');
	$('#paramdiv').css('display','none');
	$('#outdiv').css('height','100%');
    }
}

/*
Get the code from the editor and pass it to the interpreter
*/
function runCode(lc,cm,g) {
    $('#editor').css('display','none');
    $('#editButtons').css('display','none');
    $('#runButtons').css('display','block');
    $('#run').css('display','block');
    setExecuteSize(g);
    var code = '';
    var ctab = $('.current').text().trim();
    tabs[ctab] = cm.getValue().trim() + '\n';
    $('.tabtitle').each(function(e) {
	if (tabs[$(this).last().text()])
	    code += '\n--## ' + $(this).last().text() + '\ndo\n' + tabs[$(this).last().text()] + '\nend\n';
    });
    lc.executeLua(code,true,g);
    return false;
}

function Tabs(t,cm) {
    var self = this;
    var tabs = {};
    var tabol = t;
    var cm = cm;

    var add = $('<li>');
    add.addClass('tabstyle');
    add.addClass('control');
    var addlink = $('<a>');
    addlink.addClass('nolink');
    addlink.attr('href','#');
    addlink.attr('id','add');
    addlink.text('+');
    add.append(addlink);
    tabol.append(add);

    $(document).on('keypress', '.tabtitle', function(e){
	return e.which != 13; 
    }); 

    tabol.sortable({
	axis: "x",
	distance: 5,
	handle: ".handle",
	cancel: ".control",
	stop: function(e, ui) {
	    if (ui.position.left - add.position().left > 0) {
		if (ui.item.attr('id') == 'Main') {
		    tabol.sortable("cancel");
		} else {
		    if (ui.item.children().last().hasClass('current')) {
			$('#Main').children().first().trigger('click');
		    }
		    ui.item.remove();
		}
	    }
	},
    });

    /*
      Save the code to a file
    */
    this.saveCode = function(e) {
	var code = '';
	var ctab = $('.current').text().trim();
	tabs[ctab] = cm.getValue().trim() + '\n';
	$('.tabtitle').each(function(e) {
	    if (tabs[$(this).last().text()])
		code += '\n--## ' + $(this).last().text() + '\n\n' + tabs[$(this).last().text()] + '\n\n';
	});
	var title = $('#title').text().trim();
	var blob = new Blob([code], {'type':'text/plain'});
	if (typeof window.navigator.msSaveBlob === 'function') {
	    window.navigator.msSaveBlob(blob, title + '.lua');
	} else {
	    var a = $(e.currentTarget);
	    a.attr('href', window.URL.createObjectURL(blob));
	    a.attr('download', title + '.lua');
	}
    }
    
    /*
      Load the code from a file
    */
    this.loadCode = function(f) {
	var reader = new FileReader();

	reader.onload = function(e){
	    self.setCode(e.target.result);
	}
	var t = f.target.files[0].name;
	var re = new RegExp('\\.[^/.]+$');
	t = t.replace(re, "");
	$('#title').text(t);
	reader.readAsText(f.target.files[0]);
    }

    /*
      Insert the code into tabs
    */
    this.setCode = function(c) {
	var code = c.split(/\n(--## [^\n]*)\n/);
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
		tab = self.makeTab(match[1],curr);
		tab.insertBefore($("#add").parent());
		first = false;
	    }
	    i++;
	}
	$('current').parent().attr('id','Main');
    }

    /*
      Add a tab to the list
    */
    this.addTab = function(e,t,id) {
	if (typeof(t) === 'undefined')
	    t = 'New Tab';
	var tab = self.makeTab(t,false,id);
	tab.insertBefore(add);
	$(tab.children()[0]).trigger('click');
	return false;
    }

    /*
      Auxiliary for making a tab
    */
    this.makeTab = function(t,b,id) {
	var tab = $('<li>');
	var hdle = $('<span>');
	hdle.text("⇔");
	hdle.addClass("handle");
	hdle.click(self.switchTab);
	tab.append(hdle);
	var title = $('<span>');
	title.text(t);
	title.attr('contenteditable','true');
	title.addClass('tabtitle');
	title.on('focus', self.startRename).on('blur keyup paste input', self.renameTab);
	if (b) {
	    $('current').removeClass('current');
	    title.addClass('current');
	}
	if (id) {
	    tab.attr('id',id);
	}
	tab.append(title);
	tab.addClass('tab');
	tab.addClass('tabstyle');
	return tab;
    }

    /*
      When renaming a tab, we need to save the old name first
    */
    this.startRename = function() {
	var $this = $(this);
	$this.data('before', $this.html());
	return $this;
    }

    /*
      Rename a tab, transfering its contents in the tabs object
    */
    this.renameTab = function() {
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
    this.switchTab = function(e) {
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
      Reset
    */

    this.reset = function() {
	tabs = {};
	tabol.empty();
	addlink.click(self.addTab);
	tabol.append(add);
	self.addTab(false,'Main','Main');
    }
    
    addlink.click(self.addTab);
    this.addTab(false,'Main','Main');
    return this;
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
    var LuaState; // transformation and style and similar
    var LuaGrExt; // our graphical extensions
    var LuaExt; // our non-graphical extensions
    var threadResume; // thread in non-graphical mode
    var threadYield; // thread in non-graphical mode
    var LuaG; // Lua's _G table
    var sTime; // time at which the script started
    var inTouch; // used for handling touches
    var code; // saves the current code in case we restart
    var graphics; // are we in graphics mode?
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
	colourDodge: 'color-dodge',
	colourBurn: 'color-burn',
	hardLight: 'hard-light',
	softLight: 'soft-light',
	difference: 'difference',
	exclusion: 'exclusion',
	hue: 'hue',
	saturation: 'saturation',
	colour: 'color',
	luminosity: 'luminosity'
    };

    /*
      This does the actual execution
     */
    this.executeLua = function(c,cl,g) {
	code = c;
	graphics = g;
	var lcode = self.prelua(g);
	var offset = lcode.split('\n').length - 1;
	lcode += '\n' + code + '\n' + self.postlua(g);
	if (cl) {
	    output.text('');
	    output.css('color','black');
	    self.clear();
	}
	var L = new Lua.State;
	LuaG = L._G;
	self.initialiseLua(g);
	sTime = Date.now();
	try {
	    L.execute(lcode);
	} catch(e) {
	    self.doError(e);
	}
    }

    this.doError = function(e) {
	var emsg;
	var lcode = self.prelua(graphics);
	var offset = lcode.split('\n').length - 1;
	lcode += '\n' + code + '\n' + self.postlua(graphics);
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

    
    /*
      Restart the code from fresh
    */
    this.restartCode = function() {
	self.stopLua();
	self.executeLua(code,true,graphics);
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
	return false;
    }
    
    /*
      Returns a vanilla state (transformation,styles,etc)
     */
    this.getLuaState = function() {
	return {
	    transformation: [
		new Transformation(),
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
		    textValign: 1,
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
		textValign: 1,
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

    this.applyTransformation = function(x,y) {
	var p = LuaState.transformation[0].applyTransformation(x,y);
	var ch = ctx.canvas.height;
	p.y *= -1;
	p.y += ch;
	return p;
    }

    this.applyTransformationNoShift = function(x,y) {
	var p = LuaState.transformation[0].applyTransformationNoShift(x,y);
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
	$(ctx.canvas).on('mousemove touchmove',self.recordTouch);
    }

    this.stopTouch = function(e) {
	if (inTouch)
	    self.recordTouch(e);
	$(ctx.canvas).off('mousemove touchmove');
	inTouch = false;
    }

    $(ctx.canvas).on('mousedown touchstart',self.startTouch);
    $(ctx.canvas).on('mouseleave mouseup touchend touchcancel',self.stopTouch);

    this.recordTouch = (function() {
	var prevTouch;
	return function(e) {
	    var s;
	    var px,py,dx,dy,x,y;
	    x = Math.floor(e.pageX - $(ctx.canvas).offset().left);
	    y = $(ctx.canvas).offset().top + parseInt($(ctx.canvas).attr('height'),10) - e.pageY;
	    if (e.type == 'mousedown' || e.type == 'touchstart') {
		s = 'BEGAN';
	    } else if (e.type == 'mousemove' || e.type == 'touchmove') {
		s = 'MOVING';
		px = prevTouch.x;
		py = prevTouch.y;
		dx = x - px;
		dy = x - py;
	    } else if (e.type == 'mouseup' || e.type == 'mouseleave' || e.type == 'touchend' || e.type == 'touchcancel') {
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

    this.prelua = function(g) {
	var str = 'print() clearOutput() ' +
	    $('#lua_class').text() + ' ';
	if (g) {
	    str += $('#lua_parameters').text() +
		' do ' +
		'stroke(255,255,255) ' +
		'fill(0,0,0) '
	} else {
	    str += 'do local __p = __prompt __prompt = nil function prompt(t) __p(t) local _,b = coroutine.yield() return b end end local __thread = coroutine.wrap(function() ';
	}
	str += 'do ';
	return str;
    }

    this.postlua = function(g) {
	var str = ' end ';
	if (g) {
	    str +=
	    'setup() ' +
	    'do initCycle(draw,function (...) touched(select(2,...)) end) end ' +
	    'end';
	} else {
	    str += ' end) initThread(__thread) ';
	}
	return str;
    }

    this.coresume = function(e) {
	if (e.keyCode == 13) {
	    $(this).off('keyup');
	    $(this).prop('disabled',true);
	    threadResume($(this).val());
	}
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
	    luaDraw = new Animation(
		function() {
		    LuaState.transformation = [new Transformation()];
		    try {
			draw();
		    } catch(e) {
			self.doError(e);
		    }
		    LuaState.touches.forEach(
			function(t) {
			    try {
				touched(t);
			    } catch(e) {
				self.doError(e);
			    }
			}
		    );
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

    this.initialiseLua = function(gr) {
	var g = LuaG;
	params.empty();
	if (gr) {
	    g.set('WIDTH',$(ctx.canvas).attr('width'));
	    g.set('HEIGHT',$(ctx.canvas).attr('height'));
	    g.set('CORNER',0);
	    g.set('CORNERS',1);
	    g.set('CENTER',2);
	    g.set('CENTRE',2);
	    g.set('RADIUS',3);
	    g.set('LEFT',0);
	    g.set('RIGHT',1);
	    g.set('BOTTOM',0);
	    g.set('BASELINE',1);
	    g.set('TOP',3);
	    g.set('ROUND',0);
	    g.set('SQUARE',1);
	    g.set('PROJECT',2);
	    Object.keys(LuaGrExt).forEach(function(v,i,a) {
		g.set(v, LuaGrExt[v]);
	    })
	    g.set('blendmodes',blendmodes);
	    g.set('setup', function() {});
	    g.set('draw', function() {});
	    g.set('touched', function() {});
	    self.applyStyle(LuaState.defaultStyle);
	} else {
	    Object.keys(LuaExt).forEach(function(v,i,a) {
		g.set(v, LuaExt[v]);
	    })

	}
    }

    /*
      First argument is passed as 'this'.
    */
    LuaExt = {
	clearOutput: function() {
	    output.text('');
	},
	__prompt: function() {
	    var txt = (this === window) ? "" : this;
	    var tbox = $('<input>');
	    tbox.attr('type','text');
	    tbox.addClass('prompt');
	    if (!output.is(':empty')) {
		output.append( $('<br>'));
	    }
	    if (txt) {
		output.append(document.createTextNode(txt));
	    }
	    output.append(tbox);
	    tbox.keyup(self.coresume);
	},
	initThread: function() {
	    threadResume = this;
	    threadResume();
	}
    }
    
    LuaGrExt = {
	initCycle: function(t) {
	    var d = this;
	    self.initCycle(d,t);
	},
	clearOutput: function() {
	    output.text('');
	},
	rect: function(y,w,h) {
	    var x = this;
	    if (x instanceof Vec2) {
		h = w;
		w = y;
		y = x.y;
		x = x.x;
	    }
	    if (w instanceof Vec2) {
		h = w.y;
		w = w.x;
	    }
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
	    var p = self.applyTransformation(x,y);
	    var r = self.applyTransformationNoShift(w,0);
	    var s = self.applyTransformationNoShift(0,h);
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
	    if (this !== window) {
		LuaState.style[0].rectMode = m;
	    } else {
		return LuaState.style[0].rectMode;
	    }
	},
	blendMode: function() {
	    var m = this;
	    if (this !== window) {
		LuaState.style[0].blendMode = m;
		ctx.globalCompositeOperation = m;
	    } else {
		return LuaState.style[0].blendMode;
	    }
	},
	background: function(g,b,a) {
	    var c = this;
	    if (!(c instanceof Colour)) {
		c = new Colour(c,g,b,a);
	    }
	    ctx.save();
	    ctx.globalCompositeOperation = 'source-over';
	    ctx.fillStyle = c.toCSS();
	    ctx.setTransform(1,0,0,1,0,0);
	    ctx.beginPath();
	    ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
	    ctx.restore();
	},
	fill: function (g,b,a) {
	    var c = this;
	    if (c !== window) {
		if (!(c instanceof Colour)) {
		    c = new Colour(c,g,b,a);
		}
		ctx.fillStyle = c.toCSS();
		LuaState.style[0].fillColour = c;
		LuaState.style[0].fill = true;
	    } else {
		return ctx.fillStyle;
	    }
	},
	stroke: function (g,b,a) {
	    var c = this;
	    if (c !== window) {
		var c;
		if (!(c instanceof Colour)) {
		    c = new Colour(c,g,b,a);
		}
		ctx.strokeStyle = c.toCSS();
		LuaState.style[0].strokeColour = c;
		LuaState.style[0].stroke = true;
	    } else {
		return ctx.strokeStyle;
	    }
	},
	strokeWidth: function () {
	    var w = this;
	    if (w !== window) {
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
	    if (x instanceof Vec2) {
		yy = xx;
		xx = y;
		y = x.y;
		x = x.x;
	    }
	    if (xx instanceof Vec2) {
		yy = xx.y;
		xx = xx.x;
	    }
	    if (LuaState.style[0].stroke) {
		var p = self.applyTransformation(x,y);
		var pp = self.applyTransformation(xx,yy);
		ctx.beginPath();
		ctx.moveTo(p.x,p.y);
		ctx.lineTo(pp.x,pp.y);
		ctx.stroke();
	    }
	},
	lineCapMode: function() {
	    var m = this;
	    if (m !== window) {
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
	    if (x instanceof Vec2) {
		y = x.y;
		x = x.x;
	    }
	    var s = this;
	    var p = self.applyTransformation(x,y);
	    var q = self.applyTransformationNoShift(1,0).normalise();
	    var r = self.applyTransformationNoShift(0,-1).normalise();
	    if (LuaState.style[0].textMode == 1) {
		var tm = ctx.measureText(s);
		p = p.__sub(q.__mul(tm.width));
	    } else if (LuaState.style[0].textMode == 2) {
		var tm = ctx.measureText(s);
		p = p.__sub(q.__mul(tm.width/2));
	    }
	    if (LuaState.style[0].textValign == 0) {
		var f = LuaState.style[0].fontSize + 'px ' + LuaState.style[0].font;
		var fm = getTextHeight(f,s);
		p = p.__sub(r.__mul(fm.descent));
	    } else if (LuaState.style[0].textValign == 2) {
		var f = LuaState.style[0].fontSize + 'px ' + LuaState.style[0].font;
		var fm = getTextHeight(f,s);
		p = p.__add(r.__mul(fm.height/2-fm.descent));
	    } else if (LuaState.style[0].textValign == 3) {
		var f = LuaState.style[0].fontSize + 'px ' + LuaState.style[0].font;
		var fm = getTextHeight(f,s);
		p = p.__add(r.__mul(fm.ascent));
	    }
	    ctx.save();
	    ctx.beginPath();
	    ctx.setTransform(q.x,q.y,r.x,r.y,p.x,p.y);
	    ctx.fillText(s,0,0);
	    ctx.restore();
	},
	textMode: function() {
	    var m = this;
	    if (m !== window) {
		if (m == 0) {
		    LuaState.style[0].textMode = 0;
		} else if (m == 1) {
		    LuaState.style[0].textMode = 1;
		} else if (m == 2) {
		    LuaState.style[0].textMode = 2;
		}
	    } else {
		return LuaState.style[0].textMode;
	    }
	},
	textValign: function() {
	    var m = this;
	    if (m !== window) {
		if (m == 0) {
		    LuaState.style[0].textValign = 0;
		} else if (m == 1) {
		    LuaState.style[0].textValign = 1;
		} else if (m == 2) {
		    LuaState.style[0].textValign = 2;
		} else if (m == 3) {
		    LuaState.style[0].textValign = 3;
		}
	    } else {
		return LuaState.style[0].textValign;
	    }
	},
	textSize: function() {
	    var s = this;
	    var tm = ctx.measureText(s);
	    var f = LuaState.style[0].fontSize + 'px ' + LuaState.style[0].font;
	    var fm = getTextHeight(f,s);
	    return tm.width,fm.height;
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
	    if (x instanceof Vec2) {
		h = w;
		w = y;
		y = x.y;
		x = x.x;
	    }
	    if (w instanceof Vec2) {
		h = w.y;
		w = w.x;
	    }
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
	    var p = self.applyTransformation(x,y);
	    var r = self.applyTransformationNoShift(w,0);
	    var s = self.applyTransformationNoShift(0,h);
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
	    if (m !== window) {
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
	    self.applyStyle(LuaState.style[0]);
	},
	resetStyle: function() {
	    Object.keys(LuaState.defaultStyle).forEach(function(v) {
		LuaState.style[0][v] = LuaState.defaultStyle[v];
	    })
	    self.applyStyle(LuaState.style[0]);
	},
	pushTransformation: function() {
	    LuaState.transformation.unshift(new Transformation(LuaState.transformation[0]));
	},
	popTransformation: function() {
	    LuaState.transformation.shift();
	},
	resetTransformation: function() {
	    LuaState.transformation[0] = new Transformation();
	},
	translate: function(y) {
	    var x = this;
	    if (x instanceof Vec2) {
		y = x.y;
		x = x.x;
	    }
	    LuaState.transformation[0] = LuaState.transformation[0].translate(x,y);
	},
	scale: function(b) {
	    var a = this;
	    if (a instanceof Vec2) {
		b = a.y;
		a = a.x;
	    }
	    LuaState.transformation[0] = LuaState.transformation[0].scale(a,b);
	},
	xsheer: function() {
	    var a = this;
	    LuaState.transformation[0] = LuaState.transformation[0].xsheer(a);
	},
	ysheer: function() {
	    var a = this;
	    LuaState.transformation[0] = LuaState.transformation[0].ysheer(a);
	},
	rotate: function(x,y) {
	    var ang = this;
	    LuaState.transformation[0] = LuaState.transformation[0].rotate(ang,x,y);
	},
	applyTransformation: function() {
	    LuaState.transformation[0] = LuaState.transformation[0].applyTransformation(this);
	},
	modelTransformation: function() {
	    if (this !== window) {
		LuaState.transformation[0] = new Transformation(this);
	    } else {
		return LuaState.transformation[0];
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
	transformation: function(b,c,d,e,f) {
	    var a = this;
	    return new Transformation(a,b,c,d,e,f);
	},
	vec2: function(y) {
	    var x = this;
	    return new Vec2(x,y);
	},
	coordinate: function(y) {
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
			return false;
		    }
		} else {
		    cfn = function(e) {
			LuaG.set(name,$(e.target).val());
			return false;
		    }
		}
		tfield.change(cfn);
		var pdiv = $('<div>');
		pdiv.addClass('parameter');
		pdiv.append(tname);
		pdiv.append(tfield);
		params.append(pdiv);
	    },
	    number: function(a,b,i,v,f) {
		var name = this;
		LuaG.set(name,i);
		var pdiv = $('<div>');
		pdiv.addClass('parameter');
		var slider = $('<div>');
		var tval = $('<span>');
		var sfn,cfn;
		cfn = function(e,u) {
		    LuaG.set(name,u.value);
		    tval.text(u.value);
		}
		if (typeof(f) === "function") {
		    sfn = function(e,u) {
			LuaG.set(name,u.value);
			tval.text(u.value);
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
		tname.text(name);
		tname.addClass('parameter');
		tname.addClass('text');
		tval.text(i);
		tval.addClass('parameter');
		tval.addClass('value');
		pdiv.append(tname);
		pdiv.append(tval);
		pdiv.append(slider);
		params.append(pdiv);
	    },
	    select: function(o,i,f) {
		var name = this;
		LuaG.set(name,i);
		var pdiv = $('<div>');
		pdiv.addClass('parameter');
		var tname = $('<span>');
		tname.text(name);
		tname.addClass('parameter');
		tname.addClass('select');
		var sel = $('<select>');
		var op;
		var v;
		for (var i = 1; typeof(o.get(i)) !== "undefined"; i++) {
		    op = $('<option>');
		    v = o.get(i);
		    op.val(v);
		    op.text(v);
		    if (v === i) {
			op.attr('selected',true);
		    }
		    sel.append(op);
		}
		var cfn;
		if (typeof(f) === "function") {
		    cfn = function(e) {
			LuaG.set(name,$(e.target).val());
			f($(e.target).val());
			return false;
		    }
		} else {
		    cfn = function(e) {
			LuaG.set(name,$(e.target).val());
			return false;
		    }
		}
		sel.change(cfn);
		pdiv.append(tname);
		pdiv.append(sel);
		params.append(pdiv);
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
		var pdiv = $('<div>');
		pdiv.addClass('parameter');
		pdiv.append(tname);
		pdiv.append(tfield);
		params.append(pdiv);
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
			return false;
		    }
		} else {
		    cfn = function(e) {
			LuaG.set(c,new Colour($(e.target).val()));
			return false;
		    }
		}
		tfield.change(cfn);
		var pdiv = $('<div>');
		pdiv.addClass('parameter');
		pdiv.append(tname);
		pdiv.append(tfield);
		params.append(pdiv);
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
		tfield.click(function() {f(); return false;});
		var pdiv = $('<div>');
		pdiv.addClass('parameter');
		pdiv.append(tfield);
		params.append(pdiv);
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
			return false;
		    }
		} else {
		    cfn = function(e) {
			LuaG.set(name,$(e.target).is(':checked'));
			return false;
		    }
		}
		tfield.change(cfn);
		var pdiv = $('<div>');
		pdiv.addClass('parameter');
		pdiv.append(tname);
		pdiv.append(dv);
		params.append(pdiv);
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

function Transformation(a,b,c,d,e,f) {
    if (typeof(a) !== 'undefined') {
	if (a instanceof Transformation || typeof(a) === 'array') {
	    for (var i = 1; i <= 6; i++) {
		this[i] = a[i];
	    }
	} else if (typeof(a) === 'number' || a instanceof Number) {
	    this[1] = a;
	    this[2] = b;
	    this[3] = c;
	    this[4] = d;
	    this[5] = e;
	    this[6] = f;
	} else {
	    this[1] = 1;
	    this[2] = 0;
	    this[3] = 0;
	    this[4] = 1;
	    this[5] = 0;
	    this[6] = 0;
	}
    } else {
	this[1] = 1;
	this[2] = 0;
	this[3] = 0;
	this[4] = 1;
	this[5] = 0;
	this[6] = 0;
    }

    return this;
}

Transformation.prototype.applyTransformation = function(x,y) {
    if (x instanceof Vec2 ) {
	y = x.y;
	x = x.x;
    }
    var xx = this[1]*x + this[3]*y + this[5];
    var yy = this[2]*x + this[4]*y + this[6];
    return new Vec2(xx,yy)
}

Transformation.prototype.applyTransformationNoShift = function(x,y) {
    if (x instanceof Vec2 ) {
	y = x.y;
	x = x.x;
    }
    var xx = this[1]*x + this[3]*y;
    var yy = this[2]*x + this[4]*y;
    return new Vec2(xx, yy)
}

Transformation.prototype.composeTransformation = function(mr) {
    var nm = [];
    nm[1] = this[1] * mr[1] + this[3] * mr[2];
    nm[2] = this[2] * mr[1] + this[4] * mr[2];
    nm[3] = this[1] * mr[3] + this[3] * mr[4];
    nm[4] = this[2] * mr[3] + this[4] * mr[4];
    nm[5] = this[1] * mr[5] + this[3] * mr[6] + this[5];
    nm[6] = this[2] * mr[5] + this[4] * mr[6] + this[6];
    return new Transformation(nm);
}

Transformation.prototype.translate = function(x,y) {
    var nm = new Transformation(this);
    nm[5] += nm[1]*x + nm[3]*y;
    nm[6] += nm[2]*x + nm[4]*y;
    return nm;
}
    
Transformation.prototype.scale = function(a,b) {
    if (typeof(b) === "undefined")
	b = a;
    var nm = new Transformation(this);
    nm[1] *= a;
    nm[2] *= a;
    nm[3] *= b;
    nm[4] *= b;
    return nm;
}
    
Transformation.prototype.postscale = function(a,b) {
    if (typeof(b) === "undefined")
	b = a;
    var nm = new Transformation(this);
    nm[1] *= a;
    nm[3] *= a;
    nm[5] *= a;
    nm[2] *= b;
    nm[4] *= b;
    nm[6] *= b;
    return nm;
}
    
Transformation.prototype.xsheer = function(a) {
    nm = new Transformation(this);
    nm[3] += nm[1] * a;
    nm[4] += nm[2] * a;
    return nm;
}
    
Transformation.prototype.ysheer = function(a) {
    nm = new Transformation(this);
    nm[1] += nm[3] * a;
    nm[2] += nm[4] * a;
    return nm;
}
    
Transformation.prototype.rotate = function(ang,x,y) {
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
    return this.composeTransformation([cs,sn,-sn,cs,x - cs * x + sn * y,y - sn * x - cs * y]);
}

Transformation.prototype.__mul = function(a,b) {
    if (typeof(b) === 'undefined') {
	b = a;
	a = this;
    }
    if (a instanceof Number || typeof(a) === 'number') {
	return b.postscale(a);
    } else if (b instanceof Number || typeof(b) === 'number') {
	return a.scale(b);
    } else if (b instanceof Vec2) {
	return a.applyTransformation(b);
    } else {
	return a.composeTransformation(b);
    }
}

Transformation.prototype.__div = function(z) {
    if (z instanceof Number || typeof(z) === 'number') {
	var nm = new Transformation(this);
	nm[1] *= z;
	nm[2] *= z;
	nm[3] *= z;
	nm[4] *= z;
	nm[5] *= z;
	nm[6] *= z;
	return nm;
    }
}

Transformation.prototype.__unm = function() {
    return this.postscale(-1);
}

Transformation.prototype.__eq = function(m) {
    return this[1] == nm[1]
	&& this[2] == nm[2]
	&& this[3] == nm[3]
	&& this[4] == nm[4]
	&& this[5] == nm[5]
	&& this[6] == nm[6]
}

Transformation.prototype.toString = function() {
    return '[' + this[1] + ',' + this[3] + ',' + this[5] + ']\n[' + this[2] + ',' + this[4] + ',' + this[6] + ']';
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

    return this;
}

/*
  Add, subtract, and divide can all take numbers on either side and
  treat the result as if a Vec2 was a complex number.
*/

Vec2.prototype.__add = function(a,b) {
    if (typeof(b) === 'undefined') {
	b = a;
	a = this;
    }
    if (b instanceof Number || typeof(b) === 'number') {
	return new Vec2(a.x+b,a.y);
    } else if (a instanceof Number || typeof(a) === 'number') {
	return new Vec2(a + b.x,b.y);
    } else {
	return new Vec2(a.x + b.x, a.y + b.y);
    }
}
    
Vec2.prototype.__sub = function(a,b) {
    if (typeof(b) === 'undefined') {
	b = a;
	a = this;
    }
    if (b instanceof Number || typeof(b) === 'number') {
	return new Vec2(a.x-b,a.y);
    } else if (a instanceof Number || typeof(a) === 'number') {
	return new Vec2(a - b.x,-b.y);
    } else {
	return new Vec2(a.x - b.x, a.y - b.y);
    }
}

Vec2.prototype.__mul = function(a,b) {
    if (typeof(b) === 'undefined') {
	b = a;
	a = this;
    }
    if (b instanceof Number || typeof(b) === 'number') {
	return new Vec2(a.x*b,a.y*b);
    } else if (a instanceof Number || typeof(a) === 'number') {
	return new Vec2(a * b.x, a * b.y);
    } else {
	return new Vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
    }
}

Vec2.prototype.__div = function(a,b) {
    if (typeof(b) === 'undefined') {
	b = a;
	a = this;
    }
    var l;
    if (b instanceof Number || typeof(b) === 'number') {
	return new Vec2(a.x/b,a.y/b);
    } else if (a instanceof Number || typeof(a) === 'number') {
	l = b.lenSqr();
	return new Vec2(a * b.x/l, -a * b.y/l);
    } else {
	return new Vec2((a.x * b.x + a.y * b.y)/l, (-a.x * b.y + a.y * b.x)/l);
    }
}

Vec2.prototype.__unm = function() {
    return new Vec2(-this.x,-this.y);
}

Vec2.prototype.__eq = function(v) {
	return (this.x == v.x) && (this.y == v.y);
    }
    
Vec2.prototype.len = function() {
	return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
Vec2.prototype.lenSqr = function() {
	return this.x * this.x + this.y * this.y;
    }

Vec2.prototype.normalise = function() {
    var l = this.len();
    if (l !== 0) {
	return new Vec2(this.x/l,this.y/l);
    } else {
	return new Vec2(1,0);
    }
}

Vec2.prototype.normalize = Vec2.prototype.normalise;

Vec2.prototype.dist = function(v) {
	var x = this.x - v.x;
	var y = this.y - v.y;
	return Math.sqrt(x*x + y*y);
    }

Vec2.prototype.distSqr = function(v) {
	var x = this.x - v.x;
	var y = this.y - v.y;
	return x*x + y*y;
    }

Vec2.prototype.rotate = function(a) {
	var x = this.x * Math.cos(a*Math.PI/180) - this.y * Math.sin(a*Math.PI/180);
	var y = this.x * Math.sin(a*Math.PI/180) + this.y * Math.cos(a*Math.PI/180);
	return new Vec2(x,y);
    }

Vec2.prototype.rotate90 = function() {
	return new Vec2(-y,x);
    }

Vec2.prototype.toString = function() {
	return '(' + this.x + ',' + this.y + ')';
    }

/*
  Utilities
*/

function Animation(callback, delay) {
    var timerId, start, remaining = delay;
    var self = this;
    
    this.isPaused = false;
    
    this.pause = function() {
        window.cancelAnimationFrame(timerId);
        remaining -= new Date() - start;
	self.isPaused = true;
    };

    this.resume = function() {
        start = new Date();
        window.cancelAnimationFrame(timerId);
        timerId = window.requestAnimationFrame(callback);
	self.isPaused = false;
    };

    this.stop = function() {
	window.cancelAnimationFrame(timerId);
    }
    
    this.resume();
}

function toHex(d) {
    return  ("0"+(Number(d).toString(16))).slice(-2).toUpperCase()
}

/*
  From: http://stackoverflow.com/a/9847841
*/

var getTextHeight = function(font,s) {

  var text = $('<span>' + s + '</span>').css({ fontFamily: font });
  var block = $('<div style="display: inline-block; width: 1px; height: 0px;"></div>');

  var div = $('<div></div>');
  div.append(text, block);

  var body = $('body');
  body.append(div);

  try {

    var result = {};

    block.css({ verticalAlign: 'baseline' });
    result.ascent = block.offset().top - text.offset().top;

    block.css({ verticalAlign: 'bottom' });
    result.height = block.offset().top - text.offset().top;

    result.descent = result.height - result.ascent;

  } finally {
    div.remove();
  }

  return result;
};
