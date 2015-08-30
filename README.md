# Lua Canvas

The purpose of this project is to provide an arena for learning programming.  The aims that it seeks to fulfil are:

1. The programming language should be a simple written language.
2. The environment should make it easy to do graphical programs.
3. The whole system should work anywhere with no installation.

The third requirement essentially forces a system that works in a browser with only native capabilities.  The second means that we want to play around with something graphical, so either `canvas` or `SVG`.  This suggests `javascript` as the answer to the first requirement, except that it doesn't really qualify as "simple".  However, it does mean that whatever it is will need to be run on top of `javascript`.  Fortunately, there is a `lua` VM compiled to `javascript`.

Thus this page allows the user to enter `lua` code which is then interpreted in `javascript` and the results displayed.  The display page contains a `canvas` element and the `lua` interpreter has been extended to provide some easy access to drawing on this `canvas`.

## Usage

Usage should be fairly obvious: write `lua` code in the text box and click `Execute` to run it.  You can `Save` and `Load` projects to files on your local machine.

You can have multiple tabs to organise your code.  Click the `+` button to add a tab and edit its title to rename it (the program doesn't current disallow using the same name for two tabs but you'll lose the code if you do that).  Tabs are `chunks` in `lua` parlance.  You can reorder tabs by dragging on their handles (the funny symbol before the tab name), dragging a tab past the `+` button should remove it entirely.  Clicking on the handle selects that tab for editing.

## Running the Code

Once the code has been read, we enter a _draw loop_.  If you have defined a function called `setup`, that is now run.  After that, a function called `draw` is run on a loop.  This makes animation possible.

The draw loop can be paused or restarted using the obvious buttons at the bottom of the page.

It is also possible to detect mouse clicks on the canvas.  Any clicks are passed to a function called `touched` which is run after each `draw`, once for each click that's happened in the last cycle.

## Dependencies

This project uses the following `javascript` libraries:

1. [CodeMirror](https://codemirror.net/) for the code editor part.
2. [lua.vm.js](https://github.com/loopspace/lua.vm.js) for the lua interpreter.  Note that this is my fork of the original: I extended it a tiny bit to add more metamethods for `userdata`.
3. [jQuery](https://jquery.com/) to make life a little easier inside the code.
4. [jQuery-ui](https://jqueryui.com/) to make life a little easier outside the code.

Note: this project does not contain the dependencies.  For `jquery-ui`, you need the `sortable` interaction and `slider` widget.  For Codemirror, you need the `closebrackets.js` and `matchbrackets.js` add-ons and all the themes.  Look at the `head` section of `index.html` to see where to put the files.

## Acknowledgements

This project was *heavily* influenced by the awesome [Codea](http://twolivesleft.com/Codea/).  The only down side to Codea is that it only runs on iPads, thus failing criterion 3.  If you find this project fun but limited, and have an iPad, you should *definitely* get hold of Codea (or Codea Scratchpad).