
--## Main

function setup()
  g=Grid(20,5)
end

function draw()
  background(40,40,50)
  g:draw()
end

--## Grid

Grid = class()

function Grid:init(n,s)
  self.scale = s
  self.size = n
end

function Grid:draw()
  local n,s = self.size,self.scale
  local sf = math.min((WIDTH-20)/(2*n),(HEIGHT-20)/(2*n))
  local xm,ym = math.floor((WIDTH-20)/(2*sf)),math.floor((HEIGHT-20)/(2*sf))
  pushStyle()
  translate(WIDTH/2,HEIGHT/2)
  scale(sf)
  stroke(100)
  strokeWidth(1)
  for k=1,xm do
    line(k,-ym,k,ym)
    line(-k,-ym,-k,ym)
  end
  for k=1,ym do
    line(-xm,k,xm,k)
    line(-xm,-k,xm,-k)
  end
  stroke(255)
  line(0,-ym,0,ym)
  line(-xm,0,xm,0)
  fill(255)
  textMode(CENTRE)
  textValign(TOP)
  for k=s,xm,s do
    line(k,0,k,-.5)
    text(k,k,-.5)
    line(-k,0,-k,-.5)
    text(-k,-k,-.5)
  end
  textMode(RIGHT)
  textValign(CENTRE)
  for k=s,ym,s do
    line(0,k,-.5,k)
    text(k,-1,k)
    line(0,-k,-.5,-k)
    text(-k,-1,-k)
  end
  popStyle()
end

function Grid:invtransform(v,p)
  p = p or 0
  local n,s = self.size,self.scale
  local sf = math.min((WIDTH-20)/(2*n),(HEIGHT-20)/(2*n))
  local xm,ym = math.floor((WIDTH-20)/(2*sf)),math.floor((HEIGHT-20)/(2*sf))
  local x,y = v.x - WIDTH/2, v.y - HEIGHT/2
  x = math.floor(x/sf*10^p+.5)/10^p
  y = math.floor(y/sf*10^p+.5)/10^p
  return vec2(x,y)
end