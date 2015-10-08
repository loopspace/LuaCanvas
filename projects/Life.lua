
--## Main

function setup()
  parameter.integer("size",10,100,10,restart)
  parameter.action("Restart",restart)
  parameter.action("Step",step)
  parameter.boolean("Run",false)
--  parameter.watch("DeltaTime")
  restart()
end

function draw()
  background(40,40,50)
  scale(sqwidth)
  fill(200)
  noStroke()
  for k=1,gridwidth do
    for l=1,gridheight do
      if grid[k][l] == 1 then
        rect(k-1,l-1,1,1)
      end
    end
  end
  stroke(100)
  for k=1,gridheight do
    line(0,k,gridwidth,k)
  end
  for k=1,size-1 do
    line(k,0,k,gridheight)
  end
  if Run then
    step()
  end
    
end

function restart()
  sqwidth = WIDTH/size
  gridwidth = size
  gridheight = math.floor(HEIGHT/sqwidth)
  grid = {}
  for k=1,size do
    table.insert(grid,{})
    for l=1,gridheight do
      table.insert(grid[k],0)
    end
  end
end

function step()
  local g = {}
  local nb
  for k=1,size do
    table.insert(g,{})
    for l=1,gridheight do
      nb = 0
      for m=math.max(1,k-1),math.min(size,k+1) do
        for n=math.max(1,l-1),math.min(gridheight,l+1) do
          nb = nb + grid[m][n]
        end
      end
      nb = nb - grid[k][l]
      if grid[k][l] == 1 and (nb < 2 or nb > 3) then
        g[k][l] = 0
      elseif grid[k][l] == 0 and nb == 3 then
        g[k][l] = 1
      else
        g[k][l] = grid[k][l]
      end
    end
  end
  grid = g
end

function touched(t)
  if t.state == "ENDED" then
    local sqx = math.floor(t.x/sqwidth)+1
    local sqy = math.floor(t.y/sqwidth)+1
    grid[sqx][sqy] = 1 - grid[sqx][sqy]
  end
end


