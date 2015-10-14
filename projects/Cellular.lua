
--## Main

function setup()
  size = 10
  rule = {}
  parameter.action("Restart",restart)
  parameter.action("Continuous",function() persist = not persist nextLine() end)
  parameter.action("Shift Up", function() clear = true end)
  parameter.action("Random Start", function() clear = true for k=1,size do if math.random() > .5 then grid[k] = 1 end end end)
  parameter.action("Draw", nextLine) 
  parameter.integer("Rule","Rule",0,255,101, newRule)
  parameter.integer("Size","size",10,WIDTH,10,restart)
  parameter.colour("Edge Colour","edgeColour",colour(255))
  parameter.colour("Shade Colour","shadeColour",colour(200))
  newRule(101)
  restart()
end

function draw()
  if clear then
    background(40,40,50)
    h = 1
    clear = false
    drawSq = true
  end
  stroke(edgeColour)
  if drawSq then
    for k=1,size do
      if grid[k] == 1 then
        fill(shadeColour)
      else
        noFill()
      end
      rect((k-1)*sqwidth,HEIGHT - h*sqwidth,sqwidth,sqwidth)
    end
    drawSq = false
    if persist then
      nextLine()
    end
    h = h + 1
    if h*sqwidth > 1*HEIGHT then
      clear = true
    end
  end
end

function touched(t)
  if h==2 and t.state == ENDED and t.y > HEIGHT - sqwidth then
    local sq = math.floor(t.x/sqwidth) + 1
    grid[sq] = 1 - grid[sq]
    clear = true
  end
end

function restart()
  sqwidth = WIDTH/size
  h = 1
  grid = {}
  for k=1,size do
    table.insert(grid,0)
  end
  clear = true
  persist = false
end

function nextLine()
  local g = {}
  local a,b,c
  for k=1,size do
    a = grid[k-1] or 0
    b = grid[k]
    c = grid[k+1] or 0
    g[k] = rule[a*4 + b*2 + c + 1]
  end
  grid = g
  drawSq = true
end

function newRule(n)
  rule = {}
  for k = 1,8 do
    table.insert(rule,n%2)
    n = math.floor(n/2)
  end
  local v
  output.clear()
  for k=0,7 do
    print(math.floor(k/4)%2 .. math.floor((k%4)/2)%2 .. k%2 .. " -> " .. rule[k+1])
  end
end


