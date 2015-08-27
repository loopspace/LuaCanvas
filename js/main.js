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

/*
rectModes:
0: CORNER
1: CORNERS
2: CENTRE/CENTER
3: RADIUS
*/

var cm;
var prelua;
var postlua;
var ctx;
var luaDraw;
var LuaState;
var LuaExt;
var LuaG;
var Module;
var sTime;
var inTouch;
var tabs = {};
var composites = [
    'source-over',
    'source-in',
    'source-out',
    'source-atop',
    'destination-over',
    'destination-in',
    'destination-out',
    'destination-atop',
    'lighter',
    'copy',
    'xor',
    'multiply',
    'screen',
    'overlay',
    'darken',
    'lighten',
    'color-dodge',
    'color-burn',
    'hard-light',
    'soft-light',
    'difference',
    'exclusion',
    'hue',
    'saturation',
    'color',
    'luminosity'
];
blendmodes = {};
composites.forEach(function(v,i) {
    var s = v.replace(/-./, function(m) { return m.substr(1,1).toUpperCase() });
    blendmodes[s] = v;
});

function init() {
    $('#execute').click(runCode);
    $('#edit').click(startEditing);
    $('#pause').click(pauseCode);
    $('#restart').click(restartCode);
    $('#save').click(saveCode);
    $('#load').change(loadCode);
    $('#add').click(addTab);
    $('#theme').change(selectTheme);
    $('.handle').click(switchTab);
    $('.tabtitle').change(renameTab);
    $('#cvs').mousedown(startTouch);
    $('#cvs').mouseup(stopTouch);
    $('#cvs').mouseleave(stopTouch);
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
    cm = CodeMirror.fromTextArea(document.getElementById('code'),
				 {
				     lineNumbers: true,
				     tabSize: 2,
				     electricChars: true,
				     autoCloseBrackets: true,
				     matchBrackets: true,
				 }
				);
    cm.setValue(template());
    startEditing();
    var theme = localStorage.getItem('theme');
    if (theme != '') {
	$('#theme option').filter(function () { return $(this).html() == theme}).attr('selected', 'selected');
    };
    $('#theme').trigger('change');
    var cvs = $('#cvs')[0];
    ctx = cvs.getContext('2d');
}

$(document).ready(init);

function selectTheme() {
    var theme = $('#theme option:selected').text();
    localStorage.setItem("theme",theme);
    cm.setOption("theme",theme);
}

function executeLua(code,cl) {
    var lcode = prelua() + '\n' + code + '\n' + postlua();
    if (cl) {
	$('#output').text('');
	$('#output').css('color',null);
	clear(ctx);
    }
    var L = new Lua.State;
    initialiseLua(L._G);
    applyStyle(LuaState.defaultStyle);
    sTime = Date.now();
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
    var code = '';
    var ctab = $('.current').text().trim();
    tabs[ctab] = cm.getValue().trim() + '\n';
    $('.tabtitle').each(function(e) {
	if (tabs[$(this).last().text()])
	    code += '\ndo\n' + tabs[$(this).last().text()] + '\nend\n';
    });
    executeLua(code,true);
}

function restartCode() {
    stopLua();
    $('#pause').text('Pause');
    var code = '';
    var ctab = $('.current').text().trim();
    tabs[ctab] = cm.getValue().trim() + '\n';
    $('.tabtitle').each(function(e) {
	if (tabs[$(this).last().text()])
	    code += '\ndo\n' + tabs[$(this).last().text()] + '\nend\n';
    });
    executeLua(code,true);
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
    var h = 2*$(window).height() - $(document).height();
    $('#codediv').height(h);
    $('.CodeMirror').height(h);
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

function saveCode(e) {
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

var reader = new FileReader();

function loadCode(f) {
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

function addTab(e) {
    var tab = makeTab('New Tab');
    tab.insertBefore($(e.target).parent());
    tab.children()[0].trigger('click');
}

function makeTab(t,b = false) {
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


function startRename() {
    var $this = $(this);
    $this.data('before', $this.html());
    return $this;
}

function renameTab() {
    var $this = $(this);
    if ($this.data('before') !== $this.html()) {
	tabs[$this.html()] = tabs[$this.data('before')];
	tabs[$this.data('before')] = '';
    }
    return $this;
}



function switchTab(e) {
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

LuaState = getLuaState();

function applyStyle(s) {
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

function identityMatrix() {
    return [1,0,0,1,0,0];
}

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

function applyMatrix(m) {
    var mo = LuaState.matrix[0];
    var nm = [];
    nm[0] = mo[0] * m[0] + mo[2] * m[1];
    nm[1] = mo[1] * m[0] + mo[3] * m[1];
    nm[2] = mo[0] * m[2] + mo[2] * m[3];
    nm[3] = mo[1] * m[2] + mo[3] * m[3];
    nm[4] = mo[0] * m[4] + mo[2] * m[5] + mo[4];
    nm[5] = mo[1] * m[4] + mo[3] * m[5] + mo[5];
    LuaState.matrix[0] = nm;
}

function clear(c) {
    c.save();
    c.setTransform(1,0,0,1,0,0);
    c.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
    c.restore();
}

function startTouch(e) {
    recordTouch(e);
    inTouch = true;
    $('#cvs').mousemove(recordTouch);
}

function stopTouch(e) {
    if (inTouch)
	recordTouch(e);
    $('#cvs').off('mousemove');
    inTouch = false;
}

recordTouch = (function() {
    var prevTouch;
    return function(e) {
	var s;
	var px,py,dx,dy,x,y;
	x = Math.floor(e.pageX - $('#cvs').offset().left);
	y = $('#cvs').offset().top + parseInt($('#cvs').attr('height'),10) - e.pageY;
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

function prelua() {
    var str =
	luaClass() +
	luaParameters() +
	'do ' +
	'stroke(255,255,255) ' +
	'fill(0,0,0) ' +
	'do ';
    return str;
}

function postlua() {
	return 'end ' +
	'setup() ' +
	'do js.global:initCycle(_G,draw,function (...) touched(select(2,...)) end) end ' +
	'end';
}

initCycle = (function () {
    var time;
    var itime;
    var G;
    var draw;
    var touched;

    function doCycle() {
	var t = Date.now();
	var dt = t - time;
	G.set('ElapsedTime',t - itime);
	G.set('DeltaTime',t - time);
	time = t;
	luaDraw = new Timer(
	    function() {
		LuaState.matrix = [identityMatrix()];
		draw();
		LuaState.touches.forEach(touched);
		LuaState.touches = [];
		LuaState.watches.forEach(function(v) {v()});
		doCycle();
	    },
	    Math.max(10 - dt,0)
	);
    }
    
    return function(g,d,t) {
	G = g;
	draw = d;
	touched = t;
	time = sTime;
	itime = sTime;
	etime = 0;
	doCycle();
    }
	
})();

function template() {
    var str = 'function setup()\n' +
	'\tprint("hello world")\n' +
	'end\n\n' +
	'function draw()\n' +
	'\tbackground(40,40,50)\n' +
	'\tfill(150,200,30)\n' + 
	'\tstroke(200,30,150)\n' +
	'\tstrokeWidth(10)\n' +
	'\trect(20,20,100,100)\n' + 
	'end\n'
    return str;
}

/*
  
  Copyright 2012 Two Lives Left Pty. Ltd.
  
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
  
  http://www.apache.org/licenses/LICENSE-2.0
  
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
  
 Class.lua
 Compatible with Lua 5.1 (not 5.0).
*/

function luaClass() {
    return 'function class(base)\n' +
	'    local c = {}    -- a new class instance\n' +
	'    if type(base) == \'table\' then\n' +
	'        -- our new class is a shallow copy of the base class!\n' +
	'        for i,v in pairs(base) do\n' +
	'            c[i] = v\n' +
	'        end\n' +
	'        c._base = base\n' +
	'    end\n' +
	'\n' +
	'    -- the class will be the metatable for all its objects,\n' +
	'    -- and they will look up their methods in it.\n' +
	'    c.__index = c\n' +
	'\n' +
	'    -- expose a constructor which can be called by <classname>(<args>)\n' +
	'    local mt = {}\n' +
	'    mt.__call = function(class_tbl, ...)\n' +
	'        local obj = {}\n' +
	'        setmetatable(obj,c)\n' +
	'        if class_tbl.init then\n' +
	'            class_tbl.init(obj,...)\n' +
	'        else \n' +
	'            -- make sure that any stuff from the base class is initialized!\n' +
	'            if base and base.init then\n' +
	'                base.init(obj, ...)\n' +
	'            end\n' +
	'        end\n' +
	'        \n' +
	'        return obj\n' +
	'    end\n' +
	'\n' +
	'    c.is_a = function(self, klass)\n' +
	'        local m = getmetatable(self)\n' +
	'        while m do \n' +
	'            if m == klass then return true end\n' +
	'            m = m._base\n' +
	'        end\n' +
	'        return false\n' +
	'    end\n' +
	'\n' +
	'    setmetatable(c, mt)\n' +
	'    return c\n' +
	'end\n';
}

function luaParameters() {
    return '\n' +
	'local __parameter = parameter\n' +
	'parameter = {}\n' +
	'function parameter.text(n,i,f)\n' +
	'    local fn\n' +
	'    if type(f) == "function" then\n' +
	'       fn = function(a,b) f(b) end\n' +
	'    end\n' +
	'    __parameter.text(n,i,fn)\n' +
	'end\n\n' +
	'function parameter.watch(s)\n' +
	'    local ufn = __parameter.watch(s)\n' +
	'    local fn = function() ufn(loadstring("return " .. s )()) end\n' +
	'    __parameter.watchfn(fn)\n' +
	'end\n\n' +
	'function parameter.colour(n,r,g,b,f)\n' +
	'    local c\n' +
	'    if not r or type(r) == "function" then\n' +
	'        c = colour()\n' +
	'        f = r\n' +
	'    elseif not g or type(g) == "function" then\n' +
	'        c = colour(r)\n' +
	'        f = g\n' +
	'    else\n' +
	'        c = colour(r,g,b)\n' +
	'    end\n' +
	'    local fn\n' +
	'    if type(f) == "function" then\n' +
	'       fn = function(a,b) f(b) end\n' +
	'    end\n' +
	'    __parameter.colour(n,c,fn)\n' +
	'    end\n' +
	'parameter.color = parameter.colour\n' +
	'function parameter.number(n,a,b,i,f)\n' +
	'    local fn\n' +
	'    if not a or type(a) == "function" then\n' +
	'        f = a\n' +
	'        a = 0\n' +
	'        b = 1\n' +
	'        i = 0\n' +
	'    elseif not i or type(i) == "function" then\n' +
	'        f = i\n' +
	'        i = a\n' +
	'    end\n' +
	'    if type(f) == "function" then\n' +
	'       fn = function(a,b) f(b) end\n' +
	'    end\n' +
	'    __parameter.number(n,a,b,i,.001,fn)\n' +
	'end\n\n' +
	'function parameter.integer(n,a,b,i,f)\n' +
	'    local fn\n' +
	'    if not a or type(a) == "function" then\n' +
	'        f = a\n' +
	'        a = 0\n' +
	'        b = 1\n' +
	'        i = 0\n' +
	'    elseif not i or type(i) == "function" then\n' +
	'        f = i\n' +
	'        i = a\n' +
	'    end\n' +
	'    if type(f) == "function" then\n' +
	'       fn = function(a,b) f(b) end\n' +
	'    end\n' +
	'    __parameter.number(n,a,b,i,1,fn)\n' +
	'end\n\n' +
	'function parameter.action(n,f)\n' +
	'    __parameter.action(n,f)\n' +
	'end\n\n' +
	'function parameter.boolean(n,i,f)\n' +
	'    local fn\n' +
	'    if not f and type(i) == "function" then\n' +
	'        f = i\n' +
	'        i = true\n' +
	'    end\n' +
	'    if not i then\n' +
	'        i = true\n' +
	'    end\n' +
	'    if type(f) == "function" then\n' +
	'       fn = function(a,b) f(b) end\n' +
	'    end\n' +
	'    __parameter.bool(n,i,fn)\n' +
	'end\n\n'
}

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


function initialiseLua(g) {
    $('#parameters').empty()
    LuaG = g;
    g.set('WIDTH',$('#cvs').attr('width'));
    g.set('HEIGHT',$('#cvs').attr('height'));
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
	    var p = applyTransform(x,y);
	    var pp = applyTransform(xx,yy);
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
	var p = applyTransform(x,y);
	var q = applyTransformNoShift(1,0);
	var ql = Math.sqrt(q.x*q.x + q.y*q.y);
	var r = applyTransformNoShift(0,-1);
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
	var m = [];
	LuaState.matrix[0].forEach(function(v,k) {
	    m[k] = v;
	})
	LuaState.matrix.unshift(m);
    },
    popMatrix: function() {
	LuaState.matrix.shift();
    },
    resetMatrix: function() {
	LuaState.matrix[0] = [1,0,0,1,0,0];
    },
    translate: function(y) {
	var x = this;
	LuaState.matrix[0][4] += x;
	LuaState.matrix[0][5] += y;
    },
    scale: function(b) {
	var a = this;
	if (typeof(b) === "undefined")
	    b = a;
	LuaState.matrix[0][0] *= a;
	LuaState.matrix[0][1] *= a;
	LuaState.matrix[0][2] *= b;
	LuaState.matrix[0][3] *= b;
    },
    xsheer: function() {
	var a = this;
	LuaState.matrix[0][2] += LuaState.matrix[0][0] * a;
	LuaState.matrix[0][3] += LuaState.matrix[0][1] * a;
    },
    ysheer: function() {
	var a = this;
	LuaState.matrix[0][0] += LuaState.matrix[0][2] * a;
	LuaState.matrix[0][1] += LuaState.matrix[0][3] * a;
    },
    rotate: function(x,y) {
	var ang = this;
	if (typeof(x) === "undefined")
	    x = 0;
	if (typeof(y) === "undefined")
	    y = 0;
	ang *= Math.PI/180;
	var cs = Math.cos(ang);
	var sn = Math.sin(ang);
	applyMatrix([cs,sn,-sn,cs,x - cs * x + sn * y,y - sn * x - cs * y]);
    },
    applyMatrix: function() {
	applyMatrix(this);
    },
    modelMatrix: function() {
	if (typeof(this) !== "undefined") {
	    setMatrix(this);
	} else {
	    return LuaState.matrix[0];
	}
    },
    clearState: function() {
	LuaState = getLuaState();
    },
    colour: function(g,b,a) {
	var r = this;
	return new Colour(r,g,b,a);
    },
    color: function(g,b,a) {
	var r = this;
	return new Colour(r,g,b,a);
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
	    $('#parameters').append(tname);
	    $('#parameters').append(tfield);
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
	    $('#parameters').append(tname);
	    $('#parameters').append(slider);
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
	    $('#parameters').append(tname);
	    $('#parameters').append(tfield);
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
	    $('#parameters').append(tname);
	    $('#parameters').append(tfield);
	},
	clear: function() {
	    $('#parameters').empty();
	},
	action: function(f) {
	    var name = this;
	    var tfield = $('<input>');
	    tfield.addClass('parameter');
	    tfield.addClass('action');
	    tfield.attr('type','button');
	    tfield.val(name);
	    tfield.click(f);
	    $('#parameters').append(tfield);
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
	    $('#parameters').append(tname);
	    $('#parameters').append(dv);
	    dv.append(tfield);
	    dv.append(lbl);
	    lbl.append(spna);
	    lbl.append(spnb);
	}
    },
    output: {
	clear: function() {
	    $('#output').text('');
	}
    }
}

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
