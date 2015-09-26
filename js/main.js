
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
	cm.setValue($('#Template').text().trim());
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
function runCode(lc,tabs,g) {
    $('#editor').css('display','none');
    $('#editButtons').css('display','none');
    $('#runButtons').css('display','block');
    $('#run').css('display','block');
    setExecuteSize(g);
    var code = tabs.getCode(true);
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

    var graphicTabs = [
	'Class',
	'Parameter',
	'Colour',
	'Vec2',
	'Transformation',
	'Graphics'
    ];
    var consoleTabs = [
	'Class',
	'Console'
    ];
    
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
	    touches: [],
	    watches: [],
	}
    }
    
    LuaState = this.getLuaState();

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
	var str = '';
	if (g) {
	    graphicTabs.forEach(function(v) {
		str += ' do\n--## ' + v + '\n' + $('#' + v).text() + ' end ';
	    })
	} else {
	    consoleTabs.forEach(function(v) {
		str += ' do ' + $('#' + v).text() + ' end ';
	    })
	}
	str += ' print() clearOutput() ';
	if (g) {
	    str +=
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
	    'do initCycle(function() clearTransformation() draw() end,function (...) touched(select(2,...)) end) end ' +
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
	    g.set('context',ctx);
	    Object.keys(LuaGrExt).forEach(function(v,i,a) {
		g.set(v, LuaGrExt[v]);
            })
	} else {
	    Object.keys(LuaExt).forEach(function(v,i,a) {
		g.set(v, LuaExt[v]);
            })
	}
	g.set('output',output);
    }

    /*
      First argument is passed as 'this'.
    */
    LuaExt = {
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
    }
    
    LuaGrExt = {
	initCycle: function(t) {
	    var d = this;
	    self.initCycle(d,t);
	},
	clearOutput: function() {
	    output.text('');
	},
	getTextHeight: getTextHeight,
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
	    watch: function(t) {
		var wexp = this;
		if (typeof(t) === "undefined")
		    t = wexp;
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
	    colour: function(cf,ic,f) {
		var c = this;
		LuaG.set(c,cf(ic));
		var tname = $('<span>');
		tname.text(c + ':');
		tname.addClass('parameter');
		tname.addClass('colour');
		var tfield = $('<input>');
		tfield.addClass('parameter');
		tfield.addClass('colour');
		tfield.attr('type','color');
		tfield.val(ic);
		var cfn;
		if (typeof(f) === "function") {
		    cfn = function(e) {
			LuaG.set(c,cf($(e.target).val()));
	 		f(cf($(e.target).val()));
			return false;
		    }
		} else {
		    cfn = function(e) {
			LuaG.set(c,cf($(e.target).val()));
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
