
local ctx = context
local out = output

local defaultStyle = {
   fill = true,
   stroke = true,
   fillColour = colour(0,0,0,255),
   strokeColour = colour(255,255,255,255),
   strokeWidth = 1,
   rectMode = 0,
   ellipseMode = 0,
   textMode = 0,
   lineCapMode = 0,
   font = 'sans-serif',
   fontSize = 12,
   textValign = 1,
   blendMode = 'source-over'
}
local style = {{}}
local styleLevel = 1
for k,v in pairs(defaultStyle) do
   style[1][k] = v
end
local transform = {transformation()}
local transformLevel = 1

local __applyTransformation = function(x,y)
   local p = transform[transformLevel]:applyTransformation(x,y)
   p.y = HEIGHT - p.y
   return p
end

local __applyTransformationNoShift = function(x,y)
   local p = transform[transformLevel]:applyTransformationNoShift(x,y)
   p.y = - p.y
   return p
end

--[[
WIDTH = $(ctx.canvas).attr('width'));
HEIGHT = $(ctx.canvas).attr('height'));
--]]

-- Global constants
CORNER = 0
CORNERS = 1
CENTER = 2
CENTRE = 2
RADIUS = 3
LEFT = 0
RIGHT = 1
BOTTOM = 0
BASELINE = 1
TOP = 3
ROUND = 0
SQUARE = 1
PROJECT = 2

local blendmodes = {
   sourceOver = 'source-over',
   sourceIn = 'source-in',
   sourceOut = 'source-out',
   sourceAtop = 'source-atop',
   destinationOver = 'destination-over',
   destinationIn = 'destination-in',
   destinationOut = 'destination-out',
   destinationAtop = 'destination-atop',
   lighter = 'lighter',
   copy = 'copy',
   xor = 'xor',
   multiply = 'multiply',
   screen = 'screen',
   overlay = 'overlay',
   darken = 'darken',
   lighten = 'lighten',
   colourDodge = 'color-dodge',
   colourBurn = 'color-burn',
   hardLight = 'hard-light',
   softLight = 'soft-light',
   difference = 'difference',
   exclusion = 'exclusion',
   hue = 'hue',
   saturation = 'saturation',
   colour = 'color',
   luminosity = 'luminosity'
}

function applyStyle(s)
   ctx.lineWidth = s.strokeWidth
   ctx.fillStyle = s.fillColour:toCSS()
   ctx.strokeStyle = s.strokeColour:toCSS()
   ctx.font = string.format("%dpx %s",s.fontSize, s.font)
   if s.lineCapMode == 0 then
      ctx.lineCap = "round"
   elseif s.lineCapMode == 1 then
      ctx.lineCap = "butt"
   elseif s.lineCapMode == 2 then
      ctx.lineCap = "square"
   end
   ctx.globalCompositeOperation = s.blendMode
end

function clearOutput()
   out:text('')
end

function rect(x,y,w,h)
   if is_a(x,vec2) then
      h = w
      w = y
      y = x.y
      x = x.x
   end
   if is_a(w,vec2) then
      h = w.y
      w = w.x
   end
   if style[styleLevel].rectMode == 1 then
      w = w - x
      h = h - y
   elseif style[styleLevel].rectMode == 2 then
      x = x - w/2
      y = y - h/2
   elseif style[styleLevel].rectMode == 3 then
      x = x - w
      y = y - h
      w = w * 2
      h = h * 2
   end
   local p = __applyTransformation(x,y)
   local r = __applyTransformationNoShift(w,0)
   local s = __applyTransformationNoShift(0,h)
   if style[styleLevel].fill then
      ctx:beginPath()
      ctx:save()
      ctx:setTransform(r.x,r.y,s.x,s.y,p.x,p.y)
      ctx:rect(0,0,1,1)
      ctx:restore()
      ctx:fill()
   end
   if style[styleLevel].stroke then
      ctx:beginPath()
      ctx:save()
      ctx:setTransform(r.x,r.y,s.x,s.y,p.x,p.y)
      ctx:rect(0,0,1,1)
      ctx:restore()
      ctx:stroke()
   end
end

function rectMode(m)
   if m then
      style[styleLevel].rectMode = m
   else
      return style[styleLevel].rectMode
   end
end

function blendMode(m)
   if m then
      style[styleLevel].blendMode = m      
      ctx.globalCompositeOperation = m
   else
      return style[styleLevel].blendMode
   end
end

function background(r,g,b,a)
   if not is_a(r,colour) then
      r = colour(r,g,b,a)
   end
   ctx:save()
   ctx.globalCompositeOperation = 'source-over'
   ctx.fillStyle = r:toCSS()
   ctx:setTransform(1,0,0,1,0,0)
   ctx:beginPath()
   ctx:fillRect(0,0,ctx.canvas.width,ctx.canvas.height)
   ctx:restore()
end

function fill(r,g,b,a)
   if r then
      if not is_a(r,colour) then
	 r = colour(r,g,b,a)
      end
      ctx.fillStyle = r:toCSS()
      style[styleLevel].fillColour = r
      style[styleLevel].fill = true
   else
      return ctx.fillStyle
   end
end

function stroke(r,g,b,a)
   if r then
      if not is_a(r,colour) then
	 r = colour(r,g,b,a)
      end
      ctx.strokeStyle = r:toCSS()
      style[styleLevel].strokeColour = r
      style[styleLevel].stroke = true
   else
      return ctx.strokeStyle
   end
end


function strokeWidth(w)
   if w then
      ctx.lineWidth = w
      style[styleLevel].strokeWidth = w
      style[styleLevel].stroke = true
   else
      return ctx.lineWidth
   end
end

function noFill()
   style[styleLevel].fill = false
end

function noStroke()
   style[styleLevel].stroke = false
end

function line(x,y,xx,yy)
   if is_a(x,vec2) then
      yy = xx
      xx = y
      y = x.y
      x = x.x
   end
   if is_a(xx,vec2) then
      yy = xx.y
      xx = xx.x
   end
   if style[styleLevel].stroke then
      local p = __applyTransformation(x,y)
      local pp = __applyTransformation(xx,yy)
      ctx:beginPath()
      ctx:moveTo(p.x,p.y)
      ctx:lineTo(pp.x,pp.y)
      ctx:stroke()
   end
end

function lineCapMode(m)
   if m then
      style[styleLevel].lineCapMode = m
      if m == 0 then
	 ctx.lineCap = "round"
      elseif m == 1 then
	 ctx.lineCap = "butt"
      elseif m == 2 then
	 ctx.lineCap = "square"
      end
   else
      return style[styleLevel].lineCapMode
   end
end

function text(s,x,y)
   if is_a(x,vec2) then
      y = x.y
      x = x.x
   end
   local p = __applyTransformation(x,y)
   local q = __applyTransformationNoShift(1,0):normalise()
   local r = __applyTransformationNoShift(0,-1):normalise()
   if style[styleLevel].textMode == 1 then
      local tm = ctx:measureText(s)
      p = p - tm.width * q
   elseif style[styleLevel].textMode == 2 then
      local tm = ctx:measureText(s)
      p = p - tm.width * q/2
   end
   local f = string.format("%dpx %s",style[styleLevel].fontSize, style[styleLevel].font)
   local fm = getTextHeight(f,s)
   if style[styleLevel].textValign == 0 then
      p = p - r * fm.descent
   elseif style[styleLevel].textValign == 2 then
      p = p + r * (fm.height/2 - fm.descent)
   elseif style[styleLevel].textValign == 3 then
      p = p + r * fm.ascent
   end
   ctx:save()
   ctx:beginPath()
   ctx:setTransform(q.x,q.y,r.x,r.y,p.x,p.y)
   ctx:fillText(s,0,0)
   ctx:restore()
end

function textMode(m)
   if m then
      style[styleLevel].textMode = m
   else
      return style[styleLevel].textMode
   end
end

function textValign(m)
   if m then
      style[styleLevel].textValign = m
   else
      return style[styleLevel].textValign
   end
end

function textSize(s)
   local tm = ctx:measureText(s)
   local f = string.format("%dpx %s",style[styleLevel].fontSize, style[styleLevel].font)
   local fm = getTextHeight(f,s)
   return tm.width,fm.height
end

function font(f)
   style[styleLevel].font = f
   ctx.font = string.format("%dpx %s",style[styleLevel].fontSize, style[styleLevel].font)
end

function fontSize(f)
   style[styleLevel].fontSize = f
   ctx.font = string.format("%dpx %s",style[styleLevel].fontSize, style[styleLevel].font)
end


function ellipse(x,y,w,h)
   if is_a(x,vec2) then
      h = w
      w = y
      y = x.y
      x = x.x
   end
   if is_a(w,vec2) then
      h = w.y
      w = w.x
   end
   h = h or w
   if style[styleLevel].ellipseMode == 1 then
      w = w - x
      h = h - y
   elseif style[styleLevel].ellipseMode == 2 then
      x = x - w/2
      y = y - h/2
   elseif style[styleLevel].ellipseMode == 2 then
      x = x - w
      y = y - h
      w = w * 2
      h = h * 2
   end
   local p = __applyTransformation(x,y)
   local r = __applyTransformationNoShift(w,0)
   local s = __applyTransformationNoShift(0,h)
   if style[styleLevel].fill then
      ctx:save()
      ctx:beginPath()
      ctx:setTransform(r.x,r.y,s.x,s.y,p.x,p.y)
      ctx:arc(0,0,1,0, 2 * math.pi,false)
      ctx:restore()
      ctx:fill()
   end
   if style[styleLevel].stroke then
      ctx:save()
      ctx:beginPath()
      ctx:setTransform(r.x,r.y,s.x,s.y,p.x,p.y)
      ctx:arc(0,0,1,0, 2 * math.pi,false)
      ctx:restore()
      ctx:stroke()
   end
end

function ellipseMode(m)
   if m then
      style[styleLevel].ellipseMode = m
   else
      return style[styleLevel].ellipseMode
   end
end

function pushStyle()
   local s = {}
   for k,v in pairs(style[styleLevel]) do
      s[k] = v
   end
   table.insert(style,s)
   styleLevel = styleLevel + 1
end

function popStyle()
   table.remove(style)
   styleLevel = styleLevel - 1
   applyStyle(style[styleLevel])
end

function resetStyle()
   for k,v in pairs(defaultStyle) do
      style[styleLevel][k] = v
   end
end

function pushTransformation()
   local t = transformation(transform[transformLevel])
   table.insert(transform,t)
   transformLevel = transformLevel + 1
end

function popTransformation()
   table.remove(transform)
   transformLevel = transformLevel - 1
end

function resetTransformation()
   transform[transformLevel] = transform()
end

function translate(x,y)
   transform[transformLevel] = transform[transformLevel]:translate(x,y)
end

function scale(x,y)
   transform[transformLevel] = transform[transformLevel]:scale(x,y)
end

function xsheer(x)
   transform[transformLevel] = transform[transformLevel]:xsheer(x)
end

function ysheer(y)
   transform[transformLevel] = transform[transformLevel]:ysheer(y)
end

function rotate(a,x,y)
   transform[transformLevel] = transform[transformLevel]:rotate(a,x,y)
end

function applyTransformation(m)
   transform[transformLevel] = transform[transformLevel]:applyTransformation(m)
end

function modelTransformation(m)
   if m then
      transform[transformLevel] = transformation(m)
   else
      return transform[transformLevel]
   end
end

function clearState()
   style = {{}}
   styleLevel = 1
   for k,v in pairs(defaultStyle) do
      style[1][k] = v
   end
   transform = {transformation()}
   transformLevel = 1
end

function clearTransformation()
   transform = {transformation()}
   transformLevel = 1
end

function log(s)
   console.log(s)
end
