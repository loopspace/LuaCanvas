
--## Main

function setup()
  g=Grid(20,5)
  c=coordinate
  coordinates = {{colour = colour(255,255,255)}}
  parameter.watch("Number of Coordinates","#coordinates[1]")
  parameter.action("Undo",function() table.remove(coordinates[1]) end)
  parameter.colour("lineColour",colour(255,255,255),function(c) coordinates[1].colour = c end)
  parameter.action("New Set of Lines",function() table.insert(coordinates,1,{colour = lineColour}) end)
  parameter.action("Show",function() for k,v in ipairs(coordinates) do print("---") for l,u in ipairs(v) do print(u) end end end)
  parameter.action("Clear", function() coordinates = {{colour = lineColour }}
 end)
end

function draw()
  background(40,40,50)
  strokeWidth(3)
  g:draw()
  for j,v in ipairs(coordinates) do
    stroke(v.colour)
    for k=2,#v do
      line(v[k-1],v[k])
    end
  end
  noStroke()
  fill(50,200,50)
  if #coordinates[1] ~= 0 then
      ellipse(coordinates[1][#coordinates[1]],.5)
  end
end

function touched(t)
  if t.state == "BEGAN" then
      x = math.floor((t.x - WIDTH/2)/g.scaleFactor+.5)
      y = math.floor((t.y - HEIGHT/2)/g.scaleFactor+.5)
      table.insert(coordinates[1],c(x,y))
  end
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
  self.scaleFactor = sf
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


