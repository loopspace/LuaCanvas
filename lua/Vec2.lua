vec2 = class()
coordinate = vec2

function vec2:init(x,y)
   if type(x) == "table" then
      if x.is_a and x:is_a(vec2) then
	 y = x.y
	 x = x.x
      elseif x.x and x.y then
	 y = x.y
	 x = x.x
      elseif x[1] and x[2] then
	 y = x[2]
	 x = x[1]
      end
   end
   self.x = x or 0
   self.y = y or 0
end

--[[
Add, subtract, multiply, and divide can all take numbers on either
side and treat the result as if a vec2 was a complex number.
--]]

function vec2:__add(v)
   if type(v) == "number" then
      return vec2(self.x + v, self.y)
   elseif type(self) == "number" then
      return vec2(v.x + self,v.y)
   else
      return vec2(self.x + v.x, self.y + v.y)
   end
end

function vec2:__sub(v)
   if type(v) == "number" then
      return vec2(self.x - v, self.y)
   elseif type(self) == "number" then
      return vec2(self - v.x,-v.y)
   else
      return vec2(self.x - v.x, self.y - v.y)
   end
end

function vec2:__mul(v)
   if type(v) == "number" then
      return vec2(self.x * v, self.y * v)
   elseif type(self) == "number" then
      return vec2(self * v.x,self * v.y)
   else
      return vec2(self.x * v.x - self.y * v.y, self.x * v.y + self.y * v.x)
   end
end   

function vec2:__div(v)
   if type(v) == "number" then
      return vec2(self.x / v, self.y / v)
   else
      local l = v:lenSqr()
      if type(self) == "number" then
	 return vec2(self * v.x/l, -self * v.y/l)
      else
	 return vec2((self.x * v.x + self.y * v.y)/l, (self.y * v.x - self.x * v.y)/l)
      end
   end
end

function vec2:__unm()
   return vec2(-self.x,-self.y)
end

function vec2:__eq(v)
   if this.x == v.x and this.y == v.y then
      return true
   else
      return false
   end
end

function vec2:len()
   return math.sqrt(self.x * self.x + self.y * self.y)
end

function vec2:lenSqr()
   return self.x * self.x + self.y * self.y
end

function vec2:normalise()
   local l = self:len()
   if l ~= 0 then
      return vec2(self.x/l,self.y/l)
   else
      return vec2(1,0)
   end
end

vec2.normalize = vec2.normalise

function vec2:dist(v)
   local x = self.x - v.x
   local y = self.y - v.y
   return math.sqrt(x*x + y*y)
end

function vec2:distSqr(v)
   local x = self.x - v.x
   local y = self.y - v.y
   return x*x + y*y
end

function vec2:rotate(a)
   local ra = a * math.pi/180
   local ca,sa = math.cos(ra),math.sin(ra)
   local x = self.x * ca - self.y * sa
   local y = self.x * sa + self.y * ca
   return vec2(x,y)
end

function vec2:rotate90()
   return vec2(-y,x)
end

function vec2:__tostring()
   return string.format("(%d,%d)",self.x,self.y)
end
