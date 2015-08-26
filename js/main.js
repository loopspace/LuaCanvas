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
var sTime;
var inTouch;
var tabs = {};

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
	},
	touches: []
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

function initialiseLua(g) {
    g.set('WIDTH',$('#cvs').attr('width'));
    g.set('HEIGHT',$('#cvs').attr('height'));
    Object.keys(LuaExt).forEach(function(v,i,a) {
	g.set(v, LuaExt[v]);
    })
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
    background: function(g,b,a = 255) {
	var r = this;
	var al = a/255;
	ctx.save();
	ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
	ctx.setTransform(1,0,0,1,0,0);
	ctx.beginPath();
	ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
	ctx.restore();
    },
    fill: function (g,b,a = 255) {
	var r = this;
	if (typeof(r) !== 'undefined') {
	    var al = a/255;
	    ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
	    LuaState.style[0].fillColour = [r,g,b,a];
	    LuaState.style[0].fill = true;
	} else {
	    return ctx.fillStyle;
	}
    },
    stroke: function (g,b,a = 255) {
	var r = this;
	if (typeof(r) !== 'undefined') {
	    var al = a/255;
	    ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
	    LuaState.style[0].strokeColour = [r,g,b,a];
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
    text: function (x,y) {
	var s = this;
	var p = applyTransform(x,y);
	ctx.beginPath();
	ctx.fillText(s,p.x,p.y);
    },
    ellipse: function (y,w,h) {
	var x = this;
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
    clearState: function() {
	LuaState = getLuaState();
    }
}
