
--## Main

--[[
Worms:

When entering a node, there are at most 5 exits.  So there are 32 possible states.  For each, we make a choice as to which exit to choose.

0 exits -> die
1 exit  -> must take this one
2 exits -> 10 configurations, 2 choices
3 exits -> 10 configurations, 3 choices
4 exits -> 5 configurations,  4 choices
5 exits -> 1 configuration,   2 choices

For 5 exits, as the first decision is a 5-exit one, the choice "straight ahead" leads to the worm simply heading in a straight line so we
disallow that choice.  Then also as the first decision is a 5-exit one, chosing, say, a left turn gives a mirror image to a rule where the
choice is a right turn (of the same angle).  So up to symmetry, we only have two options to choose between.

So there are 2^10 * 3^10 * 4^5 * 2 choices of the above.

Only the starting square can have an even number of exits, and each possibility can only occur once.  So in a given simulation, at most
one rule with 4 exits and one rule with 2 exits will be used.  This brings the number of rules down to: 2 * 3^10 * 4 * 2.

If we simplify the choice so that with 3 exits, there is a single rule of the form left, centre, or middle, we have 2 * 3 * 4 * 2 = 48 rules.

--]]

local dirs = {
  {0,vec2(1,0),3},
  {60,vec2(0,1),4},
  {120,vec2(-1,1),5},
  {180,vec2(-1,0),0},
  {240,vec2(-1,-1),1},
  {300,vec2(0,-1),2}
}

function setup()
  parameter.integer("Size","size",10,100,10,restart)
  parameter.integer("Speed","speed",1,10)
  parameter.action("Restart",restart)
  parameter.action("Step",step)
  parameter.boolean("Run","Run",false)
  parameter.colour("Grid","Grid","grey")
  parameter.colour("Worm","Worm","orange")
  parameter.colour("Eaten","Eaten","brown")
  parameter.integer("Rule","rule",0,47,10,restart)
  parameter.watch("DeltaTime")
  ly = vec2(1,0):rotate(60)
  lz = vec2(1,0):rotate(120)
  lx = vec2(1,0)
  spd = .0005
  move = true
  ht = math.sqrt(3)/2
  restart()
end

function draw()
  background(40,40,50)
  scale(sqwidth)
  strokeWidth(2)
  stroke(Grid)
	for k=0,gridheight do
    line(0,k*ht,gridwidth,k*ht)
  end
  for k=0,gridheight,2 do
    line(0,k*ht,gridwidth,k*ht+2*gridwidth*ht)
    line(gridwidth,k*ht,0,k*ht+2*gridwidth*ht)
  end
  for k=0,gridwidth do
    line(k,0,k*lx.x + ly.x*gridheight,ly.y*gridheight)
    line(k,0,k*lx.x + lz.x*gridheight,lz.y*gridheight)
  end
  local wd = wormdir:rotate(dangle*clamp((ElapsedTime - wtime)*spd*speed))
  local w = worm + clamp((ElapsedTime - wtime)*spd*speed - 1)*wd
  stroke(Eaten)
	strokeWidth(4)
  for k=2,#eaten do
    line(eaten[k-1],eaten[k])
  end
  line(worm,w)
  stroke(Worm)
	strokeWidth(5)
  line(w,w + wd/3)
  fill(Worm)
  noStroke()
  circle(w + wd/3,.1)
  if Run and (ElapsedTime - wtime)*spd*speed > 2 then
    step()
  end
    --collectgarbage()
end

function restart()
  output:clear()
  sqwidth = WIDTH/size
  gridwidth = size
  gridheight = math.floor(HEIGHT/sqwidth*2/math.sqrt(3))+1
  grid = {}
  for k=1,size do
    table.insert(grid,{})
    for l=1,gridheight do
      table.insert(grid[k],0)
    end
  end
  wormg = vec2(math.floor(gridwidth/2),math.floor(gridheight/2))
  worm = vec2(wormg.x + (wormg.y%2)/2,ht*wormg.y)
  grid = {}
  for k=1,gridwidth+1 do
    table.insert(grid,{})
    for l=1,gridheight+1 do
      grid[k][l] = 0
    end
  end
  grid[wormg.x][wormg.y] = 1
  wormdir = vec2(1,0)
  wangle = dirs[1][1]
  dangle = wangle
  wdir = dirs[1][2]
  wnext = dirs[1][3]
  eaten = {worm}
  wtime = ElapsedTime
  Died = false
  local r = rule
  choices = {}
  choices[5] = math.floor(r/24) + 1
  r = r%24
  choices[4] = math.floor(r/6) + 1
  r = r%6
  choices[3] = math.floor(r/2) + 1
  r = r%2
  choices[2] = r + 1
  choices[0] = false
  choices[1] = 1
  local opt
--  print("No exits: die")
  print("No exits: 0")
--  print("One exit: follow it")
  print("One exit: 1")
  if choices[2] == 1 then opt = "left" else opt = "right" end
--  print("Two exits: " .. opt)
  print("Two exits: " .. choices[2])
  if choices[3] == 1 then opt = "left" elseif choices[3] == 2 then opt = "middle" else opt = "right" end
--  print("Three exits: " .. opt .. " exit")
  print("Three exits: " .. choices[3])
  if choices[4] == 1 then opt = "first" elseif choices[4] == 2 then opt = "second" elseif choices[4] == 3 then opt = "third" else opt = "fourth" end
--  print("Four exits: " .. opt .. " exit")
  print("Four exits: " .. choices[4])
  if choices[5] == 1 then opt = "first" else opt = "second" end
--  print("Five exits: " .. opt)
  print("Five exits: " .. choices[5])
end

function step()
  if Died then
    return
  end
  wormdir = vec2(1,0):rotate(wangle)
	worm = worm + wormdir
  table.insert(eaten,worm)
  wormg = wormg + wdir + math.abs(wdir.y)*vec2((wormg.y%2),0)
  if not grid[wormg.x] or not grid[wormg.x][wormg.y] then
    print("Fell off the edge of the world!  Oh dear.")
    Run = false
    Died = true
    wormdir = vec2(0,0)
    return
  end

  grid[wormg.x][wormg.y] = grid[wormg.x][wormg.y] + 2^wnext
  -- current state of the grid at worm's current position
  local n = grid[wormg.x][wormg.y]
  -- counts the number of used exits
  local c = 0
  while (n > 0) do
    c = c + n%2
    n = bit32.rshift(n,1)
  end
  c = 6 - c
  -- reset n
  n = grid[wormg.x][wormg.y]
  -- rotate round to current direction
  n = bitrot(n,wnext,6)
  -- we take exit ...
  local d,e = 0,wnext
  if not choices[c] then
    print("Died!  Oh dear.")
    Run = false
    Died = true
    wormdir = vec2(0,0)
    return
  end
  while d < choices[c] do
    d = d + 1 - (n%2)
    n = math.floor(n/2)
    e = e + 1
  end
  e = (e-1)%6 + 1
  d = wangle
  wangle,wdir,wnext = unpack(dirs[e])
  dangle = wangle - d
  if dangle > 180 then
    dangle = dangle - 360
  elseif dangle < -180 then
    dangle = dangle + 360
  end
  grid[wormg.x][wormg.y] = grid[wormg.x][wormg.y] + 2^(e-1)
  wtime = ElapsedTime
end

function clamp(t)
  return math.min(1,math.max(0,t))
end

-- Rotate the m-bit binary number a by n digits 
function bitrot(a,n,m)
  return math.floor(math.floor(a/2^n) + (a%2^n)*2^(m-n))
end


