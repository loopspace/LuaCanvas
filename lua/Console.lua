local out = output

function clearOutput()
   output:text('')
end

	initThread: function() {
	    threadResume = this;
	    threadResume();
	}
