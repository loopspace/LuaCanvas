/*
  TODO:

  Consider loading the lua vm via ajax to speed up initial load time

  Add sprites via a spritesheet (use Lost Garden)

  Keyboard?
*/


/*
Set up Lua output to a div with id #output
*/
var Module = {
    print: function(x) {
	var out = $('#output');
	if (!out.is(':empty')) {
	    out.append($('<br>'));
	}
/*	var txt = $('#output').text();
	txt = (txt ? txt + '\n' : '') + x;
	$('#output').text(txt);
*/
	out.append(document.createTextNode(x));
	var outdiv = $('#outdiv');
	outdiv.prop('scrollTop',outdiv.prop('scrollHeight'));
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
    var code = localStorage.getItem('code');
    if (code !== null) {
	tabs.setCode(code);
	var title = localStorage.getItem('title');
	if (title !== null) {
	    $('#title').text(title);
	}
	var gr = localStorage.getItem('graphics');
	if (gr !== null) {
	    $('#graphics').prop('checked',gr);
	}
    } else {
	if ($('#graphics').is(':checked')) {
	    cm.setValue($('#lua_template').text().trim());
	}
    }

    $('#panel').data('origWidth',$('#panel').width());

    $('#execute').click(function() {
	var g = $('#graphics').is(':checked');
	runCode(lc,tabs,g);
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
    $('#clear').click(function(e) {
	tabs.reset();
	if ($('#graphics').is(':checked')) {
	    cm.setValue($('#lua_template').text().trim());
	} else {
	    cm.setValue('');
	}
	$('#title').text('Project');
	return false;
    });
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
	    $('#title').text(project);
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
    if (theme !== 'default') {
	$.ajax({
	    url: "css/theme/" + theme + ".css",
	}).done(function(data) {
	    $("head").append("<style>" + data + "</style");
	    cm.setOption("theme",theme);
	}).fail(function() { alert("Failed to load editor theme " + theme); });
    } else {
	cm.setOption("theme","default");
    }
}

/*
Start editing: ensure that the lua draw cycle isn't running and show the relevant divs.
*/
function startEditing(lc) {
    if (lc)
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
function runCode(lc,tabs,g) {
    $('#editor').css('display','none');
    $('#editButtons').css('display','none');
    $('#runButtons').css('display','block');
    $('#run').css('display','block');
    setExecuteSize(g);
    var code = tabs.getCode();
    localStorage.setItem('code',code);
    localStorage.setItem('title',$('#title').text());
    localStorage.setItem('graphics',$('#graphics').is(':checked'));
    code = tabs.getCode(true);
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
      Get the code from the tabs, if b is true, wrap each tab in do ... end
    */
    this.getCode = function(b) {
	var pre;
	var post;
	if (b) {
	    pre = '\ndo\n';
	    post = '\nend\n';
	} else {
	    pre = '\n\n';
	    post = '\n\n';
	}
	var code = '';
	var ctab = $('.current').text().trim();
	tabs[ctab] = cm.getValue().trim() + '\n';
	$('.tabtitle').each(function(e) {
	    if (tabs[$(this).last().text()])
		code += '\n--## ' + $(this).last().text() + pre + tabs[$(this).last().text()] + post;
	});
	return code;
    }
    
    /*
      Save the code to a file
    */
    this.saveCode = function(e) {
	var code = self.getCode();
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
	$('.current').parent().attr('id','Main');
	$('.current').attr('contenteditable',false);
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
    $('.current').attr('contenteditable',false);

    return this;
}
/*
This is our wrapper around the lua interpreter
*/
function LuaCanvas(c,o,p) {
    var self = this; // keep hold of this
    var ctx = c; // canvas context
    var gctx = c; // so that we never lose the base canvas 
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
    var imgNum = 0; // generated images
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
		    arcMode: 0,
		    bezierMode: 0,
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
		arcMode: 0,
		bezierMode: 0,
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

/*
Currently only records a single touch.  Needs a bit of work to track multiple touches correctly.
*/
    
    this.startTouch = function(e) {
	e.preventDefault();
	window.blockMenuHeaderScroll = true;
	self.recordTouch(e);
	inTouch = true;
	$(ctx.canvas).on('mousemove touchmove',self.recordTouch);
    }

    this.stopTouch = function(e) {
	e.preventDefault();
	window.blockMenuHeaderScroll = false;
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
	    e.preventDefault();
	    var s;
	    var px,py,dx,dy,x,y,pgx,pgy,id,radx;
	    if (e.type == 'touchstart' || e.type == 'touchmove' || e.type == 'touchend' || e.type == 'touchcancel' ) {
		var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
		pgx = touch.pageX;
		pgy = touch.pageY;
		id = touch.identifier;
	    } else {
		pgx = e.pageX;
		pgy = e.pageY;
	    }
	    x = Math.floor(pgx - $(ctx.canvas).offset().left);
	    y = $(ctx.canvas).offset().top + parseInt($(ctx.canvas).attr('height'),10) - pgy;
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
		id: id,
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
		    ctx = gctx;
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
	    // Canvas dimensions
	    g.set('WIDTH',$(ctx.canvas).attr('width'));
	    g.set('HEIGHT',$(ctx.canvas).attr('height'));
	    // Rectangle and Ellipse modes
	    g.set('CORNER',0);
	    g.set('CORNERS',1);
	    g.set('CENTER',2);
	    g.set('CENTRE',2);
	    g.set('RADIUS',3);
	    // Text horizontal alignment
	    g.set('LEFT',0);
	    g.set('RIGHT',1);
	    // Text vertical alignment
	    g.set('BOTTOM',0);
	    g.set('BASELINE',1);
	    g.set('TOP',3);
	    // Bezier control point and Arc angle
	    g.set('ABSOLUTE',0);
	    g.set('RELATIVE',1);
	    // line cap
	    g.set('ROUND',0);
	    g.set('SQUARE',1);
	    g.set('PROJECT',2);
	    Object.keys(LuaGrExt).forEach(function(v,i,a) {
		g.set(v, LuaGrExt[v]);
	    })
	    g.set('ElapsedTime',0);
	    g.set('DeltaTime',0);
	    g.set('blendmodes',blendmodes);
	    g.set('setup', function() {});
	    g.set('draw', function() {});
	    g.set('touched', function() {});
	    LuaState = this.getLuaState();
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
	    ctx.beginPath();
	    ctx.save();
	    ctx.setTransform(r.x,r.y,s.x,s.y,p.x,p.y);
	    ctx.rect(0,0,1,1);
	    ctx.restore();
	    if (LuaState.style[0].fill) {
		ctx.fill();
	    }
	    if (LuaState.style[0].stroke) {
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
	arcMode: function() {
	    var m = this;
	    if (this !== window) {
		LuaState.style[0].arcMode = m;
	    } else {
		return LuaState.style[0].arcMode;
	    }
	},
	bezierMode: function() {
	    var m = this;
	    if (this !== window) {
		LuaState.style[0].bezierMode = m;
	    } else {
		return LuaState.style[0].bezierMode;
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
/*
How should the angles interact with the transformation?
*/
	arc: function(y,r,sa,ea,cl) {
	    var x = this;
	    if (x instanceof Vec2) {
		cl = ea;
		ea = sa;
		sa = r;
		r = y;
		y = x.y;
		x = x.x;
	    }
	    if (LuaState.style[0].arcMode == 1)
		ea += sa;
	    sa *= Math.PI/180;
	    ea *= Math.PI/180;
	    var p = self.applyTransformation(x,y);
	    var q = self.applyTransformationNoShift(r,0);
	    var s = self.applyTransformationNoShift(0,r);
	    ctx.beginPath();
	    ctx.save();
	    ctx.setTransform(q.x,q.y,s.x,s.y,p.x,p.y);
	    ctx.arc(0,0,1,sa,ea,cl);
	    ctx.restore();
	    if (LuaState.style[0].stroke) {
		ctx.stroke();
	    }
	},
	bezier: function(ay,bx,by,cx,cy,dx,dy) {
	    var ax = this;
	    if (ax instanceof Vec2) {
		dy = dx;
		dx = cy;
		cy = cx;
		cx = by;
		by = bx;
		bx = ay;
		ay = ax.y;
		ax = ax.x;
	    }
	    if (bx instanceof Vec2) {
		dy = dx;
		dx = cy;
		cy = cx;
		cx = by;
		by = bx.y;
		bx = bx,x;
	    }
	    if (cx instanceof Vec2) {
		dy = dx;
		dx = cy;
		cy = cx.y;
		cx = cx.x;
	    }
	    if (dx instanceof Vec2) {
		dy = dx.y;
		dx = dx.x;
	    }

	    if (LuaState.style[0].bezierMode == 1) {
		cy += dy;
		cx += dx;
		by += ay;
		bx += ax;
	    }
	    dy -= ay;
	    dx -= ax;
	    cy -= ay;
	    cx -= ax;
	    by -= ay;
	    bx -= ax;
	    var p = self.applyTransformation(ax,ay);
	    var q = self.applyTransformationNoShift(1,0);
	    var s = self.applyTransformationNoShift(0,1);
	    ctx.beginPath();
	    ctx.save();
	    ctx.setTransform(q.x,q.y,s.x,s.y,p.x,p.y);
	    ctx.moveTo(0,0);
	    ctx.bezierCurveTo(bx,by,cx,cy,dx,dy);
	    ctx.restore();
	    if (LuaState.style[0].stroke) {
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
	    ctx.save();
	    ctx.beginPath();
	    ctx.setTransform(r.x,r.y,s.x,s.y,p.x,p.y);
	    ctx.arc(0,0,1,0, 2 * Math.PI,false);
	    ctx.restore();
	    if (LuaState.style[0].fill) {
		ctx.fill();
	    }
	    if (LuaState.style[0].stroke) {
		ctx.stroke();
	    }
	},
	circle: function (y,r) {
	    var x = this;
	    if (x instanceof Vec2) {
		r = y;
		y = x.y;
		x = x.x;
	    }
	    if (LuaState.style[0].ellipseMode == 1) {
		r -=x;
	    } else if (LuaState.style[0].ellipseMode == 2) {
		x -= r/2;
		y -= r/2;
	    } else if (LuaState.style[0].ellipseMode == 3) {
		x -= r/2;
		y -= r/2;
		r *= 2;
	    }
	    var p = self.applyTransformation(x,y);
	    var d = LuaState.transformation[0].determinant();
	    d = Math.sqrt(d) * r;
	    ctx.save();
	    ctx.beginPath();
	    ctx.setTransform(d,0,0,d,p.x,p.y);
	    ctx.arc(0,0,1,0, 2 * Math.PI,false);
	    ctx.restore();
	    if (LuaState.style[0].fill) {
		ctx.fill();
	    }
	    if (LuaState.style[0].stroke) {
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
	composeTransformation: function() {
	    LuaState.transformation[0] = LuaState.transformation[0].composeTransformation(this);
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
	path: function(b) {
	    var a = this;
	    return new Path(a,b);
	},
	log: function() {
	    console.log(this.toString());
	},
	image: function(h) {
	    var w = this;
	    if (w instanceof Vec2) {
		h = w.y;
		w = w.x;
	    }
	    var c = $('<canvas>');
	    c.prop('width',w);
	    c.prop('height',h);
	    return c[0].getContext('2d');
	},
	setContext: function() {
	    var c = this;
	    if (c !== window) {
		ctx = c;
	    } else {
		ctx = gctx;
	    }
	},
	smooth: function() {
	    ctx.imageSmoothingEnabled = true;
	    $(ctx.canvas).removeClass('pixelated');
	},
	noSmooth: function() {
	    ctx.imageSmoothingEnabled = false;
	    $(ctx.canvas).addClass('pixelated');
	},
	sprite: function(x,y,w,h) {
	    var img = this;
	    if (img.canvas)
		img = img.canvas;
	    if (x instanceof Vec2) {
		h = w;
		w = y;
		y = x.y;
		x = x.y;
	    }
	    if (w instanceof Vec2) {
		h = w.y;
		w = w.x;
	    }
	    if (typeof(h) === 'undefined') {
		h = $(img).prop('height');
	    }
	    if (typeof(w) === 'undefined') {
		w = $(img).prop('width');
	    }
	    y = ctx.canvas.height - y - h;
	    ctx.drawImage(img,x,y,w,h);
	},
	saveImage: function(s) {
	    var img=this;
	    if (typeof(s) === 'undefined')
		s = $('#title').text() + '-' + imgNum++;
	    img.canvas.toBlob(function(b) {
		var a = $('<a>');
		a.attr('href', window.URL.createObjectURL(b));
		a.attr('download', s + '.png');
		a.text('Download ' + s);
		a.addClass('imgDownload');
		var pdiv = $('<div>');
		pdiv.addClass('parameter');
		pdiv.append(a);
		params.append(pdiv);
	    });
	},
	parameter: {
	    text: function(n,i,f) {
		var title = this;
		if (typeof(i) === "undefined")
		    i = '';
		LuaG.set(n,i);
		var tname = $('<span>');
		tname.text(title + ':');
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
			LuaG.set(n,$(e.target).val());
			f($(e.target).val());
			return false;
		    }
		} else {
		    cfn = function(e) {
			LuaG.set(n,$(e.target).val());
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
	    number: function(n,a,b,i,v,f) {
		var title = this;
		LuaG.set(n,i);
		var pdiv = $('<div>');
		pdiv.addClass('parameter');
		var slider = $('<div>');
		var tval = $('<span>');
		var sfn,cfn;
		cfn = function(e,u) {
		    LuaG.set(n,u.value);
		    tval.text(u.value);
		}
		if (typeof(f) === "function") {
		    sfn = function(e,u) {
			LuaG.set(n,u.value);
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
		tname.text(title);
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
	    select: function(n,o,i,f) {
		var title = this;
		LuaG.set(n,i);
		var pdiv = $('<div>');
		pdiv.addClass('parameter');
		var tname = $('<span>');
		tname.text(title);
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
			LuaG.set(n,$(e.target).val());
			f($(e.target).val());
			return false;
		    }
		} else {
		    cfn = function(e) {
			LuaG.set(n,$(e.target).val());
			return false;
		    }
		}
		sel.change(cfn);
		pdiv.append(tname);
		pdiv.append(sel);
		params.append(pdiv);
	    },
	    watch: function() {
		var t = this;
		var tname = $('<span>');
		tname.text(t + ':');
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
	    colour: function(c,ic,f) {
		var title = this;
		LuaG.set(c,ic);
		var tname = $('<span>');
		tname.text(title + ':');
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
	    bool: function(n,i,f) {
		var title = this;
		if (typeof(i) === "undefined")
		    i = true;
		LuaG.set(n,i);
		var tname = $('<span>');
		tname.text(title + ':');
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
			LuaG.set(n,$(e.target).is(':checked'));
			f($(e.target).is(':checked'));
			return false;
		    }
		} else {
		    cfn = function(e) {
			LuaG.set(n,$(e.target).is(':checked'));
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


    /*
      Path is a subobject of LuaCanvas so that it has access to the
      current transformation
    */

    Path = new(function(t) {
	return function(x,y) {
	    var lc = t;
	    var self = this;
	    this.path = [];
	
	    if (typeof x !== "undefined") {
		var p = lc.applyTransformation(x,y);
		this.path.push(["moveTo",[p.x,p.y]]);
		self.point = p;
	    }

	    this.moveTo = function(x,y) {
		var p = lc.applyTransformation(x,y);
		self.path.push(["moveTo",[p.x,p.y]]);
		self.point = p;
	    }
	    
	    this.lineTo = function(x,y) {
		var p = lc.applyTransformation(x,y);
		self.path.push(["lineTo",[p.x,p.y]]);
		self.point = p;
	    }

	    this.close = function() {
		self.path.push(["closePath",[]]);
	    }

	    this.curveTo = function(bx,by,cx,cy,dx,dy) {
		if (bx instanceof Vec2) {
		    dy = dx
		    dx = cy
		    cy = cx
		    cx = by
		    by = bx.y
		    bx = bx.x
		}
		if (cx instanceof Vec2) {
		    dy = dx
		    dx = cy
		    cy = cx.y
		    cx = cx.x
		}
		if (dx instanceof Vec2) {
		    dy = dx.y
		    dx = dx.x
		}
		if (LuaState.style[0].bezierMode == 1) {
		    cy += dy;
		    cx += dx;
		    by += self.point.y;
		    bx += self.point.x;
		}
		var p = lc.applyTransformation(dx,dy);
		var q = lc.applyTransformation(cx,cy);
		var r = lc.applyTransformation(bx,by);
		
		self.path.push(["bezierCurveTo",[r.x,r.y,q.x,q.y,p.x,p.y]]);
	    }
	    /*
	      Should the angles of an arc interact with the transformation?
	     */
	    this.arc = function(x,y,r,sa,ea,cl) {
		if (x instanceof Vec2) {
		    ea = sa;
		    sa = r;
		    r = y;
		    y = x.y;
		    x = x.x;
		}
		if (LuaState.style[0].arcMode == 1)
		    ea += sa;
		sa *= -Math.PI/180;
		ea *= -Math.PI/180;
		cl = !cl;
		var p = lc.applyTransformation(x,y);
		self.path.push(["arc",[p.x,p.y,r,sa,ea,cl]]);
	    }


	    /*
	      Consider replacing rect by a piece-wise rect.
	    */
	    this.rect = function(x,y,w,h) {
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
		var p = lc.applyTransformation(x,y);
		self.path.push(["rect",[p.x,p.y,w,h]]);
		self.point = p;
	    }

	    this.draw = function(opts) {
		if (typeof opts === "undefined")
		    opts = new Table;
		var d = opts.get("draw");
		if (!d)
		    opts.set("draw",true);
		self.use(opts);
	    }

	    this.fill = function(opts) {
		if (typeof opts === "undefined")
		    opts = new Table;
		var d = opts.get("fill");
		if (!d)
		    opts.set("fill",true);
		self.use(opts);
	    }

	    this.filldraw = function(opts) {
		if (typeof opts === "undefined")
		    opts = new Table;
		var d = opts.get("draw");
		if (!d)
		    opts.set("draw",true);
		d = opts.get("fill");
		if (!d)
		    opts.set("fill",true);
		self.use(opts);
	    }

	    this.use = function(opts) {
		var p,b,m,c,w,d,f;
		if (typeof opts !== "undefined") {
		    b = opts.get("transformShape");
		    if (typeof b === "undefined")
			b = false;
		    m = opts.get("transformation");
		    if (typeof m === "undefined") {
			m = LuaState.transformation[0];
		    } else {
			b = true;
		    }
		    c = opts.get("colour");
		    w = opts.get("strokeWidth");
		    d = opts.get("draw");
		    f = opts.get("fill");
		}
		if (b) {
		    p = [];
		    self.path.forEach(function(v) {
			var a = argTransform[v[0]](m,v[1]);
			p.push([v[0],a]);
		    });
		} else {
		    p = self.path;
		}
		ctx.save();
		ctx.save();
		ctx.setTransform(1,0,0,1,0,0);
		ctx.beginPath();
		p.forEach(function(v) {
		    ctx[v[0]].apply(ctx,v[1]);
		});
		ctx.restore();
		if (c) {
		    ctx.strokeStyle = c.toCSS();
		    ctx.fillStyle = c.toCSS();
		}
		if (d instanceof Colour)
		    ctx.strokeStyle = d.toCSS();
		if (f instanceof Colour)
		    ctx.fillStyle = d.toCSS();
		if (w)
		    ctx.lineWidth = w;
		if (f)
		    ctx.fill()
		if (d)
		    ctx.stroke();
		ctx.restore();
	    }

	    this.clear = function() {
		self.path = [];
	    }

	    var argTransform = {
		moveTo: function(m,a) {
		    var ch = ctx.canvas.height;
		    var x,y;
		    x = a[0];
		    y = ch - a[1];
		    var p = m.applyTransformation(x,y);
		    p.y *= -1;
		    p.y += ch;
		    return [p.x,p.y];
		},
		lineTo: function(m,a) {
		    var ch = ctx.canvas.height;
		    var x,y;
		    x = a[0];
		    y = ch - a[1];
		    var p = m.applyTransformation(x,y);
		    p.y *= -1;
		    p.y += ch;
		    return [p.x,p.y];
		},
		curveTo: function(m,a) {
		    var ch = ctx.canvas.height;
		    var x,y,p;
		    x = a[0];
		    y = ch - a[1];
		    p = m.applyTransformation(x,y);
		    x = a[2];
		    y = ch - a[3];
		    q = m.applyTransformation(x,y);
		    x = a[4];
		    y = ch - a[5];
		    r = m.applyTransformation(x,y);
		    p.y *= -1;
		    p.y += ch;
		    q.y *= -1;
		    q.y += ch;
		    r.y *= -1;
		    r.y += ch;
		    return [p.x,p.y,q.x,q.y,r.x,r.y];
		},
		arc: function(m,a) {
		    var ch = ctx.canvas.height;
		    var x,y;
		    x = a[0];
		    y = ch - a[1];
		    var p = m.applyTransformation(x,y);
		    p.y *= -1;
		    p.y += ch;
		    return [p.x,p.y,a[2],a[3],a[4],a[5]];
		},
		rect: function(m,a) {
		    var ch = ctx.canvas.height;
		    var x,y;
		    x = a[0];
		    y = ch - a[1];
		    var p = m.applyTransformation(x,y);
		    p.y *= -1;
		    p.y += ch;
		    return [p.x,p.y,a[2],a[3]];
		}

	    }
	    
	}
    })(this);

}


/*
  Userdata

Available objects:
Colour
Transformation
Vec2
Path - subobject of LuaCanvas
*/

var svg,x11

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
	} else if (svg[r.replace(/\s+/g,'').toLowerCase()]) {
	    r = r.replace(/\s+/g,'').toLowerCase();
	    a = svg[r].a;
	    b = svg[r].b;
	    g = svg[r].g;
	    r = svg[r].r;
	} else if (x11[r.replace(/\s+/g,'').toLowerCase()]) {
	    r = r.replace(/\s+/g,'').toLowerCase();
	    a = x11[r].a;
	    b = x11[r].b;
	    g = x11[r].g;
	    r = x11[r].r;
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
	if (a instanceof Vec2) {
	    f = e;
	    e = d;
	    d = c;
	    c = b;
	    b = a.y;
	    a = a.x;
	}
	if (c instanceof Vec2) {
	    f = e;
	    e = d;
	    d = c.y;
	    c = c.x;
	}
	if (e instanceof Vec2) {
	    f = e.y;
	    e = e.x;
	}
	if (a instanceof Transformation || Array.isArray(a)) {
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
    var nm = new Transformation(this);
    nm[3] += nm[1] * a;
    nm[4] += nm[2] * a;
    return nm;
}
    
Transformation.prototype.ysheer = function(a) {
    var nm = new Transformation(this);
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

Transformation.prototype.determinant = function() {
    return this[1] * this[4] - this[2] * this[3];
}

Transformation.prototype.inverse = function() {
    var nm = [];
    var d = this.determinant();
    if (d === 0)
	return false;
    nm[1] = this[4]/d;
    nm[2] = -this[2]/d;
    nm[3] = -this[3]/d;
    nm[4] = this[1]/d;
    nm[5] = - nm[1] * nm[5] - nm[3] * nm[6];
    nm[6] = - nm[2] * nm[5] - nm[4] * nm[6];
    return new Transformation(nm);
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
	return new Vec2(-this.y,this.x);
    }

Vec2.prototype.toString = function() {
	return '(' + this.x + ',' + this.y + ')';
    }

/*
For when a JS function is expecting a Lua table but none came from Lua
*/

function Table() {
    var prop = {};

    this.get = function(s) {
	return prop[s];
    }

    this.set = function(s,v) {
	prop[s] = v;
    }
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

svg = {
    transparent: {r: 0, g: 0, b: 0, a: 0},
    aliceblue: {r: 239, g: 247, b: 255, a: 255},
    antiquewhite: {r: 249, g: 234, b: 215, a: 255},
    aqua: {r: 0, g: 255, b: 255, a: 255},
    aquamarine: {r: 126, g: 255, b: 211, a: 255},
    azure: {r: 239, g: 255, b: 255, a: 255},
    beige: {r: 244, g: 244, b: 220, a: 255},
    bisque: {r: 255, g: 227, b: 196, a: 255},
    black: {r: 0, g: 0, b: 0, a: 255},
    blanchedalmond: {r: 255, g: 234, b: 205, a: 255},
    blue: {r: 0, g: 0, b: 255, a: 255},
    blueviolet: {r: 137, g: 43, b: 226, a: 255},
    brown: {r: 165, g: 42, b: 42, a: 255},
    burlywood: {r: 221, g: 183, b: 135, a: 255},
    cadetblue: {r: 94, g: 158, b: 160, a: 255},
    chartreuse: {r: 126, g: 255, b: 0, a: 255},
    chocolate: {r: 210, g: 104, b: 29, a: 255},
    coral: {r: 255, g: 126, b: 79, a: 255},
    cornflowerblue: {r: 99, g: 149, b: 237, a: 255},
    cornsilk: {r: 255, g: 247, b: 220, a: 255},
    crimson: {r: 220, g: 20, b: 59, a: 255},
    cyan: {r: 0, g: 255, b: 255, a: 255},
    darkblue: {r: 0, g: 0, b: 138, a: 255},
    darkcyan: {r: 0, g: 138, b: 138, a: 255},
    darkgoldenrod: {r: 183, g: 133, b: 11, a: 255},
    darkgray: {r: 169, g: 169, b: 169, a: 255},
    darkgreen: {r: 0, g: 99, b: 0, a: 255},
    darkgrey: {r: 169, g: 169, b: 169, a: 255},
    darkkhaki: {r: 188, g: 182, b: 107, a: 255},
    darkmagenta: {r: 138, g: 0, b: 138, a: 255},
    darkolivegreen: {r: 84, g: 107, b: 47, a: 255},
    darkorange: {r: 255, g: 140, b: 0, a: 255},
    darkorchid: {r: 183, g: 49, b: 204, a: 255},
    darkred: {r: 138, g: 0, b: 0, a: 255},
    darksalmon: {r: 232, g: 150, b: 122, a: 255},
    darkseagreen: {r: 142, g: 187, b: 142, a: 255},
    darkslateblue: {r: 72, g: 61, b: 138, a: 255},
    darkslategray: {r: 47, g: 79, b: 79, a: 255},
    darkslategrey: {r: 47, g: 79, b: 79, a: 255},
    darkturquoise: {r: 0, g: 206, b: 209, a: 255},
    darkviolet: {r: 147, g: 0, b: 211, a: 255},
    deeppink: {r: 255, g: 20, b: 146, a: 255},
    deepskyblue: {r: 0, g: 191, b: 255, a: 255},
    dimgray: {r: 104, g: 104, b: 104, a: 255},
    dimgrey: {r: 104, g: 104, b: 104, a: 255},
    dodgerblue: {r: 29, g: 144, b: 255, a: 255},
    firebrick: {r: 177, g: 33, b: 33, a: 255},
    floralwhite: {r: 255, g: 249, b: 239, a: 255},
    forestgreen: {r: 33, g: 138, b: 33, a: 255},
    fuchsia: {r: 255, g: 0, b: 255, a: 255},
    gainsboro: {r: 220, g: 220, b: 220, a: 255},
    ghostwhite: {r: 247, g: 247, b: 255, a: 255},
    gold: {r: 255, g: 215, b: 0, a: 255},
    goldenrod: {r: 218, g: 165, b: 31, a: 255},
    gray: {r: 127, g: 127, b: 127, a: 255},
    green: {r: 0, g: 127, b: 0, a: 255},
    greenyellow: {r: 173, g: 255, b: 47, a: 255},
    grey: {r: 127, g: 127, b: 127, a: 255},
    honeydew: {r: 239, g: 255, b: 239, a: 255},
    hotpink: {r: 255, g: 104, b: 179, a: 255},
    indianred: {r: 205, g: 91, b: 91, a: 255},
    indigo: {r: 74, g: 0, b: 130, a: 255},
    ivory: {r: 255, g: 255, b: 239, a: 255},
    khaki: {r: 239, g: 229, b: 140, a: 255},
    lavender: {r: 229, g: 229, b: 249, a: 255},
    lavenderblush: {r: 255, g: 239, b: 244, a: 255},
    lawngreen: {r: 124, g: 252, b: 0, a: 255},
    lemonchiffon: {r: 255, g: 249, b: 205, a: 255},
    lightblue: {r: 173, g: 216, b: 229, a: 255},
    lightcoral: {r: 239, g: 127, b: 127, a: 255},
    lightcyan: {r: 224, g: 255, b: 255, a: 255},
    lightgoldenrod: {r: 237, g: 221, b: 130, a: 255},
    lightgoldenrodyellow: {r: 249, g: 249, b: 210, a: 255},
    lightgray: {r: 211, g: 211, b: 211, a: 255},
    lightgreen: {r: 144, g: 237, b: 144, a: 255},
    lightgrey: {r: 211, g: 211, b: 211, a: 255},
    lightpink: {r: 255, g: 181, b: 192, a: 255},
    lightsalmon: {r: 255, g: 160, b: 122, a: 255},
    lightseagreen: {r: 31, g: 177, b: 170, a: 255},
    lightskyblue: {r: 135, g: 206, b: 249, a: 255},
    lightslateblue: {r: 132, g: 112, b: 255, a: 255},
    lightslategray: {r: 119, g: 135, b: 153, a: 255},
    lightslategrey: {r: 119, g: 135, b: 153, a: 255},
    lightsteelblue: {r: 175, g: 196, b: 221, a: 255},
    lightyellow: {r: 255, g: 255, b: 224, a: 255},
    lime: {r: 0, g: 255, b: 0, a: 255},
    limegreen: {r: 49, g: 205, b: 49, a: 255},
    linen: {r: 249, g: 239, b: 229, a: 255},
    magenta: {r: 255, g: 0, b: 255, a: 255},
    maroon: {r: 127, g: 0, b: 0, a: 255},
    mediumaquamarine: {r: 102, g: 205, b: 170, a: 255},
    mediumblue: {r: 0, g: 0, b: 205, a: 255},
    mediumorchid: {r: 186, g: 84, b: 211, a: 255},
    mediumpurple: {r: 146, g: 112, b: 219, a: 255},
    mediumseagreen: {r: 59, g: 178, b: 113, a: 255},
    mediumslateblue: {r: 123, g: 104, b: 237, a: 255},
    mediumspringgreen: {r: 0, g: 249, b: 154, a: 255},
    mediumturquoise: {r: 72, g: 209, b: 204, a: 255},
    mediumvioletred: {r: 198, g: 21, b: 132, a: 255},
    midnightblue: {r: 24, g: 24, b: 112, a: 255},
    mintcream: {r: 244, g: 255, b: 249, a: 255},
    mistyrose: {r: 255, g: 227, b: 225, a: 255},
    moccasin: {r: 255, g: 227, b: 181, a: 255},
    navajowhite: {r: 255, g: 221, b: 173, a: 255},
    navy: {r: 0, g: 0, b: 127, a: 255},
    navyblue: {r: 0, g: 0, b: 127, a: 255},
    oldlace: {r: 252, g: 244, b: 229, a: 255},
    olive: {r: 127, g: 127, b: 0, a: 255},
    olivedrab: {r: 107, g: 141, b: 34, a: 255},
    orange: {r: 255, g: 165, b: 0, a: 255},
    orangered: {r: 255, g: 68, b: 0, a: 255},
    orchid: {r: 218, g: 112, b: 214, a: 255},
    palegoldenrod: {r: 237, g: 232, b: 170, a: 255},
    palegreen: {r: 151, g: 251, b: 151, a: 255},
    paleturquoise: {r: 175, g: 237, b: 237, a: 255},
    palevioletred: {r: 219, g: 112, b: 146, a: 255},
    papayawhip: {r: 255, g: 238, b: 212, a: 255},
    peachpuff: {r: 255, g: 218, b: 184, a: 255},
    peru: {r: 205, g: 132, b: 63, a: 255},
    pink: {r: 255, g: 191, b: 202, a: 255},
    plum: {r: 221, g: 160, b: 221, a: 255},
    powderblue: {r: 175, g: 224, b: 229, a: 255},
    purple: {r: 127, g: 0, b: 127, a: 255},
    red: {r: 255, g: 0, b: 0, a: 255},
    rosybrown: {r: 187, g: 142, b: 142, a: 255},
    royalblue: {r: 65, g: 104, b: 225, a: 255},
    saddlebrown: {r: 138, g: 68, b: 19, a: 255},
    salmon: {r: 249, g: 127, b: 114, a: 255},
    sandybrown: {r: 243, g: 164, b: 95, a: 255},
    seagreen: {r: 45, g: 138, b: 86, a: 255},
    seashell: {r: 255, g: 244, b: 237, a: 255},
    sienna: {r: 160, g: 81, b: 44, a: 255},
    silver: {r: 191, g: 191, b: 191, a: 255},
    skyblue: {r: 135, g: 206, b: 234, a: 255},
    slateblue: {r: 105, g: 89, b: 205, a: 255},
    slategray: {r: 112, g: 127, b: 144, a: 255},
    slategrey: {r: 112, g: 127, b: 144, a: 255},
    snow: {r: 255, g: 249, b: 249, a: 255},
    springgreen: {r: 0, g: 255, b: 126, a: 255},
    steelblue: {r: 70, g: 130, b: 179, a: 255},
    tan: {r: 210, g: 179, b: 140, a: 255},
    teal: {r: 0, g: 127, b: 127, a: 255},
    thistle: {r: 216, g: 191, b: 216, a: 255},
    tomato: {r: 255, g: 99, b: 71, a: 255},
    turquoise: {r: 63, g: 224, b: 207, a: 255},
    violet: {r: 237, g: 130, b: 237, a: 255},
    violetred: {r: 208, g: 31, b: 144, a: 255},
    wheat: {r: 244, g: 221, b: 178, a: 255},
    white: {r: 255, g: 255, b: 255, a: 255},
    whitesmoke: {r: 244, g: 244, b: 244, a: 255},
    yellow: {r: 255, g: 255, b: 0, a: 255},
    yellowgreen: {r: 154, g: 205, b: 49, a: 255}
}

x11 = {
    antiquewhite1: {r: 255, g: 238, b: 219, a: 255},
    antiquewhite2: {r: 237, g: 223, b: 204, a: 255},
    antiquewhite3: {r: 205, g: 191, b: 175, a: 255},
    antiquewhite4: {r: 138, g: 130, b: 119, a: 255},
    aquamarine1: {r: 126, g: 255, b: 211, a: 255},
    aquamarine2: {r: 118, g: 237, b: 197, a: 255},
    aquamarine3: {r: 102, g: 205, b: 170, a: 255},
    aquamarine4: {r: 68, g: 138, b: 116, a: 255},
    azure1: {r: 239, g: 255, b: 255, a: 255},
    azure2: {r: 224, g: 237, b: 237, a: 255},
    azure3: {r: 192, g: 205, b: 205, a: 255},
    azure4: {r: 130, g: 138, b: 138, a: 255},
    bisque1: {r: 255, g: 227, b: 196, a: 255},
    bisque2: {r: 237, g: 212, b: 182, a: 255},
    bisque3: {r: 205, g: 182, b: 158, a: 255},
    bisque4: {r: 138, g: 124, b: 107, a: 255},
    blue1: {r: 0, g: 0, b: 255, a: 255},
    blue2: {r: 0, g: 0, b: 237, a: 255},
    blue3: {r: 0, g: 0, b: 205, a: 255},
    blue4: {r: 0, g: 0, b: 138, a: 255},
    brown1: {r: 255, g: 63, b: 63, a: 255},
    brown2: {r: 237, g: 58, b: 58, a: 255},
    brown3: {r: 205, g: 51, b: 51, a: 255},
    brown4: {r: 138, g: 34, b: 34, a: 255},
    burlywood1: {r: 255, g: 211, b: 155, a: 255},
    burlywood2: {r: 237, g: 196, b: 145, a: 255},
    burlywood3: {r: 205, g: 170, b: 124, a: 255},
    burlywood4: {r: 138, g: 114, b: 84, a: 255},
    cadetblue1: {r: 151, g: 244, b: 255, a: 255},
    cadetblue2: {r: 141, g: 228, b: 237, a: 255},
    cadetblue3: {r: 122, g: 196, b: 205, a: 255},
    cadetblue4: {r: 82, g: 133, b: 138, a: 255},
    chartreuse1: {r: 126, g: 255, b: 0, a: 255},
    chartreuse2: {r: 118, g: 237, b: 0, a: 255},
    chartreuse3: {r: 102, g: 205, b: 0, a: 255},
    chartreuse4: {r: 68, g: 138, b: 0, a: 255},
    chocolate1: {r: 255, g: 126, b: 35, a: 255},
    chocolate2: {r: 237, g: 118, b: 33, a: 255},
    chocolate3: {r: 205, g: 102, b: 28, a: 255},
    chocolate4: {r: 138, g: 68, b: 19, a: 255},
    coral1: {r: 255, g: 114, b: 85, a: 255},
    coral2: {r: 237, g: 105, b: 79, a: 255},
    coral3: {r: 205, g: 90, b: 68, a: 255},
    coral4: {r: 138, g: 62, b: 47, a: 255},
    cornsilk1: {r: 255, g: 247, b: 220, a: 255},
    cornsilk2: {r: 237, g: 232, b: 205, a: 255},
    cornsilk3: {r: 205, g: 200, b: 176, a: 255},
    cornsilk4: {r: 138, g: 135, b: 119, a: 255},
    cyan1: {r: 0, g: 255, b: 255, a: 255},
    cyan2: {r: 0, g: 237, b: 237, a: 255},
    cyan3: {r: 0, g: 205, b: 205, a: 255},
    cyan4: {r: 0, g: 138, b: 138, a: 255},
    darkgoldenrod1: {r: 255, g: 184, b: 15, a: 255},
    darkgoldenrod2: {r: 237, g: 173, b: 14, a: 255},
    darkgoldenrod3: {r: 205, g: 149, b: 12, a: 255},
    darkgoldenrod4: {r: 138, g: 100, b: 7, a: 255},
    darkolivegreen1: {r: 201, g: 255, b: 112, a: 255},
    darkolivegreen2: {r: 187, g: 237, b: 104, a: 255},
    darkolivegreen3: {r: 161, g: 205, b: 89, a: 255},
    darkolivegreen4: {r: 109, g: 138, b: 61, a: 255},
    darkorange1: {r: 255, g: 126, b: 0, a: 255},
    darkorange2: {r: 237, g: 118, b: 0, a: 255},
    darkorange3: {r: 205, g: 102, b: 0, a: 255},
    darkorange4: {r: 138, g: 68, b: 0, a: 255},
    darkorchid1: {r: 191, g: 62, b: 255, a: 255},
    darkorchid2: {r: 177, g: 58, b: 237, a: 255},
    darkorchid3: {r: 154, g: 49, b: 205, a: 255},
    darkorchid4: {r: 104, g: 33, b: 138, a: 255},
    darkseagreen1: {r: 192, g: 255, b: 192, a: 255},
    darkseagreen2: {r: 179, g: 237, b: 179, a: 255},
    darkseagreen3: {r: 155, g: 205, b: 155, a: 255},
    darkseagreen4: {r: 104, g: 138, b: 104, a: 255},
    darkslategray1: {r: 150, g: 255, b: 255, a: 255},
    darkslategray2: {r: 140, g: 237, b: 237, a: 255},
    darkslategray3: {r: 121, g: 205, b: 205, a: 255},
    darkslategray4: {r: 81, g: 138, b: 138, a: 255},
    deeppink1: {r: 255, g: 20, b: 146, a: 255},
    deeppink2: {r: 237, g: 17, b: 136, a: 255},
    deeppink3: {r: 205, g: 16, b: 118, a: 255},
    deeppink4: {r: 138, g: 10, b: 79, a: 255},
    deepskyblue1: {r: 0, g: 191, b: 255, a: 255},
    deepskyblue2: {r: 0, g: 177, b: 237, a: 255},
    deepskyblue3: {r: 0, g: 154, b: 205, a: 255},
    deepskyblue4: {r: 0, g: 104, b: 138, a: 255},
    dodgerblue1: {r: 29, g: 144, b: 255, a: 255},
    dodgerblue2: {r: 28, g: 133, b: 237, a: 255},
    dodgerblue3: {r: 23, g: 116, b: 205, a: 255},
    dodgerblue4: {r: 16, g: 77, b: 138, a: 255},
    firebrick1: {r: 255, g: 48, b: 48, a: 255},
    firebrick2: {r: 237, g: 43, b: 43, a: 255},
    firebrick3: {r: 205, g: 38, b: 38, a: 255},
    firebrick4: {r: 138, g: 25, b: 25, a: 255},
    gold1: {r: 255, g: 215, b: 0, a: 255},
    gold2: {r: 237, g: 201, b: 0, a: 255},
    gold3: {r: 205, g: 173, b: 0, a: 255},
    gold4: {r: 138, g: 117, b: 0, a: 255},
    goldenrod1: {r: 255, g: 192, b: 36, a: 255},
    goldenrod2: {r: 237, g: 179, b: 33, a: 255},
    goldenrod3: {r: 205, g: 155, b: 28, a: 255},
    goldenrod4: {r: 138, g: 104, b: 20, a: 255},
    green1: {r: 0, g: 255, b: 0, a: 255},
    green2: {r: 0, g: 237, b: 0, a: 255},
    green3: {r: 0, g: 205, b: 0, a: 255},
    green4: {r: 0, g: 138, b: 0, a: 255},
    honeydew1: {r: 239, g: 255, b: 239, a: 255},
    honeydew2: {r: 224, g: 237, b: 224, a: 255},
    honeydew3: {r: 192, g: 205, b: 192, a: 255},
    honeydew4: {r: 130, g: 138, b: 130, a: 255},
    hotpink1: {r: 255, g: 109, b: 179, a: 255},
    hotpink2: {r: 237, g: 105, b: 167, a: 255},
    hotpink3: {r: 205, g: 95, b: 144, a: 255},
    hotpink4: {r: 138, g: 58, b: 98, a: 255},
    indianred1: {r: 255, g: 105, b: 105, a: 255},
    indianred2: {r: 237, g: 99, b: 99, a: 255},
    indianred3: {r: 205, g: 84, b: 84, a: 255},
    indianred4: {r: 138, g: 58, b: 58, a: 255},
    ivory1: {r: 255, g: 255, b: 239, a: 255},
    ivory2: {r: 237, g: 237, b: 224, a: 255},
    ivory3: {r: 205, g: 205, b: 192, a: 255},
    ivory4: {r: 138, g: 138, b: 130, a: 255},
    khaki1: {r: 255, g: 246, b: 142, a: 255},
    khaki2: {r: 237, g: 229, b: 132, a: 255},
    khaki3: {r: 205, g: 197, b: 114, a: 255},
    khaki4: {r: 138, g: 133, b: 77, a: 255},
    lavenderblush1: {r: 255, g: 239, b: 244, a: 255},
    lavenderblush2: {r: 237, g: 224, b: 228, a: 255},
    lavenderblush3: {r: 205, g: 192, b: 196, a: 255},
    lavenderblush4: {r: 138, g: 130, b: 133, a: 255},
    lemonchiffon1: {r: 255, g: 249, b: 205, a: 255},
    lemonchiffon2: {r: 237, g: 232, b: 191, a: 255},
    lemonchiffon3: {r: 205, g: 201, b: 165, a: 255},
    lemonchiffon4: {r: 138, g: 136, b: 112, a: 255},
    lightblue1: {r: 191, g: 238, b: 255, a: 255},
    lightblue2: {r: 177, g: 223, b: 237, a: 255},
    lightblue3: {r: 154, g: 191, b: 205, a: 255},
    lightblue4: {r: 104, g: 130, b: 138, a: 255},
    lightcyan1: {r: 224, g: 255, b: 255, a: 255},
    lightcyan2: {r: 209, g: 237, b: 237, a: 255},
    lightcyan3: {r: 179, g: 205, b: 205, a: 255},
    lightcyan4: {r: 122, g: 138, b: 138, a: 255},
    lightgoldenrod1: {r: 255, g: 235, b: 138, a: 255},
    lightgoldenrod2: {r: 237, g: 220, b: 130, a: 255},
    lightgoldenrod3: {r: 205, g: 189, b: 112, a: 255},
    lightgoldenrod4: {r: 138, g: 128, b: 75, a: 255},
    lightpink1: {r: 255, g: 174, b: 184, a: 255},
    lightpink2: {r: 237, g: 161, b: 173, a: 255},
    lightpink3: {r: 205, g: 140, b: 149, a: 255},
    lightpink4: {r: 138, g: 94, b: 100, a: 255},
    lightsalmon1: {r: 255, g: 160, b: 122, a: 255},
    lightsalmon2: {r: 237, g: 149, b: 114, a: 255},
    lightsalmon3: {r: 205, g: 128, b: 98, a: 255},
    lightsalmon4: {r: 138, g: 86, b: 66, a: 255},
    lightskyblue1: {r: 175, g: 226, b: 255, a: 255},
    lightskyblue2: {r: 164, g: 211, b: 237, a: 255},
    lightskyblue3: {r: 140, g: 181, b: 205, a: 255},
    lightskyblue4: {r: 95, g: 123, b: 138, a: 255},
    lightsteelblue1: {r: 201, g: 225, b: 255, a: 255},
    lightsteelblue2: {r: 187, g: 210, b: 237, a: 255},
    lightsteelblue3: {r: 161, g: 181, b: 205, a: 255},
    lightsteelblue4: {r: 109, g: 123, b: 138, a: 255},
    lightyellow1: {r: 255, g: 255, b: 224, a: 255},
    lightyellow2: {r: 237, g: 237, b: 209, a: 255},
    lightyellow3: {r: 205, g: 205, b: 179, a: 255},
    lightyellow4: {r: 138, g: 138, b: 122, a: 255},
    magenta1: {r: 255, g: 0, b: 255, a: 255},
    magenta2: {r: 237, g: 0, b: 237, a: 255},
    magenta3: {r: 205, g: 0, b: 205, a: 255},
    magenta4: {r: 138, g: 0, b: 138, a: 255},
    maroon1: {r: 255, g: 52, b: 178, a: 255},
    maroon2: {r: 237, g: 48, b: 167, a: 255},
    maroon3: {r: 205, g: 40, b: 144, a: 255},
    maroon4: {r: 138, g: 28, b: 98, a: 255},
    mediumorchid1: {r: 224, g: 102, b: 255, a: 255},
    mediumorchid2: {r: 209, g: 94, b: 237, a: 255},
    mediumorchid3: {r: 179, g: 81, b: 205, a: 255},
    mediumorchid4: {r: 122, g: 54, b: 138, a: 255},
    mediumpurple1: {r: 170, g: 130, b: 255, a: 255},
    mediumpurple2: {r: 159, g: 121, b: 237, a: 255},
    mediumpurple3: {r: 136, g: 104, b: 205, a: 255},
    mediumpurple4: {r: 93, g: 71, b: 138, a: 255},
    mistyrose1: {r: 255, g: 227, b: 225, a: 255},
    mistyrose2: {r: 237, g: 212, b: 210, a: 255},
    mistyrose3: {r: 205, g: 182, b: 181, a: 255},
    mistyrose4: {r: 138, g: 124, b: 123, a: 255},
    navajowhite1: {r: 255, g: 221, b: 173, a: 255},
    navajowhite2: {r: 237, g: 206, b: 160, a: 255},
    navajowhite3: {r: 205, g: 178, b: 138, a: 255},
    navajowhite4: {r: 138, g: 121, b: 94, a: 255},
    olivedrab1: {r: 191, g: 255, b: 62, a: 255},
    olivedrab2: {r: 178, g: 237, b: 58, a: 255},
    olivedrab3: {r: 154, g: 205, b: 49, a: 255},
    olivedrab4: {r: 104, g: 138, b: 33, a: 255},
    orange1: {r: 255, g: 165, b: 0, a: 255},
    orange2: {r: 237, g: 154, b: 0, a: 255},
    orange3: {r: 205, g: 132, b: 0, a: 255},
    orange4: {r: 138, g: 89, b: 0, a: 255},
    orangered1: {r: 255, g: 68, b: 0, a: 255},
    orangered2: {r: 237, g: 63, b: 0, a: 255},
    orangered3: {r: 205, g: 54, b: 0, a: 255},
    orangered4: {r: 138, g: 36, b: 0, a: 255},
    orchid1: {r: 255, g: 130, b: 249, a: 255},
    orchid2: {r: 237, g: 122, b: 232, a: 255},
    orchid3: {r: 205, g: 104, b: 201, a: 255},
    orchid4: {r: 138, g: 71, b: 136, a: 255},
    palegreen1: {r: 154, g: 255, b: 154, a: 255},
    palegreen2: {r: 144, g: 237, b: 144, a: 255},
    palegreen3: {r: 124, g: 205, b: 124, a: 255},
    palegreen4: {r: 84, g: 138, b: 84, a: 255},
    paleturquoise1: {r: 186, g: 255, b: 255, a: 255},
    paleturquoise2: {r: 174, g: 237, b: 237, a: 255},
    paleturquoise3: {r: 150, g: 205, b: 205, a: 255},
    paleturquoise4: {r: 102, g: 138, b: 138, a: 255},
    palevioletred1: {r: 255, g: 130, b: 170, a: 255},
    palevioletred2: {r: 237, g: 121, b: 159, a: 255},
    palevioletred3: {r: 205, g: 104, b: 136, a: 255},
    palevioletred4: {r: 138, g: 71, b: 93, a: 255},
    peachpuff1: {r: 255, g: 218, b: 184, a: 255},
    peachpuff2: {r: 237, g: 202, b: 173, a: 255},
    peachpuff3: {r: 205, g: 175, b: 149, a: 255},
    peachpuff4: {r: 138, g: 119, b: 100, a: 255},
    pink1: {r: 255, g: 181, b: 196, a: 255},
    pink2: {r: 237, g: 169, b: 183, a: 255},
    pink3: {r: 205, g: 145, b: 158, a: 255},
    pink4: {r: 138, g: 99, b: 108, a: 255},
    plum1: {r: 255, g: 186, b: 255, a: 255},
    plum2: {r: 237, g: 174, b: 237, a: 255},
    plum3: {r: 205, g: 150, b: 205, a: 255},
    plum4: {r: 138, g: 102, b: 138, a: 255},
    purple1: {r: 155, g: 48, b: 255, a: 255},
    purple2: {r: 145, g: 43, b: 237, a: 255},
    purple3: {r: 124, g: 38, b: 205, a: 255},
    purple4: {r: 84, g: 25, b: 138, a: 255},
    red1: {r: 255, g: 0, b: 0, a: 255},
    red2: {r: 237, g: 0, b: 0, a: 255},
    red3: {r: 205, g: 0, b: 0, a: 255},
    red4: {r: 138, g: 0, b: 0, a: 255},
    rosybrown1: {r: 255, g: 192, b: 192, a: 255},
    rosybrown2: {r: 237, g: 179, b: 179, a: 255},
    rosybrown3: {r: 205, g: 155, b: 155, a: 255},
    rosybrown4: {r: 138, g: 104, b: 104, a: 255},
    royalblue1: {r: 72, g: 118, b: 255, a: 255},
    royalblue2: {r: 67, g: 109, b: 237, a: 255},
    royalblue3: {r: 58, g: 94, b: 205, a: 255},
    royalblue4: {r: 38, g: 63, b: 138, a: 255},
    salmon1: {r: 255, g: 140, b: 104, a: 255},
    salmon2: {r: 237, g: 130, b: 98, a: 255},
    salmon3: {r: 205, g: 112, b: 84, a: 255},
    salmon4: {r: 138, g: 75, b: 57, a: 255},
    seagreen1: {r: 84, g: 255, b: 159, a: 255},
    seagreen2: {r: 77, g: 237, b: 147, a: 255},
    seagreen3: {r: 67, g: 205, b: 127, a: 255},
    seagreen4: {r: 45, g: 138, b: 86, a: 255},
    seashell1: {r: 255, g: 244, b: 237, a: 255},
    seashell2: {r: 237, g: 228, b: 221, a: 255},
    seashell3: {r: 205, g: 196, b: 191, a: 255},
    seashell4: {r: 138, g: 133, b: 130, a: 255},
    sienna1: {r: 255, g: 130, b: 71, a: 255},
    sienna2: {r: 237, g: 121, b: 66, a: 255},
    sienna3: {r: 205, g: 104, b: 57, a: 255},
    sienna4: {r: 138, g: 71, b: 38, a: 255},
    skyblue1: {r: 135, g: 206, b: 255, a: 255},
    skyblue2: {r: 125, g: 191, b: 237, a: 255},
    skyblue3: {r: 108, g: 165, b: 205, a: 255},
    skyblue4: {r: 73, g: 112, b: 138, a: 255},
    slateblue1: {r: 130, g: 110, b: 255, a: 255},
    slateblue2: {r: 122, g: 103, b: 237, a: 255},
    slateblue3: {r: 104, g: 89, b: 205, a: 255},
    slateblue4: {r: 71, g: 59, b: 138, a: 255},
    slategray1: {r: 197, g: 226, b: 255, a: 255},
    slategray2: {r: 184, g: 211, b: 237, a: 255},
    slategray3: {r: 159, g: 181, b: 205, a: 255},
    slategray4: {r: 108, g: 123, b: 138, a: 255},
    snow1: {r: 255, g: 249, b: 249, a: 255},
    snow2: {r: 237, g: 232, b: 232, a: 255},
    snow3: {r: 205, g: 201, b: 201, a: 255},
    snow4: {r: 138, g: 136, b: 136, a: 255},
    springgreen1: {r: 0, g: 255, b: 126, a: 255},
    springgreen2: {r: 0, g: 237, b: 118, a: 255},
    springgreen3: {r: 0, g: 205, b: 102, a: 255},
    springgreen4: {r: 0, g: 138, b: 68, a: 255},
    steelblue1: {r: 99, g: 183, b: 255, a: 255},
    steelblue2: {r: 91, g: 172, b: 237, a: 255},
    steelblue3: {r: 79, g: 147, b: 205, a: 255},
    steelblue4: {r: 53, g: 99, b: 138, a: 255},
    tan1: {r: 255, g: 165, b: 79, a: 255},
    tan2: {r: 237, g: 154, b: 73, a: 255},
    tan3: {r: 205, g: 132, b: 63, a: 255},
    tan4: {r: 138, g: 89, b: 43, a: 255},
    thistle1: {r: 255, g: 225, b: 255, a: 255},
    thistle2: {r: 237, g: 210, b: 237, a: 255},
    thistle3: {r: 205, g: 181, b: 205, a: 255},
    thistle4: {r: 138, g: 123, b: 138, a: 255},
    tomato1: {r: 255, g: 99, b: 71, a: 255},
    tomato2: {r: 237, g: 91, b: 66, a: 255},
    tomato3: {r: 205, g: 79, b: 57, a: 255},
    tomato4: {r: 138, g: 53, b: 38, a: 255},
    turquoise1: {r: 0, g: 244, b: 255, a: 255},
    turquoise2: {r: 0, g: 228, b: 237, a: 255},
    turquoise3: {r: 0, g: 196, b: 205, a: 255},
    turquoise4: {r: 0, g: 133, b: 138, a: 255},
    violetred1: {r: 255, g: 62, b: 150, a: 255},
    violetred2: {r: 237, g: 58, b: 140, a: 255},
    violetred3: {r: 205, g: 49, b: 119, a: 255},
    violetred4: {r: 138, g: 33, b: 81, a: 255},
    wheat1: {r: 255, g: 230, b: 186, a: 255},
    wheat2: {r: 237, g: 216, b: 174, a: 255},
    wheat3: {r: 205, g: 186, b: 150, a: 255},
    wheat4: {r: 138, g: 125, b: 102, a: 255},
    yellow1: {r: 255, g: 255, b: 0, a: 255},
    yellow2: {r: 237, g: 237, b: 0, a: 255},
    yellow3: {r: 205, g: 205, b: 0, a: 255},
    yellow4: {r: 138, g: 138, b: 0, a: 255},
    gray0: {r: 189, g: 189, b: 189, a: 255},
    green0: {r: 0, g: 255, b: 0, a: 255},
    grey0: {r: 189, g: 189, b: 189, a: 255},
    maroon0: {r: 175, g: 48, b: 95, a: 255},
    purple0: {r: 160, g: 31, b: 239, a: 255}
}
