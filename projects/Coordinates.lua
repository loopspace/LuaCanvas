
--## Main

function setup()
  c=coordinate
end

function draw()
  background(40,40,50)
  drawGrid(20,5)
  strokeWidth(2)
  pv = c(1,2)
  for k,v in ipairs({
      c(3,4),
      c(5,8),
      c(7,1)
    }) do
    line(pv,v)
    pv = v
    end
end

function drawGrid(n,s)
   pushStyle()
  translate(WIDTH/2,HEIGHT/2)
  scale((HEIGHT-20)/(2*n))
  stroke(100)
  strokeWidth(1)
  for k=1,n do
    line(k,-n,k,n)
    line(-k,-n,-k,n)
    line(-n,k,n,k)
    line(-n,-k,n,-k)
    end
  stroke(255)
  line(0,-n,0,n)
  line(-n,0,n,0)
  fill(255)
  textMode(CENTRE)
  textValign(TOP)
  for k=s,n,s do
    line(k,0,k,-.5)
    text(k,k,-.5)
    line(-k,0,-k,-.5)
    text(-k,-k,-.5)
  end
  textMode(RIGHT)
  textValign(CENTRE)
  for k=s,n,s do
    line(0,k,-.5,k)
    text(k,-1,k)
    line(0,-k,-.5,-k)
    text(-k,-1,-k)
  end
  popStyle()
  end