transformation = class()

function transformation:init(a,b,c,d,e,f)
   if is_a(a,transformation) then
      f = a[6]
      e = a[5]
      d = a[4]
      c = a[3]
      b = a[2]
      a = a[1]
   elseif is_a(a,vec2) then
      f = e
      e = d
      c = b
      b = a.y
      a = a.x
   elseif is_a(a,"table") then
      -- for now, just try to coerce it
      f = a[6]
      e = a[5]
      d = a[4]
      c = a[3]
      b = a[2]
      a = a[1]
   end
   if is_a(c,vec2) then
      f = e
      e = d
      d = c.y
      c = c.x
   end
   if is_a(e,vec2) then
      f = e.y
      e = e.x
   end
   self[1] = a or 1
   self[2] = b or 0
   self[3] = c or 0
   self[4] = d or 1
   self[5] = e or 0
   self[6] = f or 0
end


function transformation:applyTransformation(x,y)
   if is_a(x,vec2) then
      y = x.y
      x = x.x
   end
   local xx = self[1] * x + self[3] * y + self[5]
   local yy = self[2] * x + self[4] * y + self[6]
   return vec2(xx,yy)
end

function transformation:applyTransformationNoShift(x,y)
   if is_a(x,vec2) then
      y = x.y
      x = x.x
   end
   local xx = self[1] * x + self[3] * y
   local yy = self[2] * x + self[4] * y
   return vec2(xx,yy)
end

function transformation:composeTransformation(mr)
   local nm = {}
   nm[1] = self[1] * mr[1] + self[3] * mr[2]
   nm[2] = self[2] * mr[1] + self[4] * mr[2]
   nm[3] = self[1] * mr[3] + self[3] * mr[4]
   nm[4] = self[2] * mr[3] + self[4] * mr[4]
   nm[5] = self[1] * mr[5] + self[3] * mr[6] + self[5]
   nm[6] = self[2] * mr[5] + self[4] * mr[6] + self[6]
   return transformation(nm)
end

function transformation:translate(x,y)
   if is_a(x,vec2) then
      y = x.y
      x = x.x
   end
   local nm = transformation(self)
   nm[5] = nm[5] + nm[1]*x + nm[3] * y
   nm[6] = nm[6] + nm[2]*x + nm[4] * y
   return nm
end

function transformation:scale(x,y)
   if is_a(x,vec2) then
      y = x.y
      x = x.x
   end
   y = y or x
   local nm = transformation(self)
   nm[1] = nm[1] * x
   nm[2] = nm[2] * x
   nm[3] = nm[3] * y
   nm[4] = nm[4] * y
   return nm
end

function transformation:postscale(x,y)
   if is_a(x,vec2) then
      y = x.y
      x = x.x
   end
   y = y or x
   local nm = transformation(self)
   nm[1] = nm[1] * x
   nm[3] = nm[2] * x
   nm[5] = nm[2] * x
   nm[2] = nm[3] * y
   nm[4] = nm[4] * y
   nm[6] = nm[4] * y
   return nm
end

function transformation:xsheer(a)
   local nm = transformation(self)
   nm[3] = nm[3] + nm[1] * a
   nm[4] = nm[4] + nm[2] * a
   return nm
end
    
function transformation:ysheer(a)
   local nm = transformation(self)
   nm[1] = nm[1] + nm[3] * a
   nm[2] = nm[2] + nm[4] * a
   return nm
end

function transformation:rotate(a,x,y)
   if is_a(x,vec2) then
      y = x.y
      x = x.x
   end
   x = x or 0
   y = y or 0
   a = a * math.pi/180
   ca = math.cos(a)
   sa = math.sin(a)
   return self:composeTransformation({ca,sa,-sa,ca,x - ca * x + sa * y, y - sa * x - ca * y})
end

function transformation:__mul(m)
   if is_a(self, "number") then
      return m:postscale(self)
   elseif is_a(m, "number") then
      return self:scale(m)
   elseif is_a(m,vec2) then
      return self:applyTransformation(m)
   elseif is_a(m,transformation) then
      return self:composeTransformation(m)
   end
end

function transformation:__div(s)
   if is_a(s,"number") then
      local nm = transformation(self)
      nm[1] = nm[1]/s
      nm[2] = nm[1]/s
      nm[3] = nm[1]/s
      nm[4] = nm[1]/s
      nm[5] = nm[1]/s
      nm[6] = nm[1]/s
      return nm
   end
end

function transformation:__unm()
   return self:postscale(-1)
end

function transformation:__eq(m)
   if self[1] == m[1]
      and self[2] == m[2]
      and self[3] == m[3]
      and self[4] == m[4]
      and self[5] == m[5]
      and self[6] == m[6]
   then
      return true
   else
      return false
   end
end

function transformation:__tostring()
   return string.format("[%d,%d,%d]\n[%d,%d,%d]",unpack(self))
end
