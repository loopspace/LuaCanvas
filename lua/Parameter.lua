local __parameter = parameter
parameter = {}

function parameter.text(n,i,f)
    local fn
    if type(f) == "function" then
       fn = function(a,b) f(b) end
    end
    __parameter.text(n,i,fn)
end

function parameter.watch(s)
    local ufn = __parameter.watch(s)
    local fn = function() ufn(loadstring("return " .. s )()) end
    __parameter.watchfn(fn)
end

function parameter.colour(n,r,g,b,f)
    local c
    if not r or type(r) == "function" then
        c = colour()
        f = r
    elseif not g or type(g) == "function" then
        c = colour(r)
        f = g
    else
        c = colour(r,g,b)
    end
    local fn
    if type(f) == "function" then
       fn = function(a,b) f(b) end
    end
    __parameter.colour(n,function(a,b) return colour(b) end,c:toHex(),fn)
end

parameter.color = parameter.colour

function parameter.number(n,a,b,i,f)
    local fn
    if not a or type(a) == "function" then
        f = a
        a = 0
        b = 1
        i = 0
    elseif not i or type(i) == "function" then
        f = i
        i = a
    end
    if type(f) == "function" then
       fn = function(a,b) f(b) end
    end
    __parameter.number(n,a,b,i,.001,fn)
end

function parameter.integer(n,a,b,i,f)
    local fn
    if not a or type(a) == "function" then
        f = a
        a = 0
        b = 1
        i = 0
    elseif not i or type(i) == "function" then
        f = i
        i = a
    end
    if type(f) == "function" then
       fn = function(a,b) f(b) end
    end
    __parameter.number(n,a,b,i,1,fn)
end

function parameter.action(n,f)
    __parameter.action(n,f)
end

function parameter.boolean(n,i,f)
    local fn
    if not f and type(i) == "function" then
        f = i
        i = true
    end
    if i == nil then
        i = true
    end
    if type(f) == "function" then
       fn = function(a,b) f(b) end
    end
    __parameter.bool(n,i,fn)
end

function parameter.select(n,o,i,f)
    local fn
    if not f and type(i) == "function" then
        f = i
        i = o[1]
    end
    if type(f) == "function" then
        fn = function(a,b) f(b) end
    end
    __parameter.select(n,o,i,fn)
end

