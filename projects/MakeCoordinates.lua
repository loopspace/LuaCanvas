
--## Main

function setup()
  c=coordinate
  coordinates = {}
  scaleFactor = (HEIGHT-20)/40
  parameter.watch("#coordinates")
  parameter.action("Undo",function() table.remove(coordinates) end)
  parameter.colour("lineColour",colour(255,255,255))
  parameter.action("Show",function() for k,v in ipairs(coordinates) do print(v) end end)
end

function draw()
  background(40,40,50)
  strokeWidth(3)
  drawGrid()
  stroke(lineColour)
  pv = coordinates[1]
  for k=2,#coordinates do
    line(coordinates[k-1],coordinates[k])
    end
end

function touched(t)
  if t.state == "BEGAN" then
    x = math.floor((t.x - WIDTH/2)/scaleFactor+.5)
    y = math.floor((t.y - HEIGHT/2)/scaleFactor+.5)
		table.insert(coordinates,c(x,y))
    end
  end
    
function drawGrid()
  translate(WIDTH/2,HEIGHT/2)
  scale(scaleFactor)
  stroke(100)
  for k=1,20 do
    line(k,-20,k,20)
    line(-k,-20,-k,20)
    line(-20,k,20,k)
    line(-20,-k,20,-k)
    end
  stroke(255)
  line(0,-20,0,20)
  line(-20,0,20,0)
  fill(255)
  for k=5,20,5 do
    line(k,0,k,-.5)
    text(k,k,-1.5)
    line(-k,0,-k,-.5)
    text(-k,-k,-1.5)
    line(0,k,-.5,k)
    text(k,-2,k)
    line(0,-k,-.5,-k)
    text(-k,-2,-k)
    end
  end


