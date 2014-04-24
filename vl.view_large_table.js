var fs = require('fs');
var argv = require('minimist')(process.argv.slice(2));
var tty = require('tty');

var re;
var widths;
var currentColumn = 0;
var howManyCharsInCell = 0;
var str = "";
var continueReading = true;


var FILENAME = argv._[0];
if (typeof(FILENAME)==="string") {
    re = fs.createReadStream(FILENAME);
} else if (!tty.isatty()){
    re = process.stdin;
} else {
    info();
}

var COLUMN_MARGIN = (typeof(argv.m)==='number') ? argv.m : 1;
var SEP = (typeof(argv.s)==='string') ? new RegExp(argv.s) : /[\t,]/;
var SKIP = (typeof(argv.k)==='number') ? argv.k : 0;
var LINES_FOR_ESTIMATION = (typeof(argv.e)==='number' && argv.e>0) ? argv.e : 70;

var linesLeftForEstimation = LINES_FOR_ESTIMATION;
var linesToSkip = SKIP;

function makeSpaces(n) {
    return Array(n+1).join(' ');
}

function info() {
    process.stdout.write('No filename or stdin specified.\n\nUsage: vl [FILE] [OPTION]...\n\n  -m  number of spaces to separate columns. default = 1\n  -s  a regular expression to match column separators. default = [\\t,]\n  -k  number of lines to skip formatting. default = 0\n  -e  number of lines for estimation of column width. default = 70\n');
    process.exit();
}

/*******************  MAIN **********************/


re.on('readable', function () {
    if (continueReading) {
        var chunk = re.read();
    } else {
        return;
    }
    if (!!chunk) {
        var cur = chunk.toString();
    } else {
        var cur = '';
    }
    if (!!chunk && linesLeftForEstimation > 0) {
        // Hold the output.
        var lines = cur.split('\n');
        if (linesToSkip>0) {
            process.stdout.write(lines.slice(0,linesToSkip).join('\n'));
            str += lines.slice(linesToSkip).join('\n');
            linesToSkip -= lines.length - 1;
        } else {
            str += cur;
            linesLeftForEstimation -= lines.length - 1;
        }
    } else {
        str += cur;
        // Compute the widths.
        if (!widths) {
            var lines = str.split('\n');
            var cells = lines.map(function(s){return s.split(SEP);});

            var cellLengths = cells.map(function(l){
                return l.map(function(s){
                    return s.length;
                })
            });

            var listNumOfCellsInEachRow = cellLengths.map(function(l){
                return l.length;
            })

            var maxLength = Math.max.apply(null, listNumOfCellsInEachRow);
            
            var widthInEachColumn = [];
            for (var i=0;i<maxLength;i++) {
                var lengthsInColumn = cellLengths.map(function(l){return isNaN(l[i]) ? 0 : l[i]})
                widthInEachColumn.push(Math.max.apply(null, lengthsInColumn));
            }
            
            widths = widthInEachColumn;
        }

        // Estimation ended. Enter typewriter-style parser loop.
        var i = -1;
        var r = "";
        debugger;
        while (++i<str.length) {
            r = str[i];
            if (r=='\n') {
               process.stdout.write('\n');
               howManyCharsInCell = 0;
               currentColumn = 0;
            } else if (r.match(SEP)) {
               if (howManyCharsInCell>widths[currentColumn]) {
                   // If a cell is bigger than expected, expand that column for the rest of the file.
                   widths[currentColumn] = howManyCharsInCell;
               }
               process.stdout.write(makeSpaces(widths[currentColumn]-howManyCharsInCell+COLUMN_MARGIN));
               howManyCharsInCell = 0;
               currentColumn++;
            } else {
               process.stdout.write(r);
               howManyCharsInCell++;
            }
        }
        str = "";
    }
});


// re.on('readable', function () {
//     var chunk = re.read();
//     var str = chunk.toString();
//     if (linesLeftForEstimation > 0) {
//         // We use the first buffer (usually 65536 bytes) to fast estimate the width for each column.
//         var lines = str.split('\n');
//         linesLeftForEstimation -= lines.length - 1;
//         var cells = lines.map(function(s){return s.split(SEP);});

//         var cellLengths = cells.map(function(l){
//             return l.map(function(s){
//                 return s.length;
//             })
//         });

//         var listNumOfCellsInEachRow = cellLengths.map(function(l){
//             return l.length;
//         })

//         var maxLength = Math.max.apply(null, listNumOfCellsInEachRow);
        
//         var widthInEachColumn = [];
//         for (var i=0;i<maxLength;i++) {
//             var lengthsInColumn = cellLengths.map(function(l){return isNaN(l[i]) ? 0 : l[i]})
//             widthInEachColumn.push(Math.max.apply(null, lengthsInColumn));
//         }
        
//         widths = widthInEachColumn;
//     }
    
//     // Typewriter-style parser.
//     var i = -1;
//     var r = "";
//     while (++i<str.length) {
//         r = str[i];
//         if (r=='\n') {
//            process.stdout.write('\n');
//            howManyCharsInCell = 0;
//            currentColumn = 0;
//         } else if (r.match(SEP)) {
//            if (howManyCharsInCell>widths[currentColumn]) {
//                // If a cell is bigger than expected, expand that column for the rest of the file.
//                widths[currentColumn] = howManyCharsInCell;
//            }
//            process.stdout.write(makeSpaces(widths[currentColumn]-howManyCharsInCell+COLUMN_MARGIN));
//            howManyCharsInCell = 0;
//            currentColumn++;
//         } else {
//            process.stdout.write(r);
//            howManyCharsInCell++;
//         }
//     }
// });

process.stdout.on('error', function () {
    console.error('Pipe found closed when trying to write.');
    continueReading = false;
});