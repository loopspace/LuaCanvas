
--## Main

function setup()
  turtle = Turtle()
  -- Turtle instructions go here
  
  protractor = Protractor()
  ruler = Ruler()
end

function draw()
  background(40,40,50)
  turtle:draw()
  protractor:draw()
  ruler:draw()
end

function touched(t)
  if protractor:touched(t) then
    return
  elseif ruler:touched(t) then
    return
  end
end



--## Turtle

Turtle = class()

function Turtle:init()
  self.pos = vec2(0,0)
  self.dir = vec2(0,1)
  self.width = 2
  self.colour = colour("orange")
  self.canvas = image(WIDTH,HEIGHT)
  self.actions = {}
  self.drawing = true
  self.speed = 1/10
  self.aspeed = 1/10
  self.tSize = 10
end

function Turtle:draw()
  local ts = self.tSize
  pushStyle()
  pushTransformation()
  resetTransformation()
  sprite(self.canvas,0,0)
  translate(WIDTH/2,HEIGHT/2)
  if self.action then
    if self.action.draw() then
      setContext(self.canvas)
      self.action.finish()
      setContext()
      self.action = table.remove(self.actions,1)
      if self.action then
        self.action.init()
      end
    end
  else
    self.action = table.remove(self.actions,1)
    if self.action then
      self.action.init()
    end
  end
  local p,d,b = self.pos,ts*self.dir,ts*self.dir:rotate90()
  translate(p+d)
  strokeWidth(self.width)
  stroke(self.colour)
  line(0,0,-d)
  strokeWidth(2)
  line(d,b/2)
  line(b/2,- b/2)
  line(- b/2,d)
  popTransformation()
  popStyle()
end

function Turtle:penUp()
  table.insert(self.actions,{
      init = function() self.drawing = false end,
      draw = function() return true end,
      finish = function() end
    })
end

function Turtle:penDown()
  table.insert(self.actions,{
      init = function() self.drawing = true end,
      draw = function() return true end,
      finish = function() end
    })
end

function Turtle:setPenWidth(w)
  table.insert(self.actions,{
      init = function() self.width = w end,
      draw = function() return true end,
      finish = function() end
    })
end

function Turtle:setPenColour(...)
  local t = {...}
  local c = colour(table.unpack(t))
  table.insert(self.actions,{
      init = function() self.colour = c end,
      draw = function() return true end,
      finish = function() end
    })
end

function Turtle:penErase()
end

function Turtle:penNormal()
end

function Turtle:setFillColour(c)
end

function Turtle:fill()
end

function Turtle:forward(d)
  local sp
  local st
  table.insert(self.actions,{
      init = function() sp = self.pos st = ElapsedTime end,
      draw = function()
        local t = step((ElapsedTime - st)*self.speed/math.abs(d))
        local ep = sp + t*d*self.dir
        if self.drawing then
          stroke(self.colour)
          strokeWidth(self.width)
          line(sp.x,sp.y,ep.x,ep.y)
        end
        self.pos = ep
        if t >= 1 then
          return true
        end
      end,
      finish = function()
        self.pos = sp + d*self.dir
        if self.drawing then
          stroke(self.colour)
          strokeWidth(self.width)
          line(sp,self.pos)
        end
      end
    })
end

function Turtle:backward(d)
  self:forward(-d)
end

function Turtle:left(a)
  local sd
  local st
  table.insert(self.actions,{
      init = function() sd = self.dir st = ElapsedTime end,
      draw = function()
        local t = step((ElapsedTime - st)*self.speed/math.abs(a))
        self.dir = sd:rotate(t*a)
        if t >= 1 then
          return true
        end
      end,
      finish = function() self.dir = sd:rotate(a) end
    })
end

function Turtle:right(a)
  self:left(-a)
end

function Turtle:fill()
end

function Turtle:toAngle(a)
  local sd,st,sa
  table.insert(self.actions,{
      init = function() 
        sd = self.dir 
        st = ElapsedTime
        a = a - vec2(1,0):angleBetween(self.dir)
        a = (a + 180)%360 - 180
      end,
      draw = function()
        local t = step((ElapsedTime - st)*self.speed/math.abs(a))
        self.dir = sd:rotate(t*a)
        if t >= 1 then
          return true
        end
      end,
      finish = function() self.dir = sd:rotate(a) end
    })
end

function Turtle:toRelativeAngle(a)
  local sd,st,sa
  table.insert(self.actions,{
      init = function()
        sd = self.dir
        st = ElapsedTime
        a = a - self.pos:angleBetween(self.dir)
        a = (a + 180)%360 - 180
      end,
      draw = function()
        local t = step((ElapsedTime - st)*self.speed/math.abs(a))
        self.dir = sd:rotate(t*a)
        if t >= 1 then
          return true
        end
      end,
      finish = function() self.dir = sd:rotate(a) end
    })
end

function Turtle:toPosition(...)
  local p = vec2(...)
  local st,sp,d
  table.insert(self.actions,{
      init = function() sp = self.pos st = ElapsedTime  d = (p - sp):len() end,
      draw = function()
        local t = step((ElapsedTime - st)*self.speed/math.abs(d))
        local ep = (1 - t)*sp + t*p
        if self.drawing then
          stroke(self.colour)
          strokeWidth(self.width)
          line(sp.x,sp.y,ep.x,ep.y)
        end
        self.pos = ep
        if t >= 1 then
          return true
        end
      end,
      finish = function()
        self.pos = p
        if self.drawing then
          stroke(self.colour)
          strokeWidth(self.width)
          line(sp,self.pos)
        end
      end
    })
end

function Turtle:toRelativePosition(...)
  local p = vec2(...)
  local st,sp,d
  table.insert(self.actions,{
      init = function() sp = self.pos st = ElapsedTime  d = p:len() end,
      draw = function()
        local t = step((ElapsedTime - st)*self.speed/math.abs(d))
        local ep = sp + t*p
        if self.drawing then
          stroke(self.colour)
          strokeWidth(self.width)
          line(sp.x,sp.y,ep.x,ep.y)
        end
        self.pos = ep
        if t >= 1 then
          return true
        end
      end,
      finish = function()
        self.pos = sp + t*p
        if self.drawing then
          stroke(self.colour)
          strokeWidth(self.width)
          line(sp,self.pos)
        end
      end
    })
end

function step(t,a,b)
  a = a or 0
  b = b or 1
  return math.min(b,math.max(a,t))
end



--## Protractor

Protractor = class()

function Protractor:init(r)
  r = r or 100
  local b = 5
  local w = 2*r + 2*b
  local h = r + 2*b
  self.img = image(w,h)
  setContext(self.img)
  stroke("white")
  line(b,b,2*r+b,b)
  arc(r+b,b,r,0,180)
  local v = vec2(1,0)
  local p = vec2(b+r,b)
  for k=1,35 do
    line(p+(r-15 + k%2*5)*v:rotate(5*k),p+r*v:rotate(5*k))
  end
  line(p,p+vec2(0,5))
  setContext()
  self.pos = vec2(r,0)
  self.ang = 0
  self.radius = r
  self.border = b
end

function Protractor:draw()
  pushTransformation()
  resetTransformation()
  translate(self.pos)
  rotate(self.ang)
  sprite(self.img,-self.radius - self.border,-self.border)
	popTransformation()
end

function Protractor:touched(t)
  local p = vec2(t.x,t.y)
  if t.state == BEGAN then
    local q = (p - self.pos):rotate(-self.ang)
    if q.y > 0 then
      if q:len() < 50 then
        self.tp = p - self.pos
        self.state = 1
      elseif q:len() <100 then
        self.tp = vec2(1,0):angleBetween(p - self.pos) - self.ang
        self.state = 2
      else
        return false
      end
    else
      return false
    end
  elseif t.state == MOVING then
    if self.state == 1 then
      self.pos = p - self.tp
    elseif self.state == 2 then
      self.ang = vec2(1,0):angleBetween(p - self.pos) - self.tp
    else
      return false
    end
  elseif t.state == ENDED then
    if self.state then
      self.state = nil
    else
      return false
    end
  end
  return true
end


--## Ruler

Ruler = class()

function Ruler:init(l,w)
  l = l or 200
  w = w or 20
  local b = 5
  self.img = image(l + 2*b,w + 2*b)
  setContext(self.img)
  stroke("white")
  line(b,b+w,l+b,b+w)
  line(b,b+w,b,b)
  line(l+b,b+w,l+b,b)
  for k=5,l-5,5 do
    line(b+k,b+w-15+k%2*5,b+k,b+w)
  end
  setContext()
  self.pos = vec2(WIDTH-l-b,b+w)
  self.ang = 0
  self.width = w
  self.length = l
  self.border = b
end

function Ruler:draw()
  pushTransformation()
  resetTransformation()
  translate(self.pos)
  rotate(self.ang)
  sprite(self.img,-self.border, - self.width-self.border)
	popTransformation()
end

function Ruler:touched(t)
  local p = vec2(t.x,t.y)
  if t.state == BEGAN then
    local w,l = self.width,self.length
    local q = (p - self.pos):rotate(-self.ang)
    if q.y < 0 and q.y > -w then
      if math.abs(q.x - l/2) < l/4 then
        self.state = 1
        self.tp = p - self.pos
      elseif math.abs(q.x - l/2) < l/2 then
        if q.x > l/2 then
          self.state = 2
          self.tp = vec2(1,0):angleBetween(p - self.pos) - self.ang
        else
          self.state = 3
          self.op = self.pos + vec2(l,0):rotate(self.ang)
          self.tp = vec2(1,0):angleBetween(p - self.op) - self.ang + 180
        end
      else
        return false
      end
    else
      return false
    end
  elseif t.state == MOVING then
    local l = self.length
    if self.state == 1 then
      self.pos = p - self.tp
    elseif self.state == 2 then
      self.ang = vec2(1,0):angleBetween(p - self.pos) - self.tp
    elseif self.state == 3 then
      self.ang = vec2(1,0):angleBetween(p - self.op) - self.tp + 180
      self.pos = self.op - vec2(l,0):rotate(self.ang)
    else
      return false
    end
  elseif t.state == ENDED then
    if self.state then
      self.state = nil
    else
      return false
    end
  end
  return true
end

