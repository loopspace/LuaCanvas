
--## Main

function setup()
	parameter.integer("clock",3,200,12)
  parameter.integer("multiplier",2,10,2)
  parameter.integer("offset",-10,10,0)
  radius = math.min(WIDTH/2-10,HEIGHT/2-10)
end

function draw()
  background(40,40,50)
  stroke(200,30,150)
  strokeWidth(2)
  translate(WIDTH/2,HEIGHT/2)
  ellipse(0,0,radius)
  local p,q,a,r
  a = 360/clock
  r = vec2(radius,0)
	for k=1,clock do
    p = r:rotate(90 - k*a)
    q = r:rotate(90 - (k*multiplier + offset)*a)
    line(p,q)
    end
end


