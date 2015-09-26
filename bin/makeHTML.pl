#! perl -w

use strict;
use HTML::Entities;

my $lualoc = $ARGV[0];

if (!-e $lualoc || !-d $lualoc) {
    die "Can't access $lualoc\n";
}

opendir(my $dir, $lualoc) || die "Can't open directory: $!\n";

my @files;

while (my $f = readdir($dir)) {
    if ($f =~ /\.lua$/) {
	push @files,$f;
    }
}

open(my $template, '<', 'index.template') || die "Can't open template: $!\n";
open(my $index, '>', 'index.html') || die "Can't open destination: $!\n";

while (<$template>) {
    print $index $_;
    if (/<div id="luacode"/) {
	foreach my $file (@files) {
	    my $name = $file;
	    $name =~ s/\.lua$//;
	    open(my $lcode, '<', 'lua/' . $file) || die "Can't open $file: $!\n";
	    print $index '<div id="' . $name . '" class="lua_code">' . "\n";
	    while (<$lcode>) {
		print $index encode_entities($_);
	    }
	    print $index '</div>' . "\n";
	    close($lcode);
	}
    }
}
close($template);
close($index);
