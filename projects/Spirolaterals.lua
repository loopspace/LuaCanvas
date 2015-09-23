
--## Main

function setup()
	parameter.integer("multiplier",1,12,3)
  parameter.integer("clock",2,15,9)
  parameter.integer("angleStep",2,10,4)
  parameter.number("fadeFactor",0,1,0)
  parameter.action("Generate",generate)
  generate()
  background(40,40,50)
end

function draw()
  background(40,40,50,fadeFactor*255)
  stroke(200,30,150)
  strokeWidth(2)
  translate(WIDTH/2,HEIGHT/2)
  scale(scalefactor)
  translate(-centre.x,-centre.y)
	line(lines[step].x,lines[step].y,lines[step%nlines+1].x,lines[step%nlines+1].y)
  step = step%nlines + 1
end

function generate()
  background(40,40,50)
  local m,n,da = multiplier,clock,360/angleStep
  local l,nl
  nl = 1
  local pts = {(m-1)%n + 1}
  for k=2,n do
    l = (k*m - 1)%n + 1
    if l == m then
      break
      end
    table.insert(pts,l)
    nl = nl + 1
    end
  for k=1,angleStep do
    for l=1,nl do
      table.insert(pts,pts[l])
      end
    end
  nl = nl * angleStep
  local ll,ur,p,a = vec2(0,0),vec2(0,0),vec2(0,0),0
  ll.x = math.min(ll.x,p.x)
  ll.y = math.min(ll.y,p.y)
  ur.x = math.max(ur.x,p.x)
  ur.y = math.max(ur.y,p.y)
  lines = {vec2(0,0)}
	for k=1,nl do 
    p = p + vec2(pts[k]*math.cos(a/180*math.pi),pts[k]*math.sin(a/180*math.pi))
  	table.insert(lines,p)
    a = a + da
		k = k + 1
  end
  for k,v in ipairs(lines) do
  	ll.x = math.min(ll.x,v.x)
    ll.y = math.min(ll.y,v.y)
    ur.x = math.max(ur.x,v.x)
    ur.y = math.max(ur.y,v.y)
    end
  centre = ll + ur
	centre.x = centre.x/2
  centre.y = centre.y/2
  local w = ur - ll
  scalefactor = math.min((WIDTH-10)/w.x,(HEIGHT-10)/w.y)
  step = 1
  nlines = #lines
end


